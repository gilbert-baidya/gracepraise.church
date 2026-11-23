import { test, expect } from '@playwright/test';

const routes = ['index', 'plan-visit', 'give', 'calendar', 'prayer-request', 'daily-devotion'];

function contrast(foreground: string, background: string) {
  const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3)
    .map(Number).map(channel => channel / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('carousel captions keep their compact role inside the circular overlays', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 767, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const captions = page.locator('.block-the-loop .heading h2');
    expect(await captions.count()).toBeGreaterThanOrEqual(4);
    for (const caption of await captions.all()) {
      await expect(caption).toHaveCSS('font-size', width < 768 ? '16px' : width === 768 ? '19.2px' : '24px');
      await expect(caption).toHaveCSS('line-height', width < 768 ? '22px' : width === 768 ? '24.96px' : '31.2px');
      expect(await caption.evaluate(element => {
        const text = element.getBoundingClientRect();
        const overlay = element.closest('.heading')!.getBoundingClientRect();
        return !text.width || text.left >= overlay.left && text.right <= overlay.right &&
          text.top >= overlay.top && text.bottom <= overlay.bottom;
      })).toBe(true);
    }
  }
});

test('homepage visit essentials reflow into one column at tablet widths', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const geometry = await page.locator('.visit-essentials-grid').evaluate(element => {
      const grid = element.getBoundingClientRect();
      const summary = element.querySelector('.visit-summary')!.getBoundingClientRect();
      const heading = element.querySelector('h1')!;
      return { right: grid.right, summaryRight: summary.right, summaryWidth: summary.width,
        width: grid.width, headingOverflow: heading.scrollWidth - heading.clientWidth };
    });
    expect(geometry.headingOverflow).toBeLessThanOrEqual(1);
    expect(geometry.summaryRight).toBeLessThanOrEqual(geometry.right + 1);
    expect(geometry.summaryWidth).toBeCloseTo(width <= 1024 ? geometry.width : 528, 0);
  }
});

test('the Loop CTA keeps an opaque gold background and navy label in both themes', async ({ page }) => {
  await page.goto('/index.html');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
    const button = page.locator('.block-the-loop .button');
    await expect(button).toHaveCSS('background-color', 'rgb(230, 184, 78)');
    await expect(button).toHaveCSS('color', 'rgb(16, 32, 51)');
  }
});

test('Visit English-only regions retain English typography after switching to Bangla', async ({ page }) => {
  await page.route('**/events.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `const events = [{date:'2099-01-01',name:'Future fellowship',description:'English event details',category:'gpbc'}];`,
  }));
  await page.goto('/plan-visit.html');
  await expect(page.locator('#upcomingHighlights .highlight-item:not(.sunday-worship)')).toHaveCount(1);
  await page.locator('[data-site-language="bn"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  for (const selector of ['a.skip-link', 'header .nav-links > li > a', '.site-footer p', '.visit-coming-soon', '.visit-rhythm-card strong', '#upcomingHighlights', '#upcomingHighlights .highlight-item:not(.sunday-worship) p']) {
    const elements = page.locator(selector);
    expect(await elements.count()).toBeGreaterThan(0);
    for (const element of await elements.all()) {
      expect(await element.evaluate(node => node.matches(':lang(en)'))).toBe(true);
      await expect(element).toHaveCSS('font-family', 'Inter, "Noto Sans Bengali", system-ui, sans-serif');
    }
  }
  await expect(page.locator('.site-footer h2').first()).toHaveCSS('font-family', 'Lora, Georgia, "Noto Sans Bengali", serif');
  await expect(page.locator('h1 [data-lang="bn"]')).toHaveCSS('font-family', /^"Noto Sans Bengali",/);
});

