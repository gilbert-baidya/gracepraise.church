/**
 * Autonomous Visual Tour & Screenshot Audit Script
 * Target: http://localhost:8080
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outputDir = path.join(__dirname, '..', 'visual-audit-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('1. Navigating to Hero section on index.html...');
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outputDir, '01-hero-landing.png'), fullPage: false });
  console.log('Saved 01-hero-landing.png');

  console.log('2. Scrolling to Community Stat counters...');
  const statsEl = page.locator('#about .stats');
  await statsEl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2200); // Allow counter animation to finish
  await page.screenshot({ path: path.join(outputDir, '02-animated-counters.png'), fullPage: false });
  console.log('Saved 02-animated-counters.png');

  console.log('3. Triggering Sermon Audio Player...');
  await page.evaluate(() => {
    window.playSermon({
      title: 'Walking in the Light of Christ',
      speaker: 'Pastor Gilbert Baidya',
      passage: '1 John 1:5-10',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      coverImg: 'images/community-worship.png'
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outputDir, '03-sermon-player-active.png'), fullPage: false });
  console.log('Saved 03-sermon-player-active.png');

  console.log('4. Navigating to songbook.html and testing Accessible Modals...');
  await page.goto('http://localhost:8080/songbook.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('.song-card');
  await page.click('.song-card:first-child');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, '04-accessible-modals.png'), fullPage: false });
  console.log('Saved 04-accessible-modals.png');

  await browser.close();
  console.log('Visual audit complete.');
})();
