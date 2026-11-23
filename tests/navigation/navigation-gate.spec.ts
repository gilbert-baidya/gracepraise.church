import { test, expect } from '@playwright/test';

const languageLinkStyles = (elements: Element[]) => elements.map(element => {
  const style = getComputedStyle(element);
  return [style.display, style.minWidth, style.minHeight, style.borderRadius,
    style.padding, style.fontSize, style.fontWeight, style.lineHeight, style.whiteSpace];
});

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
});

for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
  for (const width of [390, 844]) {
    test(`expanded and scrolled drawer keeps controls reachable: ${width} ${theme} ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 390 });
      await page.goto('/about.html?lang=' + language, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
      await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
      await page.evaluate(() => document.fonts.ready);
      const pill = page.locator('.site-language-choices');
      const headerLanguageStyles = await pill.locator('a').evaluateAll(languageLinkStyles);
      const headerPill = await pill.evaluate(element => {
        (window as any).__languagePill = element;
        const style = getComputedStyle(element);
        return [style.borderRadius, style.borderTopWidth, style.padding, style.gap];
      });
      await page.locator('.mobile-menu-btn[aria-controls="nav-links"]').click();
      const nav = page.locator('#nav-links');
      await expect(nav).toHaveClass(/mobile-open/);
      expect(await pill.evaluate(element => element === (window as any).__languagePill)).toBe(true);
      expect(await pill.locator('a').evaluateAll(languageLinkStyles)).toEqual(headerLanguageStyles);
      expect(await pill.evaluate(element => {
        const style = getComputedStyle(element);
        return [style.borderRadius, style.borderTopWidth, style.padding, style.gap];
      })).toEqual(headerPill);
      const activeLanguage = nav.locator('[data-site-language][aria-pressed="true"]');
      await expect(activeLanguage).toHaveCount(1);
      await expect(activeLanguage).toHaveAttribute('data-site-language', language);
      expect(await activeLanguage.evaluate(element => {
        const check = getComputedStyle(element, '::before');
        return check.content.includes('✓') && check.display !== 'none' &&
          getComputedStyle(element).backgroundColor !== 'rgba(0, 0, 0, 0)';
      })).toBe(true);
      const about = nav.locator(':scope > .nav-dropdown').filter({ has: page.locator('a[href*="about.html"]') }).first();
      const toggle = about.locator(':scope > a');
      await expect(async () => {
        if (!await about.evaluate(element => element.classList.contains('mobile-dropdown-open'))) await toggle.click();
        await expect(about).toHaveClass(/mobile-dropdown-open/, { timeout: 100 });
      }).toPass({ timeout: 3000, intervals: [250] });
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const submenu = about.locator(':scope > .dropdown-menu');
      await expect(submenu).toBeVisible();
      await expect(submenu).toHaveCSS('opacity', '1');
      await expect(submenu).toHaveCSS('visibility', 'visible');
      expect(await submenu.locator('a').count()).toBeGreaterThan(0);
      const topStyle = await toggle.evaluate(element => ({
        size: parseFloat(getComputedStyle(element).fontSize),
        padding: parseFloat(getComputedStyle(element).paddingInlineStart)
      }));
      for (const child of await submenu.locator(':scope > li > a').all()) {
        const style = await child.evaluate(element => {
          const s = getComputedStyle(element);
          const luminance = (rgb: number[]) => rgb.map(c => c / 255)
            .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
            .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
          const ink = luminance((s.color.match(/[\d.]+/g) || []).slice(0, 3).map(Number));
          return { size: parseFloat(s.fontSize), padding: parseFloat(s.paddingInlineStart),
            color: s.color, contrast: (ink + .05) / (luminance([15, 23, 42]) + .05) };
        });
        expect(style.size).toBeLessThan(topStyle.size);
        expect(style.padding - topStyle.padding).toBeCloseTo(16, 1);
        expect(style.color).toBe('rgb(203, 213, 225)');
        expect(style.contrast).toBeGreaterThanOrEqual(4.5);
      }
      const tools = about.locator('.nav-dropdown-nested').first();
      const toolsToggle = tools.locator(':scope > a');
      await expect(toolsToggle.locator('.dropdown-arrow')).toHaveText('▾');
      await toolsToggle.click();
      await expect(toolsToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(toolsToggle.locator('.dropdown-arrow')).toHaveText('▴');
      await expect(toolsToggle.locator('.dropdown-arrow')).toHaveCSS('transform', 'none');
      await tools.locator(':scope > .dropdown-menu-nested a').first().focus();
      await page.keyboard.press('Escape');
      await expect(nav).not.toHaveClass(/mobile-open/);
      await expect(page.locator('.mobile-menu-btn')).toHaveAttribute('aria-expanded', 'false');
      await page.locator('.mobile-menu-btn').click();
      await expect(nav).toHaveClass(/mobile-open/);
      await nav.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect(await page.locator('.visit-brand-copy').evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
      })).toBe(true);
      for (const link of await nav.locator('[data-site-language]').all()) {
        expect(await link.evaluate(element => {
          const box = element.getBoundingClientRect();
          return box.width >= 44 && box.height >= 44 &&
            element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
        })).toBe(true);
      }
      await nav.locator('[data-site-language="bn"]').click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
      await expect(nav).toHaveClass(/mobile-open/);
      await expect(activeLanguage).toHaveAttribute('data-site-language', 'bn');
      await page.keyboard.press('Escape');
      await expect(page.locator('.site-language-row [data-site-language]')).toHaveCount(2);
      await expect(nav.locator('[data-drawer-language]')).toHaveCount(0);
      await page.locator('.mobile-menu-btn').click();
      await expect(nav.locator('[data-drawer-language]')).toHaveCount(1);
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(nav).not.toHaveClass(/mobile-open/);
      await expect(nav.locator('[data-drawer-language]')).toHaveCount(0);
      await expect(page.locator('.site-language-row [data-site-language]')).toHaveCount(2);
    });
  }

  test(`desktop dropdown containment, layering and Escape: ${theme} ${language}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop pointer and keyboard dropdown behavior');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/about.html?lang=' + language, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('header[data-gpbc-drawer]')).toBeAttached();
    await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
    await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '#nav-links .dropdown-menu a { transition-delay: 150ms !important; }' });
    for (const name of ['About', 'Devotion']) {
      const destination = name === 'About' ? 'about.html' : 'daily-devotion.html';
      const dropdown = page.locator('#nav-links > .nav-dropdown').filter({ has: page.locator(`:scope > a[href*="${destination}"]`) }).first();
      const toggle = dropdown.locator(':scope > a');
      await toggle.evaluate(element => {
        const dropdown = element.parentElement!;
        (window as any).__openingBounds = null;
        dropdown.addEventListener('mouseenter', () => requestAnimationFrame(() => {
          const menu = dropdown.querySelector('.dropdown-menu')!;
          const box = menu.getBoundingClientRect();
          (window as any).__openingBounds = { left: box.left, right: box.right, viewport: innerWidth };
        }), { once: true });
      });
      await toggle.hover();
      const menu = dropdown.locator(':scope > .dropdown-menu');
      const immediate = await menu.evaluate(element => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, viewport: innerWidth };
      });
      expect(immediate.left).toBeGreaterThanOrEqual(0);
      expect(immediate.right).toBeLessThanOrEqual(immediate.viewport);
      await expect.poll(() => page.evaluate(() => (window as any).__openingBounds)).not.toBeNull();
      const firstFrame = await page.evaluate(() => (window as any).__openingBounds);
      expect(firstFrame.left).toBeGreaterThanOrEqual(0);
      expect(firstFrame.right).toBeLessThanOrEqual(firstFrame.viewport);
      await expect(menu).toBeVisible();
      await expect(menu).toHaveCSS('opacity', '1');
      expect(await menu.evaluate(element => {
        const box = element.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth;
      })).toBe(true);
      const links = menu.locator(':scope > li > a');
      expect(await menu.evaluate(element => Array.from(element.querySelectorAll('*')).some(child =>
        getComputedStyle(child).transitionProperty.split(',').map(value => value.trim())
          .some(value => value === 'all' || value === 'visibility')))).toBe(false);
      await expect.poll(() => links.evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
      }))).toEqual(Array(await links.count()).fill(true));
      await toggle.focus();
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toBeHidden();
      await expect(page.locator('header[data-gpbc-drawer]')).not.toHaveClass(/desktop-dropdown-open/);
      await page.mouse.move(0, 899);
      await toggle.focus();
      await page.keyboard.press('ArrowDown');
      await expect(menu).toBeVisible();
      await expect(links.first()).toBeFocused();
      await page.locator('main').dispatchEvent('click');
      await expect(menu).toBeHidden();
      await expect(page.locator('header[data-gpbc-drawer]')).not.toHaveClass(/desktop-dropdown-open/);
    }
    await page.locator('[data-site-language="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
}

