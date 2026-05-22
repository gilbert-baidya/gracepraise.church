import { test as deviceTest, expect } from '../fixtures/device.fixture';
import type { Page } from '@playwright/test';

type ThemeMode = 'day' | 'dark';

const THEMES: ThemeMode[] = ['day', 'dark'];
const CRITICAL_ROUTES = [
  '/index.html',
  '/about.html',
  '/ministries.html',
  '/lent-fasting.html',
  '/daily-devotion.html'
];

async function waitForPageSettle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function applyTheme(page: Page, mode: ThemeMode): Promise<void> {
  await page.evaluate((themeMode) => {
    const dark = themeMode === 'dark';
    const themeValue = dark ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', themeValue);
    document.documentElement.classList.toggle('dark', dark);

    if (document.body) {
      document.body.setAttribute('data-theme', themeValue);
      document.body.classList.toggle('dark', dark);
      document.body.classList.toggle('homepage', document.body.classList.contains('homepage'));
    }

    if (typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem('theme', themeValue);
      window.localStorage.setItem('site-theme', themeValue);
    }

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeValue } }));
  }, mode);

  await page.waitForTimeout(300);
}

async function assertNoErrorPage(page: Page): Promise<void> {
  await expect(page).not.toHaveTitle(/Error response|404/i);
}

