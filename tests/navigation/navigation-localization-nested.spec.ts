import { test, expect } from '@playwright/test';
import { mockSongbookSession } from '../fixtures/songbook-session';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
});

for (const language of ['en', 'bn']) {
  test(`shared navigation translates without replacing links: ${language}`, async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/about.html?lang=' + language);
      await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
      const nav = page.locator('#nav-links');
      const about = nav.locator(':scope > .nav-dropdown > a[href*="about.html"]').first();
      const tools = nav.locator('.nav-dropdown-nested > a').first();
      await about.evaluate(element => { (window as any).__originalNavLink = element; });
      const heading = await page.locator('main h1').first().textContent();
      await nav.evaluate(element => {
        const item = document.createElement('li');
        item.innerHTML = '<a href="#unknown">Uncatalogued navigation</a><a href="#empty"></a><a href="#pastor">Our Pastor</a>';
        element.append(item);
      });
      if (width === 390) await page.locator('.mobile-menu-btn').click();
      for (const selected of ['bn', 'en', 'bn', 'en']) {
        await page.locator(`[data-site-language="${selected}"]`).click();
        await expect(about).toHaveText(selected === 'bn' ? /আমাদের সম্পর্কে/ : /About/);
        await expect(tools).toHaveText(selected === 'bn' ? /উপকরণ/ : /Tools/);
        await expect(nav.locator('a[href*="history.html"]').first()).toHaveText(selected === 'bn' ? 'আমাদের ইতিহাস' : 'Our History');
        await expect(nav.locator('a[href*="bible-slide-builder"]').first()).toHaveText(selected === 'bn' ? 'বাইবেলের পদের স্লাইড তৈরি' : 'Bible Slide Builder');
        await expect(nav).toHaveAttribute('lang', selected);
        expect(await about.evaluate(element => element === (window as any).__originalNavLink && element.isConnected)).toBe(true);
        await expect(nav.locator('a[href="#unknown"]')).toHaveText('Uncatalogued navigation');
        await expect(nav.locator('a[href="#empty"]')).toBeEmpty();
        await expect(nav.locator('a[href="#pastor"]')).toHaveText(selected === 'bn' ? 'আমাদের পাস্টর' : 'Our Pastor');
        expect(await page.locator('main h1').first().textContent()).toBe(heading);
        if (width === 390) await expect(nav).toHaveClass(/mobile-open/);
      }
    }
  });
}

for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
  test(`legacy Give desktop dropdowns open: ${theme} ${language}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop hover navigation');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/give-bootstrap.html?lang=${language}`);
    await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
    await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
    for (const destination of ['about.html', 'ministries.html', 'daily-devotion.html']) {
      const dropdown = page.locator('#nav-links > .nav-dropdown').filter({ has: page.locator(`:scope > a[href*="${destination}"]`) }).first();
      await dropdown.locator(':scope > a').hover();
      const menu = dropdown.locator(':scope > .dropdown-menu');
      await expect(menu).toBeVisible();
      await expect(menu).toHaveCSS('opacity', '1');
      expect(await menu.evaluate(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right <= innerWidth;
      })).toBe(true);
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await page.mouse.move(0, 899);
    }
  });
}

const blockedKeyboardCases = [
  ...['fasting-40days.html', 'lent-fasting.html'].flatMap(route =>
    ['en', 'bn'].flatMap(language => ['light', 'dark'].map(theme => ({ route, language, theme })))),
  { route: 'fasting-30days.html', language: 'en', theme: 'light' },
  { route: 'give-modern.html', language: 'en', theme: 'light' },
  { route: 'bible-slide-builder/review.html', language: 'en', theme: 'dark' },
  { route: 'bible-slide-builder/review.html', language: 'bn', theme: 'dark' }
];

for (const { route, language, theme } of blockedKeyboardCases) {
  test(`nested keyboard public navigation: ${route} ${theme} ${language}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop nested keyboard navigation');
    await mockSongbookSession(page, false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${route}?lang=${language}`);
    if (route.startsWith('bible-slide-builder/')) await expect(page).toHaveURL(/songbook\.html/);
    const welcome = page.locator('#welcomeCta');
    if (await welcome.isVisible()) {
      await welcome.focus();
      await expect(welcome).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#welcomeOverlay')).toBeHidden();
    }
    await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
    await page.evaluate(({ language, theme }) => {
      (window as any).GPBCLanguage.set(language);
      (window as any).Platform.applyTheme(theme);
    }, { language, theme });
    await page.evaluate(() => document.fonts.ready);
    const about = page.locator('#nav-links > .nav-dropdown').filter({ has: page.locator(':scope > a[href*="about.html"]') }).first();
    const rootToggle = about.locator(':scope > a');
    const nested = about.locator('.nav-dropdown-nested').first();
    const toggle = nested.locator(':scope > a');
    const menu = nested.locator(':scope > .dropdown-menu-nested');
    await rootToggle.focus();
    await page.keyboard.press('ArrowDown');
    await expect(about.locator(':scope > .dropdown-menu > li > a').first()).toBeFocused();
    await toggle.focus();
    await page.keyboard.press('ArrowRight');
    const links = menu.locator(':scope > li > a');
    await expect(links.first()).toBeFocused();
    await expect(menu).toHaveCSS('opacity', '1');
    await page.keyboard.press('ArrowDown');
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(menu).toBeHidden();
    await expect(rootToggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(links.first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(toggle).toBeFocused();
    await expect(menu).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(about.locator(':scope > .dropdown-menu')).toBeHidden();
    await expect(rootToggle).toBeFocused();
  });
}
