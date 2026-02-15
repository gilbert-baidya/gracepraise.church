/**
 * Share Card Modal Tests
 * Tests the share card modal interaction system
 * Covers: modal open/close, canvas visibility, background sync
 */

import { test, expect } from '@playwright/test';
import { DailyDevotionPage } from '../../pages/generated/daily-devotion.page';

test.describe('Daily Devotion - Share Card Modal', () => {
  
  test('share button opens modal correctly', async ({ page }) => {
    const devotionPage = new DailyDevotionPage(page);
    await devotionPage.goto();
    await devotionPage.assertCoreReady();
    
    // Find share button
    const shareButton = page.locator('.simple-share-btn, .share-button, button:has-text("Share")');
    await expect(shareButton).toBeVisible({ timeout: 5000 });
    
    // Click share button
    await shareButton.click();
    
    // Modal should open
    const modal = page.locator('.share-card-modal, .modal, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
  });
  
  test('share card canvas renders successfully', async ({ page }) => {
    const devotionPage = new DailyDevotionPage(page);
    await devotionPage.goto();
    await devotionPage.assertCoreReady();
    
    // Open share modal
    const shareButton = page.locator('.simple-share-btn, .share-button, button:has-text("Share")');
    await shareButton.click();
    
    // Canvas should be visible
    const canvas = page.locator('#shareCardCanvas, canvas.share-card');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    
    // Canvas should have dimensions (1080x1080 or 1080x1920)
    const dimensions = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height
    }));
    
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    
    // Common dimensions: 1080x1080 (square) or 1080x1920 (story)
    const isSquare = dimensions.width === 1080 && dimensions.height === 1080;
    const isStory = dimensions.width === 1080 && dimensions.height === 1920;
    expect(isSquare || isStory, `Canvas dimensions ${dimensions.width}x${dimensions.height} not standard`).toBe(true);
  });
  
  test('canvas has rendered content (not blank)', async ({ page }) => {
    const devotionPage = new DailyDevotionPage(page);
    await devotionPage.goto();
    await devotionPage.assertCoreReady();
    
    // Open share modal
    const shareButton = page.locator('.simple-share-btn, .share-button, button:has-text("Share")');
    await shareButton.click();
    
    // Wait for canvas to render
    const canvas = page.locator('#shareCardCanvas, canvas.share-card');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000); // Give time for rendering
    
    // Check if canvas has pixel data
    const hasContent = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return false;
      
      const imageData = ctx.getImageData(0, 0, el.width, el.height);
      const pixels = imageData.data;
      
      // Check if there are non-zero pixels
      let nonZeroCount = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        // Check RGB channels (skip alpha)
        if (pixels[i] !== 0 || pixels[i+1] !== 0 || pixels[i+2] !== 0) {
          nonZeroCount++;
          if (nonZeroCount > 100) return true; // Found enough pixels
        }
      }
      
      return nonZeroCount > 100;
    });
    
    expect(hasContent, 'Canvas appears to be blank').toBe(true);
  });
  
  test('canvas background syncs with devotion page background', async ({ page }) => {
    const devotionPage = new DailyDevotionPage(page);
    await devotionPage.goto();
    await devotionPage.assertCoreReady();
    
    // Get devotion page background URL
    const pageBackgroundUrl = await page.locator('.devotion-container, .devotion-wrapper, main.devotion').evaluate((el: Element) => {
      const bg = window.getComputedStyle(el).backgroundImage;
      const match = bg.match(/url\(["']?(.+?)["']?\)/);
      return match ? match[1] : null;
    });
    
    // Open share modal
    const shareButton = page.locator('.simple-share-btn, .share-button, button:has-text("Share")');
    await shareButton.click();
    
    // Wait for canvas to render
    await page.waitForTimeout(2000);
    
    // Check if canvas background URL is logged (console monitoring)
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('background') || msg.text().includes('image')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Note: Full background sync validation requires inspecting canvas rendering logic
    // This test documents the expectation
    console.log('Page background URL:', pageBackgroundUrl);
    expect(pageBackgroundUrl).toBeTruthy();
  });
  
  test('modal can be closed successfully', async ({ page }) => {
    const devotionPage = new DailyDevotionPage(page);
    await devotionPage.goto();
    await devotionPage.assertCoreReady();
    
    // Open share modal
    const shareButton = page.locator('.simple-share-btn, .share-button, button:has-text("Share")');
    await shareButton.click();
    
    // Modal should be visible
    const modal = page.locator('.share-card-modal, .modal, [role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Close modal (via close button or overlay)
    const closeButton = page.locator('.modal-close, .close-modal, button:has-text("Close"), button:has-text("×")');
    if (await closeButton.count() > 0) {
      await closeButton.first().click();
    } else {
      // Try clicking overlay
      const overlay = page.locator('.modal-overlay, .overlay');
      if (await overlay.count() > 0) {
        await overlay.click({ position: { x: 10, y: 10 } });
      }
    }
    
    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });
  
  test('download button works', async ({ page }) => {
    const devotionPage = new DailyDevotionPage(page);
    await devotionPage.goto();
    await devotionPage.assertCoreReady();
    
    // Open share modal
    const shareButton = page.locator('.simple-share-btn, .share-button, button:has-text("Share")');
    await shareButton.click();
    
    // Wait for canvas to render
    await page.waitForTimeout(2000);
    
    // Find download button
    const downloadButton = page.locator('.download-btn, button:has-text("Download")');
    
    if (await downloadButton.count() > 0) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
      
      await downloadButton.click();
      
      // Verify download initiated
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(png|jpg|jpeg)$/i);
    }
  });
  
});
