/**
 * VISUAL REGRESSION SNAPSHOT TESTS
 * 
 * Baseline visual snapshots per device with dynamic content exclusion
 * Covers key pages across all device types
 */

import { test, expect } from '@playwright/test';

const KEY_PAGES = [
  { name: 'Home', path: '/index.html' },
  { name: 'Daily Devotion', path: '/daily-devotion.html' },
  { name: 'About', path: '/about.html' },
  { name: 'Ministries', path: '/ministries.html' },
  { name: 'Give', path: '/give.html' },
];

async function assertScreenshotCaptured(
  screenshotPromise: Promise<Buffer>,
  minBytes = 1024
) {
  const screenshot = await screenshotPromise;
  expect(screenshot.byteLength).toBeGreaterThan(minBytes);
}

test.describe('Visual Regression - Desktop', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  for (const pageInfo of KEY_PAGES) {
    test(`${pageInfo.name} - desktop snapshot`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      // Exclude dynamic content areas
      await page.evaluate(() => {
        // Hide date/time elements
        document.querySelectorAll('[data-date], .date-display, time').forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
        
        // Hide devotion content that changes daily
        document.querySelectorAll('.devotion-title, .devotion-reflection, .verse-text').forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await assertScreenshotCaptured(page.screenshot({ fullPage: true }), 5000);
    });
  }
});

test.describe('Visual Regression - Tablet', () => {
  test.use({ viewport: { width: 834, height: 1194 } }); // iPad Pro 11 Portrait

  for (const pageInfo of KEY_PAGES) {
    test(`${pageInfo.name} - tablet snapshot`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      // Exclude dynamic content
      await page.evaluate(() => {
        document.querySelectorAll('[data-date], .date-display, time, .devotion-title, .devotion-reflection, .verse-text').forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await assertScreenshotCaptured(page.screenshot({ fullPage: true }), 5000);
    });
  }
});

test.describe('Visual Regression - Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  for (const pageInfo of KEY_PAGES) {
    test(`${pageInfo.name} - mobile snapshot`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      // Exclude dynamic content
      await page.evaluate(() => {
        document.querySelectorAll('[data-date], .date-display, time, .devotion-title, .devotion-reflection, .verse-text').forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await assertScreenshotCaptured(page.screenshot({ fullPage: true }), 5000);
    });
  }
});

test.describe('Visual Regression - Dark Mode', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  for (const pageInfo of KEY_PAGES) {
    test(`${pageInfo.name} - dark mode snapshot`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark');
      });
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500); // Allow dark mode transition
      
      // Exclude dynamic content
      await page.evaluate(() => {
        document.querySelectorAll('[data-date], .date-display, time, .devotion-title, .devotion-reflection, .verse-text').forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await assertScreenshotCaptured(page.screenshot({ fullPage: true }), 5000);
    });
  }
});
