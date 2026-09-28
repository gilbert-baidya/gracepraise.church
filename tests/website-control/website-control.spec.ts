import { expect, test, type Page } from '@playwright/test';

// Keep the fixture generated from the same checked-in registry used by the
// browser adapter and the trusted backend. This prevents the test payload from
// silently drifting to a partial feature map.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const schema = require('../../shared/website-control-schema');

const endpointRoute = '**/__v21/published-config';
const endpointUrl = 'https://us-central1-grace-and-praise-bangladesh.cloudfunctions.net/__v21/published-config';

type FeatureState = 'LIVE' | 'HIDDEN' | 'COMING_SOON' | 'ADMIN_PREVIEW';
type DeliveryFailure = { name: string; status: number; body: string; delay?: number; abort?: boolean };

function publishedConfig(overrides: Record<string, FeatureState> = {}) {
  const features = schema.FEATURE_IDS.reduce((map: Record<string, { state: FeatureState }>, featureId: string) => {
    map[featureId] = { state: 'LIVE' };
    return map;
  }, {});

  Object.entries(overrides).forEach(([featureId, state]) => {
    features[featureId] = { state };
  });

  return {
    schemaVersion: schema.SCHEMA_VERSION,
    revision: 8,
    features
  };
}

async function configurePage(page: Page, mode: string) {
  await page.addInitScript(({ configuredMode, configuredEndpoint }) => {
    (window as any).__GPBC_V21_TEST_HARNESS__ = { runtimeMode: configuredMode };
    (window as any).GPBC_WEBSITE_CONTROL_CONFIG = { endpoint: configuredEndpoint };
  }, { configuredMode: mode, configuredEndpoint: endpointUrl });
}

async function waitForAdapter(page: Page) {
  await page.waitForFunction(() => {
    const status = (window as any).GPBCWebsiteControl?.getState?.().status;
    return ['ready', 'fallback', 'disabled', 'preview-ready'].includes(status);
  });
}

async function marker(page: Page, featureId: string) {
  return page.locator(`[data-gpbc-feature="${featureId}"]`).evaluate((element: HTMLElement) => ({
    hidden: element.hidden,
    ariaHidden: element.getAttribute('aria-hidden'),
    controlState: element.dataset.gpbcControlState || null,
    comingSoon: element.classList.contains('gpbc-control-coming-soon'),
    height: element.getBoundingClientRect().height
  }));
}

