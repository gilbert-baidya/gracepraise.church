import { test, expect } from '@playwright/test';
import { titles } from '../../js/bangla-draft.mjs';

const routes = ['index', 'plan-visit', 'prayer-request', 'give', 'calendar', 'about', 'contact', 'ministries'];
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://upload-widget.cloudinary.com/global/all.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.cloudinary = { createUploadWidget: () => ({ open() {} }) };',
  }));
});

for (const route of routes) {
  test(route + ' has at least 95% Bengali coverage outside proper nouns and restores English', async ({ page }) => {
    await page.goto('/' + route + '.html?lang=bn', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page).toHaveTitle(new RegExp('^' + titles['/' + route]));
    await expect(page.locator('.site-footer')).toBeAttached();
    const coverage = await page.evaluate(() => {
      const english: string[] = [];
      let total = 0;
      const proper = /^(?:GRACE & PRAISE|Grace (?:and|&) Praise(?: Bangladeshi Church)?|Bangladeshi Church|GPBC|English|PayPal|YouTube|Facebook|Instagram|Google Calendar|Apple \/ iCal|Outlook|Rahul M\.|Priya D\.|Rev\. Gilbert Simon Baidya, PhD|988 Suicide & Crisis Lifeline|San Bernardino, (?:CA(?: 92408)?|California)|Southern California|1325 Richardson Street(?:, San Bernardino, CA 92408)?|info@gracepraise\.church)$/;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement!;
        const text = node.textContent!.trim().replace(/\s+/g, ' ');
        if (!/[A-Za-z]{2}|[\u0980-\u09ff]/.test(text) || proper.test(text) ||
            parent.closest('script, style, noscript, svg, [hidden], [aria-hidden="true"], .sr-only, .visually-hidden') ||
            !parent.getClientRects().length || getComputedStyle(parent).visibility !== 'visible') continue;
        total++;
        if (!/[\u0980-\u09ff]/.test(text)) english.push(text);
      }
      return { total, english, ratio: (total - english.length) / total };
    });
    expect(coverage.total).toBeGreaterThan(25);
    expect(coverage.ratio, JSON.stringify(coverage.english)).toBeGreaterThanOrEqual(.95);
    console.info('BN coverage ' + route + ': ' + (coverage.ratio * 100).toFixed(1) + '% (' +
      (coverage.total - coverage.english.length) + '/' + coverage.total + ' eligible visible nodes)');
    const translated = page.locator('[data-bangla-text]').first();
    const original = await translated.getAttribute('data-en');
    await page.evaluate(() => (window as any).GPBCLanguage.set('en'));
    await expect(translated).toHaveText(original!.trim());
    await expect(translated).toHaveAttribute('lang', 'en');
    await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
    await expect(translated).toHaveAttribute('lang', 'bn');
  });
}

test('footer headings retain plain text geometry while empty, unknown and nested content stays intact', async ({ page }) => {
  await page.goto('/index.html?lang=bn', { waitUntil: 'domcontentloaded' });
  const headings = page.locator('.sacred-footer .footer-nav-title');
  await expect(headings.first()).toHaveAttribute('data-bangla-text', '');
  expect(await headings.evaluateAll(elements => elements.every(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return element.childNodes.length === 1 && element.firstChild?.nodeType === Node.TEXT_NODE &&
      range.getClientRects().length === 1 && element.hasAttribute('data-en') && element.hasAttribute('data-bn');
  }))).toBe(true);
  const pair = await headings.first().evaluate(element => ({
    en: (element as HTMLElement).dataset.en!, bn: (element as HTMLElement).dataset.bn!,
  }));
  await page.evaluate(pair => {
    const fixture = document.createElement('div');
    fixture.id = 'draft-footer-fixtures';
    fixture.innerHTML = '<h4 class="footer-nav-title"></h4><h4 class="footer-nav-title">Uncatalogued footer heading</h4><h4 class="footer-nav-title"><strong></strong></h4>';
    fixture.querySelector('strong')!.textContent = pair.en;
    document.querySelector('.sacred-footer')!.append(fixture);
  }, pair);
  const fixture = page.locator('#draft-footer-fixtures');
  await expect(fixture.locator('strong')).toHaveText(pair.bn.trim());
  await expect(fixture.locator('strong > [data-bangla-text]')).toHaveCount(1);
  await expect(fixture.locator('h4').nth(0)).toBeEmpty();
  await expect(fixture.locator('h4').nth(0)).not.toHaveAttribute('data-en', /.*/);
  await expect(fixture.locator('h4').nth(1)).toHaveText('Uncatalogued footer heading');
  await expect(fixture.locator('h4').nth(1)).not.toHaveAttribute('data-en', /.*/);
  for (const language of ['en', 'bn'] as const) {
    await page.evaluate(language => (window as any).GPBCLanguage.set(language), language);
    await expect(headings.first()).toHaveText(pair[language].trim());
    await expect(headings.first()).toHaveAttribute('lang', language);
    await expect(headings.first().locator('*')).toHaveCount(0);
    await expect(fixture.locator('strong')).toHaveText(pair[language].trim());
  }
});

