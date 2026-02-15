/**
 * Visual Regression Snapshot Tests
 * Captures baseline visual snapshots for critical pages
 * Masks dynamic content (dates, devotion text, calendar pills)
 * Runs across all 7 device projects
 */

import { test, expect } from '@playwright/test';
import { test as deviceTest } from '../fixtures/device.fixture';

const extendedTest = test.extend(deviceTest['_extendTest']);

extendedTest.describe('Visual Regression - Homepage', () => {
  
  extendedTest('homepage visual snapshot', async ({ page, deviceContext }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    
    // Mask dynamic elements
    const maskedElements = [
      page.locator('.date-display, .current-date'),
      page.locator('.dynamic-content'),
      page.locator('.live-timestamp')
    ].filter(async (locator) => await locator.count() > 0);
    
    await expect(page).toHaveScreenshot(`homepage-${deviceContext.deviceName}.png`, {
      mask: maskedElements,
      maxDiffPixels: 100,
      animations: 'disabled'
    });
  });
  
});

extendedTest.describe('Visual Regression - About Page', () => {
  
  extendedTest('about page visual snapshot', async ({ page, deviceContext }) => {
    await page.goto('/about.html');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot(`about-${deviceContext.deviceName}.png`, {
      maxDiffPixels: 100,
      animations: 'disabled'
    });
  });
  
});

extendedTest.describe('Visual Regression - Daily Devotion', () => {
  
  extendedTest('devotion page visual snapshot (content masked)', async ({ page, deviceContext }) => {
    await page.goto('/daily-devotion.html');
    await page.waitForLoadState('networkidle');
    
    // Mask dynamic devotion content
    const maskedElements = await Promise.all([
      page.locator('.devotion-text, .devotion-content'),
      page.locator('.date-display, .devotion-date'),
      page.locator('.devotion-title'),
      page.locator('.calendar-pills .active, .date-pill.active')
    ]).then(locators => locators.filter(async (loc) => await loc.count() > 0));
    
    await expect(page).toHaveScreenshot(`devotion-${deviceContext.deviceName}.png`, {
      mask: maskedElements,
      maxDiffPixels: 150, // Higher tolerance due to background images
      animations: 'disabled',
      timeout: 10000
    });
  });
  
});

extendedTest.describe('Visual Regression - Calendar', () => {
  
  extendedTest('calendar page visual snapshot', async ({ page, deviceContext }) => {
    await page.goto('/calendar.html');
    await page.waitForLoadState('networkidle');
    
    // Mask active date indicators
    const maskedElements = [
      page.locator('.calendar-pills .active'),
      page.locator('.today-indicator'),
      page.locator('.current-month-highlight')
    ].filter(async (locator) => await locator.count() > 0);
    
    await expect(page).toHaveScreenshot(`calendar-${deviceContext.deviceName}.png`, {
      mask: maskedElements,
      maxDiffPixels: 100,
      animations: 'disabled'
    });
  });
  
});

extendedTest.describe('Visual Regression - Navigation States', () => {
  
  extendedTest('navigation header visual snapshot', async ({ page, deviceContext }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    
    // Snapshot just the header
    const header = page.locator('header, nav[role="navigation"]').first();
    
    await expect(header).toHaveScreenshot(`header-${deviceContext.deviceName}.png`, {
      maxDiffPixels: 50,
      animations: 'disabled'
    });
  });
  
  extendedTest('burger menu open state (mobile/tablet)', async ({ page, deviceContext }) => {
    // Skip on desktop
    if (deviceContext.isDesktop) {
      test.skip();
      return;
    }
    
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    
    // Open burger menu
    const burgerButton = page.locator('.burger-button, .mobile-menu-toggle');
    await burgerButton.click();
    await page.waitForTimeout(500); // Wait for animation
    
    // Snapshot open menu
    await expect(page).toHaveScreenshot(`burger-menu-open-${deviceContext.deviceName}.png`, {
      maxDiffPixels: 100,
      animations: 'disabled'
    });
  });
  
});

extendedTest.describe('Visual Regression - Footer', () => {
  
  extendedTest('footer visual snapshot', async ({ page, deviceContext }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    
    // Scroll to footer
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    const footer = page.locator('footer, .footer').first();
    
    await expect(footer).toHaveScreenshot(`footer-${deviceContext.deviceName}.png`, {
      maxDiffPixels: 50,
      animations: 'disabled'
    });
  });
  
});
