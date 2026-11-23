import { test, expect } from '@playwright/test';

const contrastPages = `about.html beliefs.html bible-slide-builder/index.html calendar.html
children-devotion.html core-values.html family-devotion.html fasting-21days.html fasting-30days.html
fasting-40days.html gratitude-fasting.html history.html kids/games/index.html leadership.html lent-fasting.html
ministries.html ministries/index.html ministries/bible-study.html ministries/community-development.html
ministries/homeless-ministry.html ministries/hospital-ministry.html ministries/kids-ministry.html
ministries/men-fellowship.html ministries/mission-outreach.html ministries/prison-ministry.html
ministries/support-missionaries.html ministries/worship-ministry.html ministries/youth-ministry.html
mission.html pastor/index.html plan-visit.html position-papers.html sms-opt-in.html songbook.html
testimonies.html youth-devotion.html youth/games/index.html`.split(/\s+/);
const bengaliPages = `about.html beliefs.html bible-reader.html children-devotion.html contact.html
core-values.html couples-devotion.html family-devotion.html fasting-21days.html fasting-30days.html
gallery.html gratitude-fasting.html history.html kids/games/index.html leadership.html ministries.html
ministries/bible-study.html ministries/community-development.html ministries/homeless-ministry.html
ministries/hospital-ministry.html ministries/kids-ministry.html ministries/men-fellowship.html
ministries/mission-outreach.html ministries/prison-ministry.html ministries/support-missionaries.html
ministries/worship-ministry.html ministries/youth-ministry.html mission.html pastor/index.html
position-papers.html privacy-policy.html sms-opt-in.html terms-conditions.html testimonies.html
youth-devotion.html youth/games/index.html`.split(/\s+/);
const gutterPages = ['beliefs.html', 'daily-devotion.html', 'leadership.html', 'mission.html',
  'plan-visit.html', 'position-papers.html', 'testimonies.html'];
const pages = [...new Set([...contrastPages, ...bengaliPages, ...gutterPages])];

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
test.setTimeout(120_000);

for (const route of pages) {
  for (const language of ['en', 'bn']) {
    test(`QA layout: ${route} ${language}`, async ({ page }) => {
      const externalFonts: string[] = [];
      page.on('request', request => {
        if (request.resourceType() === 'font' && new URL(request.url()).origin !== new URL(page.url()).origin) {
          externalFonts.push(request.url());
        }
      });
      await page.route('https://script.google.com/**', request => request.abort());
      await page.goto('/' + route + '?lang=' + language, {
        waitUntil: route === 'gallery.html' ? 'domcontentloaded' : 'networkidle'
      });
      if (route === 'bible-slide-builder/index.html') await page.waitForURL(/\/songbook\.html/);
      await expect(page.locator('.site-language-choices').first()).toBeAttached();
      await page.evaluate(async () => {
        await document.fonts.load('16px "Noto Sans Bengali"', 'সান বার্নার্ডিনো');
        await document.fonts.ready;
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight * .8) {
          scrollTo({ top: y, behavior: 'instant' });
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        scrollTo({ top: 0, behavior: 'instant' });
      });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => {
          const platform = (window as any).Platform;
          if (platform?.applyTheme) platform.applyTheme(theme);
          else {
            document.documentElement.dataset.theme = theme;
            document.body.dataset.theme = theme;
            document.documentElement.classList.toggle('dark', theme === 'dark');
            document.body.classList.toggle('dark', theme === 'dark');
          }
        }, theme);
        for (const width of [360, 390, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(async () => {
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            for (const animation of document.getAnimations()) {
              if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
            }
          });
          const result = await page.evaluate(options => {
            const parse = (s: string) => {
              const c = (s.match(/[\d.]+/g) || []).map(Number);
              return s.startsWith('color(srgb') ? c.map((v, i) => i < 3 ? v * 255 : v) : c;
            };
            const over = (front: number[], back: number[]) => front.slice(0, 3)
              .map((v, i) => v * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)));
            const luminance = (c: number[]) => c.map(v => v / 255)
              .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
              .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
            const contrastFailures: string[] = [], gutterFailures: string[] = [], fontFailures: string[] = [];
            let checked = 0, bengaliNodes = 0;
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const node = walker.currentNode;
              const element = node.parentElement!;
              const closedDetails = element.closest('details:not([open])');
              if (closedDetails && !closedDetails.querySelector('summary')?.contains(element)) continue;
              const text = node.textContent!.trim();
              if (!/[\p{Letter}\p{Number}]/u.test(text) ||
                  element.closest('script, style, svg, [hidden], [aria-hidden="true"], .sr-only, .visually-hidden, .map-announcement')) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              const box = range.getBoundingClientRect();
              if (!box.width || !box.height) continue;
              const style = getComputedStyle(element);
              if (style.visibility !== 'visible') continue;
              const ancestors: Element[] = [];
              for (let p: Element | null = element; p; p = p.parentElement) ancestors.unshift(p);
              let background = [255, 255, 255], opacity = 1, unknownBackground = false, scrollable = false;
              for (const p of ancestors) {
                const css = getComputedStyle(p);
                opacity *= +css.opacity;
                const color = parse(css.backgroundColor);
                if ((color[3] ?? 1) === 1) unknownBackground = false;
                background = over(color, background);
                if (css.backgroundImage !== 'none') unknownBackground = true;
                if (p !== document.body && p !== document.documentElement &&
                    /auto|scroll/.test(css.overflowX) && p.scrollWidth > p.clientWidth) scrollable = true;
              }
              if (opacity < .9) continue;
              const label = element.tagName + '.' + element.className + ': ' + text.slice(0, 70);
              if (options.fonts && /[\u0980-\u09ff]/.test(text)) {
                bengaliNodes++;
                if (!style.fontFamily.includes('Noto Sans Bengali')) fontFailures.push(label + ' ' + style.fontFamily);
              }
              if (options.gutters && innerWidth < 600 && element.closest('main') && !scrollable &&
                  (box.left < 7.99 || box.right > innerWidth - 7.99)) {
                gutterFailures.push(label + ' ' + JSON.stringify({ left: box.left, right: box.right }));
              }
              if (options.contrast && !unknownBackground) {
                const a = luminance(over(parse(style.color), background)), b = luminance(background);
                const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
                checked++;
                if (ratio < 4.5) contrastFailures.push(label + ' ' + ratio.toFixed(3) + ' ' + style.color + ' / ' + background);
              }
            }
            return { contrastFailures, gutterFailures, fontFailures, checked, bengaliNodes };
          }, { contrast: contrastPages.includes(route), gutters: gutterPages.includes(route),
            fonts: bengaliPages.includes(route) });
          const state = route + ' ' + language + ' ' + theme + ' ' + width;
          expect.soft(result.contrastFailures, state + ' solid-background contrast').toEqual([]);
          expect.soft(result.gutterFailures, state + ' gutters').toEqual([]);
          expect.soft(result.fontFailures, state + ' Bengali stacks').toEqual([]);
          if (contrastPages.includes(route)) expect.soft(result.checked, state).toBeGreaterThan(2);
          if (bengaliPages.includes(route) && language === 'bn') {
            expect.soft(result.bengaliNodes, state).toBeGreaterThan(0);
          }
        }
      }
      expect(externalFonts).toEqual([]);
    });
  }
}

