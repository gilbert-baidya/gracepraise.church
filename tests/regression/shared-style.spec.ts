import { test, expect } from '@playwright/test';

const routes = ['index', 'plan-visit', 'give', 'calendar', 'prayer-request', 'daily-devotion'];

for (const route of routes) {
  test(`${route} uses local shared typography and persistent day/night roles`, async ({ page }) => {
    const externalFonts: string[] = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname) ||
        request.resourceType() === 'font' && url.origin !== new URL(page.url()).origin) externalFonts.push(request.url());
    });
    await page.route('https://script.google.com/**', route => route.fulfill({
      json: { events: [] }, headers: { 'access-control-allow-origin': '*' },
    }));
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto(`/${route}.html`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 247, 240)');
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(16, 32, 51)');
    await expect(page.locator('body')).toHaveCSS('font-family', 'Inter, "Noto Sans Bengali", system-ui, sans-serif');
    await expect(page.locator('h1').first()).toHaveCSS('font-family', 'Lora, Georgia, "Noto Sans Bengali", serif');
    await expect(page.locator('h1').first()).toHaveCSS('font-size', '64px');
    await expect(page.locator('h1').first()).toHaveCSS('line-height', '76px');
    expect(await page.locator('link[rel="stylesheet"]').last().getAttribute('href')).toBe('assets/css/shared-style.css');
    await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(0);

    await page.evaluate(() => {
      const section = document.createElement('section');
      section.id = 'shared-style-probe';
      section.innerHTML = '<article class="gpbc-card"><h2 lang="bn">বিশ্বাসে বেড়ে উঠি</h2><p lang="bn">ঈশ্বরের ভালোবাসায় একসঙ্গে উপাসনা করি।</p><a href="#shared-style-probe">Read more</a><button class="gpbc-button-primary">Continue</button><button class="gpbc-button-secondary">Back</button><label>Email<input class="gpbc-input" aria-describedby="shared-style-error"></label><p class="gpbc-error" id="shared-style-error">! Enter an email address.</p><p class="gpbc-success">✓ Message sent.</p></article>';
      document.querySelector('main')!.append(section);
    });
    const probe = page.locator('#shared-style-probe');
    await expect(probe.locator('h2')).toHaveCSS('font-family', '"Noto Sans Bengali", sans-serif');
    await expect(probe.locator('h2')).toHaveCSS('font-size', '24px');
    await expect(probe.locator('h2')).toHaveCSS('letter-spacing', 'normal');
    await expect(probe.locator('h2')).toHaveCSS('text-transform', 'none');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('background-color', 'rgb(230, 184, 78)');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('color', 'rgb(16, 32, 51)');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('-webkit-text-fill-color', 'rgb(16, 32, 51)');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('min-height', '52px');
    await expect(probe.locator('.gpbc-error')).toHaveCSS('color', 'rgb(180, 35, 24)');
    await expect(probe.locator('.gpbc-success')).toHaveCSS('color', 'rgb(22, 101, 52)');
    await expect(probe.locator('input')).toHaveValue('');
    await expect(probe.locator('input')).toHaveCSS('min-height', '52px');
    await probe.locator('input').evaluate(input => input.setAttribute('aria-invalid', 'true'));
    await expect(probe.locator('input')).toHaveCSS('border-top-color', 'rgb(180, 35, 24)');
    await probe.locator('a').focus();
    await expect(probe.locator('a')).toHaveCSS('outline-width', '3px');
    await expect(probe.locator('a')).toHaveCSS('outline-offset', '3px');
    await expect(probe.locator('a')).toHaveCSS('outline-color', 'rgb(29, 78, 216)');
    await expect(probe.locator('a')).toHaveCSS('color', 'rgb(29, 78, 216)');
    await expect(probe.locator('a')).toHaveCSS('text-decoration-line', 'underline');

    await page.locator('#darkModeToggle').evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 20, 32)');
    await expect(probe.locator('.gpbc-error')).toHaveCSS('color', 'rgb(253, 162, 155)');
    await expect(probe.locator('.gpbc-success')).toHaveCSS('color', 'rgb(134, 239, 172)');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('color', 'rgb(16, 32, 51)');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(page.locator('h1').first()).toHaveCSS('font-size', '36px');
    if (route === 'daily-devotion') {
      expect(await page.locator('#monthSelect').evaluate(element => {
        const style = getComputedStyle(element);
        const context = document.createElement('canvas').getContext('2d')!;
        context.font = style.font;
        const textWidth = Math.max(...Array.from((element as HTMLSelectElement).options, option => context.measureText(option.text).width));
        return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 20 - textWidth;
      })).toBeGreaterThanOrEqual(0);
    }
    expect(await page.locator('.skip-link').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThan(0);
    await page.locator('.skip-link').focus();
    await expect.poll(() => page.locator('.skip-link').evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
    expect(externalFonts).toEqual([]);
  });
}

test('shared controls remain usable when font downloads fail', async ({ page }) => {
  await page.route('**/assets/fonts/**/*.woff2', route => route.abort());
  await page.goto('/prayer-request.html');
  const input = page.locator('#prayer-name');
  await input.fill('Fallback font');
  await expect(input).toHaveValue('Fallback font');
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.locator('h1').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(0);
});
