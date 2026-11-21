import { test, expect } from '@playwright/test';

test('Lent shared query language takes precedence over its legacy saved language', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gpbc-lent-lang', 'bn');
    localStorage.setItem('gpbc-lent-visited-2026', '1');
  });
  await page.goto('/lent-fasting.html?lang=en&day=3');
  await expect(page.locator('#devotionTopic')).not.toBeEmpty();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#langEn')).toHaveClass(/active/);
  await expect(page.locator('#devotionTopic')).toBeVisible();
  await expect(page.locator('#devotionTopicBn')).toBeHidden();
});

test('Lent has independently annotated English and Bengali regions under its English UI', async ({ page }) => {
  await page.goto('/lent-fasting.html?day=3');
  await expect(page.locator('#devotionTopic')).not.toBeEmpty({ timeout: 15000 });
  await expect(page.locator('#devotionTopic')).toHaveJSProperty('tagName', 'H2');
  await expect(page.locator('main')).toHaveAttribute('lang', 'en');
  for (const id of ['devotionTopicBn', 'verseTextBn', 'verseRefBn', 'reflectionTextBn', 'prayerTextBn', 'promiseTextBn']) {
    await expect(page.locator('#' + id)).toHaveAttribute('lang', 'bn');
  }
  await expect(page.locator('#devotionTopic')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#heroWeekTheme [lang="bn"]')).not.toBeEmpty();
  await expect(page.locator('#heroWeekTheme [lang="en"]')).not.toBeEmpty();
  await expect(page.locator('#langBn')).toHaveAttribute('lang', 'bn');
});

test('Gratitude annotates translated content, English fallback and subsequent switching', async ({ page }) => {
  await page.goto('/gratitude-fasting.html?day=3');
  await expect(page.locator('#devotionTopic')).not.toBeEmpty();
  await page.locator('#langBn').click();
  for (const id of ['devotionTopic', 'verseText', 'reflectionText', 'prayerText', 'promiseText']) {
    await expect(page.locator('#' + id)).toHaveAttribute('lang', 'bn');
  }
  expect(await page.locator('#devotionDate').evaluate(node => node.closest('[lang]')?.getAttribute('lang'))).toBe('en');
  await page.locator('#langEn').click();
  await expect(page.locator('#devotionTopic')).toHaveAttribute('lang', 'en');
  await page.locator('#langBn').click();
  await page.evaluate('updateContent({ day: 3, date: "2026-11-03", topicBn: "", keyVerseTextBn: "English fallback", reflectionBn: "", prayerBn: "", biblePromiseBn: "" })');
  await expect(page.locator('#verseText')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#verseText')).toHaveText('English fallback');
  await expect(page.locator('#devotionTopic')).toHaveAttribute('lang', 'en');
});
