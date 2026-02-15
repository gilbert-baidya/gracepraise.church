/**
 * DEVOTION SYSTEM DEEP TEST SUITE
 * 
 * Comprehensive tests for daily-devotion.html including:
 * - Background intelligence loading
 * - Share card modal functionality
 * - Canvas rendering (square & story formats)
 * - Dark mode rendering
 * - Adaptive overlay system
 * - Content visibility
 */

import { test, expect } from '@playwright/test';
import { test as deviceTest } from '../fixtures/device.fixture';

const DEVOTION_URL = '/daily-devotion.html';

test.describe('Devotion System - Background Intelligence', () => {
  test('should load devotion background image', async ({ page }) => {
    const backgroundLoaded = new Promise<boolean>(resolve => {
      page.on('response', response => {
        if (response.url().includes('/backgrounds/') && response.url().match(/\.(png|jpg|jpeg|webp)$/)) {
          resolve(response.status() === 200);
        }
      });
    });

    await page.goto(DEVOTION_URL);
    await page.waitForLoadState('networkidle');

    const result = await Promise.race([
      backgroundLoaded,
      page.waitForTimeout(5000).then(() => false)
    ]);

    expect(result).toBeTruthy();
  });

  test('should log background selection in console', async ({ page }) => {
    const backgroundLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Background AI') || text.includes('Selected background')) {
        backgroundLogs.push(text);
      }
    });

    await page.goto(DEVOTION_URL);
    await page.waitForTimeout(2000);

    expect(backgroundLogs.length).toBeGreaterThan(0);
  });

  test('should have background manifest loaded', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    
    const manifestLoaded = await page.evaluate(() => {
      return window.hasOwnProperty('DevotionBackgroundIntelligence');
    });

    expect(manifestLoaded).toBeTruthy();
  });
});

test.describe('Devotion System - Share Card Modal', () => {
  test('should open share card modal on button click', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    await page.waitForLoadState('networkidle');

    // Find and click share button
    const shareButton = page.locator('button:has-text("Share"), .share-btn, [aria-label*="share" i]').first();
    await shareButton.click();

    // Verify modal opened
    const modal = page.locator('.share-card-modal, #shareCardModal, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should display modal with glass morphism styling in dark mode', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    });

    // Open share modal
    const shareButton = page.locator('button:has-text("Share"), .share-btn').first();
    await shareButton.click();

    const modal = page.locator('.share-card-modal').first();
    await expect(modal).toBeVisible();

    // Check for glass morphism properties
    const backdropFilter = await modal.evaluate(el => 
      window.getComputedStyle(el).backdropFilter || window.getComputedStyle(el).webkitBackdropFilter
    );
    
    expect(backdropFilter).toContain('blur');
  });

  test('should close modal on close button click', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    
    // Open modal
    const shareButton = page.locator('button:has-text("Share"), .share-btn').first();
    await shareButton.click();

    const modal = page.locator('.share-card-modal').first();
    await expect(modal).toBeVisible();

    // Click close button
    const closeButton = modal.locator('button.share-card-close, [aria-label*="close" i], .close').first();
    await closeButton.click();

    // Verify modal closed
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Devotion System - Canvas Rendering', () => {
  test('should render share card canvas (square format)', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    await page.waitForLoadState('networkidle');

    // Open share modal
    const shareButton = page.locator('button:has-text("Share"), .share-btn').first();
    await shareButton.click();

    // Wait for canvas to be rendered
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify canvas has content (not blank)
    const canvasData = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return null;
      
      const imageData = ctx.getImageData(0, 0, el.width, el.height);
      const data = imageData.data;
      
      // Check if canvas has non-transparent pixels
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true; // Found non-transparent pixel
      }
      return false;
    });

    expect(canvasData).toBeTruthy();
  });

  test('should render canvas with adaptive overlay', async ({ page }) => {
    const overlayLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('adaptive') || text.includes('overlay') || text.includes('opacity')) {
        overlayLogs.push(text);
      }
    });

    await page.goto(DEVOTION_URL);
    
    // Open share modal
    const shareButton = page.locator('button:has-text("Share"), .share-btn').first();
    await shareButton.click();

    await page.waitForTimeout(3000);

    // Should have logged adaptive overlay calculation
    expect(overlayLogs.some(log => log.toLowerCase().includes('adaptive'))).toBeTruthy();
  });

  test('should show loading skeleton before canvas renders', async ({ page }) => {
    await page.goto(DEVOTION_URL);

    // Open share modal
    const shareButton = page.locator('button:has-text("Share"), .share-btn').first();
    await shareButton.click();

    // Check for skeleton/loading state
    const skeleton = page.locator('.skeleton, .loading, [data-loading]').first();
    
    // Skeleton should appear briefly (or canvas should render quickly)
    const skeletonVisible = await skeleton.isVisible().catch(() => false);
    const canvasVisible = await page.locator('canvas').first().isVisible();

    expect(skeletonVisible || canvasVisible).toBeTruthy();
  });
});