test('all title drafts resolve to Bengali on their public routes', async ({ page }) => {
  test.setTimeout(300_000);
  for (const route of Object.keys(titles).filter(route => route !== '/ministries/index')) {
    await page.goto(route + '.html?lang=bn', { waitUntil: 'domcontentloaded' });
    if (route === '/bible-slide-builder/index') await page.waitForURL(/songbook\.html/);
    await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page).toHaveTitle(/^[\u0980-\u09ff].* \| Grace and Praise Bangladeshi Church$/);
    expect(await page.title()).not.toMatch(/· বাংলা$/);
  }
});

test('standalone documents resolve language without injecting header UI', async ({ page }) => {
  for (const route of ['give-monthly.html', 'worship-studio/index.html']) {
    await page.goto('/' + route + '?lang=bn', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page).toHaveTitle(/^[\u0980-\u09ff]/);
    expect((await page.title()).match(/Grace and Praise Bangladeshi Church/g)).toHaveLength(1);
    await expect(page.locator('body')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.site-language-row')).toHaveCount(0);
    await page.evaluate(() => (window as any).GPBCLanguage.set('en'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  }
});

test('Bengali prayer labels and retry preserve user-authored values', async ({ page }) => {
  const payloads: any[] = [];
  await page.route('https://script.google.com/**', async route => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ json: { success: false }, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.goto('/prayer-request.html?lang=bn');
  await expect(page.getByLabel('আপনার নাম', { exact: false })).toBeVisible();
  await expect(page.locator('#prayer-request')).toHaveAttribute('lang', 'bn');
  await page.locator('#prayer-name').fill('Test Friend');
  await page.locator('#prayer-email').fill('test@example.com');
  await page.locator('#prayer-request').fill('Please pray for my family. আমাদের জন্য প্রার্থনা করুন।');
  await page.getByRole('button', { name: 'প্রার্থনার অনুরোধ পাঠান', exact: true }).click();
  await expect(page.locator('#prayer-error')).toContainText('আবার চেষ্টা করুন');
  await expect(page.locator('#prayer-request')).toHaveValue('Please pray for my family. আমাদের জন্য প্রার্থনা করুন।');
  expect(payloads[0].prayer.name).toBe('Test Friend');
  expect(payloads[0].prayer.email).toBe('test@example.com');
  expect(payloads[0].prayer.details).toBe('Please pray for my family. আমাদের জন্য প্রার্থনা করুন।');
  await page.evaluate(() => (window as any).GPBCLanguage.set('en'));
  await expect(page.getByRole('button', { name: 'Share My Prayer', exact: true })).toBeVisible();
});

test('Calendar month changes and event details use Bengali labels without translating private descriptions', async ({ page }) => {
  await page.goto('/calendar.html?lang=bn');
  const next = page.getByRole('button', { name: 'পরের মাসে যান', exact: true });
  await expect(next).toHaveAttribute('lang', 'bn');
  await next.click();
  await expect(page.locator('#currentMonth')).toContainText(/[\u0980-\u09ff]/);
  await page.evaluate(() => (window as any).showEventDetail({
    date: '2026-12-06', name: 'Worship Service', category: 'gpbc',
    description: 'Private description remains unchanged.'
  }));
  await expect(page.locator('#eventTitle')).toContainText('উপাসনা');
  await expect(page.locator('#eventDate')).toContainText('৬ ডিসেম্বর, ২০২৬');
  await expect(page.locator('#eventDescription')).toHaveText('Private description remains unchanged.');
  await page.getByRole('button', { name: 'আয়োজনের বিস্তারিত বন্ধ করুন', exact: true }).click();
  await expect(page.locator('#eventDetailModal')).toBeHidden();
});

test('deferred, empty and literal HTML labels are safe and preserve SVG decoration', async ({ page }) => {
  await page.goto('/prayer-request.html?lang=bn');
  await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
  await page.evaluate(() => {
    const container = document.createElement('div');
    container.id = 'draft-fixture';
    for (const text of ['Your Name', '', '<img src=x onerror=alert(1)>']) {
      const node = document.createElement('p');
      node.textContent = text;
      container.append(node);
    }
    document.querySelector('main')!.append(container);
  });
  await expect(page.locator('#draft-fixture p').nth(0)).toHaveText('আপনার নাম');
  await expect(page.locator('#draft-fixture p').nth(1)).toBeEmpty();
  await expect(page.locator('#draft-fixture img')).toHaveCount(0);
  await expect(page.locator('#draft-fixture p').nth(2)).toHaveText('<img src=x onerror=alert(1)>');
  await page.locator('#draft-fixture [data-bangla-text]').evaluate(node => {
    node.prepend(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
  });
  await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
  await expect(page.locator('#draft-fixture svg')).toHaveCount(1);
});

test('a missing draft catalog leaves the existing language switch usable', async ({ page }) => {
  await page.route('**/js/bangla-draft.mjs', route => route.abort());
  await page.goto('/prayer-request.html?lang=bn');
  await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'unavailable');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('#prayer-request')).toBeVisible();
  await page.evaluate(() => (window as any).GPBCLanguage.set('en'));
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
