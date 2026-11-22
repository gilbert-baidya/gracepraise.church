import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const pages = ['index', 'plan-visit', 'give', 'calendar'];
const feed = { date: '2026-11-25', name: 'Church fellowship', category: 'gpbc', description: 'Everyone is welcome.' };
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.route('https://script.google.com/**', route => route.fulfill({ json: { events: [feed] } }));
});

for (const theme of ['light', 'dark']) {
  test(`lazy Stay Connected heading keeps readable ${theme} text fill`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const language of ['en', 'bn']) {
      await page.goto('/index.html?lang=' + language);
      const heading = page.locator('#stay-connected-v8-heading');
      await heading.evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
      await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href?.includes('/stay-connected-v8.css')));
      for (const node of [heading, heading.locator('span')]) {
        const text = theme === 'dark' ? 'rgb(245, 241, 232)' : 'rgb(16, 32, 51)';
        await expect(node).toHaveCSS('color', text);
        await expect(node).toHaveCSS('-webkit-text-fill-color', text);
      }
      await page.locator('.mobile-menu-btn').click();
      await expect(page.locator('.fast-menu-label > span:visible')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      for (const label of [page.locator('.fast-menu-label'), page.locator('.fast-menu-label > span:visible')]) {
        await expect(label).toHaveCSS('transform', 'none');
        await expect(label).toHaveCSS('opacity', '1');
      }
    }
  });
}

test('Home keeps offscreen supporting photos deferred behind the visit essentials', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  const slide = page.locator('.community-v5__slide').first();
  const caption = (await slide.locator('.community-v5__caption').innerText()).trim().replace(/\s+/g, ' ');
  await expect(slide).toHaveAccessibleName(new RegExp(caption));
  const images = await page.locator('main img.fast-lazy-image').evaluateAll(nodes =>
    nodes.filter(node => node.getBoundingClientRect().top > innerHeight * 2)
      .map(node => ({ requested: node.hasAttribute('src'), fallback: node.nextElementSibling?.tagName })));
  expect(images.length).toBeGreaterThan(0);
  expect(images.every(image => !image.requested && image.fallback === 'NOSCRIPT')).toBe(true);
  const backToTop = page.locator('#scrollToTop');
  await expect(backToTop).toBeHidden();
  await page.evaluate(() => scrollTo({ top: 500, behavior: 'instant' }));
  await expect(backToTop).toBeVisible();
  await backToTop.click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(backToTop).toBeHidden();
  await expect(page.locator('#main-content')).toBeFocused();
});