for (const width of [390, 1440]) for (const language of ['en', 'bn']) {
  test(`in-page anchors land below the header and jump bar at ${width}px ${language}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about.html?lang=' + language, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('header[data-gpbc-drawer]')).toBeAttached();
    await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important'));
    for (const id of ['story', 'mission']) {
      await page.locator(`.about-jump-nav a[href="#${id}"]`).click();
      await expect.poll(() => page.locator('#' + id).evaluate(element => {
        const header = document.querySelector('header[data-gpbc-drawer]')!;
        const jumpNav = document.querySelector('.about-jump-nav')!;
        return element.getBoundingClientRect().top - Math.max(
          header.getBoundingClientRect().bottom, jumpNav.getBoundingClientRect().bottom
        );
      })).toBeGreaterThanOrEqual(0);
      expect(await page.locator('#' + id).evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(900);
      await expect(page).toHaveURL(new RegExp('#' + id + '$'));
    }
  });
}

test('keyboard page scrolling is locked and closing restores the original scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/bible-reader.html?lang=bn', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(0, 600);
    return scrollY;
  })).toBe(600);
  await page.locator('.mobile-menu-btn').evaluate(element => element.addEventListener('click', () => {
    (window as any).__drawerEntryScroll = scrollY;
  }, { capture: true, once: true }));
  await page.locator('.mobile-menu-btn[aria-controls="nav-links"]').dispatchEvent('click');
  const entry = await page.evaluate(() => (window as any).__drawerEntryScroll);
  expect(entry).toBeGreaterThan(0);
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  const locked = await page.evaluate(() => scrollY);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  expect(await page.evaluate(() => scrollY)).toBe(locked);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(entry, 0);
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed');
});
