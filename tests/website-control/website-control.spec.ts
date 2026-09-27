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
    (window as any).GPBC_WEBSITE_CONTROL_CONFIG = {
      mode: configuredMode,
      endpoint: configuredEndpoint
    };
  }, { configuredMode: mode, configuredEndpoint: endpointUrl });
}

async function waitForAdapter(page: Page) {
  await page.waitForFunction(() => {
    const status = (window as any).GPBCWebsiteControl?.getState?.().status;
    return ['ready', 'fallback', 'disabled'].includes(status);
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
});
