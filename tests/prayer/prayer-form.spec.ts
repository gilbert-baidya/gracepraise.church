import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const productionCsp = readFileSync('netlify.toml', 'utf8')
  .match(/^\s*Content-Security-Policy\s*=\s*"([^"]+)"/m)![1];

test.beforeEach(async ({ page }) => {
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('**/prayer-request.html', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': productionCsp },
    });
  });
});

test('production CSP policies allow both Apps Script origins in connect-src', () => {
  const homepageCsp = readFileSync('index.html', 'utf8')
    .match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)![1];
  for (const policy of [productionCsp, homepageCsp]) {
    const connectSources = policy.split(';').map(directive => directive.trim())
      .find(directive => directive.startsWith('connect-src '))!.split(/\s+/).slice(1);
    expect(connectSources).toContain('https://script.google.com');
    expect(connectSources).toContain('https://script.googleusercontent.com');
  }
});

for (const outcome of ['success', 'http-error', 'network-error', 'application-error', 'invalid-response']) {
  test(`prayer submission handles ${outcome} without losing the request`, async ({ page }) => {
    const requests: { method: string; payload: any }[] = [];
    await page.route('https://script.google.com/**', async route => {
      requests.push({ method: route.request().method(), payload: route.request().postDataJSON() });
      if (outcome === 'network-error' && requests.length === 1) {
        await route.abort('failed');
        return;
      }
      const firstAttempt = requests.length === 1;
      await route.fulfill({
        status: outcome === 'http-error' && firstAttempt ? 500 : 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: outcome === 'invalid-response' && firstAttempt ? 'not JSON' : JSON.stringify({
          success: !(outcome === 'application-error' && firstAttempt),
        }),
      });
    });

    await page.goto('/prayer-request.html');
    const form = page.locator('#prayer-form');
    const success = page.locator('#prayer-success');
    const error = page.locator('#prayer-error');
    const submit = form.getByRole('button', { name: 'Share My Prayer' });
    await page.locator('#prayer-name').fill('Test Friend');
    await page.locator('#prayer-email').fill('test@example.com');
    await page.locator('#prayer-request').fill('Please pray for peace. শান্তির জন্য প্রার্থনা করুন।');
    await page.locator('#prayer-private').check();
    await submit.click();

    if (outcome !== 'success') {
      await expect(error).toBeVisible();
      await expect(error).toHaveAttribute('role', 'alert');
      await expect(error).toContainText('try again');
      await expect(form).toBeVisible();
      await expect(success).toBeHidden();
      await expect(submit).toBeEnabled();
      await expect(page.locator('#prayer-name')).toHaveValue('Test Friend');
      await expect(page.locator('#prayer-email')).toHaveValue('test@example.com');
      await expect(page.locator('#prayer-request')).toHaveValue('Please pray for peace. শান্তির জন্য প্রার্থনা করুন।');
      await expect(page.locator('#prayer-private')).toBeChecked();
      await submit.click();
    }

    await expect(success).toBeVisible();
    await expect(form).toBeHidden();
    await expect(error).toBeHidden();
    expect(requests).toHaveLength(outcome === 'success' ? 1 : 2);
    for (const request of requests) {
      expect(request.method).toBe('POST');
      expect(request.payload).toEqual({
        action: 'addPrayerRequest',
        prayer: {
          name: 'Test Friend', email: 'test@example.com', isAnonymous: true,
          categories: 'Confidential / Pastoral Team',
          details: 'Please pray for peace. শান্তির জন্য প্রার্থনা করুন।',
          status: 'Active', timestamp: expect.any(String),
          submissionId: expect.any(String),
        },
      });
    }
    const firstId = requests[0].payload.prayer.submissionId;
    expect(firstId.length).toBeGreaterThan(0);
    expect(requests.every(request => request.payload.prayer.submissionId === firstId)).toBe(true);
    await success.getByRole('button', { name: 'Submit Another Request' }).click();
    await expect(form).toBeVisible();
    await expect(error).toBeHidden();
    await expect(page.locator('#prayer-request')).toHaveValue('');
    await page.locator('#prayer-request').fill('A new prayer after confirmed success.');
    await submit.click();
    await expect(success).toBeVisible();
    expect(requests[requests.length - 1].payload.prayer.submissionId).not.toBe(firstId);
  });
}

for (const unavailable of ['randomUUID', 'crypto']) {
  test(`submission IDs survive retries without ${unavailable}`, async ({ page }) => {
    await page.addInitScript(unavailable => {
      Object.defineProperty(unavailable === 'crypto' ? window : window.crypto, unavailable, { value: undefined });
    }, unavailable);
    const ids: string[] = [];
    await page.route('https://script.google.com/**', async route => {
      ids.push(route.request().postDataJSON().prayer.submissionId);
      if (ids.length === 1) return route.abort();
      await route.fulfill({ json: { success: true, duplicate: ids.length === 2 }, headers: { 'access-control-allow-origin': '*' } });
    });
    await page.goto('/prayer-request.html');
    await page.locator('#prayer-request').fill('Please pray for our family.');
    await page.locator('#prayer-form button[type="submit"]').click();
    await expect(page.locator('#prayer-error')).toBeVisible();
    await page.locator('#prayer-form button[type="submit"]').click();
    await expect(page.locator('#prayer-success')).toBeVisible();
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBe(ids[0]);
    await page.getByRole('button', { name: 'Submit Another Request' }).click();
    await page.locator('#prayer-request').fill('Another prayer.');
    await page.locator('#prayer-form button[type="submit"]').click();
    await expect(page.locator('#prayer-success')).toBeVisible();
    expect(ids[2]).toBeTruthy();
    expect(ids[2]).not.toBe(ids[0]);
  });
}

test('empty prayer does not send a request', async ({ page }) => {
  let requests = 0;
  await page.route('https://script.google.com/**', async route => {
    requests++;
    await route.abort();
  });
  await page.goto('/prayer-request.html');
  await page.locator('#prayer-form button[type="submit"]').click();
  await expect(page.locator('#prayer-form')).toBeVisible();
  await expect(page.locator('#prayer-success')).toBeHidden();
  expect(requests).toBe(0);
});
