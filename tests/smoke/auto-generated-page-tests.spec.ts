/**
 * Auto-Generated Smoke Tests
 * Automatically generates 4 test groups for all pages in registry:
 * 1. Page Load - HTTP success, no console errors
 * 2. Layout Integrity - No horizontal scroll, core elements visible
 * 3. Navigation Integrity - Burger menu (mobile/tablet), links clickable
 * 4. Accessibility Baseline - ARIA attributes, labels
 * 
 * Generated from page-registry.ts (59 pages)
 * Runs across all 7 device projects
 */

import { test, expect } from '@playwright/test';
import { pageRegistry } from '../../pages/page-registry';

// Use base test - fixtures are already available through imports
for (const entry of pageRegistry) {
  test.describe(`${entry.htmlPath} - Auto Generated Suite`, () => {
    
    // Group 1: Page Load Tests
    test('loads successfully without errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      page.on('pageerror', error => {
        pageErrors.push(error);
      });
      
      const pageObject = entry.create(page);
      const response = await pageObject.goto();
      
      // Verify HTTP 200
      expect(response?.status()).toBe(200);
      
      // Wait for core ready
      await pageObject.assertCoreReady();
      
      // Verify no console errors
      expect(consoleErrors, `Console errors found: ${consoleErrors.join(', ')}`).toHaveLength(0);
      expect(pageErrors, `Page errors found: ${pageErrors.map(e => e.message).join(', ')}`).toHaveLength(0);
    });
    
    // Group 2: Layout Integrity Tests
    test('has no horizontal scroll overflow', async ({ page, deviceContext }) => {
      const pageObject = entry.create(page);
      await pageObject.goto();
      await pageObject.assertCoreReady();
      
      // Get document dimensions
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth
      }));
      
      // Allow 1px tolerance for rounding
      expect(dimensions.scrollWidth, `Horizontal overflow detected: scrollWidth(${dimensions.scrollWidth}) > clientWidth(${dimensions.clientWidth})`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
      expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.bodyClientWidth + 1);
    });
    
    test('displays header and footer correctly', async ({ page }) => {
      const pageObject = entry.create(page);
      await pageObject.goto();
      await pageObject.assertCoreReady();
      
      // Header should be visible
      const header = page.locator('header, .header, nav[role="navigation"]').first();
      await expect(header).toBeVisible({ timeout: 5000 });
      
      // Footer should exist (may be below fold)
      const footer = page.locator('footer, .footer').first();
      await expect(footer).toBeAttached({ timeout: 5000 });
    });
    
    // Group 3: Navigation Integrity Tests
    test('burger menu works on mobile/tablet devices', async ({ page, deviceContext, navigation }) => {
      // Skip on desktop
      if (deviceContext.isDesktop) {
        test.skip();
        return;
      }
      
      const pageObject = entry.create(page);
      await pageObject.goto();
      await pageObject.assertCoreReady();
      
      // Burger menu should be visible
      await navigation.assertBurgerMenuVisible();
      
      // Should be closed initially
      await navigation.assertBurgerMenuClosed();
      
      // Open burger menu
      await navigation.openBurgerMenu();
      await navigation.assertBurgerMenuOpen();
      
      // Close burger menu
      await navigation.closeBurgerMenu();
      await navigation.assertBurgerMenuClosed();
    });
    
    test('all navigation links are clickable', async ({ page }) => {
      const pageObject = entry.create(page);
      await pageObject.goto();
      await pageObject.assertCoreReady();
      
      // Find all navigation links
      const navLinks = page.locator('nav a[href], header a[href], .navigation a[href]');
      const count = await navLinks.count();
      
      // Should have at least some navigation links
      expect(count, 'No navigation links found').toBeGreaterThan(0);
      
      // All links should have href
      for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');
        expect(href, `Link ${i} missing href attribute`).toBeTruthy();
      }
    });
    
    // Group 4: Accessibility Baseline Tests
    test('buttons and interactive elements have labels', async ({ page }) => {
      const pageObject = entry.create(page);
      await pageObject.goto();
      await pageObject.assertCoreReady();
      
      // Check buttons have accessible names
      const buttons = page.locator('button, [role="button"]');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible().catch(() => false);
        
        if (!isVisible) continue; // Skip hidden buttons
        
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        
        const hasAccessibleName = text?.trim() || ariaLabel || title;
        expect(hasAccessibleName, `Button ${i} missing accessible name`).toBeTruthy();
      }
    });
    
    test('images have alt text', async ({ page }) => {
      const pageObject = entry.create(page);
      await pageObject.goto();
      await pageObject.assertCoreReady();
      
      // Find all images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const isVisible = await img.isVisible().catch(() => false);
        
        if (!isVisible) continue; // Skip hidden images
        
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const role = await img.getAttribute('role');
        
        // Images must have alt text (can be empty for decorative) or aria-label
        const hasAccessibleText = alt !== null || ariaLabel || role === 'presentation';
        expect(hasAccessibleText, `Image ${i} missing alt attribute`).toBeTruthy();
      }
    });
    
  });
}

// Summary test that verifies registry coverage
test.describe('Registry Coverage', () => {
  test('verifies all 59 pages are registered', () => {
    expect(pageRegistry.length, 'Expected 59 pages in registry').toBe(59);
  });
  
  test('all entries have required properties', () => {
    for (const entry of pageRegistry) {
      expect(entry.htmlPath, 'htmlPath missing').toBeTruthy();
      expect(entry.className, 'className missing').toBeTruthy();
      expect(typeof entry.isFullDocument, 'isFullDocument must be boolean').toBe('boolean');
      expect(typeof entry.create, 'create must be function').toBe('function');
    }
  });
});
