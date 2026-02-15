import { test, expect } from '@playwright/test';
import { test as deviceTest } from '../fixtures/device.fixture';

test.describe('Share Card - Format Switching', () => {
  
  test('should switch from square to story format', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    // Open share modal
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(1000);
    
    // Wait for canvas to render
    const canvas = page.locator('canvas#share-canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    
    // Click story format button
    const storyBtn = page.locator('button:has-text("Story"), .format-btn[data-format="story"]').first();
    if (await storyBtn.isVisible()) {
      await storyBtn.click();
      await page.waitForTimeout(1500);
      
      // Check canvas dimensions changed
      const dimensions = await canvas.evaluate((el: HTMLCanvasElement) => ({
        width: el.width,
        height: el.height
      }));
      
      // Story format should be 1080x1920 (portrait)
      expect(dimensions.height).toBeGreaterThan(dimensions.width);
    }
  });
  
  test('should switch from story to square format', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas#share-canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    
    // Click story format first
    const storyBtn = page.locator('button:has-text("Story")').first();
    if (await storyBtn.isVisible()) {
      await storyBtn.click();
      await page.waitForTimeout(1500);
      
      // Switch back to square
      const squareBtn = page.locator('button:has-text("Square"), .format-btn[data-format="square"]').first();
      await squareBtn.click();
      await page.waitForTimeout(1500);
      
      const dimensions = await canvas.evaluate((el: HTMLCanvasElement) => ({
        width: el.width,
        height: el.height
      }));
      
      // Square format should be 1080x1080
      expect(dimensions.width).toBe(dimensions.height);
    }
  });
  
  deviceTest('should default to story format on mobile', async ({ page, deviceInfo }) => {
    deviceTest.skip(!deviceInfo.isMobile, 'Story default is mobile-only');
    
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(2000);
    
    const canvas = page.locator('canvas#share-canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    
    const dimensions = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height
    }));
    
    // Mobile should default to story (portrait)
    expect(dimensions.height).toBeGreaterThanOrEqual(dimensions.width);
  });
  
});

test.describe('Share Card - Download Functionality', () => {
  
  test('should trigger download on download button click', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(2000);
    
    // Wait for canvas to be ready
    const canvas = page.locator('canvas#share-canvas');
    await expect(canvas).toBeVisible();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    
    // Click download button
    const downloadBtn = page.locator('button:has-text("Download"), .download-btn, [download]').first();
    await downloadBtn.click();
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/devotion.*\.(png|jpg|jpeg)/i);
  });
  
  test('should download with correct filename format', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(2000);
    
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    
    const downloadBtn = page.locator('button:has-text("Download"), .download-btn').first();
    await downloadBtn.click();
    
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    
    // Filename should include date or "devotion" or "gpbc"
    expect(filename.toLowerCase()).toMatch(/devotion|gpbc|share|2026/);
  });
  
});

test.describe('Share Card - One-Tap Share', () => {
  
  test('should have share button visible', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await expect(shareBtn).toBeVisible();
    
    // Button should be clickable
    await expect(shareBtn).toBeEnabled();
  });
  
  test('should open modal on share button click', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    
    // Modal should appear within 2 seconds
    const modal = page.locator('.share-card-modal, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 2000 });
  });
  
  test('should close modal without errors', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(1000);
    
    // Track console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Close modal
    const closeBtn = page.locator('.close-btn, button[aria-label*="close" i]').first();
    await closeBtn.click();
    await page.waitForTimeout(500);
    
    // No errors should occur
    expect(errors.length).toBe(0);
  });
  
});

test.describe('Share Card - SMS Share Export', () => {
  
  test('should generate canvas data URL for SMS export', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(2000);
    
    // Check if canvas can be exported as data URL
    const dataUrl = await page.evaluate(() => {
      const canvas = document.querySelector('canvas#share-canvas') as HTMLCanvasElement;
      if (!canvas) return null;
      
      try {
        return canvas.toDataURL('image/png');
      } catch (e) {
        return null;
      }
    });
    
    expect(dataUrl).toBeTruthy();
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
  
  test('should have proper canvas CORS settings', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(2000);
    
    // Check if images used in canvas have crossOrigin set
    const corsCheck = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img[src*="backgrounds"]'));
      return images.map((img: Element) => {
        const htmlImg = img as HTMLImageElement;
        return {
          src: htmlImg.src,
          crossOrigin: htmlImg.crossOrigin
        };
      });
    });
    
    // Background images should have crossOrigin for canvas export
    if (corsCheck.length > 0) {
      expect(corsCheck.some(img => img.crossOrigin === 'anonymous' || img.crossOrigin === '')).toBeTruthy();
    }
  });
  
});

test.describe('Share Card - Performance', () => {
  
  test('should render canvas within 3 seconds', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const startTime = Date.now();
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    
    // Wait for canvas to be fully rendered (non-blank)
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas#share-canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    
    // Check canvas is not blank
    const isRendered = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return false;
      
      const imageData = ctx.getImageData(0, 0, el.width, el.height);
      return imageData.data.some(pixel => pixel !== 0);
    });
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    expect(isRendered).toBeTruthy();
    expect(renderTime).toBeLessThan(3000); // Under 3 seconds
  });
  
  test('should not block UI during canvas rendering', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    
    // Try to interact with page while canvas renders
    await page.waitForTimeout(500);
    
    // Close button should still be clickable during render
    const closeBtn = page.locator('.close-btn, button[aria-label*="close" i]').first();
    const isClickable = await closeBtn.isEnabled();
    
    expect(isClickable).toBeTruthy();
  });
  
});
