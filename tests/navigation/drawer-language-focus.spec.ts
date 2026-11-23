import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });

for (const route of ['index', 'plan-visit', 'daily-devotion', 'about', 'calendar', 'bible-reader']) {
  for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
    test(`drawer language focus: ${route} ${language} ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => {
        localStorage.setItem('gpbc:logoLoaderSeen', 'true');
        localStorage.setItem('gpbc-lent-visited-2026', '1');
        window.addEventListener('DEVOTION_RENDER_COMPLETE', () => { (window as any).__pillDevotionReady = true; });
      });
      await page.route('https://fonts.googleapis.com/**', request => request.abort());
      await page.route('https://script.google.com/**', request => request.abort());
      await page.goto('/' + route + '.html?lang=' + language, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('header[data-gpbc-drawer]')).toBeAttached();
      await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
      await expect(page.locator('#nav-links')).toHaveAttribute('lang', language);
      if (route === 'daily-devotion') await page.waitForFunction(() => (window as any).__pillDevotionReady);
      await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
      await page.evaluate(() => document.fonts.ready);
      const burger = page.locator('.mobile-menu-btn');
      await burger.tap();
      const pills = page.locator('#nav-links [data-site-language]');
      await expect(pills.first()).toBeFocused();
      const readablePills = async () => {
        await expect(pills).toHaveCount(2);
        await expect(page.locator('#nav-links [data-site-language][aria-pressed="true"]')).toHaveCount(1);
        await expect(page.locator('#nav-links [data-site-language][aria-pressed="false"]')).toHaveCount(1);
        for (const pill of await pills.all()) {
          const selected = await pill.getAttribute('aria-pressed') === 'true';
          await expect(pill).toHaveCSS('color', selected ? 'rgb(15, 23, 42)' : 'rgb(245, 241, 232)');
          await expect(pill).toHaveCSS('background-color', selected ? 'rgb(245, 241, 232)' : 'rgba(0, 0, 0, 0)');
          await expect(pill).toHaveCSS('background-image', 'none');
          const contrast = await pill.evaluate(element => {
            const style = getComputedStyle(element);
            const ink = style.getPropertyValue('-webkit-text-fill-color') || style.color;
            const paper = style.backgroundColor === 'rgba(0, 0, 0, 0)' ?
              getComputedStyle(element.closest('[data-drawer-language]')!).backgroundColor : style.backgroundColor;
            const luminance = (color: string) => (color.match(/[\d.]+/g) || []).slice(0, 3)
              .map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
              .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
            const light = luminance(ink), dark = luminance(paper);
            return (Math.max(light, dark) + .05) / (Math.min(light, dark) + .05);
          });
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        }
      };
      await readablePills();
      const noPointerRing = async () => {
        const styles = await pills.evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element);
          return { outline: style.outlineStyle, shadow: style.boxShadow };
        }));
        expect(styles).toHaveLength(2);
        for (const style of styles) {
          expect(style.outline).toBe('none');
          const selectionUnderline = style.shadow.includes('inset') &&
            style.shadow.replace(/rgba?\([^)]+\)/g, '').replace(/\binset\b/g, '').trim() === '0px -3px 0px 0px';
          expect(style.shadow === 'none' || selectionUnderline).toBe(true);
        }
      };
      for (const target of ['bn', 'en']) {
        const pill = page.locator('#nav-links [data-site-language="' + target + '"]');
        await pill.tap();
        await expect(pill).toHaveAttribute('aria-pressed', 'true');
        await noPointerRing();
        await readablePills();
      }
      await burger.focus();
      const attempts = await page.locator('#nav-links a:visible').count() + 4;
      for (let index = 0; index < attempts && !await pills.first().evaluate(element => element === document.activeElement); index++) {
        await page.keyboard.press('Tab');
      }
      for (const pill of await pills.all()) {
        await expect(pill).toBeFocused();
        expect(await pill.evaluate(element => element.matches(':focus-visible'))).toBe(true);
        await expect(pill).toHaveCSS('outline-style', 'solid');
        await expect(pill).toHaveCSS('outline-width', '3px');
        await expect(pill).toHaveCSS('outline-offset', '3px');
        await expect(pill).toHaveCSS('outline-color', 'rgb(143, 188, 255)');
        const contrast = await pill.evaluate(element => {
          const luminance = (color: string) => (color.match(/[\d.]+/g) || []).slice(0, 3)
            .map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
            .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
          const ring = luminance(getComputedStyle(element).outlineColor);
          const background = luminance(getComputedStyle(document.querySelector('[data-drawer-language]')!).backgroundColor);
          return (Math.max(ring, background) + .05) / (Math.min(ring, background) + .05);
        });
        expect(contrast).toBeGreaterThanOrEqual(3);
        await readablePills();
        if (await pill.getAttribute('data-site-language') === 'en') await page.keyboard.press('Tab');
      }
      await pills.first().tap();
      await noPointerRing();
      await readablePills();
      await expect(page.locator('#nav-links')).toHaveClass(/mobile-open/);
    });
  }
}
