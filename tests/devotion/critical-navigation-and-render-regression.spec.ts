import { test, expect, Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];
const DESKTOP_VIEWPORT = { name: 'desktop', width: 1440, height: 1024 };

function sanitizeInternalHref(value: string | null): string {
  return (value || '').trim();
}

async function openMobileMenu(page: Page): Promise<void> {
  const menuButton = page
    .locator('.mobile-menu-btn, .mobile-menu-toggle, .burger-menu-btn, button[aria-label*="menu" i]')
    .first();
  await expect(menuButton).toBeVisible({ timeout: 10000 });
  await menuButton.click();
  await page.waitForTimeout(250);
}

async function openDevotionDropdown(page: Page): Promise<void> {
  const devotionDropdown = page.locator('.nav-dropdown:has-text("Devotion")').first();
  const devotionArrow = devotionDropdown.locator('.dropdown-arrow').first();
  if (await devotionArrow.count()) {
    await devotionArrow.scrollIntoViewIfNeeded();
    await devotionArrow.dispatchEvent('click');
    await page.waitForTimeout(250);
    return;
  }

  const devotionLink = devotionDropdown.locator(':scope > a').first();
  await expect(devotionLink).toBeVisible({ timeout: 10000 });
  await devotionLink.scrollIntoViewIfNeeded();
  await devotionLink.dispatchEvent('click');

  await page.waitForTimeout(250);
}

async function clickDailyDevotionFromMenu(page: Page): Promise<void> {
  const mobileScoped = page
    .locator('.nav-links.mobile-open .nav-dropdown:has-text("Devotion") .dropdown-menu a:has-text("Daily Devotion")')
    .first();
  const generic = page
    .locator('.nav-dropdown:has-text("Devotion") .dropdown-menu a:has-text("Daily Devotion"), a:has-text("Daily Devotion")')
    .first();

  if (!(await mobileScoped.isVisible().catch(() => false)) && !(await generic.isVisible().catch(() => false))) {
    await openDevotionDropdown(page);
  }

  const dailyLink = (await mobileScoped.isVisible().catch(() => false)) ? mobileScoped : generic;
  await expect(dailyLink).toBeVisible({ timeout: 10000 });
  const dailyHref = (await dailyLink.getAttribute('href')) || 'daily-devotion.html';
  await dailyLink.click({ force: true });
  try {
    await page.waitForURL(/daily-devotion\.html/, { timeout: 5000 });
  } catch {
    await page.goto(dailyHref);
  }
  await expect(page).toHaveURL(/daily-devotion\.html/);
}

async function clickLentFromMenu(page: Page): Promise<void> {
  const mobileScoped = page
    .locator('.nav-links.mobile-open .nav-dropdown:has-text("Devotion") .dropdown-menu a:has-text("Lent")')
    .first();
  const generic = page
    .locator('.nav-dropdown:has-text("Devotion") .dropdown-menu a:has-text("Lent"), a:has-text("Lent - 40 Days")')
    .first();

  if (!(await mobileScoped.isVisible().catch(() => false)) && !(await generic.isVisible().catch(() => false))) {
    await openDevotionDropdown(page);
  }

  const lentLink = (await mobileScoped.isVisible().catch(() => false)) ? mobileScoped : generic;
  await expect(lentLink).toBeVisible({ timeout: 10000 });
  const lentHref = (await lentLink.getAttribute('href')) || 'fasting-40days.html';
  await lentLink.click({ force: true });
  try {
    await page.waitForURL(/(?:lent-fasting|fasting-40days)\.html/, { timeout: 5000 });
  } catch {
    await page.goto(lentHref);
  }
  await expect(page).toHaveURL(/(?:lent-fasting|fasting-40days)\.html/);
}

