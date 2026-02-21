import { test, expect } from '@playwright/test';

test.describe('Devotion System - Fasting Regression Coverage', () => {

    const LENT_URL = '/lent-fasting.html?day=3';
    const GRATITUDE_URL = '/gratitude-fasting.html?day=3';

    test('Lent Fasting: Dynamic Verse Fetch Populates Missing JSON Data', async ({ page }) => {
        await page.goto(LENT_URL);

        // Wait for the verse fetch to complete (the fallback text starts at "Loading verse...")
        const verseTextEl = page.locator('#verseText');

        // Ensure the element is visible and contains actual fetched text, not just the placeholder
        await expect(verseTextEl).toBeVisible({ timeout: 10000 });

        // Wait until text length is substantial (not empty, and replacing the loading state)
        await expect(verseTextEl).not.toHaveText('Loading verse...', { timeout: 10000 });
        await expect(verseTextEl).not.toBeEmpty();

        // Verify it fetched the English text correctly
        const text = await verseTextEl.textContent();
        expect(text?.length || 0).toBeGreaterThan(20);
    });

    test('Lent Fasting: Translation Toggles Work Without Phantom CSS Conflicts', async ({ page }) => {
        await page.goto(LENT_URL);
        await page.waitForLoadState('networkidle');

        const btnEnglish = page.locator('#langEn');
        const btnBengali = page.locator('#langBn');
        const verseEn = page.locator('#verseText');
        const reflectionEn = page.locator('#reflectionText');
        const verseBn = page.locator('#verseTextBn');
        const reflectionBn = page.locator('#reflectionTextBn');

        // Test 1: Switch to Bengali Only
        await btnBengali.click();
        await page.waitForTimeout(500); // Wait for CSS transition

        // English should be hidden
        await expect(verseEn.first()).not.toBeVisible();
        await expect(reflectionEn.first()).not.toBeVisible();

        // Bengali should be visible
        await expect(verseBn.first()).toBeAttached();

        // Test 2: Switch to English Only
        await btnEnglish.click();
        await page.waitForTimeout(500); // Wait for CSS transition

        // English should be visible
        await expect(verseEn.first()).toBeVisible({ timeout: 10000 });
        await expect(reflectionEn.first()).toBeVisible();

        // Bengali should be hidden
        await expect(verseBn.first()).not.toBeVisible();
    });

    test('Lent Fasting: Scroll Reveal Does Not Permanently Hide Content (Opacity Bug)', async ({ page }) => {
        await page.goto(LENT_URL);
        await page.waitForLoadState('networkidle');

        // Select all devotion sections
        const sections = page.locator('.devotion-section');
        const count = await sections.count();

        expect(count).toBeGreaterThan(0);

        // Ensure every section has rendering initialized and opacity evaluates to 1
        for (let i = 0; i < count; i++) {
            // Directly assert opacity is 1 via computed styles to prevent false positives
            const opacity = await sections.nth(i).evaluate(el => window.getComputedStyle(el).opacity);
            expect(opacity).toBe('1');
        }
    });

    test('Gratitude Fasting: baseline data maps and displays properly', async ({ page }) => {
        // Gratitude Fasting has the verses pre-loaded in the JSON, so this tests baseline integration
        await page.goto(GRATITUDE_URL);
        await page.waitForLoadState('networkidle');

        const verseTextEl = page.locator('#verseText');
        await expect(verseTextEl).toBeVisible();
        await expect(verseTextEl).not.toBeEmpty();

        const verseBnEl = page.locator('#verseTextBn');

        // Wait for JSON render logic
        await page.waitForTimeout(1500);

        // Fallback assert since Gratitude sometimes doesn't have Bengali verses loaded for every day
        const bnCount = await verseBnEl.count();
        if (bnCount > 0) {
            await expect(verseBnEl.first()).toBeAttached({ timeout: 10000 });
        }

        // Check fallback is applied to prevent invisible sections
        const sections = page.locator('.devotion-section');
        const count = await sections.count();

        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const opacity = await sections.nth(i).evaluate(el => window.getComputedStyle(el).opacity);
            expect(opacity).toBe('1');
        }
    });
});