for (const route of ['bible-reader.html', 'calendar.html']) {
  test(`vector icons survive deferred rendering on ${route}`, async ({ page }) => {
    await page.route('https://script.google.com/**', request => request.abort());
    await page.goto('/' + route);
    const icons = page.locator(route === 'bible-reader.html' ? '.book-icon svg[data-decorative-icon="book"]' :
      '.preset-filter svg[data-decorative-icon]');
    await expect.poll(() => icons.count()).toBeGreaterThan(0);
    if (route === 'bible-reader.html') await expect(icons).toHaveCount(66);
    await expect(icons.first()).toHaveAttribute('aria-hidden', 'true');
    await expect(icons.first()).toHaveAttribute('focusable', 'false');
    expect(await icons.first().evaluate(svg => svg.getBoundingClientRect().width)).toBeGreaterThan(0);
    await page.evaluate(() => {
      const fixture = document.createElement('div');
      fixture.id = 'icon-regression';
      fixture.className = 'book-icon';
      fixture.textContent = '© GPBC 📅 বাংলা ক্‍ষ 🇧🇩';
      document.querySelector('main')!.append(fixture);
      const content = document.createElement('p');
      content.id = 'unrelated-content';
      content.textContent = '♿ বাংলা';
      document.body.append(content);
    });
    const fixture = page.locator('#icon-regression');
    await expect(fixture.locator('svg')).toHaveCount(2);
    await expect(fixture).toHaveText('© GPBC  বাংলা ক্‍ষ ');
    await fixture.evaluate(node => { node.textContent = ''; });
    await expect(fixture.locator('svg')).toHaveCount(0);
    await fixture.evaluate(node => { node.textContent = '<img src=x onerror=alert(1)>📅'; });
    await expect(fixture.locator('svg')).toHaveCount(1);
    await expect(fixture.locator('img')).toHaveCount(0);
    await expect(fixture).toHaveText('<img src=x onerror=alert(1)>');
    await expect(page.locator('#unrelated-content')).toHaveText('♿ বাংলা');
    await expect(page.locator('#unrelated-content svg')).toHaveCount(0);
    if (route === 'calendar.html') {
      for (const category of ['gpbc', 'christian', 'special', 'bangladeshi', 'american']) {
        await page.evaluate(category => (window as any).showEventDetail({
          date: '2026-11-25', name: 'Contrast regression', category, description: '♿ Accessible entrance'
        }), category);
        const badge = page.locator('#eventCategory > span');
        await expect(badge).toHaveCSS('background-color', 'rgb(23, 59, 82)');
        await expect(badge).toHaveCSS('color', 'rgb(255, 253, 247)');
        await expect(page.locator('#eventDescription')).toHaveText('♿ Accessible entrance');
        await expect(page.locator('#eventDescription svg')).toHaveCount(0);
      }
    }
  });
}

test('Bengali glyphs use the self-hosted font rather than a missing-glyph fallback', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Platform font attribution requires CDP.');
  await page.goto('/history.html?lang=bn');
  await page.evaluate(async () => {
    const probe = document.createElement('p');
    probe.id = 'bengali-font-probe';
    probe.lang = 'bn';
    probe.textContent = 'সান বার্নার্ডিনো কৃতজ্ঞতার উপবাস ১২৩৪৫৬৭৮৯০ ক্ষ্মি ঁংঃড়ঢ়য়';
    document.body.append(probe);
    await document.fonts.ready;
  });
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  const { root } = await session.send('DOM.getDocument');
  const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#bengali-font-probe' });
  const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) {
    expect(font.isCustomFont).toBe(true);
    expect(font.familyName).toContain('Noto Sans Bengali');
    expect(font.glyphCount).toBeGreaterThan(0);
  }
});
