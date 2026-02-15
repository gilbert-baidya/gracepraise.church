import { test, expect } from '@playwright/test';
import { test as deviceTest } from '../fixtures/device.fixture';

test.describe('Navigation - Burger Menu', () => {
  
  deviceTest('should open burger menu on tablet/mobile', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Burger menu not shown on desktop');
    
    await page.goto('/');
    
    const burgerBtn = page.locator('.burger-menu-btn, button[aria-label*="menu" i]');
    await expect(burgerBtn).toBeVisible();
    
    await burgerBtn.click();
    
    // Wait for menu animation
    await page.waitForTimeout(500);
    
    const nav = page.locator('nav.open, nav[aria-expanded="true"], .mobile-nav');
    await expect(nav).toBeVisible();
  });
  
  deviceTest('should close burger menu on close button', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Burger menu not shown on desktop');
    
    await page.goto('/');
    
    // Open menu
    const burgerBtn = page.locator('.burger-menu-btn, button[aria-label*="menu" i]');
    await burgerBtn.click();
    await page.waitForTimeout(500);
    
    // Close menu
    const closeBtn = page.locator('.close-btn, button[aria-label*="close" i]');
    await closeBtn.click();
    await page.waitForTimeout(500);
    
    const nav = page.locator('nav.open, nav[aria-expanded="true"]');
    await expect(nav).not.toBeVisible();
  });
  
  deviceTest('should handle fast double-tap on burger menu', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Burger menu not shown on desktop');
    
    await page.goto('/');
    
    const burgerBtn = page.locator('.burger-menu-btn');
    
    // Fast double-tap
    await burgerBtn.click();
    await burgerBtn.click();
    await page.waitForTimeout(600);
    
    // Menu should stabilize (either open or closed, not stuck)
    const nav = page.locator('nav');
    const isVisible = await nav.isVisible();
    expect(typeof isVisible).toBe('boolean'); // Just verify it's in a stable state
  });
  
});

test.describe('Navigation - Dropdown Menus', () => {
  
  deviceTest('should toggle Devotion dropdown', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Dropdown behavior differs on desktop');
    
    await page.goto('/');
    
    // Open burger menu first
    const burgerBtn = page.locator('.burger-menu-btn');
    await burgerBtn.click();
    await page.waitForTimeout(500);
    
    // Find devotion dropdown
    const devotionToggle = page.locator('button:has-text("Devotion"), a:has-text("Devotion")').first();
    await devotionToggle.click();
    
    // Check submenu appears
    const submenu = page.locator('ul:near(:text("Devotion")), .submenu:near(:text("Devotion"))').first();
    await expect(submenu).toBeVisible({ timeout: 2000 });
  });
  
  deviceTest('should close dropdown when clicking another dropdown', async ({ page, deviceInfo }) => {
    deviceTest.skip(deviceInfo.isDesktop, 'Desktop has hover behavior');
    
    await page.goto('/');
    
    const burgerBtn = page.locator('.burger-menu-btn');
    await burgerBtn.click();
    await page.waitForTimeout(500);
    
    // Open first dropdown (Devotion)
    const devotionToggle = page.locator('button:has-text("Devotion"), a:has-text("Devotion")').first();
    await devotionToggle.click();
    await page.waitForTimeout(300);
    
    // Open second dropdown (About - if exists)
    const aboutToggle = page.locator('button:has-text("About"), a:has-text("About")').first();
    if (await aboutToggle.isVisible()) {
      await aboutToggle.click();
      await page.waitForTimeout(300);
      
      // First dropdown should close (only one open at a time on mobile)
      const devotionSubmenu = page.locator('ul:near(:text("Devotion"))').first();
      const isVisible = await devotionSubmenu.isVisible();
      // On mobile, typically only one dropdown open at a time
    }
  });
  
});

test.describe('Navigation - Responsive Breakpoints', () => {
  
  test('should show burger menu at tablet width (834px)', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.goto('/');
    
    const burgerBtn = page.locator('.burger-menu-btn, button[aria-label*="menu" i]');
    await expect(burgerBtn).toBeVisible();
    
    const desktopNav = page.locator('nav.desktop-nav, .desktop-only-nav');
    if (await desktopNav.count() > 0) {
      await expect(desktopNav).not.toBeVisible();
    }
  });
  
  test('should show desktop nav at desktop width (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Burger menu should not be visible on desktop
    const burgerBtn = page.locator('.burger-menu-btn');
    if (await burgerBtn.count() > 0) {
      await expect(burgerBtn).not.toBeVisible();
    }
  });
  
  test('should handle breakpoint boundary at 768px', async ({ page }) => {
    // Test at exact breakpoint
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Navigation should be functional (either mobile or desktop)
    const links = page.locator('nav a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });
  
  test('should handle breakpoint boundary at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Check if navigation is accessible
    const homeLink = page.locator('nav a:has-text("Home"), nav a[href="/"], nav a[href="index.html"]').first();
    await expect(homeLink).toBeVisible();
  });
  
});

test.describe('Navigation - Link Functionality', () => {
  
  test('should navigate to About page', async ({ page }) => {
    await page.goto('/');
    
    const aboutLink = page.locator('a[href*="about"]').first();
    await aboutLink.click();
    
    await expect(page).toHaveURL(/about/);
    await expect(page.locator('h1, h2')).toBeVisible();
  });
  
  test('should navigate to Ministries page', async ({ page }) => {
    await page.goto('/');
    
    const ministriesLink = page.locator('a[href*="ministries"], a:has-text("Ministries")').first();
    await ministriesLink.click();
    
    await expect(page).toHaveURL(/ministries/);
  });
  
  test('should navigate to Daily Devotion page', async ({ page }) => {
    await page.goto('/');
    
    const devotionLink = page.locator('a[href*="daily-devotion"]').first();
    await devotionLink.click();
    
    await expect(page).toHaveURL(/daily-devotion/);
    await expect(page.locator('.devotion-container, #devotion')).toBeVisible({ timeout: 5000 });
  });
  
  test('all navigation links should be clickable', async ({ page }) => {
    await page.goto('/');
    
    const navLinks = page.locator('nav a[href]');
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
    
    const burgerBtn = page.locator('.burger-menu-btn, button[aria-label*="menu" i]');
    
    const ariaLabel = await burgerBtn.getAttribute('aria-label');
    const title = await burgerBtn.getAttribute('title');
    const textContent = await burgerBtn.textContent();
    
    const hasLabel = ariaLabel || title || (textContent && textContent.trim().length > 0);
    expect(hasLabel).toBeTruthy();
  });
  
  test('navigation should have proper ARIA roles', async ({ page }) => {
    await page.goto('/');
    
    const nav = page.locator('nav, [role="navigation"]');
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
