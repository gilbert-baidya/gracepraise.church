import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('gpbc:logoLoaderSeen', 'true');
    (window as any).GPBC_INITIAL_DEVOTION_DATE = '2026-11-20';
  });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://upload-widget.cloudinary.com/**', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.cloudinary={createUploadWidget:()=>({open(){}})};',
  }));
});

for (const [width, height] of [[390, 844], [1024, 768]]) {
  test(`late Bengali devotion rendering preserves the open menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/devotions-data/*.json*', async route => {
      await gate;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([{
        date: '2026-11-20', title: 'English title', titleBn: 'বাংলা শিরোনাম',
        verse: 'John 3:16', verseReference: 'John 3:16',
        verseText: 'English verse', verseTextBn: 'বাংলা শাস্ত্রের পদ',
        reflection: 'English reflection', reflectionBn: 'বাংলা ভাবনা',
        prayer: 'English fallback prayer',
      }]) });
    });
    try {
      await page.goto('/daily-devotion.html?lang=bn', { waitUntil: 'domcontentloaded' });
      const button = page.locator('.mobile-menu-btn'), nav = page.locator('#nav-links');
      await expect(button).toHaveAttribute('aria-controls', 'nav-links');
      await button.click();
      await expect(nav).toHaveClass(/mobile-open/);
      await page.evaluate(() => {
        const nav = document.querySelector('#nav-links')!;
        (window as any).__menuClosures = [];
        new MutationObserver(records => {
          if (records.some(record => record.attributeName === 'class') && !nav.classList.contains('mobile-open')) (window as any).__menuClosures.push(nav.className);
        }).observe(nav, { attributes: true, attributeFilter: ['class'] });
      });
      release();
      await expect(page.locator('#devotionTitle')).toHaveText('বাংলা শিরোনাম');
      await expect(page.locator('#langBn')).toHaveClass(/active/);
      await expect(nav).toHaveClass(/mobile-open/);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(await page.evaluate(() => (window as any).__menuClosures)).toEqual([]);
      await page.keyboard.press('Escape');
      await page.locator('[data-site-language="en"]').click();
      await expect(page.locator('#devotionTitle')).toHaveText('English title');
      await page.locator('#langBn').click();
      await expect(page.locator('#devotionTitle')).toHaveText('বাংলা শিরোনাম');
      await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
      await expect(page.locator('[data-devotion-prayer]')).toHaveAttribute('lang', 'en');
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });

  for (const blocker of ['footer', 'logo', 'failed-footer', 'empty-footer']) {
    test(`burger works before delayed ${blocker} finishes at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      if (blocker === 'logo') {
        await page.route('**/logo-loader.js*', route => route.fulfill({
          contentType: 'application/javascript',
          body: 'window.GPBC_loadLogo=()=>new Promise(resolve=>{window.__releaseMenuLogo=resolve;});',
        }));
      } else {
        await page.route('**/partials/site-footer.html*', async route => {
          const response = await route.fetch();
          await gate;
          await route.fulfill(blocker === 'failed-footer' ? { status: 503, body: 'Unavailable' }
            : blocker === 'empty-footer' ? { contentType: 'text/html', body: '' } : { response });
        });
      }
      try {
        await page.goto('/daily-devotion.html?lang=en', { waitUntil: 'domcontentloaded' });
        const started = Date.now(), remaining = () => Math.max(1, 2000 - (Date.now() - started));
        const button = page.locator('.mobile-menu-btn'), nav = page.locator('#nav-links');
        await expect(button).toHaveAttribute('aria-controls', 'nav-links', { timeout: remaining() });
        await button.click({ timeout: remaining() });
        await expect(nav).toHaveClass(/mobile-open/, { timeout: remaining() });
        expect(Date.now() - started).toBeLessThan(2000);
        expect(await page.evaluate(() => (window as any).PLATFORM_PARTIALS_READY)).toBeFalsy();
        release();
        if (blocker === 'logo') {
          await page.waitForFunction(() => typeof (window as any).__releaseMenuLogo === 'function');
          await page.evaluate(() => (window as any).__releaseMenuLogo());
        }
        await page.waitForFunction(() => (window as any).PLATFORM_PARTIALS_READY);
        await expect(nav).toHaveClass(/mobile-open/);
        await page.keyboard.press('Escape');
        await expect(nav).not.toHaveClass(/mobile-open/);
      } finally {
        release();
        await page.unrouteAll({ behavior: 'wait' });
      }
    });
  }
}
