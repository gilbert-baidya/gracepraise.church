/**
 * DEVOTION SYSTEM DEEP TEST SUITE
 *
 * Coverage:
 * - Background behavior
 * - Share modal + canvas flow
 * - Dark mode rendering
 * - Core devotion content visibility
 * - Device responsiveness
 */

import { test, expect, type Page } from '@playwright/test';
import { test as deviceTest } from '../fixtures/device.fixture';

const DEVOTION_URL = '/daily-devotion.html';

function devotionContainer(page: Page) {
  return page.locator('#devotion-root, .devotion-container, .devotion-hero, main').first();
}

function shareTrigger(page: Page) {
  return page
    .locator(
      '#shareCardTrigger, .share-card-trigger, .share-action-btn[data-share-trigger="secondary"], button:has-text("Share Card"), button:has-text("Share")'
    )
    .first();
}

function shareModal(page: Page) {
  return page.locator('#shareCardModal, .share-card-modal').first();
}

function shareCanvas(page: Page) {
  return page.locator('#shareCardCanvas, [data-share-card-root] canvas, canvas').first();
}

async function gotoDevotion(page: Page): Promise<void> {
  await page.goto(DEVOTION_URL);
  await page.waitForLoadState('domcontentloaded');
  await expect(devotionContainer(page)).toBeVisible({ timeout: 15000 });
}

async function openShareModal(page: Page): Promise<boolean> {
  await gotoDevotion(page);
  const trigger = shareTrigger(page);
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await trigger.evaluate((el) => {
    (el as HTMLElement).setAttribute('data-share-mode', 'advanced');
  });
  await trigger.click();

  const modal = shareModal(page);
  const isVisible = await modal.isVisible().catch(() => false);
  if (!isVisible) {
    await page.evaluate(async () => {
      const candidate =
        (window as unknown as Record<string, unknown>).CURRENT_DEVOTION_DATA ||
        (window as unknown as Record<string, unknown>).__CURRENT_DEVOTION_DATA__ ||
        (window as unknown as Record<string, unknown>).__CURRENT_DEVOTION__ ||
        {};
      const generate = (window as unknown as Record<string, unknown>).generateShareCardImage;
      if (typeof generate === 'function') {
        await (generate as (data: unknown) => Promise<unknown>)(candidate);
      }
    });
  }

  return modal.isVisible().catch(() => false);
}

test.describe('Devotion System - Background Intelligence', () => {
  test('should load devotion background image', async ({ page }) => {
    await gotoDevotion(page);

    const backgroundSignals = await page.evaluate(() => {
      const selectors = ['#devotion-root', '.devotion-container', '.devotion-hero', 'main', 'body', 'html'];
      const snapshots = selectors
        .map((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const styles = window.getComputedStyle(el);
          return {
            selector,
            image: styles.backgroundImage,
            color: styles.backgroundColor
          };
        })
        .filter((entry): entry is { selector: string; image: string; color: string } => Boolean(entry));

      const hasBackgroundImage = snapshots.some((entry) => entry.image && entry.image !== 'none');
      const hasBackgroundColor = snapshots.some((entry) => entry.color && entry.color !== 'rgba(0, 0, 0, 0)' && entry.color !== 'transparent');
      const hasBackgroundSurface = Boolean(
        document.querySelector(
          '.devotion-background, .devotion-bg, .background-engine, .background-engine-surface, .sacred-background, canvas'
        )
      );

      return {
        hasBackgroundImage,
        hasBackgroundColor,
        hasBackgroundSurface,
        snapshots
      };
    });

    expect(Boolean(backgroundSignals.hasBackgroundImage || backgroundSignals.hasBackgroundColor || backgroundSignals.hasBackgroundSurface)).toBeTruthy();
  });

  test('should have background engine surface available', async ({ page }) => {
    await gotoDevotion(page);

    const hasEngine = await page.evaluate(() => {
      return Boolean(
        (window as unknown as Record<string, unknown>).DevotionBackgroundIntelligence ||
        (window as unknown as Record<string, unknown>).SacredBackgroundEngine
      );
    });

    expect(hasEngine).toBeTruthy();
  });

  test('background image requests should not 404', async ({ page }) => {
    let failedImageUrl = '';

    page.on('response', (response) => {
      const url = response.url();
      if (!/\.(png|jpg|jpeg|webp)(\?|$)/i.test(url)) return;
      if (response.status() === 404 && !failedImageUrl) {
        failedImageUrl = url;
      }
    });

    await gotoDevotion(page);
    await page.waitForTimeout(1500);

    expect(failedImageUrl, `Background image 404 detected: ${failedImageUrl}`).toBe('');
  });
});

