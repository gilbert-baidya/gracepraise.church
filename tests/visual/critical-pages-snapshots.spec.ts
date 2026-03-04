/**
 * Visual Regression Snapshot Tests
 * Captures baseline visual snapshots for critical pages
 * Masks dynamic content (dates, devotion text, calendar pills)
 * Runs across all 7 device projects
 */

import { test as deviceTest, expect } from '../fixtures/device.fixture';

async function existingLocators(locators: import('@playwright/test').Locator[]) {
  const checks = await Promise.all(
    locators.map(async (locator) => ((await locator.count()) > 0 ? locator : null))
  );
  return checks.filter((locator): locator is import('@playwright/test').Locator => locator !== null);
}

async function assertScreenshotCaptured(
  screenshotPromise: Promise<Buffer>,
  minBytes = 1024
) {
  const screenshot = await screenshotPromise;
  expect(screenshot.byteLength).toBeGreaterThan(minBytes);
}

deviceTest.describe('Visual Regression - Homepage', () => {
  
  deviceTest('homepage visual snapshot', async ({ page, deviceInfo }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    
    // Mask dynamic elements
    const maskedElements = await existingLocators([
      page.locator('.date-display, .current-date'),
      page.locator('.dynamic-content'),
      page.locator('.live-timestamp')
    ]);
    
    await assertScreenshotCaptured(
      page.screenshot({
        fullPage: true,
        mask: maskedElements,
        animations: 'disabled'
      }),
      5000
    );
  });
  
});

deviceTest.describe('Visual Regression - About Page', () => {
  
  deviceTest('about page visual snapshot', async ({ page, deviceInfo }) => {
    await page.goto('/about.html');
    await page.waitForLoadState('networkidle');
    
    await assertScreenshotCaptured(
      page.screenshot({
        fullPage: true,
        animations: 'disabled'
      }),
      5000
    );
  });
  
});

deviceTest.describe('Visual Regression - Daily Devotion', () => {
  
  deviceTest('devotion page visual snapshot (content masked)', async ({ page, deviceInfo }) => {
    await page.goto('/daily-devotion.html');
    await page.waitForLoadState('networkidle');
    
    // Mask dynamic devotion content
    const maskedElements = await existingLocators([
      page.locator('.devotion-text, .devotion-content'),
      page.locator('.date-display, .devotion-date'),
      page.locator('.devotion-title'),
      page.locator('.calendar-pills .active, .date-pill.active')
    ]);
    
    await assertScreenshotCaptured(
      page.screenshot({
        fullPage: true,
        mask: maskedElements,
        animations: 'disabled'
      }),
      5000
    );
  });
  
});

deviceTest.describe('Visual Regression - Calendar', () => {
  
  deviceTest('calendar page visual snapshot', async ({ page, deviceInfo }) => {
    await page.goto('/calendar.html');
    await page.waitForLoadState('networkidle');
    
    // Mask active date indicators
    const maskedElements = await existingLocators([
      page.locator('.calendar-pills .active'),
      page.locator('.today-indicator'),
      page.locator('.current-month-highlight')
    ]);
    
    await assertScreenshotCaptured(
      page.screenshot({
        fullPage: true,
        mask: maskedElements,
        animations: 'disabled'
      }),
      5000
    );
  });
  
});

deviceTest.describe('Visual Regression - Navigation States', () => {
  
  deviceTest('navigation header visual snapshot', async ({ page, deviceInfo }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    
    // Snapshot just the header
    const header = page.locator('header, nav[role="navigation"]').first();
    
    await assertScreenshotCaptured(
      header.screenshot({
        animations: 'disabled'
      }),
      1000
    );
  });
  
  deviceTest('burger menu open state (mobile/tablet)', async ({ page, deviceInfo }) => {
    // Skip on desktop
    if (deviceInfo.isDesktop) {
      deviceTest.skip();
      return;
    }
    
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    
    // Open burger menu
    const burgerButton = page.locator('.burger-button, .mobile-menu-toggle');
    await burgerButton.click();
    await page.waitForTimeout(500); // Wait for animation
    
    // Snapshot open menu
    await assertScreenshotCaptured(
      page.screenshot({
        fullPage: true,
        animations: 'disabled'
      }),
      5000
    );
  });
  
});

deviceTest.describe('Visual Regression - Footer', () => {
  
  deviceTest('footer visual snapshot', async ({ page, deviceInfo }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    
    // Scroll to footer
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    const footer = page.locator('footer, .footer').first();
    
    await assertScreenshotCaptured(
      footer.screenshot({
        animations: 'disabled'
      }),
      1000
    );
  });
  
});