deviceTest.describe('Regression Matrix - All Devices x Day/Dark', () => {
  for (const theme of THEMES) {
    deviceTest(`Homepage countdown readability contract (${theme})`, async ({ page }) => {
      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      await applyTheme(page, theme);
      await waitForPageSettle(page);
      await assertNoErrorPage(page);

      await expect(page.locator('#nextEventBanner .next-event-banner')).toBeVisible({ timeout: 15000 });

      const countdownContract = await page.evaluate(() => {
        const parseRgba = (value: string): [number, number, number, number] | null => {
          const match = value.match(/rgba?\(([^)]+)\)/i);
          if (!match) return null;
          const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
          if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
          const alpha = parts.length >= 4 && !Number.isNaN(parts[3]) ? parts[3] : 1;
          return [parts[0], parts[1], parts[2], alpha];
        };

        const blend = (
          fg: [number, number, number, number],
          bg: [number, number, number, number]
        ): [number, number, number, number] => {
          const alpha = fg[3] + bg[3] * (1 - fg[3]);
          if (alpha <= 0) return [0, 0, 0, 0];
          const r = (fg[0] * fg[3] + bg[0] * bg[3] * (1 - fg[3])) / alpha;
          const g = (fg[1] * fg[3] + bg[1] * bg[3] * (1 - fg[3])) / alpha;
          const b = (fg[2] * fg[3] + bg[2] * bg[3] * (1 - fg[3])) / alpha;
          return [r, g, b, alpha];
        };

        const toLinear = (channel: number): number => {
          const normalized = channel / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };

        const luminance = (rgba: [number, number, number, number]): number =>
          0.2126 * toLinear(rgba[0]) + 0.7152 * toLinear(rgba[1]) + 0.0722 * toLinear(rgba[2]);

        const contrast = (
          fg: [number, number, number, number],
          bg: [number, number, number, number]
        ): number => {
          const l1 = luminance(fg);
          const l2 = luminance(bg);
          const lighter = Math.max(l1, l2);
          const darker = Math.min(l1, l2);
          return (lighter + 0.05) / (darker + 0.05);
        };

        const banner = document.querySelector('#nextEventBanner .next-event-banner') as HTMLElement | null;
        const timeUnit = document.querySelector('#nextEventBanner .time-unit') as HTMLElement | null;
        const timeValue = document.querySelector('#nextEventBanner .time-value') as HTMLElement | null;
        const timeLabel = document.querySelector('#nextEventBanner .time-label') as HTMLElement | null;
        const liveBadge = document.querySelector('#nextEventBanner .live-badge') as HTMLElement | null;

        if (!banner) {
          return {
            hasBanner: false,
            hasCountdown: false,
            hasLiveBadge: false
          };
        }

        if (!timeUnit || !timeValue || !timeLabel) {
          return {
            hasBanner: true,
            hasCountdown: false,
            hasLiveBadge: !!liveBadge
          };
        }

        const bannerBg =
          parseRgba(window.getComputedStyle(banner).backgroundColor) ||
          parseRgba(window.getComputedStyle(document.body).backgroundColor) ||
          [255, 255, 255, 1];

        const timeUnitBgRaw =
          parseRgba(window.getComputedStyle(timeUnit).backgroundColor) || [255, 255, 255, 1];
        const timeUnitBg = blend(timeUnitBgRaw, bannerBg);

        const valueColor = parseRgba(window.getComputedStyle(timeValue).color) || [0, 0, 0, 1];
        const labelColor = parseRgba(window.getComputedStyle(timeLabel).color) || [0, 0, 0, 1];

        return {
          hasBanner: true,
          hasCountdown: true,
          hasLiveBadge: false,
          valueColor: window.getComputedStyle(timeValue).color,
          labelColor: window.getComputedStyle(timeLabel).color,
          timeUnitBg: window.getComputedStyle(timeUnit).backgroundColor,
          valueContrast: contrast(valueColor, timeUnitBg),
          labelContrast: contrast(labelColor, timeUnitBg)
        };
      });

      expect(countdownContract.hasBanner).toBeTruthy();

      if (!countdownContract.hasCountdown) {
        expect(countdownContract.hasLiveBadge).toBeTruthy();
        return;
      }

      expect(countdownContract.valueContrast).toBeGreaterThanOrEqual(4.5);
      expect(countdownContract.labelContrast).toBeGreaterThanOrEqual(4.5);
    });

    deviceTest(`Navigation integrity contract (${theme})`, async ({ page, deviceInfo }) => {
      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      await applyTheme(page, theme);
      await waitForPageSettle(page);
      await assertNoErrorPage(page);

      if (deviceInfo.isDesktop) {
        const desktopLabels = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.nav-links > li > a'))
            .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        );

        expect(desktopLabels.length).toBeGreaterThan(4);
        expect(desktopLabels.some((text) => /^Devotion\b/i.test(text))).toBeTruthy();
        expect(desktopLabels.some((text) => /^Give\b/i.test(text))).toBeTruthy();
        return;
      }

      const burgerButton = page
        .locator(
          '.mobile-menu-btn, .mobile-menu-toggle, .burger-menu-btn, .burger-button, button[aria-label*="menu" i]'
        )
        .first();

      await expect(burgerButton).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.nav-links.mobile-open')).toHaveCount(0);

      await burgerButton.click();
      await page.waitForTimeout(250);
      await expect(page.locator('.nav-links.mobile-open')).toBeVisible();

      const mobileLabels = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.nav-links > li > a'))
          .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
      );

      expect(mobileLabels.some((text) => /^Devotion\b/i.test(text))).toBeTruthy();
      expect(mobileLabels.some((text) => /^Give\b/i.test(text))).toBeTruthy();

      await burgerButton.click();
      await page.waitForTimeout(250);
      await expect(page.locator('.nav-links.mobile-open')).toHaveCount(0);
    });

    deviceTest(`Critical page render contract (${theme})`, async ({ page }) => {
      for (const route of CRITICAL_ROUTES) {
        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
        if (response) {
          expect(response.status(), `${route} should not be an HTTP error`).toBeLessThan(400);
        }

        await applyTheme(page, theme);
        await waitForPageSettle(page);
        await assertNoErrorPage(page);
        await expect(page.locator('body')).toBeVisible();

        if (route === '/daily-devotion.html') {
          await expect(page.locator('#bibleReference')).toBeVisible({ timeout: 15000 });
          await expect(page.locator('#bibleText')).toBeVisible({ timeout: 15000 });

          const devotionPayload = await page.evaluate(() => ({
            bibleReferenceLength: (document.getElementById('bibleReference')?.textContent || '').trim().length,
            bibleTextLength: (document.getElementById('bibleText')?.textContent || '').trim().length,
            reflectionLength: (document.getElementById('reflectionText')?.textContent || '').trim().length,
            prayerLength: (document.getElementById('prayerText')?.textContent || '').trim().length
          }));

          expect(devotionPayload.bibleReferenceLength).toBeGreaterThan(2);
          expect(devotionPayload.bibleTextLength).toBeGreaterThan(2);
          expect(devotionPayload.reflectionLength).toBeGreaterThan(20);
          expect(devotionPayload.prayerLength).toBeGreaterThan(10);
        }
      }
    });
  }
});
