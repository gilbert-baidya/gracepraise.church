import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', timezoneId: 'America/Los_Angeles' });

const eventA = { date: '2026-11-25', name: 'Delete race event A', category: 'gpbc', owner: 'fixture-owner' };
const eventB = { date: '2026-11-26', name: 'Delete race event B', category: 'gpbc', owner: 'fixture-owner' };

for (const outcome of ['success', 'rejected', 'network-error', 'canceled']) {
  test(outcome === 'canceled' ? 'canceling deletion leaves both events unchanged'
    : `pending ${outcome} deletion affects A after switching to B`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
    await page.addInitScript(() => {
      localStorage.setItem('gpbc:logoLoaderSeen', 'true');
      localStorage.setItem('lastReminderCheck', new Date().toDateString());
    });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://upload-widget.cloudinary.com/**', route => route.fulfill({
      contentType: 'application/javascript', body: 'window.cloudinary={createUploadWidget:()=>({open(){}})};',
    }));
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let remoteEvents = [eventA, eventB];
    const deletions: unknown[] = [];
    await page.route('https://script.google.com/**', async route => {
      const payload = route.request().postDataJSON();
      if (payload.action === 'deleteEvent') {
        deletions.push(payload.event);
        await gate;
        if (outcome === 'network-error') { await route.abort('failed'); return; }
        if (outcome === 'success') remoteEvents = remoteEvents.filter(event => event.name !== payload.event.name);
        await route.fulfill({ json: { success: outcome === 'success', message: 'Fixture rejection' },
          headers: { 'access-control-allow-origin': '*' } });
      } else {
        expect(payload.action).toBe('getEvents');
        await route.fulfill({ json: { events: remoteEvents }, headers: { 'access-control-allow-origin': '*' } });
      }
    });
    const messages: string[] = [];
    page.on('dialog', async dialog => {
      messages.push(dialog.message());
      if (outcome === 'canceled' && dialog.type() === 'confirm') await dialog.dismiss();
      else await dialog.accept();
    });
    try {
      await page.goto('/calendar.html');
      const marker = (name: string) => page.locator('.calendar-grid .event-marker').filter({ hasText: name });
      await expect(marker(eventA.name)).toHaveCount(1);
      await expect(marker(eventB.name)).toHaveCount(1);
      if (outcome === 'success') {
        await page.evaluate(() => (window as any).deleteCurrentEvent());
        expect(messages).toEqual(['Only GPBC events can be deleted.']);
        messages.length = 0;
      }
      await marker(eventA.name).click();
      await page.locator('#deleteEventBtn').click();
      if (outcome === 'canceled') {
        expect(messages).toEqual([`Are you sure you want to delete "${eventA.name}"?`]);
        expect(deletions).toEqual([]);
        await expect(marker(eventA.name)).toHaveCount(1);
        await expect(marker(eventB.name)).toHaveCount(1);
        await expect(page.locator('#eventDetailModal')).toBeVisible();
        await expect(page.locator('#loadingIndicator')).toHaveCount(0);
        await expect(page.locator('#deleteEventBtn')).toBeEnabled();
        return;
      }
      await expect.poll(() => deletions).toEqual([{ date: eventA.date, name: eventA.name, owner: eventA.owner }]);
      await page.locator('#eventDetailModal .close').click();
      await marker(eventB.name).click();
      await expect(page.locator('#eventTitle')).toContainText(eventB.name);
      const focusedControl = page.locator('#eventDetailModal .close');
      await focusedControl.focus();
      await expect(focusedControl).toBeFocused();
      expect(messages).toEqual([`Are you sure you want to delete "${eventA.name}"?`]);
      release();
      await expect.poll(() => messages.length).toBe(2);
      await expect.soft(marker(eventA.name)).toHaveCount(0);
      await expect.soft(marker(eventB.name)).toHaveCount(1);
      await expect.soft(page.locator('#monthEvents')).not.toContainText(eventA.name);
      await expect.soft(page.locator('#monthEvents')).toContainText(eventB.name);
      expect.soft(messages[1]).toBe(`✓ Event "${eventA.name}" deleted successfully!`);
      await expect.soft(page.locator('#eventDetailModal')).toBeVisible();
      await expect.soft(focusedControl).toBeFocused();
      expect.soft(await page.evaluate(() => (window as any).eval('currentEvent?.name'))).toBe(eventB.name);
      await expect(page.locator('#deleteEventBtn')).toBeEnabled();
      if (outcome !== 'success') {
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gpbcEvents') || '[]'));
        expect.soft(saved.map((event: { name: string }) => event.name)).toEqual([eventB.name]);
      }
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
}

