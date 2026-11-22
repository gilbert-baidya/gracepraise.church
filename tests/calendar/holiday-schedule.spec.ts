import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', timezoneId: 'America/Los_Angeles' });

const names = ['Pre-Christmas Celebration Service', 'Gratitude & New Year Celebration'];
const expected = [
  { name: names[0], date: '2026-12-20', eventTime: '5:00 PM', eventDay: 'Sunday' },
  { name: names[1], date: '2026-12-31', eventTime: '7:00 PM', eventDay: 'Thursday' }
];
const stale = [
  { name: names[0], date: '2026-12-13', eventTime: '5:00 PM', category: 'gpbc' },
  { name: names[1], date: '2026-12-31', eventTime: '10:30 PM', category: 'gpbc' }
];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00-08:00'));
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
});

for (const date of ['2026-12-13', '12/13/2026', '2026-12-20']) {
  test(`Sheets displays the approved date but deletes the source record: ${date}`, async ({ page }) => {
    const requests: any[] = [];
    await page.route('https://script.google.com/**', async route => {
      const request = JSON.parse(route.request().postData() || '{}');
      requests.push(request);
      await route.fulfill({ json: request.action === 'getEvents'
        ? { events: [{ ...stale[0], date }] } : { success: true } });
    });
    await page.goto('/calendar.html');
    await expect(page.locator('#monthEvents')).toContainText('Dec 20');
    const result = await page.evaluate(async () => {
      const event = (window as any).eval('events').find((event: any) => event.name === 'Pre-Christmas Celebration Service');
      return { date: event.date, deleted: await (window as any).deleteEventFromGoogleSheets(event) };
    });
    expect(result).toEqual({ date: '2026-12-20', deleted: true });
    expect(requests.find(request => request.action === 'deleteEvent').event.date)
      .toBe(date.includes('13') ? '2026-12-13' : '2026-12-20');
  });
}

test('saved holiday source identity survives normalization and a failed Sheets refresh', async ({ page }) => {
  await page.addInitScript(record => {
    if (window !== window.top) return;
    localStorage.setItem('gpbcEventsVersion', '3.1');
    localStorage.setItem('gpbcEvents', JSON.stringify([record]));
  }, stale[0]);
  const deletions: any[] = [];
  await page.route('https://script.google.com/**', async route => {
    const request = JSON.parse(route.request().postData() || '{}');
    if (request.action === 'deleteEvent') deletions.push(request);
    await route.fulfill({ json: request.action === 'getEvents' ? {} : { success: true } });
  });
  await page.goto('/calendar.html');
  const result = await page.evaluate(async () => {
    const record = (window as any).eval('events').find((event: any) => event.name === 'Pre-Christmas Celebration Service');
    return { date: record.date, source: record.sourceDate, deleted: await (window as any).deleteEventFromGoogleSheets(record) };
  });
  expect(result).toEqual({ date: '2026-12-20', source: '2026-12-13', deleted: true });
  expect(deletions[0].event.date).toBe('2026-12-13');
});

test('all holiday JSON-LD windows match the shared activity and ICS schedule', async ({ page }) => {
  await page.goto('/index.html');
  const schedules = await page.evaluate(() => {
    const records = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .flatMap(script => {
        const value = JSON.parse(script.textContent || '{}');
        return value['@graph'] || [value];
      }).filter(value => value['@type'] === 'Event');
    return (window as any).GPBC_HOME_ACTIVITIES.filter((activity: any) => activity.type === 'flyer')
      .map((activity: any) => ({
        expectedStart: activity.date + 'T' + activity.start + ':00-08:00',
        expectedEnd: activity.date + 'T' + activity.end + ':00-08:00',
        record: records.find(record => record.startDate.startsWith(activity.date))
      }));
  });
  expect(schedules).toHaveLength(4);
  for (const schedule of schedules) {
    expect(schedule.record.startDate).toBe(schedule.expectedStart);
    expect(schedule.record.endDate).toBe(schedule.expectedEnd);
  }
});