test('homepage countdown arrow and real directions CTA use contrasting colors in every state', async ({ page }) => {
  await page.goto('/index.html');
  await page.addStyleTag({ content: 'header nav, header nav * { pointer-events: none !important; }' });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
    for (const selector of ['#specialEventBanner .banner-link', '.visit-v3__directions']) {
      const link = page.locator(selector);
      for (const state of ['default', 'hover', 'active', 'focus']) {
        if (state === 'hover') await link.hover();
        if (state === 'active') await page.mouse.down();
        if (state === 'focus') {
          await page.mouse.move(0, 0);
          await page.mouse.up();
          await link.focus();
        }
        await expect(link).toHaveCSS('color', 'rgb(16, 32, 51)');
        await expect(link).toHaveCSS('-webkit-text-fill-color', 'rgb(16, 32, 51)');
        await expect(link).toHaveCSS('background-color', 'rgb(230, 184, 78)');
        await expect(link).toHaveCSS('background-image', 'none');
        expect(contrast(await link.evaluate(element => getComputedStyle(element).color),
          await link.evaluate(element => getComputedStyle(element).backgroundColor))).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

for (const scenario of ['translated', 'missing', 'empty', 'load-error', 'hydrated']) {
  test(`Daily Devotion language metadata follows rendered content: ${scenario}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
    const record: Record<string, string> = {
      date: scenario === 'load-error' ? '2026-10-19' : '2026-11-20',
      title: 'English title', titleBn: 'বাংলা শিরোনাম', verse: 'John 3:16',
      verseText: 'English scripture', verseTextBn: 'বাংলা শাস্ত্রের পদ',
      reflection: 'English reflection', reflectionBn: 'বাংলা ভাবনা',
      prayer: 'English prayer', prayerBn: 'বাংলা প্রার্থনা',
    };
    if (scenario === 'missing' || scenario === 'empty') {
      for (const key of ['titleBn', 'verseTextBn', 'reflectionBn', 'prayerBn']) {
        if (scenario === 'missing') delete record[key];
        else record[key] = '';
      }
    }
    if (scenario === 'hydrated') delete record.verseTextBn;
    await page.route(url => url.pathname === '/devotions-data.js', route => route.fulfill({
      contentType: 'application/javascript',
      body: `window.DEVOTIONS = ${JSON.stringify([record])};
        window.GPBC_INITIAL_DEVOTION_DATE = '2026-11-20';
        window.loadDevotionsForMonth = () => Promise.reject(new Error('Fixture data unavailable'));`,
    }));
    await page.route(url => url.pathname === '/services/bible/bible-service.js', route => route.fulfill({
      contentType: 'application/javascript',
      body: scenario === 'hydrated'
        ? `window.GPBCBibleService = {getPassage: () => new Promise(resolve => {window.__resolveBible = resolve;})};`
        : `window.GPBCBibleService = {getPassage: async () => null};`,
    }));
    await page.goto('/daily-devotion.html');
    await expect(page.locator('#devotionTitle')).toHaveText(scenario === 'load-error' ? 'God is our Refuge' : record.title);
    await page.locator('#langBn').click();
    await expect(page.locator('#heroTitle')).toHaveAttribute('lang', 'bn');
    await expect(page.locator('#heroTitle')).toHaveCSS('font-family', /^"Noto Sans Bengali",/);
    await expect(page.locator('#reflectionHeading')).toHaveAttribute('lang', 'bn');
    const translated = scenario === 'translated' || scenario === 'hydrated';
    for (const selector of ['#devotionTitle', '[data-devotion-reflection]', '[data-devotion-prayer]']) {
      await expect(page.locator(selector)).toHaveAttribute('lang', translated ? 'bn' : 'en');
    }
    await expect(page.locator('#bibleReference')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#bibleText')).toHaveAttribute('lang', scenario === 'translated' ? 'bn' : 'en');
    await expect(page.locator('#dateStrip .date-pill').first()).toHaveAttribute('lang', 'en');
    await expect(page.locator('#langEn')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#langBn')).toHaveAttribute('lang', 'bn');
    const subtitle = page.locator('#devotionSubtitle');
    await expect(subtitle.locator('span')).toHaveCount(2);
    await expect(subtitle.locator('span').first()).toHaveAttribute('lang', 'bn');
    await expect(subtitle.locator('span').first()).toContainText(/[\u0980-\u09ff]/);
    await expect(subtitle.locator('span').last()).toHaveAttribute('lang', 'en');
    await expect(subtitle.locator('span').last()).toHaveText(scenario === 'load-error' ? 'Psalm 46:1' : record.verse);
    if (scenario === 'hydrated') {
      await page.evaluate(() => (window as any).__resolveBible({ text: 'নতুন বাংলা শাস্ত্রের পদ' }));
      await expect(page.locator('#bibleText')).toHaveText('নতুন বাংলা শাস্ত্রের পদ');
      await expect(page.locator('#bibleText')).toHaveAttribute('lang', 'bn');
    }
    await page.locator('#langEn').click();
    await expect(page.locator('#heroTitle')).toHaveAttribute('lang', 'en');
    await expect(subtitle.locator('span').first()).toHaveAttribute('lang', 'en');
    await expect(subtitle.locator('span').last()).toHaveAttribute('lang', 'en');
    for (const selector of ['#devotionTitle', '#bibleText', '[data-devotion-reflection]', '[data-devotion-prayer]']) {
      await expect(page.locator(selector)).toHaveAttribute('lang', 'en');
    }
    await expect(page.locator('#devotionTitle')).toHaveText(scenario === 'load-error' ? 'God is our Refuge' : record.title);
  });
}

for (const route of routes) {
  test(`${route} uses local shared typography and persistent day/night roles`, async ({ page }) => {
    const externalFonts: string[] = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname) ||
        request.resourceType() === 'font' && url.origin !== new URL(page.url()).origin) externalFonts.push(request.url());
    });
    await page.route('https://script.google.com/**', route => route.fulfill({
      json: { events: [] }, headers: { 'access-control-allow-origin': '*' },
    }));
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    if (route === 'calendar') await page.clock.setFixedTime(new Date('2026-09-21T12:00:00Z'));
    await page.goto(`/${route}.html`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 247, 240)');
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(16, 32, 51)');
    await expect(page.locator('body')).toHaveCSS('font-family', 'Inter, "Noto Sans Bengali", system-ui, sans-serif');
    await expect(page.locator('h1').first()).toHaveCSS('font-family', 'Lora, Georgia, "Noto Sans Bengali", serif');
    const visitEssentials = route === 'index' || route === 'plan-visit';
    await expect(page.locator('h1').first()).toHaveCSS('font-size', visitEssentials ? '60px' : '64px');
    await expect(page.locator('h1').first()).toHaveCSS('line-height', visitEssentials ? '71px' : '76px');
    await expect(page.locator('link[href="assets/css/shared-style.css"]')).toHaveCount(1);
    await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(0);
    if (route === 'give' || route === 'prayer-request') {
      const quote = page.locator(route === 'give' ? '.give-v14-hero-verse p' : '.prayer-v15-scripture blockquote p');
      await expect(quote).toHaveCSS('font-style', 'italic');
      await expect(quote).toHaveCSS('font-synthesis', 'style');
    }

    await page.evaluate(() => {
      const section = document.createElement('section');
      section.id = 'shared-style-probe';
      section.innerHTML = '<article class="gpbc-card"><h2 lang="bn">বিশ্বাসে বেড়ে উঠি</h2><p lang="bn">ঈশ্বরের ভালোবাসায় একসঙ্গে উপাসনা করি।</p><a href="#shared-style-probe">Read more</a><button class="gpbc-button-primary">Continue</button><button class="gpbc-button-secondary">Back</button><label>Email<input class="gpbc-input" aria-describedby="shared-style-error"></label><p class="gpbc-error" id="shared-style-error">! Enter an email address.</p><p class="gpbc-success">✓ Message sent.</p></article>';
      document.querySelector('main')!.append(section);
    });
    const probe = page.locator('#shared-style-probe');
    await expect(probe.locator('h2')).toHaveCSS('font-family', /^"Noto Sans Bengali",/);
    await expect(probe.locator('h2')).toHaveCSS('font-size', '24px');
    await expect(probe.locator('h2')).toHaveCSS('letter-spacing', 'normal');
    await expect(probe.locator('h2')).toHaveCSS('text-transform', 'none');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('background-color', 'rgb(230, 184, 78)');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('color', 'rgb(16, 32, 51)');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('-webkit-text-fill-color', 'rgb(16, 32, 51)');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('min-height', '52px');
    await expect(probe.locator('.gpbc-error')).toHaveCSS('color', 'rgb(180, 35, 24)');
    await expect(probe.locator('.gpbc-success')).toHaveCSS('color', 'rgb(22, 101, 52)');
    await expect(probe.locator('input')).toHaveValue('');
    await expect(probe.locator('input')).toHaveCSS('min-height', '52px');
    await probe.locator('input').evaluate(input => input.setAttribute('aria-invalid', 'true'));
    await expect(probe.locator('input')).toHaveCSS('border-top-color', 'rgb(180, 35, 24)');
    await probe.locator('a').focus();
    await expect(probe.locator('a')).toHaveCSS('outline-width', '3px');
    await expect(probe.locator('a')).toHaveCSS('outline-offset', '3px');
    await expect(probe.locator('a')).toHaveCSS('outline-color', 'rgb(29, 78, 216)');
    await expect(probe.locator('a')).toHaveCSS('color', 'rgb(29, 78, 216)');
    await expect(probe.locator('a')).toHaveCSS('text-decoration-line', 'underline');

    await page.locator('#darkModeToggle').evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 20, 32)');
    await expect(probe.locator('.gpbc-error')).toHaveCSS('color', 'rgb(253, 162, 155)');
    await expect(probe.locator('.gpbc-success')).toHaveCSS('color', 'rgb(134, 239, 172)');
    await expect(probe.locator('.gpbc-button-primary')).toHaveCSS('color', 'rgb(16, 32, 51)');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(page.locator('h1').first()).toHaveCSS('font-size', visitEssentials ? '32px' : '36px');
    if (route === 'daily-devotion') {
      expect(await page.locator('#monthSelect').evaluate(element => {
        const style = getComputedStyle(element);
        const context = document.createElement('canvas').getContext('2d')!;
        context.font = style.font;
        const textWidth = Math.max(...Array.from((element as HTMLSelectElement).options, option => context.measureText(option.text).width));
        return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 20 - textWidth;
      })).toBeGreaterThanOrEqual(0);
    }
    if (route === 'calendar') {
      await expect(page.locator('#currentMonth')).toHaveText('September 2026');
      const layout = await page.evaluate(() => {
        const heading = document.querySelector('#currentMonth')!.getBoundingClientRect();
        const previous = document.querySelector('#prevMonth')!.getBoundingClientRect();
        const next = document.querySelector('#nextMonth')!.getBoundingClientRect();
        return { headingBottom: heading.bottom, previousTop: previous.top, nextTop: next.top,
          left: Math.min(heading.left, previous.left, next.left), right: Math.max(heading.right, previous.right, next.right),
          overflow: document.documentElement.scrollWidth - innerWidth };
      });
      expect(layout.headingBottom).toBeLessThanOrEqual(layout.previousTop);
      expect(layout.headingBottom).toBeLessThanOrEqual(layout.nextTop);
      expect(layout.left).toBeGreaterThanOrEqual(0);
      expect(layout.right).toBeLessThanOrEqual(320);
      expect(layout.overflow).toBe(0);
    }
    expect(await page.locator('.skip-link').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThan(0);
    await page.locator('.skip-link').focus();
    await expect.poll(() => page.locator('.skip-link').evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
      const colors = await page.locator('.skip-link').evaluate(element => ({
        text: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor,
      }));
      expect(contrast(colors.text, colors.background), `${route} ${theme} skip-link contrast`).toBeGreaterThanOrEqual(4.5);
    }
    expect(externalFonts).toEqual([]);
  });
}

test('day-theme focus has a contrasting outline and halo on the Visit directions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/plan-visit.html');
  const link = page.locator('.visit-summary-directions');
  await link.focus();
  await expect(link).toHaveCSS('outline-width', '3px');
  await expect(link).toHaveCSS('outline-offset', '3px');
  await expect(link).toHaveCSS('outline-color', 'rgb(29, 78, 216)');
  await expect(link).toHaveCSS('box-shadow', 'rgb(255, 255, 255) 0px 0px 0px 3px');
  const surface = await page.locator('.visit-summary').evaluate(element => getComputedStyle(element).backgroundColor);
  expect(contrast('rgb(29, 78, 216)', surface)).toBeGreaterThanOrEqual(3);
});

test('featured event CTAs keep navy labels on gold in interactive states and both themes', async ({ page }) => {
  await page.route('**/event-flip-cards.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto('/index.html');
  await page.addStyleTag({ content: `
    #featured-events .flip-card { position: relative; left: auto; top: auto; opacity: 1; transform: none !important; }
    #featured-events .flip-card-inner { transform: rotateY(180deg) !important; }
    #featured-events .flip-cards-container { height: auto; gap: 16px; }
    #featured-events .flip-sticky-wrapper { height: auto; padding-bottom: 32px; }
  ` });
  const links = page.locator('#featured-events .card-button');
  await expect(links).toHaveCount(4);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
    for (const link of await links.all()) {
      await expect(link).toHaveCSS('color', 'rgb(16, 32, 51)');
      await expect(link).toHaveCSS('-webkit-text-fill-color', 'rgb(16, 32, 51)');
      await expect(link).toHaveCSS('background-color', 'rgb(230, 184, 78)');
    }
    await page.locator('#featured-events .flip-card').first().hover();
    await links.first().hover();
    await expect(links.first()).toHaveCSS('color', 'rgb(16, 32, 51)');
    await page.mouse.down();
    await expect(links.first()).toHaveCSS('color', 'rgb(16, 32, 51)');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await links.first().focus();
    await expect(links.first()).toHaveCSS('color', 'rgb(16, 32, 51)');
    await expect(links.first()).toHaveCSS('-webkit-text-fill-color', 'rgb(16, 32, 51)');
  }
});

test('Visit language labels use their own language rather than their visibility state', async ({ page }) => {
  await page.goto('/plan-visit.html');
  const bengali = page.locator('[data-site-language="bn"]');
  const english = page.locator('[data-site-language="en"]');
  await expect(bengali).toHaveText('বাংলা');
  await expect(bengali).toHaveAttribute('lang', 'bn');
  await expect(bengali).toHaveCSS('font-family', /^"Noto Sans Bengali",/);
  await expect(english).toHaveText('English');
  await expect(english).toHaveAttribute('lang', 'en');
  await expect(english).toHaveCSS('font-family', 'Inter, "Noto Sans Bengali", system-ui, sans-serif');
  await expect.poll(() => page.locator('#addToGoogleCal').getAttribute('href')).not.toBe('#');
  await bengali.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(english).toBeVisible();
  await expect(english).toHaveCSS('font-family', 'Inter, "Noto Sans Bengali", system-ui, sans-serif');
});

test('shared controls remain usable when font downloads fail', async ({ page }) => {
  await page.route('**/assets/fonts/**/*.woff2', route => route.abort());
  await page.goto('/prayer-request.html');
  const input = page.locator('#prayer-name');
  await input.fill('Fallback font');
  await expect(input).toHaveValue('Fallback font');
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.locator('h1').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(0);
});

test('Visit Sunday Worship highlight heading uses Bengali typography in Bangla mode', async ({ page }) => {
  await page.goto('/plan-visit.html');
  await page.locator('[data-site-language="bn"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  const heading = page.locator('#upcomingHighlights .sunday-worship h3:visible');
  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveText('রবিবার উপাসনা সেবা');
  expect(await heading.evaluate(node => node.matches(':lang(bn)'))).toBe(true);
  expect(await heading.evaluate(node => getComputedStyle(node).fontFamily)).toMatch(/^"?Noto Sans Bengali/);
});
