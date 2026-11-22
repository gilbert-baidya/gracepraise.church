import { test, expect } from '@playwright/test';

test('390px closed submenus stay out of Tab order and scripted toggles own disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.waitForTimeout(250);
  const dropdowns = page.locator('header .nav-links > .nav-dropdown');
  for (const dropdown of await dropdowns.all()) {
    const toggle = dropdown.locator(':scope > a');
    const submenu = dropdown.locator(':scope > .dropdown-menu');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.focus();
    await expect(submenu).toBeHidden();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.dropdown-menu, .dropdown-menu-nested'))).toBe(false);
  }

  const about = dropdowns.filter({ has: page.locator(':scope > a', { hasText: 'About' }) });
  const toggle = about.locator(':scope > a');
  const submenu = about.locator(':scope > .dropdown-menu');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(about).toHaveClass(/mobile-dropdown-open/);
  await expect(submenu).toBeVisible();

  const tools = about.locator('.nav-dropdown-nested');
  const toolsToggle = tools.locator(':scope > a');
  const toolsMenu = tools.locator(':scope > .dropdown-menu-nested');
  await toolsToggle.focus();
  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toolsMenu).toBeHidden();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.dropdown-menu-nested'))).toBe(false);
  await toolsToggle.press('Enter');
  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toolsMenu).toBeVisible();
  await toolsMenu.locator('a').first().focus();
  await toolsToggle.locator('.dropdown-arrow').click();
  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(tools).not.toHaveClass(/mobile-dropdown-open/);
  await toolsToggle.focus();
  await expect(toolsMenu).toBeHidden();

  await submenu.locator('a').first().focus();
  await page.waitForTimeout(250);
  await toggle.locator('.dropdown-arrow').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(about).not.toHaveClass(/mobile-dropdown-open/);
  await toggle.focus();
  await expect(submenu).toBeHidden();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.dropdown-menu, .dropdown-menu-nested'))).toBe(false);
});

test('desktop focus still opens submenus at the 1025px boundary', async ({ page }) => {
  await page.setViewportSize({ width: 1025, height: 1000 });
  await page.goto('/index.html');
  const about = page.locator('header .nav-links > .nav-dropdown').filter({
    has: page.locator(':scope > a', { hasText: 'About' }),
  });
  await about.locator(':scope > a').focus();
  await expect(about.locator(':scope > .dropdown-menu')).toBeVisible();
  await expect(about).not.toHaveClass(/mobile-dropdown-open/);
  const tools = about.locator('.nav-dropdown-nested');
  await tools.locator(':scope > a').focus();
  await expect(tools.locator(':scope > .dropdown-menu-nested')).toBeVisible();
});

test('390px no-JavaScript fallback opens top-level and nested submenus on focus', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/index.html');
    await expect(page.locator('html')).not.toHaveClass(/js-enabled/);
    const about = page.locator('header .nav-links > .nav-dropdown').filter({
      has: page.locator(':scope > a', { hasText: 'About' }),
    });
    await about.locator(':scope > a').focus();
    await expect(about.locator(':scope > .dropdown-menu')).toBeVisible();
    const tools = about.locator('.nav-dropdown-nested');
    await tools.locator(':scope > a').focus();
    await expect(tools.locator(':scope > .dropdown-menu-nested')).toBeVisible();
  } finally {
    await context.close();
  }
});