for (const route of pages) {
  test(`${route}: in-flow disclosure, skip focus and storage-blocked theme`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
      Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/' + route + '.html');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    const menu = page.getByRole('button', { name: 'Menu', exact: true });
    const menuBox = await menu.boundingBox();
    expect(menuBox!.height).toBeGreaterThanOrEqual(52);
    expect(menuBox!.width).toBeGreaterThanOrEqual(48);
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const navigation = page.locator('#' + await menu.getAttribute('aria-controls'));
    await expect(navigation).toBeVisible();
    const boxes = await page.evaluate(() => ({
      navigation: document.querySelector('.nav-links')!.getBoundingClientRect().bottom,
      main: document.querySelector('main')!.getBoundingClientRect().top
    }));
    expect(boxes.main).toBeGreaterThanOrEqual(boxes.navigation);
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(navigation).toHaveAttribute('inert', '');
    const before = await page.locator('html').getAttribute('data-theme');
    await page.locator('#darkModeToggle').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before!);
    expect(errors).toEqual([]);
  });

  test(`${route}: reflow, text spacing and reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/' + route + '.html');
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('body :is(p,li,h1,h2,h3,h4,h5,h6,a,button,label,small,span,td,th,input,select,textarea)').forEach(element => {
        element.style.setProperty('line-height', '1.5', 'important');
        element.style.setProperty('letter-spacing', '.12em', 'important');
        element.style.setProperty('word-spacing', '.16em', 'important');
        if (element.tagName === 'P') element.style.setProperty('margin-bottom', '2em', 'important');
      });
    });
    const headingSpacing = await page.locator('h1').first().evaluate(element => {
      const style = getComputedStyle(element);
      return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
    });
    expect(headingSpacing).toBeCloseTo(1.5);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.querySelector('main')!.style.zoom = '2'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.locator('#darkModeToggle').focus();
    await expect(page.locator('#darkModeToggle')).toHaveCSS('outline-width', '3px');
  });

  test(`${route}: navigation remains usable without scripts`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
    const page = await context.newPage();
    await page.goto('/' + route + '.html');
    await expect(page.locator('.site-language-row #darkModeToggle')).toHaveCount(1);
    await expect(page.locator('header .nav-links')).toBeVisible();
    await expect(page.locator('header a[href]').first()).toBeVisible();
    await expect(page.locator('#nav-links')).toHaveCount(1);
    await expect(page.locator('main img[data-lazy-src]:visible')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.locator('main')).toContainText(route === 'give' ? 'Generosity' : '1325 Richardson Street');
    if (route === 'give') await expect(page.getByRole('link', { name: /Open online giving/ })).toHaveAttribute('href', 'https://www.paypal.com/ncp/payment/V3AF32ZHJSAME');
    await context.close();
  });
}

test('calendar uses real table semantics and a phone-default list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar.html');
  await expect(page.locator('#monthEvents')).toContainText(feed.name);
  await expect(page.locator('#calendar-month-table')).toBeHidden();
  await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('caption')).toHaveText('November 2026');
  await expect(page.getByRole('columnheader')).toHaveCount(7);
  await expect(page.getByRole('columnheader', { name: 'Sunday', exact: true })).toBeVisible();
  await expect(page.locator('.event-marker').filter({ hasText: feed.name })).toHaveAccessibleName(/Wednesday, November 25, 2026/);
  const eventBox = await page.locator('.event-marker').filter({ hasText: feed.name }).boundingBox();
  expect(eventBox!.width).toBeGreaterThanOrEqual(48);
  expect(eventBox!.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await expect(page.locator('.day button, .day[tabindex]')).toHaveCount(0);
  await page.locator('.event-marker').filter({ hasText: feed.name }).click();
  await expect(page.getByRole('button', { name: 'Close event details modal' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#eventDetailModal').locator('button:visible, a[href]:visible').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close event details modal' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.event-marker').filter({ hasText: feed.name })).toBeFocused();
});

for (const route of ['index', 'plan-visit', 'give', 'calendar']) for (const theme of ['light', 'dark']) {
  test(`late footer stylesheet preserves readable ${route} ${theme} typography`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/${route}.html`);
    const footer = page.locator('footer.site-footer');
    await expect(footer).toBeVisible();
    await footer.evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href?.includes('/css/footer-v3.css')));
    const text = theme === 'dark' ? 'rgb(245, 241, 232)' : 'rgb(16, 32, 51)';
    const gold = theme === 'dark' ? 'rgb(241, 203, 120)' : 'rgb(128, 91, 22)';
    const heading = footer.locator('.sacred-footer__brand-text > h2');
    await expect(heading).toHaveCSS('color', text);
    await expect(heading).toHaveCSS('-webkit-text-fill-color', text);
    await expect(heading).toHaveCSS('text-shadow', 'none');
    await expect(footer.locator('.sacred-footer__brand-text > p')).toHaveCSS('color', text);
    await expect(footer.locator('.sacred-footer__legal-copy')).toHaveCSS('color', text);
    await expect(footer.locator('.sacred-footer__monogram')).toHaveCSS('color', gold);
    await expect(footer.locator('.sacred-footer__brand-text > small')).toHaveCSS('font-size', '16px');
    await expect(footer.locator('.footer-nav-title').first()).toHaveCSS('font-size', '16px');
    await expect(footer.locator('.sacred-footer__logo')).toHaveAttribute('alt', '');
    await expect(page.locator('#darkModeToggle .sun-icon')).toHaveCSS('position', 'static');
  });
}