test('rejected deletion distinguishes records with the same name and date by owner', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('gpbc:logoLoaderSeen', 'true');
    localStorage.setItem('lastReminderCheck', new Date().toDateString());
  });
  const first = { ...eventA, owner: 'first-owner' }, second = { ...eventA, owner: 'second-owner' };
  const deletions: unknown[] = [];
  await page.route('https://script.google.com/**', async route => {
    const payload = route.request().postDataJSON();
    if (payload.action === 'deleteEvent') deletions.push(payload.event);
    await route.fulfill({ json: payload.action === 'getEvents' ? { events: [first, second] } : { success: false },
      headers: { 'access-control-allow-origin': '*' } });
  });
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/calendar.html');
  const markers = page.locator('.calendar-grid .event-marker').filter({ hasText: eventA.name });
  await expect(markers).toHaveCount(2);
  await markers.nth(1).click();
  await page.locator('#deleteEventBtn').click();
  await expect.poll(() => deletions.length).toBe(1);
  await expect(markers).toHaveCount(1);
  expect(deletions).toEqual([{ date: second.date, name: second.name, owner: second.owner }]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gpbcEvents') || '[]'));
  expect(saved.map((event: { owner: string }) => event.owner)).toEqual([first.owner]);
  await markers.click();
  expect(await page.evaluate(() => (window as any).eval('currentEvent.owner'))).toBe(first.owner);
});

test('rejected deletion keeps an identical second record open and focused', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('gpbc:logoLoaderSeen', 'true');
    localStorage.setItem('lastReminderCheck', new Date().toDateString());
  });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const deletions: unknown[] = [], messages: string[] = [];
  await page.route('https://script.google.com/**', async route => {
    const payload = route.request().postDataJSON();
    if (payload.action === 'deleteEvent') { deletions.push(payload.event); await gate; }
    await route.fulfill({ json: payload.action === 'getEvents' ? { events: [eventA, { ...eventA }] } : { success: false },
      headers: { 'access-control-allow-origin': '*' } });
  });
  page.on('dialog', async dialog => { messages.push(dialog.message()); await dialog.accept(); });
  try {
    await page.goto('/calendar.html');
    const markers = page.locator('.calendar-grid .event-marker').filter({ hasText: eventA.name });
    await expect(markers).toHaveCount(2);
    await markers.nth(0).click();
    const deleted = await page.evaluate(() => (window as any).eval('events.indexOf(currentEvent)'));
    await page.locator('#deleteEventBtn').click();
    await expect.poll(() => deletions.length).toBe(1);
    await page.locator('#eventDetailModal .close').click();
    await markers.nth(1).click();
    const opened = await page.evaluate(() => (window as any).eval('events.indexOf(currentEvent)'));
    expect(opened).not.toBe(deleted);
    const focusedControl = page.locator('#eventDetailModal .close');
    await focusedControl.focus();
    release();
    await expect.poll(() => messages.length).toBe(2);
    await expect(markers).toHaveCount(1);
    await expect.soft(page.locator('#eventDetailModal')).toBeVisible();
    await expect.soft(focusedControl).toBeFocused();
    expect.soft(await page.evaluate(() => (window as any).eval('currentEvent !== null && events.includes(currentEvent)'))).toBe(true);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gpbcEvents') || '[]'));
    expect.soft(saved.filter((event: { name: string }) => event.name === eventA.name)).toHaveLength(1);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

for (const success of [true, false]) {
  test(`repeat Delete clicks send one request and one success alert: server success=${success}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
    await page.addInitScript(() => {
      localStorage.setItem('gpbc:logoLoaderSeen', 'true');
      localStorage.setItem('lastReminderCheck', new Date().toDateString());
    });
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const deletions: unknown[] = [], messages: string[] = [];
    let deleted = false;
    await page.route('https://script.google.com/**', async route => {
      const payload = route.request().postDataJSON();
      if (payload.action === 'deleteEvent') {
        deletions.push(payload.event);
        await gate;
        deleted = success;
      }
      await route.fulfill({ json: payload.action === 'getEvents' ? { events: deleted ? [eventB] : [eventA, eventB] } : { success },
        headers: { 'access-control-allow-origin': '*' } });
    });
    page.on('dialog', async dialog => { messages.push(dialog.message()); await dialog.accept(); });
    try {
      await page.goto('/calendar.html');
      await page.locator('.calendar-grid .event-marker').filter({ hasText: eventA.name }).click();
      const button = page.locator('#deleteEventBtn');
      await button.click();
      await expect.poll(() => deletions.length).toBe(1);
      await button.dispatchEvent('click');
      expect.soft(messages).toEqual([`Are you sure you want to delete "${eventA.name}"?`]);
      await expect.soft(button).toBeDisabled();
      release();
      await expect.poll(() => messages.filter(message => message.includes('deleted successfully')).length).toBe(1);
      expect.soft(deletions).toHaveLength(1);
      expect.soft(messages).toEqual([`Are you sure you want to delete "${eventA.name}"?`, `✓ Event "${eventA.name}" deleted successfully!`]);
      await expect(button).toBeEnabled();
      await expect(page.locator('#eventDetailModal')).toBeHidden();
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
}
