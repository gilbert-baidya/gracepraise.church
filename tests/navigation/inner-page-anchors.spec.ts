import { test, expect } from '@playwright/test';

const innerPages = [
  '/beliefs.html',
  '/contact.html',
  '/mission.html',
  '/about.html',
  '/ministries/bible-study.html',
  '/pastor/',
];

for (const path of innerPages) {
  test(`header and footer fragment destinations exist on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForFunction(() => (window as any).PLATFORM_PARTIALS_READY === true);
    await expect(page.locator('header a[href]').first()).toBeAttached();
    await expect(page.locator('footer a[href]').first()).toBeAttached();

    const broken = await page.evaluate(async () => {
      const documents = new Map<string, Document>([[location.pathname, document]]);
      const failures: string[] = [];
      const links = document.querySelectorAll<HTMLAnchorElement>('header a[href], footer a[href]');
      for (const link of links) {
        const url = new URL(link.href);
        if (url.origin !== location.origin || !url.hash || url.hash === '#') continue;
        if (!documents.has(url.pathname)) {
          const response = await fetch(url.pathname);
          if (!response.ok) {
            failures.push(`${link.textContent?.trim()}: ${url.pathname} returned ${response.status}`);
            continue;
          }
          documents.set(url.pathname, new DOMParser().parseFromString(await response.text(), 'text/html'));
        }
        if (!documents.get(url.pathname)!.getElementById(decodeURIComponent(url.hash.slice(1)))) {
          failures.push(`${link.textContent?.trim()}: ${url.pathname}${url.hash}`);
        }
      }
      return failures;
    });

    expect(broken).toEqual([]);
    const prayer = page.locator('header a').filter({ hasText: /^Prayer$/ }).first();
    if (await prayer.count()) await expect(prayer).toHaveJSProperty('pathname', '/prayer-request.html');
  });
}

test('homepage navigation fragment hrefs remain unchanged', async ({ page, request }) => {
  const response = await request.get('/index.html');
  const html = await response.text();
  await page.goto('/');
  await page.waitForFunction(() => (window as any).PLATFORM_PARTIALS_READY === true);
  const changed = await page.evaluate((source) => {
    const original = new DOMParser().parseFromString(source, 'text/html');
    return Array.from(original.querySelectorAll<HTMLAnchorElement>('header a[href*="#"]:not([data-site-language])'))
      .map(link => link.getAttribute('href'))
      .filter(href => !Array.from(document.querySelectorAll<HTMLAnchorElement>('header a')).some(link => {
        const url = new URL(link.href);
        url.searchParams.delete('lang');
        return `${url.pathname}${url.search}${url.hash}` === new URL(href!, location.href).pathname + new URL(href!, location.href).search + new URL(href!, location.href).hash;
      }));
  }, html);
  expect(changed).toEqual([]);
});

test('preserves local targets and unrelated hrefs while repairing footer links', async ({ page }) => {
  const unchanged = ['#anchor-test-section', '#', '', '#unknown-section', 'http://[', '#%ZZ', 'https://example.com/#home'];
  await page.route('**/beliefs.html', async route => {
    const response = await route.fetch();
    const html = (await response.text())
      .replace('</header>', `${unchanged.map((href, index) => `<a id="anchor-test-${index}" href="${href}">Test</a>`).join('')}</header><div id="anchor-test-section"></div>`);
    await route.fulfill({ response, body: html });
  });
  await page.route('**/partials/site-footer.html', async route => {
    const response = await route.fetch();
    const html = (await response.text())
      .replace('</footer>', '<a id="anchor-test-footer" href="#home">Home</a><a id="anchor-test-encoded" href="#%68ome">Home</a></footer>');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/beliefs.html');
  await page.waitForFunction(() => (window as any).PLATFORM_PARTIALS_READY === true);
  for (const [index, href] of unchanged.entries()) {
    await expect(page.locator(`#anchor-test-${index}`)).toHaveAttribute('href', href);
  }
  await expect(page.locator('#anchor-test-footer')).toHaveAttribute('href', '/?lang=en#home');
  await expect(page.locator('#anchor-test-encoded')).toHaveAttribute('href', '/?lang=en#home');
});