for (const state of ['configured', 'empty', 'unavailable']) {
  test(`optimized header preserves CMS branding: ${state}`, async ({ page }) => {
    const settings = JSON.parse(readFileSync('content/settings/logo.json', 'utf8'));
    await page.route('**/content/settings/logo.json', route => state === 'unavailable'
      ? route.fulfill({ status: 503 })
      : route.fulfill({ json: { ...settings, logo: state === 'empty' ? '' : 'missing-brand.png', churchName: 'Grace Church' } }));
    await page.goto('/index.html');
    const logo = page.locator('header .logo-image');
    if (state === 'unavailable') {
      await expect(logo).toHaveAttribute('src', settings.logo);
      await expect(page.locator('.fast-brand')).toContainText('Grace');
    } else {
      await expect(page.locator('.fast-brand')).toHaveText('Grace Church');
      if (state === 'empty') await expect(logo).toHaveCSS('visibility', 'hidden');
      else {
        await expect(logo).toHaveAttribute('src', new RegExp(settings.logo + '$'));
        await page.locator('#darkModeToggle').click();
        await expect(logo).toHaveAttribute('src', new RegExp(settings.logoDark + '$'));
      }
    }
    await expect(page.locator('header .logo')).toBeVisible();
    await expect(logo).toHaveAttribute('alt', '');
  });
}

for (const body of ['{}', 'invalid JSON']) {
  test(`malformed calendar feed is unavailable, not empty: ${body}`, async ({ page }) => {
    await page.route('https://script.google.com/**', route => route.fulfill({ contentType: 'application/json', body }));
    await page.goto('/calendar.html');
    await expect(page.locator('#calendarFeedStatus')).toContainText('unavailable');
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    await expect(page.locator('#upcomingEventsList')).not.toContainText('No other gatherings');
    await expect(page.locator('.fast-sunday')).toContainText('1325 Richardson Street');
  });
}

test('empty feed is distinct from failed feed and retry announces recovery', async ({ page }) => {
  let failed = true;
  await page.route('https://script.google.com/**', route => failed ? route.abort() : route.fulfill({ json: { events: [] } }));
  await page.goto('/calendar.html');
  await expect(page.locator('#calendarFeedStatus')).toContainText('unavailable');
  await expect(page.locator('#upcomingEventsList')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.fast-sunday')).toContainText('5:00 PM Pacific Time');
  failed = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#calendarFeedStatus')).toHaveText('Upcoming events updated.');
  await expect(page.locator('#upcomingEventsList')).toContainText('No other gatherings are scheduled yet');
  await expect(page.locator('#currentMonth')).toBeFocused();
});

test('calendar bounds a stalled feed at eight seconds without blocking navigation', async ({ page }) => {
  await page.route('https://script.google.com/**', () => new Promise(() => {}));
  await page.goto('/calendar.html');
  await expect(page.locator('#calendarFeedStatus')).toHaveText('Loading upcoming events…');
  await page.locator('#nextMonth').click();
  await expect(page.locator('#currentMonth')).toHaveText('December 2026');
  await expect(page.locator('#calendarFeedStatus')).toContainText('unavailable', { timeout: 11000 });
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
});

test('initial page avoids loader videos and optional third-party media libraries', async ({ page, request }) => {
  const requests: string[] = [];
  page.on('request', event => requests.push(event.url()));
  await page.goto('/index.html');
  await expect(page.locator('#logo-loading-screen')).toHaveCount(0);
  expect(requests.filter(url => /\.mp4|jquery|slick\.min\.js|html2canvas/.test(url))).toEqual([]);
  const logo = await request.get(await page.locator('header .logo-image').getAttribute('src') as string);
  expect((await logo.body()).length).toBeLessThanOrEqual(15 * 1024);
});

test('lazy community carousel exposes only active captions and meaningful control names', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/index.html');
  const carousel = page.locator('.community-v5');
  await carousel.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const slides = carousel.locator('.community-v5__slide');
  await expect(slides.first()).toHaveAttribute('aria-hidden', 'false');
  await expect(slides.first()).not.toHaveAttribute('aria-label', /<img/);
  await expect(slides.first().locator('.community-v5__label')).toHaveCSS('font-size', '16px');
  await carousel.locator('.community-v5__next').click();
  await expect(slides.nth(1)).toHaveAttribute('aria-hidden', 'false');
  await expect(slides.nth(1)).not.toHaveAttribute('aria-label', /<img/);
  await expect(slides.first().locator('.community-v5__caption')).toBeHidden();
});
