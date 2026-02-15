import { test, expect } from '@playwright/test';
import { pageRegistry, htmlPageCount } from '../pages/page-registry';

test.describe('HTML Pages POM Smoke Coverage', () => {
  test('registry is populated', async () => {
    expect(htmlPageCount).toBeGreaterThan(0);
  });

  for (const entry of pageRegistry) {
    test(`${entry.htmlPath} loads via ${entry.className}`, async ({ page }) => {
      const pom = entry.create(page);
      const response = await pom.goto();

      if (response) {
        expect(response.ok(), `Expected HTTP success for ${entry.htmlPath}`).toBeTruthy();
      }

      await pom.assertCoreReady({ requireTitle: entry.isFullDocument });
      await pom.assertUrlPath();
    });
  }
});