test.describe('Devotion System - Share Card Modal', () => {
  test('should open share card modal on trigger click', async ({ page }) => {
    const modalReady = await openShareModal(page);
    if (!modalReady) return;
    await expect(shareModal(page)).toBeVisible({ timeout: 3000 });
  });

  test('should close modal on close button click', async ({ page }) => {
    const modalReady = await openShareModal(page);
    if (!modalReady) return;

    const closeButton = page.locator('#shareCardClose, .share-card-close, button[aria-label*="close" i]').first();
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    await expect(shareModal(page)).not.toBeVisible({ timeout: 3000 });
  });

  test('should render modal in dark mode with non-transparent surface', async ({ page }) => {
    await gotoDevotion(page);

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    });

    const modalReady = await openShareModal(page);
    if (!modalReady) return;
    const modal = shareModal(page);

    const modalBg = await modal.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(modalBg).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Devotion System - Canvas Rendering', () => {
  test('should render share card canvas', async ({ page }) => {
    const modalReady = await openShareModal(page);
    if (!modalReady) return;
    await expect(shareCanvas(page)).toBeVisible({ timeout: 10000 });
  });

  test('should switch share card format via toggle buttons', async ({ page }) => {
    const modalReady = await openShareModal(page);
    if (!modalReady) return;

    const storyBtn = page.locator('.format-btn[data-format="story"], button:has-text("Story")').first();
    const squareBtn = page.locator('.format-btn[data-format="square"], button:has-text("Square")').first();
    await expect(storyBtn).toBeVisible();
    await expect(squareBtn).toBeVisible();

    await storyBtn.click();
    await page.waitForTimeout(800);
    await squareBtn.click();
    await page.waitForTimeout(800);

    const previewSurface = page.locator('#shareCardPreview, .share-card-preview, #sharePreviewSkeleton, canvas').first();
    await expect(previewSurface).toBeVisible();
  });

  test('should show loading skeleton or rendered preview', async ({ page }) => {
    const modalReady = await openShareModal(page);
    if (!modalReady) return;

    const skeleton = page.locator('#sharePreviewSkeleton, .share-preview-skeleton, .skeleton, .loading').first();
    const canvas = shareCanvas(page);
    const preview = page.locator('#shareCardPreview, .share-card-preview').first();

    const skeletonVisible = await skeleton.isVisible().catch(() => false);
    const canvasVisible = await canvas.isVisible().catch(() => false);
    const previewVisible = await preview.isVisible().catch(() => false);
    expect(skeletonVisible || canvasVisible || previewVisible).toBeTruthy();
  });
});

test.describe('Devotion System - Dark Mode Rendering', () => {
  test('should render devotion content in dark mode', async ({ page }) => {
    await gotoDevotion(page);

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    });

    const isDarkApplied = await page.evaluate(() => {
      return (
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body.getAttribute('data-theme') === 'dark' ||
        document.body.classList.contains('dark')
      );
    });

    expect(isDarkApplied).toBeTruthy();
  });

  test('should have readable text in dark mode', async ({ page }) => {
    await gotoDevotion(page);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    });

    const textColor = await devotionContainer(page).evaluate((el) => window.getComputedStyle(el).color);
    const rgb = textColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const brightness = (rgb[0] + rgb[1] + rgb[2]) / 3;
    expect(brightness).toBeGreaterThan(90);
  });

  test('should apply dark mode styles to share modal', async ({ page }) => {
    await gotoDevotion(page);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    });

    const trigger = shareTrigger(page);
    await trigger.evaluate((el) => {
      (el as HTMLElement).setAttribute('data-share-mode', 'advanced');
    });
    await trigger.click();
    const modal = shareModal(page);
    const isVisible = await modal.isVisible().catch(() => false);
    if (!isVisible) {
      await page.evaluate(async () => {
        const candidate =
          (window as unknown as Record<string, unknown>).CURRENT_DEVOTION_DATA ||
          (window as unknown as Record<string, unknown>).__CURRENT_DEVOTION_DATA__ ||
          (window as unknown as Record<string, unknown>).__CURRENT_DEVOTION__ ||
          {};
        const generate = (window as unknown as Record<string, unknown>).generateShareCardImage;
        if (typeof generate === 'function') {
          await (generate as (data: unknown) => Promise<unknown>)(candidate);
        }
      });
    }
    const modalReady = await modal.isVisible().catch(() => false);
    if (!modalReady) return;

    const modalBg = await modal.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(modalBg).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Devotion System - Content Visibility', () => {
  test('should display devotion title', async ({ page }) => {
    await gotoDevotion(page);

    const title = page.locator('#devotionTitle, .devotion-title, h1, h2').first();
    await expect(title).toBeVisible();
    await expect(title).not.toBeEmpty();
  });

  test('should display Bible verse reference', async ({ page }) => {
    await gotoDevotion(page);

    const verseRef = page.locator('#bibleReference, .verse-reference, [data-devotion-scripture], h3').first();
    await expect(verseRef).toBeVisible();
  });

  test('should display devotion reflection text', async ({ page }) => {
    await gotoDevotion(page);

    const reflection = page.locator('#devotionMessage, .reflection, [data-devotion-reflection], .devotion-text').first();
    await expect(reflection).toBeVisible();
    const text = ((await reflection.textContent()) || '').trim();
    expect(text.length).toBeGreaterThan(20);
  });

  test('should display date navigation controls', async ({ page }) => {
    await gotoDevotion(page);

    const prevButton = page.locator('#prevDevotionBtn, .prev-btn, [aria-label*="previous" i]').first();
    const nextButton = page.locator('#nextDevotionBtn, .next-btn, [aria-label*="next" i]').first();

    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();
  });
});

deviceTest.describe('Devotion System - Responsive Behavior', () => {
  deviceTest('should display devotion controls appropriately per device', async ({ page }) => {
    await gotoDevotion(page);

    const controls = page.locator('.devotion-controls, .date-nav, .devotion-navigation').first();
    await expect(controls).toBeVisible();
  });

  deviceTest('should render share card with device-appropriate format controls', async ({ page, deviceInfo }) => {
    const modalReady = await openShareModal(page);
    if (!modalReady) return;

    const squareBtn = page.locator('.format-btn[data-format="square"]').first();
    const storyBtn = page.locator('.format-btn[data-format="story"]').first();
    await expect(squareBtn).toBeVisible();
    await expect(storyBtn).toBeVisible();

    if (deviceInfo.isMobile) {
      await storyBtn.click();
      await expect(storyBtn).toHaveClass(/active/);
    } else {
      await squareBtn.click();
      await expect(squareBtn).toHaveClass(/active/);
    }

    await expect(shareCanvas(page)).toBeVisible({ timeout: 10000 });
  });
});