for (const mode of ['normal storage', 'blocked writes']) {
  test('Sheets holiday deletion survives reload: ' + mode, async ({ page }) => {
    if (mode === 'blocked writes') {
      await page.addInitScript(() => {
        Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
      });
    }
    let deleted = false;
    const actions: string[] = [];
    await page.route('https://script.google.com/**', async route => {
      const request = JSON.parse(route.request().postData() || '{}');
      actions.push(request.action);
      if (request.action === 'deleteEvent') {
        deleted = true;
        await route.fulfill({ json: { success: true } });
      } else {
        await route.fulfill({ json: { events: deleted ? [stale[1]] : stale } });
      }
    });
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/calendar.html');
    await expect(page.locator('#monthEvents')).toContainText('Dec 20');
    await page.evaluate(async () => {
      (window as any).eval("currentEvent = events.find(event => event.name === 'Pre-Christmas Celebration Service')");
      await (window as any).deleteCurrentEvent();
    });
    await expect(page.locator('#monthEvents')).not.toContainText(names[0]);
    await expect(page.locator('#monthEvents')).toContainText(names[1]);
    expect(actions.filter(action => action === 'getEvents').length).toBeGreaterThanOrEqual(2);
    await page.reload();
    await expect(page.locator('#monthEvents')).not.toContainText(names[0]);
    await expect(page.locator('#monthEvents')).toContainText(names[1]);
  });
}

for (const mode of ['Sheets', 'Sheets with blocked writes']) {
  test('delete then explicitly re-add and refresh restores the event: ' + mode, async ({ page }) => {
    if (mode.includes('blocked writes')) {
      await page.addInitScript(() => {
        Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
      });
    }
    let records = [stale[0]];
    await page.route('https://script.google.com/**', async route => {
      const request = JSON.parse(route.request().postData() || '{}');
      if (request.action === 'deleteEvent') {
        records = [];
        await route.fulfill({ json: { success: true } });
      } else if (request.action === 'addEvent') {
        records = [request.event];
        await route.fulfill({ json: { success: true } });
      } else {
        await route.fulfill({ json: { events: records } });
      }
    });
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/calendar.html');
    await expect(page.locator('#monthEvents')).toContainText(names[0]);
    await page.evaluate(async () => {
      (window as any).eval("currentEvent = events.find(event => event.name === 'Pre-Christmas Celebration Service')");
      await (window as any).deleteCurrentEvent();
    });
    await expect(page.locator('#monthEvents')).not.toContainText(names[0]);
    await page.evaluate(async name => {
      (window as any).sendEventNotification = () => {};
      const form = document.createElement('div');
      form.id = 'addEventModal';
      for (const id of ['eventAddedBy', 'eventContact', 'eventName', 'eventDateInput', 'eventDescription', 'eventImageUrl']) {
        const existing = document.getElementById(id);
        if (existing) existing.id = 'detail-' + id;
        const input = document.createElement('input');
        input.id = id;
        form.append(input);
      }
      document.body.append(form);
      for (const [id, value] of Object.entries({
        eventAddedBy: 'Test only', eventContact: 'test@example.test',
        eventName: name, eventDateInput: '2026-12-20'
      })) (document.getElementById(id) as HTMLInputElement).value = value;
      await (window as any).addGPBCEvent();
    }, names[0]);
    await expect(page.locator('#monthEvents')).toContainText(names[0]);
    await page.reload();
    await expect(page.locator('#monthEvents')).toContainText(names[0]);
  });
}

