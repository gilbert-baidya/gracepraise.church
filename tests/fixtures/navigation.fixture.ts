/**
 * Navigation Fixture
 * Provides navigation testing utilities (burger menu, dropdowns, mobile interactions)
 */

import { test as base, expect, type Page, type Locator } from '@playwright/test';

export interface NavigationHelpers {
  burgerButton: Locator;
  mobileMenu: Locator;
  darkModeToggle: Locator;
  
  // Actions
  openBurgerMenu(): Promise<void>;
  closeBurgerMenu(): Promise<void>;
  isBurgerMenuOpen(): Promise<boolean>;
  toggleDarkMode(): Promise<void>;
  
  // Assertions
  assertBurgerMenuVisible(): Promise<void>;
  assertBurgerMenuOpen(): Promise<void>;
  assertBurgerMenuClosed(): Promise<void>;
  assertNavigationAccessible(): Promise<void>;
}

type NavigationFixtures = {
  navigation: NavigationHelpers;
};

export const test = base.extend<NavigationFixtures>({
  navigation: async ({ page }, use) => {
    const helpers: NavigationHelpers = {
      burgerButton: page.locator('.mobile-menu-btn'),
      mobileMenu: page.locator('.nav-links'),
      darkModeToggle: page.locator('#darkModeToggle, .dark-mode-toggle'),

      async openBurgerMenu() {
        const menuOpen = await helpers.isBurgerMenuOpen();
        if (!menuOpen) {
          await helpers.burgerButton.click();
          await page.waitForSelector('.nav-links.mobile-open', { timeout: 5000 });
        }
      },

      async closeBurgerMenu() {
        const menuOpen = await helpers.isBurgerMenuOpen();
        if (menuOpen) {
          // Click overlay or burger button
          const overlay = page.locator('.mobile-overlay.active');
          if (await overlay.isVisible()) {
            await overlay.click();
          } else {
            await helpers.burgerButton.click();
          }
          await page.waitForSelector('.nav-links:not(.mobile-open)', { timeout: 5000 });
        }
      },

      async isBurgerMenuOpen() {
        const classList = await helpers.mobileMenu.getAttribute('class');
        return classList?.includes('mobile-open') || false;
      },

      async toggleDarkMode() {
        await helpers.darkModeToggle.click();
        await page.waitForTimeout(300); // Wait for theme transition
      },

      async assertBurgerMenuVisible() {
        await expect(helpers.burgerButton).toBeVisible({ timeout: 5000 });
        await expect(helpers.burgerButton).toHaveAttribute('aria-label', /menu/i);
      },

      async assertBurgerMenuOpen() {
        await expect(helpers.mobileMenu).toHaveClass(/mobile-open/, { timeout: 5000 });
        await expect(helpers.burgerButton).toHaveAttribute('aria-expanded', 'true');
      },

      async assertBurgerMenuClosed() {
        await expect(helpers.mobileMenu).not.toHaveClass(/mobile-open/);
        await expect(helpers.burgerButton).toHaveAttribute('aria-expanded', 'false');
      },

      async assertNavigationAccessible() {
        // Check all nav links are keyboard accessible
        const navLinks = page.locator('.nav-links a');
        const count = await navLinks.count();
        expect(count, 'Navigation should have links').toBeGreaterThan(0);

        // Sample check: first link should have href
        if (count > 0) {
          const firstLink = navLinks.first();
          await expect(firstLink).toHaveAttribute('href', /.+/);
        }
      }
    };

    await use(helpers);
  }
});

export { expect } from '@playwright/test';