test.describe('V21 public website-control adapter', () => {
  test('DISABLED mode performs no public read and preserves current website behavior', async ({ page }) => {
    let requestCount = 0;
    await page.route(endpointRoute, async (route) => {
      requestCount += 1;
      await route.fulfill({ status: 500, body: 'should not be requested' });
    });
    await configurePage(page, 'DISABLED');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);

    expect(requestCount).toBe(0);
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState())).toMatchObject({
      mode: 'DISABLED',
      status: 'disabled',
      source: 'fallback'
    });
    expect((await marker(page, 'homepage.planVisit')).hidden).toBe(false);
  });

  test('SHADOW mode reports configured/effective state without changing marked DOM', async ({ page }) => {
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'homepage.planVisit': 'HIDDEN' }))
      });
    });
    await configurePage(page, 'SHADOW');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);

    const report = await page.evaluate(() => (window as any).GPBCWebsiteControl.buildShadowReport());
    const planVisit = report.find((entry: any) => entry.featureId === 'homepage.planVisit');
    expect(planVisit).toMatchObject({
      configuredState: 'HIDDEN',
      effectiveState: 'HIDDEN',
      domPresence: 'PRESENT',
      expectedAction: 'NO_DOM_CHANGE'
    });
    expect(planVisit.dependentLinksFound).toContain('plan-visit.html');
    expect((await marker(page, 'homepage.planVisit')).hidden).toBe(false);
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState().revision)).toBe(8);
  });

  test('ACTIVE mode applies only the selected low-risk homepage features', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    let currentConfig = publishedConfig();
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(currentConfig) });
    });
    await configurePage(page, 'ACTIVE');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);

    const cases: Array<[FeatureState, boolean, boolean]> = [
      ['LIVE', false, false],
      ['HIDDEN', true, false],
      ['COMING_SOON', false, true],
      ['ADMIN_PREVIEW', true, false]
    ];

    for (const [state, hidden, comingSoon] of cases) {
      currentConfig = publishedConfig({ 'homepage.planVisit': state });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);
      expect(await marker(page, 'homepage.planVisit')).toMatchObject({
        hidden,
        controlState: state === 'ADMIN_PREVIEW' ? 'HIDDEN' : state,
        comingSoon
      });
      if (hidden) expect((await marker(page, 'homepage.planVisit')).height).toBe(0);
    }

    currentConfig = publishedConfig({
      'homepage.welcomeHome': 'HIDDEN',
      'homepage.community': 'COMING_SOON'
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    expect(await marker(page, 'homepage.welcomeHome')).toMatchObject({ hidden: true, controlState: 'HIDDEN', height: 0 });
    expect(await marker(page, 'homepage.community')).toMatchObject({ hidden: false, controlState: 'COMING_SOON', comingSoon: true });

    const nonSelected = await page.evaluate(() => (window as any).GPBCWebsiteControl
      .buildShadowReport()
      .find((entry: any) => entry.featureId === 'homepage.hero'));
    expect(nonSelected).toMatchObject({
      expectedAction: 'NO_DOM_CHANGE',
      domPresence: 'ABSENT'
    });
    expect(pageErrors).toEqual([]);
  });

  test('Phase 9 multi-feature ACTIVE scope preserves dependencies, footer, and route safety', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const currentConfig = publishedConfig({
      'homepage.planVisit': 'HIDDEN',
      'homepage.community': 'HIDDEN',
      'pages.gallery': 'COMING_SOON',
      'pages.planVisit': 'LIVE'
    });
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(currentConfig)
      });
    });
    await configurePage(page, 'ACTIVE');

    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    expect(await marker(page, 'homepage.planVisit')).toMatchObject({ hidden: true, controlState: 'HIDDEN' });
    expect(await marker(page, 'homepage.community')).toMatchObject({ hidden: true, controlState: 'HIDDEN' });
    await expect(page.locator('[data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="footer"]')).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await page.goto('/plan-visit.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    expect(await page.locator('#main-content').isHidden()).toBe(false);
    await expect(page.locator('script[data-gpbc-route-script="pages.planVisit"]')).toHaveCount(1);

    await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    await expect(page.locator('#gpbc-route-state h1')).toHaveText('Gallery Coming Soon');
    await expect(page.locator('script[data-gpbc-route-script="pages.gallery"]')).toHaveCount(0);
    expect(await page.locator('header').isVisible()).toBe(true);
    expect(await page.locator('footer').isVisible()).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  test('ACTIVE preserves unsupported registered features and ignores browser mode injection', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).GPBC_WEBSITE_CONTROL_CONFIG = { mode: 'DISABLED' };
      document.documentElement.dataset.gpbcControlMode = 'DISABLED';
      localStorage.setItem('websiteControlMode', 'DISABLED');
    });
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.giving': 'HIDDEN', 'pages.songbook': 'COMING_SOON' }))
      });
    });
    await configurePage(page, 'ACTIVE');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    const report = await page.evaluate(() => (window as any).GPBCWebsiteControl.buildShadowReport());
    expect(report.find((entry: any) => entry.featureId === 'pages.giving')).toMatchObject({
      expectedAction: 'NO_DOM_CHANGE',
      wouldApply: 'NO_DOM_CHANGE'
    });
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState().mode)).toBe('ACTIVE');
    expect(await page.locator('header').isVisible()).toBe(true);
  });

  test('dependency resolution propagates HIDDEN and COMING_SOON safely', async ({ page }) => {
    let currentConfig = publishedConfig({ 'pages.planVisit': 'HIDDEN' });
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(currentConfig)
      });
    });
    await configurePage(page, 'SHADOW');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);

    const states = await page.evaluate(() => ({
      homepage: (window as any).GPBCWebsiteControl.resolveFeatureState('homepage.planVisit'),
      page: (window as any).GPBCWebsiteControl.resolveFeatureState('pages.planVisit')
    }));
    expect(states).toEqual({ homepage: 'HIDDEN', page: 'HIDDEN' });

    currentConfig = publishedConfig({ 'pages.planVisit': 'COMING_SOON' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.resolveFeatureState('homepage.planVisit'))).toBe('COMING_SOON');
  });

  test('malformed, unavailable, and timed-out delivery always falls back visibly', async ({ page }) => {
    const failures: DeliveryFailure[] = [
      { name: '404', status: 404, body: JSON.stringify({ error: 'not found' }) },
      { name: '500', status: 500, body: JSON.stringify({ error: 'temporary failure' }) },
      { name: 'malformed JSON', status: 200, body: 'not-json' },
      { name: 'unsupported schema', status: 200, body: JSON.stringify({ ...publishedConfig(), schemaVersion: 999 }) },
      { name: 'missing feature', status: 200, body: JSON.stringify({ ...publishedConfig(), features: {} }) },
      { name: 'unknown feature', status: 200, body: JSON.stringify({ ...publishedConfig(), features: { ...publishedConfig().features, 'unknown.feature': { state: 'LIVE' } } }) },
      { name: 'unknown state', status: 200, body: JSON.stringify(publishedConfig({ 'homepage.planVisit': 'UNKNOWN' as FeatureState })) },
      { name: 'missing revision', status: 200, body: JSON.stringify({ schemaVersion: schema.SCHEMA_VERSION, features: publishedConfig().features }) },
      { name: 'empty response', status: 200, body: '' },
      { name: 'offline', status: 200, abort: true, body: '' },
      { name: 'timeout', status: 200, delay: 1400, body: JSON.stringify(publishedConfig()) }
    ];

    let failure = failures[0];
    await page.route(endpointRoute, async (route) => {
      if (failure.abort) {
        await route.abort('failed');
        return;
      }
      if (failure.delay) await new Promise((resolve) => setTimeout(resolve, failure.delay));
      await route.fulfill({ status: failure.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: failure.body });
    });
    await configurePage(page, 'ACTIVE');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

    for (const nextFailure of failures) {
      failure = nextFailure;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);
      expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState())).toMatchObject({
        status: 'fallback',
        source: 'fallback',
        revision: null
      });
      expect((await marker(page, 'homepage.planVisit')).hidden, nextFailure.name).toBe(false);
    }
  });

  test('ACTIVE loading preserves section layout while awaiting configuration', async ({ page }) => {
    await page.route(endpointRoute, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig())
      });
    });
    await configurePage(page, 'ACTIVE');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.gpbcControlPending === 'true');

    const loadingLayout = await page.locator('[data-gpbc-feature="homepage.planVisit"]').evaluate((element: HTMLElement) => ({
      visibility: getComputedStyle(element).visibility,
      hidden: element.hidden,
      height: element.getBoundingClientRect().height
    }));
    expect(loadingLayout).toMatchObject({ visibility: 'hidden', hidden: false });
    expect(loadingLayout.height).toBeGreaterThan(0);

    await waitForAdapter(page);
    expect(await page.locator('[data-gpbc-feature="homepage.planVisit"]').evaluate((element: HTMLElement) => getComputedStyle(element).visibility)).toBe('visible');
  });

  test('selected ACTIVE features remain horizontally safe across supported viewport widths', async ({ page }) => {
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'homepage.community': 'HIDDEN' }))
      });
    });
    await configurePage(page, 'ACTIVE');

    for (const width of [375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      expect(overflow.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(overflow.clientWidth);
      expect((await marker(page, 'homepage.community')).hidden).toBe(true);
    }
  });

  test('Plan Your Visit route controls page content and skips page runtime when unavailable', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    let currentState: FeatureState = 'LIVE';
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.planVisit': currentState }))
      });
    });
    await configurePage(page, 'ACTIVE');

    for (const state of ['LIVE', 'HIDDEN', 'COMING_SOON', 'ADMIN_PREVIEW'] as FeatureState[]) {
      currentState = state;
      await page.goto('/plan-visit.html', { waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);
      const publicState = state === 'ADMIN_PREVIEW' ? 'HIDDEN' : state;
      if (publicState === 'LIVE') {
        expect(await page.locator('#main-content').isHidden()).toBe(false);
        await expect(page.locator('script[data-gpbc-route-script="pages.planVisit"]')).toHaveCount(1);
        await expect(page.locator('#addToGoogleCal')).not.toHaveAttribute('href', '#');
        expect(await page.locator('#upcomingHighlights').count()).toBe(1);
      } else {
        await expect(page.locator('#gpbc-route-state h1')).toHaveText(`Plan Your Visit ${publicState === 'HIDDEN' ? 'Unavailable' : 'Coming Soon'}`);
        expect(await page.locator('#main-content').isHidden()).toBe(true);
        expect(await page.locator('script[data-gpbc-route-script="pages.planVisit"]').count()).toBe(0);
        expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex, nofollow');
      }
      expect(await page.locator('header').isVisible()).toBe(true);
    }
    expect(pageErrors).toEqual([]);
  });

  test('Plan Your Visit homepage/page combination matrix controls dependent surfaces without broken links', async ({ page }) => {
    let currentConfig = publishedConfig();
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(currentConfig)
      });
    });
    await configurePage(page, 'ACTIVE');

    const combinations: Array<[FeatureState, FeatureState, boolean, boolean, boolean]> = [
      ['LIVE', 'LIVE', false, false, false],
      ['HIDDEN', 'LIVE', true, false, false],
      ['LIVE', 'HIDDEN', false, true, false],
      ['LIVE', 'COMING_SOON', false, false, true],
      ['LIVE', 'ADMIN_PREVIEW', false, true, false],
      ['HIDDEN', 'HIDDEN', true, true, false]
    ];

    for (const [homepageState, pageState, sectionHidden, linksHidden, linksComingSoon] of combinations) {
      currentConfig = publishedConfig({
        'homepage.planVisit': homepageState,
        'pages.planVisit': pageState
      });
      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);
      await expect(page.locator('[data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="footer"]')).toHaveCount(5);

      expect(await marker(page, 'homepage.planVisit')).toMatchObject({
        hidden: sectionHidden,
        controlState: homepageState === 'ADMIN_PREVIEW' ? 'HIDDEN' : homepageState
      });
      const links = await page.locator('[data-gpbc-feature-link="pages.planVisit"]').evaluateAll((elements) => elements.map((element) => {
        const target = element.closest('li') || element;
        return {
          hidden: (target as HTMLElement).hidden,
          ariaHidden: target.getAttribute('aria-hidden'),
          tabIndex: (element as HTMLAnchorElement).tabIndex,
          comingSoon: element.classList.contains('gpbc-control-coming-soon-link'),
          ariaLabel: element.getAttribute('aria-label') || ''
        };
      }));
      expect(links.length).toBe(9);
      expect(links.every((link) => link.hidden === linksHidden)).toBe(true);
      expect(links.every((link) => link.tabIndex === -1)).toBe(linksHidden);
      expect(links.every((link) => link.comingSoon === linksComingSoon)).toBe(true);
      if (linksComingSoon) expect(links.every((link) => link.ariaLabel.toLowerCase().includes('coming soon'))).toBe(true);

      const planVisitReport = await page.evaluate(() => (window as any).GPBCWebsiteControl
        .buildShadowReport()
        .find((entry: any) => entry.featureId === 'pages.planVisit'));
      expect(planVisitReport.dependentSurfaces).toEqual(expect.arrayContaining([
        expect.objectContaining({ surfaceType: 'homepage-cta', dependentSelector: expect.stringContaining('data-gpbc-feature-link') }),
        expect.objectContaining({ surfaceType: 'footer-link', domPresence: 'PRESENT' })
      ]));
    }
  });

  test('Plan Your Visit dependent surfaces preserve navigation framework and shadow diagnostics', async ({ page }) => {
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.planVisit': 'HIDDEN' }))
      });
    });
    await configurePage(page, 'SHADOW');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    await expect(page.locator('[data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="footer"]')).toHaveCount(5);

    const diagnostics = await page.evaluate(() => {
      const report = (window as any).GPBCWebsiteControl.buildShadowReport();
      return report.find((entry: any) => entry.featureId === 'pages.planVisit');
    });
    expect(diagnostics.dependentSurfaces).toEqual(expect.arrayContaining([
      expect.objectContaining({ surfaceType: 'homepage-cta', domPresence: 'PRESENT', expectedActiveAction: 'CONTROL_HIDDEN', actualShadowAction: 'NONE — SHADOW MODE' }),
      expect.objectContaining({ surfaceType: 'footer-link', domPresence: 'PRESENT' })
    ]));
    expect(await page.locator('[data-gpbc-feature-link="pages.planVisit"]:visible').count()).toBe(9);
    expect(await page.locator('header .nav-links').isVisible()).toBe(true);
    await page.setViewportSize({ width: 390, height: 900 });
    expect(await page.locator('header .mobile-menu-btn').isVisible()).toBe(true);
    expect(await page.locator('header .nav-links').count()).toBe(1);
    expect(await page.locator('header [data-gpbc-feature-link="pages.planVisit"]').count()).toBe(0);
  });

  test('shared footer bootstrap applies Plan Your Visit control on secondary pages', async ({ page }) => {
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.planVisit': 'HIDDEN' }))
      });
    });
    await configurePage(page, 'ACTIVE');
    await page.goto('/contact.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    await expect(page.locator('[data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="footer"]')).toHaveCount(5);
    expect(await page.locator('[data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="contact-cta"]').isHidden()).toBe(true);
    expect(await page.locator('[data-gpbc-feature-link="pages.planVisit"]').evaluateAll((elements) => elements.every((element) => {
      const target = element.closest('li') || element;
      return (target as HTMLElement).hidden && (element as HTMLAnchorElement).tabIndex === -1;
    }))).toBe(true);
    expect(await page.locator('#main-content').isHidden()).toBe(false);
  });

  test('Plan Your Visit route failure matrix always preserves the existing page', async ({ page }) => {
    const failures: DeliveryFailure[] = [
      { name: '404', status: 404, body: JSON.stringify({ error: 'not found' }) },
      { name: '500', status: 500, body: JSON.stringify({ error: 'temporary failure' }) },
      { name: 'malformed JSON', status: 200, body: 'not-json' },
      { name: 'unsupported schema', status: 200, body: JSON.stringify({ ...publishedConfig(), schemaVersion: 999 }) },
      { name: 'missing revision', status: 200, body: JSON.stringify({ schemaVersion: schema.SCHEMA_VERSION, features: publishedConfig().features }) },
      { name: 'missing pages.planVisit', status: 200, body: JSON.stringify({ ...publishedConfig(), features: { ...publishedConfig().features, 'pages.planVisit': undefined } }) },
      { name: 'malformed dependency metadata', status: 200, body: JSON.stringify({ ...publishedConfig(), features: { ...publishedConfig().features, 'pages.planVisit': { state: 'LIVE', dependencies: ['homepage.planVisit'] } } }) },
      { name: 'offline', status: 200, abort: true, body: '' },
      { name: 'timeout', status: 200, delay: 1400, body: JSON.stringify(publishedConfig()) }
    ];
    let failure = failures[0];
    await page.route(endpointRoute, async (route) => {
      if (failure.abort) {
        await route.abort('failed');
        return;
      }
      if (failure.delay) await new Promise((resolve) => setTimeout(resolve, failure.delay));
      await route.fulfill({ status: failure.status, contentType: 'application/json', body: failure.body });
    });
    await configurePage(page, 'ACTIVE');

    for (const nextFailure of failures) {
      failure = nextFailure;
      await page.goto('/plan-visit.html', { waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);
      expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState())).toMatchObject({
        status: 'fallback',
        source: 'fallback',
        revision: null
      });
      expect(await page.locator('#main-content').isHidden(), nextFailure.name).toBe(false);
      expect(await page.locator('#gpbc-route-state').count(), nextFailure.name).toBe(0);
      await expect(page.locator('script[data-gpbc-route-script="pages.planVisit"]')).toHaveCount(1);
      await expect.poll(() => page.locator('#addToGoogleCal').getAttribute('href'), { timeout: 10000 }).not.toBe('#');
    }
  });

  test('Plan Your Visit states remain responsive, themed, and reject public preview hints', async ({ page }) => {
    let currentState: FeatureState = 'COMING_SOON';
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.planVisit': currentState }))
      });
    });
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await configurePage(page, 'ACTIVE');

    for (const state of ['LIVE', 'HIDDEN', 'COMING_SOON', 'ADMIN_PREVIEW'] as FeatureState[]) {
      currentState = state;
      for (const width of [375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/plan-visit.html?preview=true&admin=true', { waitUntil: 'domcontentloaded' });
        await waitForAdapter(page);
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        }));
        expect(overflow.scrollWidth, `${state} horizontal overflow at ${width}px`).toBeLessThanOrEqual(overflow.clientWidth);
        expect(await page.locator('header').isVisible()).toBe(true);
        expect(await page.locator('html').getAttribute('data-theme')).toBe('dark');
        expect(await page.locator('#main-content').isHidden()).toBe(state !== 'LIVE');
        expect(await page.locator('.gpbc-route-state__link').isVisible()).toBe(state !== 'LIVE');
        expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState().routeState)).toBe(state === 'LIVE' ? null : (state === 'ADMIN_PREVIEW' ? 'HIDDEN' : state));
        expect(await page.locator('#darkModeToggle').isVisible()).toBe(true);
      }
    }
  });

  test('Gallery route control suppresses normal content and page script for HIDDEN and COMING_SOON', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    let currentConfig = publishedConfig({ 'pages.gallery': 'HIDDEN' });
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(currentConfig)
      });
    });
    await configurePage(page, 'ACTIVE');

    for (const [configuredState, effectiveState, heading] of [
      ['HIDDEN', 'HIDDEN', 'Gallery Unavailable'],
      ['COMING_SOON', 'COMING_SOON', 'Gallery Coming Soon'],
      ['ADMIN_PREVIEW', 'HIDDEN', 'Gallery Unavailable']
    ] as const) {
      currentConfig = publishedConfig({ 'pages.gallery': configuredState });
      await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);

      await expect(page.locator('#gpbc-route-state h1')).toHaveText(heading);
      await expect(page.locator('.gpbc-route-state__link')).toHaveAttribute('href', 'index.html#home');
      expect(await page.locator('#main-content').getAttribute('aria-hidden')).toBe('true');
      expect(await page.locator('#main-content').isHidden()).toBe(true);
      expect(await page.locator('#lightbox').isHidden()).toBe(true);
      expect(await page.locator('header').isVisible()).toBe(true);
      expect(await page.locator('.gallery-hero').isVisible()).toBe(false);
      expect(await page.locator('script[data-gpbc-route-script="pages.gallery"]').count()).toBe(0);
      expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex, nofollow');
      expect(await page.title()).toContain(heading);

      const galleryReport = await page.evaluate(() => (window as any).GPBCWebsiteControl
        .buildShadowReport()
        .find((entry: any) => entry.featureId === 'pages.gallery'));
      expect(galleryReport).toMatchObject({
        configuredState,
        effectiveState,
        routeMatch: '/gallery.html',
        expectedAction: `CONTROLLED_ROUTE_${effectiveState}`,
        domPresence: 'PRESENT'
      });
    }
    expect(pageErrors).toEqual([]);
  });

  test('Gallery route preserves current behavior in SHADOW, LIVE, and delivery fallback modes', async ({ page }) => {
    let responseMode: 'live' | 'hidden' | 'failure' = 'hidden';
    await page.route(endpointRoute, async (route) => {
      if (responseMode === 'failure') {
        await route.fulfill({ status: 500, body: 'temporary failure' });
        return;
      }
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.gallery': responseMode === 'hidden' ? 'HIDDEN' : 'LIVE' }))
      });
    });
    await configurePage(page, 'SHADOW');
    await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    await expect(page.locator('script[data-gpbc-route-script="pages.gallery"]')).toHaveCount(1);
    expect(await page.locator('#main-content').isHidden()).toBe(false);
    expect(await page.locator('#gpbc-route-state').count()).toBe(0);
    expect(await page.locator('.gallery-hero').isVisible()).toBe(true);
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl
      .buildShadowReport()
      .find((entry: any) => entry.featureId === 'pages.gallery'))).toMatchObject({
      configuredState: 'HIDDEN',
      effectiveState: 'HIDDEN',
      routeMatch: '/gallery.html',
      expectedAction: 'NO_DOM_CHANGE',
      wouldApply: 'CONTROLLED_ROUTE_HIDDEN',
      actualAction: 'NONE — SHADOW MODE'
    });

    responseMode = 'live';
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    expect(await page.locator('#main-content').isHidden()).toBe(false);
    expect(await page.locator('#gpbc-route-state').count()).toBe(0);
    expect(await page.title()).toBe('Church Gallery - Grace and Praise Bangladeshi Church');

    await configurePage(page, 'ACTIVE');
    responseMode = 'failure';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    await expect(page.locator('script[data-gpbc-route-script="pages.gallery"]')).toHaveCount(1);
    expect(await page.locator('#main-content').isHidden()).toBe(false);
    expect(await page.locator('#gpbc-route-state').count()).toBe(0);
    expect(await page.locator('.gallery-hero').isVisible()).toBe(true);
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState())).toMatchObject({
      mode: 'ACTIVE',
      status: 'fallback',
      source: 'fallback'
    });
  });

  test('Gallery route failure matrix always restores normal public behavior', async ({ page }) => {
    const failures: DeliveryFailure[] = [
      { name: '404', status: 404, body: JSON.stringify({ error: 'not found' }) },
      { name: '500', status: 500, body: JSON.stringify({ error: 'temporary failure' }) },
      { name: 'malformed JSON', status: 200, body: 'not-json' },
      { name: 'malformed schema', status: 200, body: JSON.stringify({ ...publishedConfig(), schemaVersion: 999 }) },
      { name: 'missing feature map', status: 200, body: JSON.stringify({ ...publishedConfig(), features: {} }) },
      { name: 'missing revision', status: 200, body: JSON.stringify({ schemaVersion: schema.SCHEMA_VERSION, features: publishedConfig().features }) },
      { name: 'offline', status: 200, abort: true, body: '' },
      { name: 'timeout', status: 200, delay: 1400, body: JSON.stringify(publishedConfig()) }
    ];
    let failure = failures[0];
    await page.route(endpointRoute, async (route) => {
      if (failure.abort) {
        await route.abort('failed');
        return;
      }
      if (failure.delay) await new Promise((resolve) => setTimeout(resolve, failure.delay));
      await route.fulfill({ status: failure.status, contentType: 'application/json', body: failure.body });
    });
    await configurePage(page, 'ACTIVE');

    for (const nextFailure of failures) {
      failure = nextFailure;
      await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);
      expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState())).toMatchObject({
        status: 'fallback',
        source: 'fallback',
        revision: null
      });
      expect(await page.locator('#main-content').isHidden(), nextFailure.name).toBe(false);
      expect(await page.locator('#gpbc-route-state').count(), nextFailure.name).toBe(0);
      await expect(page.locator('script[data-gpbc-route-script="pages.gallery"]')).toHaveCount(1);
    }
  });

  test('Gallery route control preserves theme handling and rejects public preview hints', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gpbcWebsiteControlState', 'ADMIN_PREVIEW');
      localStorage.setItem('websiteControlMode', 'ACTIVE');
    });
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.gallery': 'LIVE' }))
      });
    });
    await configurePage(page, 'ACTIVE');
    await page.goto('/gallery.html?preview=true&admin=true', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);

    expect(await page.locator('#main-content').isHidden()).toBe(false);
    expect(await page.locator('#gpbc-route-state').count()).toBe(0);
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.resolveControlledRoute('/gallery'))).toBeNull();
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState().routeState)).toBeNull();

    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await page.locator('#main-content').isVisible()).toBe(true);
    expect(await page.locator('#gpbc-route-state').count()).toBe(0);
  });

  test('Gallery controlled state inherits day/night theme and keeps the global toggle usable', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.gallery': 'COMING_SOON' }))
      });
    });
    await configurePage(page, 'ACTIVE');
    await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);

    expect(await page.locator('#gpbc-route-state').isVisible()).toBe(true);
    expect(await page.locator('html').getAttribute('data-theme')).toBe('dark');
    expect(await page.locator('body').getAttribute('data-theme')).toBe('dark');
    expect(await page.locator('#darkModeToggle').isVisible()).toBe(true);

    await page.locator('#darkModeToggle').click();
    await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe('light');
    expect(await page.locator('#gpbc-route-state').isVisible()).toBe(true);
  });

  test('Gallery LIVE, HIDDEN, COMING_SOON, and ADMIN_PREVIEW states stay responsive at all supported widths', async ({ page }) => {
    let currentState: FeatureState = 'LIVE';
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.gallery': currentState }))
      });
    });
    await configurePage(page, 'ACTIVE');

    for (const state of ['LIVE', 'HIDDEN', 'COMING_SOON', 'ADMIN_PREVIEW'] as FeatureState[]) {
      currentState = state;
      for (const width of [375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
        await waitForAdapter(page);
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        }));
        expect(overflow.scrollWidth, `${state} horizontal overflow at ${width}px`).toBeLessThanOrEqual(overflow.clientWidth);
        expect(await page.locator('header').isVisible()).toBe(true);
        expect(await page.locator('.gpbc-route-state__link').isVisible()).toBe(state !== 'LIVE');
        expect(await page.locator('#main-content').isHidden()).toBe(state !== 'LIVE');
      }
    }
  });

  test('Gallery route remains overflow-safe at supported widths and survives back/forward navigation', async ({ page }) => {
    await page.route(endpointRoute, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(publishedConfig({ 'pages.gallery': 'HIDDEN' }))
      });
    });
    await configurePage(page, 'ACTIVE');

    for (const width of [375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
      await waitForAdapter(page);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      expect(overflow.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(overflow.clientWidth);
      expect(await page.locator('#gpbc-route-state').isVisible()).toBe(true);
    }

    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    await expect(page.locator('#gpbc-route-state h1')).toHaveText('Gallery Unavailable');
    expect(await page.locator('script[data-gpbc-route-script="pages.gallery"]').count()).toBe(0);
  });

  test('trusted Draft Preview renders sanitized Draft only for the preview session', async ({ page }) => {
    let publicRequests = 0;
    await page.route(endpointRoute, async (route) => {
      publicRequests += 1;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(publishedConfig()) });
    });
    const preview = {
      ...publishedConfig({
        'homepage.planVisit': 'ADMIN_PREVIEW',
        'pages.planVisit': 'COMING_SOON',
        'pages.gallery': 'ADMIN_PREVIEW'
      }),
      preview: true
    };
    await page.addInitScript(({ previewPayload }) => {
      (window as any).GPBCWebsitePreview = {
        load: async () => previewPayload,
        onAuthLost: (callback: () => void) => { (window as any).__previewAuthLost = callback; }
      };
    }, { previewPayload: preview });
    await configurePage(page, 'SHADOW');
    await page.goto('/index.html?gpbc-preview=1', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);

    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState())).toMatchObject({
      mode: 'ACTIVE',
      status: 'preview-ready',
      source: 'draft-preview',
      preview: { active: true, revision: 8 }
    });
    expect(publicRequests).toBe(0);
    await expect(page.locator('#gpbc-admin-preview-banner')).toContainText('GPBC ADMIN PREVIEW');
    await expect(page.locator('#gpbc-admin-preview-banner')).toContainText('Draft Revision 8');
    expect(await page.locator('[data-gpbc-feature="homepage.planVisit"]').isHidden()).toBe(false);
    expect(await page.locator('[data-gpbc-feature-link="pages.planVisit"]').evaluateAll((elements) => elements.every((element) => !(element as HTMLElement).hidden))).toBe(true);
    expect(await page.locator('[data-gpbc-feature-link="pages.planVisit"]').evaluateAll((elements) => elements.every((element) => element.classList.contains('gpbc-control-coming-soon-link')))).toBe(true);

    await page.goto('/gallery.html?gpbc-preview=1', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);
    expect(await page.locator('#main-content').isHidden()).toBe(false);
    await expect(page.locator('#gpbc-admin-preview-banner')).toBeVisible();
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.resolveFeatureState('pages.gallery'))).toBe('LIVE');

    await page.evaluate(() => (window as any).__previewAuthLost());
    await page.waitForFunction(() => (window as any).GPBCWebsiteControl.getState().source === 'published');
    expect(await page.locator('#gpbc-admin-preview-banner').count()).toBe(0);
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState().preview.active)).toBe(false);
  });

  test('failed trusted Preview falls back to Published behavior and never exposes Draft', async ({ page }) => {
    let publicRequests = 0;
    await page.route(endpointRoute, async (route) => {
      publicRequests += 1;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(publishedConfig()) });
    });
    await page.addInitScript(() => {
      (window as any).GPBCWebsitePreview = {
        load: async () => { throw new Error('preview-admin-required'); },
        onAuthLost: () => {}
      };
    });
    await configurePage(page, 'SHADOW');
    await page.goto('/index.html?gpbc-preview=1', { waitUntil: 'domcontentloaded' });
    await waitForAdapter(page);

    expect(publicRequests).toBe(1);
    expect(await page.evaluate(() => (window as any).GPBCWebsiteControl.getState())).toMatchObject({
      status: 'ready',
      source: 'published',
      preview: { active: false }
    });
    expect(await page.locator('#gpbc-admin-preview-banner').count()).toBe(0);
    expect(await page.locator('[data-gpbc-feature="homepage.planVisit"]').isHidden()).toBe(false);
  });
});