for (const language of ['en', 'bn']) {
  test(`Home and countdown share approved holiday dates in ${language}`, async ({ page }) => {
    await page.goto('/index.html?lang=' + language);
    await expect.poll(() => page.evaluate(() => Boolean((window as any).gpbcCountdown))).toBe(true);
    const schedule = await page.evaluate(`gpbcCountdown.specialEvents
      .filter(event => ${JSON.stringify(names)}.includes(event.name))
      .map(event => ({ name: event.name, date: event.date, eventTime: event.eventTime, eventDay: event.eventDay, instant: event.dateTime.toISOString() }))`);
    expect(schedule).toEqual(expected.map((event, index) => ({
      ...event, instant: index === 0 ? '2026-12-21T01:00:00.000Z' : '2027-01-01T03:00:00.000Z'
    })));
    const preChristmas = page.locator('[data-flyer="pre-christmas-dec20"] img');
    const gratitude = page.locator('[data-flyer="gratitude-dec31"] img');
    await expect(preChristmas).toHaveAttribute('alt', language === 'bn' ? /২০ ডিসেম্বর ২০২৬.*৫টা/ : /20 December 2026, 5 PM/);
    await expect(gratitude).toHaveAttribute('alt', language === 'bn' ? /৩১ ডিসেম্বর ২০২৬.*৭টা/ : /31 December 2026, 7 PM/);
    await page.clock.setFixedTime(new Date('2026-12-31T18:00:00-08:00'));
    await page.evaluate('gpbcCountdown.updateCountdown(); gpbcCountdown.updateInlineCountdown()');
    expect(await page.evaluate('gpbcCountdown.getNextEvent().time')).toBe('19:00');
    await expect(page.locator('#specialEventBanner .event-label')).toContainText(names[1]);
    await expect(page.locator('#specialEventBanner [data-unit="hours"]')).toHaveText('01');
    await expect(page.locator('#specialEventBanner time')).toHaveAttribute('datetime', '2027-01-01T03:00:00.000Z');
    const structured = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts =>
      scripts.map(script => JSON.parse(script.textContent || '{}')).find(value => value['@type'] === 'Event'));
    expect(structured.startDate).toBe('2026-12-31T19:00:00-08:00');
  });
}

test('unavailable Sheets loads cached events even when storage writes fail', async ({ page }) => {
  const custom = { name: 'Cached fellowship with blocked writes', date: '2026-12-15', category: 'gpbc' };
  await page.addInitScript(({ stale, custom }) => {
    localStorage.setItem('gpbcEventsVersion', '3.1');
    localStorage.setItem('gpbcEvents', JSON.stringify([...stale, custom]));
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  }, { stale, custom });
  await page.route('https://script.google.com/**', route => route.abort());
  await page.goto('/calendar.html');
  await expect(page.locator('#monthEvents')).toContainText(custom.name);
  await expect(page.locator('#monthEvents')).toContainText('Dec 20');
  await page.reload();
  await expect(page.locator('#monthEvents')).toContainText(custom.name);
});

for (const source of ['saved', 'sheet', 'empty sheet', 'failed sheet']) {
  test(`Calendar uses approved holidays with ${source} data`, async ({ page }) => {
    const custom = { name: 'Unrelated custom fellowship', date: '2026-12-15', category: 'gpbc', description: 'Keep this event' };
    if (source === 'saved') {
      await page.addInitScript(({ stale, custom }) => {
        if (window !== window.top) return;
        localStorage.setItem('gpbcEventsVersion', '3.1');
        localStorage.setItem('gpbcEvents', JSON.stringify([...stale, custom]));
      }, { stale, custom });
    }
    await page.route('https://script.google.com/**', route =>
      source === 'saved' || source === 'failed sheet' ? route.abort() : route.fulfill({
        json: { events: source === 'empty sheet' ? [] : [...stale, custom] },
        headers: { 'access-control-allow-origin': '*' }
      }));
    await page.goto('/calendar.html');
    await expect(page.locator('#currentMonth')).toHaveText('December 2026');
    if (source === 'empty sheet') {
      await expect(page.locator('#monthEvents')).not.toContainText(names[0]);
      await expect(page.locator('#monthEvents')).not.toContainText(names[1]);
      expect(await page.evaluate("events.filter(event => event.category === 'gpbc').length")).toBe(0);
      return;
    }
    await expect(page.locator('#monthEvents')).toContainText(names[0]);
    const schedule = await page.evaluate(`events.filter(event => ${JSON.stringify(names)}.includes(event.name))
      .map(({ name, date, eventTime, eventDay }) => ({ name, date, eventTime, eventDay }))`);
    expect(schedule).toEqual(expected);
    await expect(page.locator('#monthEvents .event-item').filter({ hasText: names[0] })).toContainText('Dec 20');
    if (source === 'saved' || source === 'sheet') {
      await expect(page.locator('#monthEvents')).toContainText(custom.name);
    }
    if (source === 'saved') {
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gpbcEvents') || '[]'));
      expect(saved).toEqual([...stale, custom]);
    }
  });
}
