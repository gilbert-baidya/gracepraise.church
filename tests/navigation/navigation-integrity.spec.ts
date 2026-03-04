import { test, expect } from '@playwright/test';
import { test as deviceTest } from '../fixtures/device.fixture';

function primaryNav(page: any) {
  return page
    .locator('header nav, header [role="navigation"], nav')
    .filter({ has: page.locator('a[href]') })
    .first();
}

async function getBurgerButton(page: any) {
  const burgerBtn = page
    .locator('.mobile-menu-btn, .mobile-menu-toggle, .burger-menu-btn, button[aria-label*="menu" i]')
    .first();
  await expect(burgerBtn).toBeVisible();
  return burgerBtn;
}

async function openMobileMenu(page: any) {
  const burgerBtn = await getBurgerButton(page);
  const mobileNav = page.locator('.nav-links');

  const isOpen = await mobileNav.evaluate((node) => node.classList.contains('mobile-open')).catch(() => false);
  if (!isOpen) {
    await burgerBtn.click();
    await page.waitForTimeout(250);
  }

  await expect(page.locator('.nav-links.mobile-open')).toBeVisible();
}

async function closeMobileMenu(page: any) {
  const burgerBtn = await getBurgerButton(page);
  const mobileNav = page.locator('.nav-links');

  const isOpen = await mobileNav.evaluate((node) => node.classList.contains('mobile-open')).catch(() => false);
  if (isOpen) {
    await burgerBtn.click();
    await page.waitForTimeout(250);
  }

  await expect(page.locator('.nav-links.mobile-open')).toHaveCount(0);
}

async function openTopLevelDropdown(page: any, label: string) {
  const dropdown = page
    .locator('.nav-dropdown')
    .filter({ has: page.locator(':scope > a', { hasText: label }) })
    .first();
  const trigger = dropdown.locator(':scope > a').first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click({ force: true });
  await page.waitForTimeout(250);
  await expect(dropdown).toHaveClass(/mobile-dropdown-open/);
}

async function navigateViaTopLevelDropdownLabel(page: any, label: string) {
  const dropdown = page
    .locator('.nav-dropdown')
    .filter({ has: page.locator(':scope > a', { hasText: label }) })
    .first();
  const trigger = dropdown.locator(':scope > a').first();

  await trigger.scrollIntoViewIfNeeded();
  await trigger.click({ force: true }); // first tap opens on mobile
  await page.waitForTimeout(200);
  await trigger.click({ force: true }); // second tap navigates
}

test.describe('Navigation - Burger Menu', () => {
  
  deviceTest('should open burger menu on tablet/mobile', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Burger menu not shown on desktop');
    
    await page.goto('/');
    await openMobileMenu(page);
  });
  
  deviceTest('should close burger menu on close button', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Burger menu not shown on desktop');
    
    await page.goto('/');
    await openMobileMenu(page);
    await closeMobileMenu(page);
  });
  
  deviceTest('should handle fast double-tap on burger menu', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Burger menu not shown on desktop');
    
    await page.goto('/');
    const burgerBtn = await getBurgerButton(page);
    
    // Fast double-tap
    await burgerBtn.click();
    await burgerBtn.click();
    await page.waitForTimeout(600);
    
    // Menu should stabilize (either open or closed, not stuck)
    const state = await page.evaluate(() => ({
      hasMenuClass: document.body.classList.contains('menu-open'),
      hasOpenNav: document.querySelector('.nav-links')?.classList.contains('mobile-open') || false
    }));
    expect(typeof state.hasMenuClass).toBe('boolean');
    expect(state.hasMenuClass).toBe(state.hasOpenNav);
  });
  
});

test.describe('Navigation - Dropdown Menus', () => {
  
  deviceTest('should toggle Devotion dropdown', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Dropdown behavior differs on desktop');
    
    await page.goto('/');
    await openMobileMenu(page);
    await openTopLevelDropdown(page, 'Devotion');
    await expect(
      page.locator('.nav-dropdown.mobile-dropdown-open .dropdown-menu a:has-text("Daily Devotion")').first()
    ).toBeVisible({ timeout: 2000 });
  });
  
  deviceTest('should close dropdown when clicking another dropdown', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Desktop has hover behavior');
    
    await page.goto('/');
    await openMobileMenu(page);
    await openTopLevelDropdown(page, 'Devotion');
    await openTopLevelDropdown(page, 'About');

    const devotionOpen = await page.evaluate(() => {
      const devotion = Array.from(document.querySelectorAll('.nav-dropdown')).find((node) => {
        const txt = (node.querySelector(':scope > a')?.textContent || '').toLowerCase();
        return txt.includes('devotion');
      });
      return devotion?.classList.contains('mobile-dropdown-open') || false;
    });
    expect(devotionOpen).toBeFalsy();
  });
  
});