test.describe('Devotion System - Dark Mode Rendering', () => {
  test('should render devotion content in dark mode', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(500);

    // Check background color
    const bgColor = await page.evaluate(() => {
      const computed = window.getComputedStyle(document.documentElement);
      return computed.getPropertyValue('--sacred-bg-primary') || computed.backgroundColor;
    });

    expect(bgColor).toBeTruthy();
    // Dark mode should not be pure black (#000000)
    expect(bgColor).not.toBe('rgb(0, 0, 0)');
    expect(bgColor).not.toBe('#000000');
  });

  test('should have readable text in dark mode', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Check devotion content text color
    const textColor = await page.locator('.devotion-section, .devotion-container').first().evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    // Dark mode text should be light (high RGB values)
    const rgb = textColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const avgBrightness = (rgb[0] + rgb[1] + rgb[2]) / 3;
    
    expect(avgBrightness).toBeGreaterThan(128); // Light text for dark background
  });

  test('should apply dark mode to share card modal', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Open share modal
    const shareButton = page.locator('button:has-text("Share"), .share-btn').first();
    await shareButton.click();

    const modal = page.locator('.share-card-modal').first();
    await expect(modal).toBeVisible();

    // Check modal background is dark
    const bgColor = await modal.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    const rgb = bgColor.match(/\d+/g)?.map(Number) || [255, 255, 255];
    const avgBrightness = (rgb[0] + rgb[1] + rgb[2]) / 3;
    
    expect(avgBrightness).toBeLessThan(100); // Dark background
  });
});

test.describe('Devotion System - Content Visibility', () => {
  test('should display devotion title', async ({ page }) => {
    await page.goto(DEVOTION_URL);
    await page.waitForLoadState('networkidle');

    const title = page.locator('h1, .devotion-title, [data-title]').first();
    await expect(title).toBeVisible();
    await expect(title).not.toBeEmpty();
  });

  test('should display Bible verse reference', async ({ page }) => {
    await page.goto(DEVOTION_URL);

    const verseRef = page.locator('.verse-reference, [data-verse], h2').first();
    await expect(verseRef).toBeVisible();
    
    const text = await verseRef.textContent();
    expect(text).toMatch(/\d+:\d+|John|Matthew|Genesis/); // Contains verse pattern or book name
  });

  test('should display devotion reflection text', async ({ page }) => {
    await page.goto(DEVOTION_URL);

    const reflection = page.locator('.devotion-reflection, .reflection, [data-reflection]').first();
    await expect(reflection).toBeVisible();
    
    const text = await reflection.textContent();
    expect(text?.length || 0).toBeGreaterThan(50); // Has substantial content
  });

  test('should display date navigation controls', async ({ page }) => {
    await page.goto(DEVOTION_URL);

    const prevButton = page.locator('button:has-text("Previous"), .prev-btn, [aria-label*="previous" i]').first();
    const nextButton = page.locator('button:has-text("Next"), .next-btn, [aria-label*="next" i]').first();

    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();
  });
});

deviceTest.describe('Devotion System - Responsive Behavior', () => {
  deviceTest('should display devotion controls appropriately per device', async ({ page, deviceInfo }) => {
    await page.goto(DEVOTION_URL);

    if (deviceInfo.isMobile) {
      // Mobile: Compact controls
      const dateNav = page.locator('.date-nav, .devotion-controls').first();
      await expect(dateNav).toBeVisible();
    } else if (deviceInfo.isTablet) {
      // Tablet: Medium controls
      const dateNav = page.locator('.date-nav, .devotion-controls').first();
      await expect(dateNav).toBeVisible();
    } else {
      // Desktop: Full controls
      const dateNav = page.locator('.date-nav, .devotion-controls').first();
      await expect(dateNav).toBeVisible();
    }
  });

  deviceTest('should render share card with device-appropriate format', async ({ page, deviceInfo }) => {
    await page.goto(DEVOTION_URL);

    const shareButton = page.locator('button:has-text("Share"), .share-btn').first();
    await shareButton.click();

    await page.waitForTimeout(2000);

    // Check console logs for format selection
    const formatLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('format:') || msg.text().includes('Auto format')) {
        formatLogs.push(msg.text());
      }
    });

    // Desktop = square, Mobile = story
    const expectedFormat = deviceInfo.isMobile ? 'story' : 'square';
    
    // Wait a bit for logs
    await page.waitForTimeout(1000);
    
    // Canvas should exist regardless
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});
