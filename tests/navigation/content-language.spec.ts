import { test, expect } from '@playwright/test';

for (const route of ['index.html', 'daily-devotion.html']) {
  test(`${route} keeps English skip controls English in Bengali mode`, async ({ page }) => {
    await page.goto('/' + route + '?lang=bn');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page.locator('a.skip-link').first()).toHaveAttribute('lang', 'en');
    await page.evaluate(() => {
      for (const variant of ['v2-skip-link', 'sr-only', 'sr-only-focusable']) {
        const link = document.createElement('a');
        link.className = variant;
        link.href = '#main-content';
        link.textContent = 'Skip to main content';
        document.body.prepend(link);
      }
      const bengali = document.createElement('a');
      bengali.className = 'skip-link explicit-bengali-skip';
      bengali.lang = 'bn';
      bengali.href = '#main-content';
      bengali.textContent = 'মূল বিষয়বস্তুতে যান';
      document.body.prepend(bengali);
    });
    for (const variant of ['v2-skip-link', 'sr-only', 'sr-only-focusable']) {
      await expect(page.locator('a.' + variant).first()).toHaveAttribute('lang', 'en');
    }
    await expect(page.locator('.explicit-bengali-skip')).toHaveAttribute('lang', 'bn');
  });
}

test('Bible Reader labels Bengali names and passages without relabeling English UI', async ({ page }) => {
  await page.goto('/bible-reader.html?lang=bn');
  await expect(page.locator('#site-header [data-site-language]')).toHaveCount(2);
  await expect(page.locator('[data-site-language]')).toHaveCount(2);
  await expect(page.locator('#atlasView .site-language-row')).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.book-name-bn').first()).toHaveAttribute('lang', 'bn');
  await expect(page.locator('.book-name').first()).toHaveAttribute('lang', 'en');
  await expect(page.locator('small[lang="bn"]').first()).toContainText('পবিত্র');
  await page.evaluate(async () => {
    (window as any).GPBCBibleService = { getPassage: async (reference: string, language: string) => ({
      verses: [{ verse: 1, text: language === 'bn' ? 'আদিতে ঈশ্বর আকাশমণ্ডল ও পৃথিবী সৃষ্টি করিলেন।' : 'In the beginning God created the heavens and the earth.' }]
    }) };
  });
  await page.locator('.book-card').first().click();
  await page.locator('.chapter-node').first().click();
  await expect(page.locator('#selectedBookName [lang="bn"]')).toHaveText('আদিপুস্তক');
  await expect(page.locator('.verse-text-bn').first()).toHaveAttribute('lang', 'bn');
  await expect(page.locator('.verse-text-en').first()).toHaveAttribute('lang', 'en');
  await page.evaluate(() => {
    (window as any).GPBCBibleService.getPassage = async () => { throw new Error('Fixture load error'); };
  });
  await page.evaluate('app.renderReader()');
  await expect(page.locator('.verse-error')).toContainText('could not be loaded');
  expect(await page.locator('.verse-error').evaluate(node => node.closest('[lang]')?.getAttribute('lang'))).toBe('en');
});