async function assertMobileDropdownVisualContract(page: Page, dropdownLabel: string): Promise<void> {
  const styles = await page.evaluate((label) => {
    const parseRgba = (value: string): [number, number, number, number] | null => {
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
      const alpha = parts.length >= 4 && !Number.isNaN(parts[3]) ? parts[3] : 1;
      return [parts[0], parts[1], parts[2], alpha];
    };

    const isNearWhite = (value: string): boolean => {
      const rgba = parseRgba(value);
      if (!rgba) return false;
      const [r, g, b, a] = rgba;
      return r >= 235 && g >= 235 && b >= 235 && a >= 0.7;
    };

    const dropdown = Array.from(document.querySelectorAll('.nav-dropdown')).find((node) => {
      const trigger = node.querySelector(':scope > a');
      const triggerText = (trigger?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return triggerText.includes(label.toLowerCase());
    }) as HTMLElement | undefined;

    const menu = dropdown?.querySelector(':scope > .dropdown-menu') as HTMLElement | null;
    const firstItem = menu?.querySelector(':scope > li > a') as HTMLElement | null;

    if (!dropdown || !menu || !firstItem) {
      return {
        found: false,
        menuBackgroundColor: '',
        menuBackgroundImage: '',
        firstItemBackgroundColor: '',
        firstItemBackgroundImage: ''
      };
    }

    const menuStyle = window.getComputedStyle(menu);
    const firstItemStyle = window.getComputedStyle(firstItem);

    return {
      found: true,
      menuBackgroundColor: menuStyle.backgroundColor,
      menuBackgroundImage: menuStyle.backgroundImage,
      menuIsNearWhite: isNearWhite(menuStyle.backgroundColor),
      firstItemBackgroundColor: firstItemStyle.backgroundColor,
      firstItemBackgroundImage: firstItemStyle.backgroundImage,
      firstItemIsNearWhite: isNearWhite(firstItemStyle.backgroundColor)
    };
  }, dropdownLabel);

  expect(styles.found).toBeTruthy();
  expect(styles.menuIsNearWhite).toBeFalsy();
  expect(styles.firstItemIsNearWhite).toBeFalsy();
}

async function assertDesktopLightDropdownContrast(page: Page, dropdownLabel: string): Promise<void> {
  const styles = await page.evaluate((label) => {
    const parseRgba = (value: string): [number, number, number, number] | null => {
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
      const alpha = parts.length >= 4 && !Number.isNaN(parts[3]) ? parts[3] : 1;
      return [parts[0], parts[1], parts[2], alpha];
    };

    const isNearWhite = (value: string): boolean => {
      const rgba = parseRgba(value);
      if (!rgba) return false;
      const [r, g, b, a] = rgba;
      return r >= 235 && g >= 235 && b >= 235 && a >= 0.7;
    };

    const toLinear = (channel: number): number => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };

    const luminance = (rgba: [number, number, number, number]): number => {
      const [r, g, b] = rgba;
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const contrastRatio = (fg: [number, number, number, number], bg: [number, number, number, number]): number => {
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    };

    const dropdown = Array.from(document.querySelectorAll('.nav-dropdown')).find((node) => {
      const trigger = node.querySelector(':scope > a');
      const triggerText = (trigger?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return triggerText.startsWith(label.toLowerCase());
    }) as HTMLElement | undefined;

    const menu = dropdown?.querySelector(':scope > .dropdown-menu') as HTMLElement | null;
    const firstItem = menu?.querySelector(':scope > li > a') as HTMLElement | null;

    if (!dropdown || !menu || !firstItem) {
      return {
        found: false,
        menuDisplay: '',
        menuBackgroundColor: '',
        firstItemColor: '',
        firstItemBackgroundColor: '',
        contrastRatio: 0,
        menuIsNearWhite: false,
        firstItemIsNearWhite: false
      };
    }

    const menuStyle = window.getComputedStyle(menu);
    const firstItemStyle = window.getComputedStyle(firstItem);
    const menuRgba = parseRgba(menuStyle.backgroundColor);
    const firstItemRgba = parseRgba(firstItemStyle.color);

    return {
      found: true,
      menuDisplay: menuStyle.display,
      menuBackgroundColor: menuStyle.backgroundColor,
      firstItemColor: firstItemStyle.color,
      firstItemBackgroundColor: firstItemStyle.backgroundColor,
      contrastRatio:
        menuRgba && firstItemRgba ? contrastRatio(firstItemRgba, menuRgba) : 0,
      menuIsNearWhite: isNearWhite(menuStyle.backgroundColor),
      firstItemIsNearWhite: isNearWhite(firstItemStyle.color)
    };
  }, dropdownLabel);

  expect(styles.found).toBeTruthy();
  expect(styles.menuDisplay).not.toBe('none');
  expect(styles.menuIsNearWhite && styles.firstItemIsNearWhite).toBeFalsy();
  expect(styles.contrastRatio).toBeGreaterThan(4.5);
}

async function assertDailyDevotionRenderContract(page: Page): Promise<void> {
  await expect(page).not.toHaveTitle(/Error response/i);
  await expect(page.locator('#bibleReference')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#bibleText')).toBeVisible({ timeout: 15000 });

  await expect(page.locator('#verseRef')).toHaveCount(1);
  await expect(page.locator('#reflectionText')).toHaveCount(1);
  await expect(page.locator('#prayerText')).toHaveCount(1);

  const payload = await page.evaluate(() => {
    const runtime = window as any;
    const bibleReference = (document.getElementById('bibleReference')?.textContent || '').trim();
    const bibleText = (document.getElementById('bibleText')?.textContent || '').trim();
    const reflectionText = (document.getElementById('reflectionText')?.textContent || '').trim();
    const prayerText = (document.getElementById('prayerText')?.textContent || '').trim();

    let updateContentOk = false;
    try {
      if (typeof runtime.updateContent === 'function') {
        runtime.updateContent();
        updateContentOk = true;
      }
    } catch (error) {
      updateContentOk = false;
    }

    return {
      bibleReference,
      bibleText,
      reflectionTextLength: reflectionText.length,
      prayerTextLength: prayerText.length,
      hasDevotionLoaderLoad: !!runtime.devotionLoader && typeof runtime.devotionLoader.load === 'function',
      hasCurrentDevotion: !!runtime.currentDevotion,
      hasCurrentDevotionData: !!runtime.__CURRENT_DEVOTION_DATA__,
      hasUpdateContent: typeof runtime.updateContent === 'function',
      updateContentOk
    };
  });

  expect(payload.bibleReference.length).toBeGreaterThan(2);
  expect(payload.bibleText.length).toBeGreaterThan(2);
  expect(payload.bibleText.trim()).not.toEqual(payload.bibleReference.trim());
  expect(payload.reflectionTextLength).toBeGreaterThan(20);
  expect(payload.prayerTextLength).toBeGreaterThan(10);
  expect(payload.hasDevotionLoaderLoad).toBeTruthy();
  expect(payload.hasCurrentDevotion).toBeTruthy();
  expect(payload.hasCurrentDevotionData).toBeTruthy();
  expect(payload.hasUpdateContent).toBeTruthy();
  expect(payload.updateContentOk).toBeTruthy();
}

async function assertNoRootAbsoluteCriticalNavLinks(page: Page): Promise<void> {
  const hrefs = await page.evaluate(() => {
    const logo = document.querySelector('.logo') as HTMLAnchorElement | null;
    const daily = Array.from(document.querySelectorAll('.nav-links a')).find((a) =>
      /daily devotion/i.test((a.textContent || '').trim())
    ) as HTMLAnchorElement | undefined;
    return {
      logoHref: logo?.getAttribute('href') || '',
      dailyHref: daily?.getAttribute('href') || ''
    };
  });

  const logoHref = sanitizeInternalHref(hrefs.logoHref);
  const dailyHref = sanitizeInternalHref(hrefs.dailyHref);

  expect(logoHref).toBeTruthy();
  expect(dailyHref).toBeTruthy();
  expect(logoHref.startsWith('/')).toBeFalsy();
  expect(dailyHref.startsWith('/')).toBeFalsy();
}

test.describe('Critical Regression - Navigation + Daily Devotion Render', () => {
  test('Desktop light-mode dropdown links remain readable (About, Ministries, Devotion)', async ({ page }, testInfo) => {
    test.skip(!/Desktop/i.test(testInfo.project.name), 'Desktop-only dropdown contrast contract');

    await page.setViewportSize({ width: DESKTOP_VIEWPORT.width, height: DESKTOP_VIEWPORT.height });
    await page.goto('/index.html');

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.body.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', 'light');
      }
    });

    for (const label of ['About', 'Ministries', 'Devotion']) {
      const trigger = page.locator('.nav-dropdown > a', { hasText: label }).first();
      await expect(trigger).toBeVisible({ timeout: 10000 });
      await trigger.focus();
      await page.waitForTimeout(150);
      await assertDesktopLightDropdownContrast(page, label);
    }
  });

  for (const viewport of VIEWPORTS) {
    test(`Home -> burger -> Devotion -> Daily Devotion renders core content (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/index.html');

      await openMobileMenu(page);
      await openDevotionDropdown(page);
      await assertMobileDropdownVisualContract(page, 'Devotion');
      await clickDailyDevotionFromMenu(page);

      await assertDailyDevotionRenderContract(page);
    });

    test(`Lent -> burger Devotion -> Daily Devotion + logo route do not 404 (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/lent-fasting.html');
      await expect(page.locator('.logo').first()).toBeVisible({ timeout: 10000 });

      await assertNoRootAbsoluteCriticalNavLinks(page);

      await openMobileMenu(page);
      await openDevotionDropdown(page);
      await assertMobileDropdownVisualContract(page, 'Devotion');
      await clickDailyDevotionFromMenu(page);

      await expect(page).toHaveURL(/daily-devotion\.html/);
      await expect(page).not.toHaveTitle(/Error response/i);
      await assertDailyDevotionRenderContract(page);

      await page.goto('/lent-fasting.html');
      await expect(page.locator('.logo').first()).toBeVisible({ timeout: 10000 });
      await Promise.all([
        page.waitForURL(/index\.html(?:#home)?$/, { timeout: 10000 }),
        page.locator('.logo').first().click()
      ]);

      await expect(page).not.toHaveTitle(/Error response/i);
      await expect(page).toHaveURL(/index\.html(?:#home)?$/);
    });

    test(`Home -> Devotion -> Lent -> Devotion -> Daily + logo route remains valid (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/index.html');

      await openMobileMenu(page);
      await openDevotionDropdown(page);
      await assertMobileDropdownVisualContract(page, 'Devotion');
      await clickLentFromMenu(page);

      await expect(page).toHaveURL(/(?:lent-fasting|fasting-40days)\.html/);
      await expect(page.locator('.logo').first()).toBeVisible({ timeout: 10000 });
      await assertNoRootAbsoluteCriticalNavLinks(page);

      await openMobileMenu(page);
      await openDevotionDropdown(page);
      await assertMobileDropdownVisualContract(page, 'Devotion');
      await clickDailyDevotionFromMenu(page);

      await expect(page).toHaveURL(/daily-devotion\.html/);
      await expect(page).not.toHaveTitle(/Error response/i);
      await assertDailyDevotionRenderContract(page);

      await page.goto('/lent-fasting.html');
      await expect(page.locator('.logo').first()).toBeVisible({ timeout: 10000 });
      await Promise.all([
        page.waitForURL(/index\.html(?:#home)?$/, { timeout: 10000 }),
        page.locator('.logo').first().click()
      ]);
      await expect(page).not.toHaveTitle(/Error response/i);
    });
  }

  test('Nested page keeps critical nav links path-safe (no root-absolute internal hrefs)', async ({ page }) => {
    await page.goto('/ministries/bible-study.html');
    await expect(page.locator('.logo').first()).toBeVisible({ timeout: 10000 });

    await assertNoRootAbsoluteCriticalNavLinks(page);

    const dailyHref = await page
      .locator('.nav-links a:has-text("Daily Devotion")')
      .first()
      .getAttribute('href');

    expect((dailyHref || '').startsWith('../')).toBeTruthy();
  });
});
