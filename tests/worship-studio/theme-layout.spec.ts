import { expect, test } from '@playwright/test';

for (const width of [1920, 1440, 834, 390]) {
  test(`Style & export has padded, aligned controls at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 720 ? 844 : 1080 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/worship-studio/');
    await expect(page.locator('#catalogCount')).toContainText('1,492');
    const toolbar = page.locator('.theme-export-toolbar');
    await expect(page.getByLabel('Theme', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Show section labels', { exact: true })).toBeChecked();
    const layout = await toolbar.evaluate(card => {
      const box = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          width: rect.width, height: rect.height };
      };
      const required = (selector: string) => {
        const element = card.querySelector(selector);
        if (!element) throw new Error(`Missing Style & export element: ${selector}`);
        return element;
      };
      const bounds = box(card);
      const select = box(required('#themeSelector'));
      const option = box(required('.section-label-setting'));
      const checkbox = box(required('#showSectionLabels'));
      const label = box(required('.section-label-setting span'));
      const heading = box(required('h2'));
      const buttons = [...card.querySelectorAll('.export-actions button')].map(box);
      const text = [...card.querySelectorAll('.helper-text, .save-status')]
        .filter(element => box(element).height > 0).map(box);
      return { bounds, heading, select, option, checkbox, label, buttons, text,
        padding: getComputedStyle(card).paddingLeft,
        referencePadding: getComputedStyle(document.querySelector('.catalog-panel')!).paddingLeft,
        children: [...card.children].filter(element => box(element).height > 0).map(box),
        checkboxLabel: (required('#showSectionLabels') as HTMLInputElement).labels?.[0]?.textContent,
        selectAppearance: getComputedStyle(required('#themeSelector')).appearance,
        checkboxStyle: getComputedStyle(required('.section-label-setting span')).whiteSpace };
    });
    expect(layout.padding).toBe(layout.referencePadding);
    expect(layout.heading.left - layout.bounds.left).toBeGreaterThanOrEqual(24);
    for (const child of layout.children) {
      expect(child.left).toBeGreaterThanOrEqual(layout.heading.left - 1);
      expect(child.right).toBeLessThanOrEqual(layout.bounds.right - 24);
    }
    expect(layout.checkbox.width).toBeLessThanOrEqual(20);
    expect(layout.checkbox.height).toBeLessThanOrEqual(20);
    expect(layout.checkboxLabel).toContain('Show section labels');
    expect(layout.checkboxStyle).toBe('nowrap');
    expect(layout.selectAppearance).toBe('none');
    expect(layout.select.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs((layout.checkbox.top + layout.checkbox.bottom) / 2
      - (layout.label.top + layout.label.bottom) / 2)).toBeLessThanOrEqual(1);
    expect(new Set(layout.buttons.map(button => button.height)).size).toBe(1);
    for (const text of layout.text) expect(text.left).toBeCloseTo(layout.heading.left, 0);
    expect(layout.select.top).toBeGreaterThan(layout.heading.bottom);
    if (width > 720) {
      expect(layout.option.left).toBeGreaterThan(layout.select.right);
      expect(layout.option.bottom).toBeCloseTo(layout.select.bottom, 0);
      expect(new Set(layout.buttons.map(button => button.top)).size).toBe(1);
    } else {
      expect(layout.option.top).toBeGreaterThanOrEqual(layout.select.bottom);
      expect(layout.buttons[0].top).toBeGreaterThanOrEqual(layout.option.bottom);
      expect(layout.buttons[1].top).toBeGreaterThan(layout.buttons[0].bottom);
    }
    await toolbar.screenshot({ path: testInfo.outputPath(`style-export-${width}.png`) });
    expect(errors).toEqual([]);
  });
}