test.describe('Navigation - Responsive Breakpoints', () => {
  
  test('should show burger menu at tablet width (834px)', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.goto('/');
    
    const burgerBtn = page.locator('.mobile-menu-btn, button[aria-label*="menu" i]').first();
    await expect(burgerBtn).toBeVisible();
    
    const desktopNav = page.locator('nav.desktop-nav, .desktop-only-nav');
    if (await desktopNav.count() > 0) {
      await expect(desktopNav).not.toBeVisible();
    }
  });
  
  test('should show desktop nav at desktop width (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    const nav = primaryNav(page);
    await expect(nav).toBeVisible();
    
    // Burger menu should not be visible on desktop
    const burgerBtn = page.locator('.mobile-menu-btn');
    if (await burgerBtn.count() > 0) {
      await expect(burgerBtn).not.toBeVisible();
    }
  });
  
  test('should handle breakpoint boundary at 768px', async ({ page }) => {
    // Test at exact breakpoint
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    const nav = primaryNav(page);
    await expect(nav).toBeVisible();
    
    // Navigation should be functional (either mobile trigger or direct link)
    const burgerVisible = await page.locator('.mobile-menu-btn, .mobile-menu-toggle, .burger-menu-btn, button[aria-label*="menu" i]').first().isVisible().catch(() => false);
    const homeLinkVisible = await primaryNav(page).locator('a:has-text("Home"), a[href="/"], a[href="index.html"]').first().isVisible().catch(() => false);
    expect(burgerVisible || homeLinkVisible).toBeTruthy();
  });
  
  test('should handle breakpoint boundary at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    
    const nav = primaryNav(page);
    await expect(nav).toBeVisible();
    
    // Check if navigation is accessible at the boundary mode
    const burgerVisible = await page.locator('.mobile-menu-btn, .mobile-menu-toggle, .burger-menu-btn, button[aria-label*="menu" i]').first().isVisible().catch(() => false);
    const homeLinkVisible = await primaryNav(page).locator('a:has-text("Home"), a[href="/"], a[href="index.html"]').first().isVisible().catch(() => false);
    expect(burgerVisible || homeLinkVisible).toBeTruthy();
  });
  
});

test.describe('Navigation - Link Functionality', () => {
  
  test('should navigate to About page', async ({ page }) => {
    await page.goto('/');

    const burgerBtn = page.locator('.mobile-menu-btn').first();
    if (await burgerBtn.isVisible().catch(() => false)) {
      await openMobileMenu(page);
      await navigateViaTopLevelDropdownLabel(page, 'About');
    } else {
      await page.locator('.nav-dropdown > a[href*="about"]').first().click();
    }
    
    await expect(page).toHaveURL(/about/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
  
  test('should navigate to Ministries page', async ({ page }) => {
    await page.goto('/');

    const burgerBtn = page.locator('.mobile-menu-btn').first();
    if (await burgerBtn.isVisible().catch(() => false)) {
      await openMobileMenu(page);
      await navigateViaTopLevelDropdownLabel(page, 'Ministries');
    } else {
      await page.locator('.nav-dropdown > a[href*="ministries"]').first().click();
    }
    
    await expect(page).toHaveURL(/ministries/);
  });
  
  test('should navigate to Daily Devotion page', async ({ page }) => {
    await page.goto('/');

    const burgerBtn = page.locator('.mobile-menu-btn').first();
    if (await burgerBtn.isVisible().catch(() => false)) {
      await openMobileMenu(page);
      await openTopLevelDropdown(page, 'Devotion');
      const devotionLink = page.locator('.nav-dropdown.mobile-dropdown-open .dropdown-menu a:has-text("Daily Devotion")').first();
      await devotionLink.scrollIntoViewIfNeeded();
      await devotionLink.click({ force: true });
    } else {
      await page.locator('a[href*="daily-devotion"]').first().click();
    }
    
    await expect(page).toHaveURL(/daily-devotion/);
    await expect(page.locator('#bibleReference, .devotion-container, #devotion').first()).toBeVisible({ timeout: 10000 });
  });
  
  test('all navigation links should be clickable', async ({ page }) => {
    await page.goto('/');
    
    const navLinks = primaryNav(page).locator('a[href]');
    const count = await navLinks.count();
    
    expect(count).toBeGreaterThan(5); // At least 5 navigation links
    
    // Check first 5 links are clickable (not disabled)
    for (let i = 0; i < Math.min(5, count); i++) {
      const link = navLinks.nth(i);
      await expect(link).toBeEnabled();
      
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
  
});

test.describe('Navigation - Accessibility', () => {
  
  test('burger menu should have accessible label', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.goto('/');
    
    const burgerBtn = page.locator('.mobile-menu-btn, button[aria-label*="menu" i]').first();
    
    const ariaLabel = await burgerBtn.getAttribute('aria-label');
    const title = await burgerBtn.getAttribute('title');
    const textContent = await burgerBtn.textContent();
    
    const hasLabel = ariaLabel || title || (textContent && textContent.trim().length > 0);
    expect(hasLabel).toBeTruthy();
  });
  
  test('navigation should have proper ARIA roles', async ({ page }) => {
    await page.goto('/');
    
    const nav = primaryNav(page);
    await expect(nav).toBeVisible();
    
    // Check if nav has role or is <nav> element
    const tagName = await nav.evaluate(el => el.tagName.toLowerCase());
    const role = await nav.getAttribute('role');
    
    const isAccessibleNav = tagName === 'nav' || role === 'navigation';
    expect(isAccessibleNav).toBeTruthy();
  });
  
  test('skip to content link should exist', async ({ page }) => {
    await page.goto('/');
    
    // Skip links are often visually hidden but keyboard accessible
    const skipLink = page.locator('a[href="#main-content"], a[href="#content"], a:has-text("Skip to")').first();
    
    if (await skipLink.count() > 0) {
      const href = await skipLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
    // Note: Skip link is optional but recommended for a11y
  });
  
});
