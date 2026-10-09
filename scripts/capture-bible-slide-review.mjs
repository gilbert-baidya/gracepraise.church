import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'bible-slide-builder', 'review-artifacts');
const origin = process.env.BASE_URL || 'http://127.0.0.1:8080';
const names = [
    '01-bangla-psalm-shepherds-peace.png',
    '02-bilingual-psalm-river-of-grace.png',
    '03-john-word-and-light.png',
    '04-long-passage-pagination.png',
    '05-bangla-heritage.png',
    '06-shepherds-peace.png',
    '07-communion-table.png',
    '08-bethlehem-night.png',
    '09-sacred-minimal.png'
];

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage({ viewport: { width: 1680, height: 1020 }, deviceScaleFactor: 1 });
    await page.goto(`${origin}/bible-slide-builder/review.html`, { waitUntil: 'networkidle' });
    await page.locator('.review-card').nth(8).waitFor({ state: 'visible' });
    await page.addStyleTag({ content: `
        .builder-header, .review-heading { display:none !important; }
        .review-main { width:1600px !important; padding:0 !important; }
        .review-gallery { display:block !important; }
        .review-card { width:1600px !important; margin:0 !important; border:0 !important; border-radius:0 !important; }
        .review-card__heading { display:none !important; }
        .review-frame { width:1600px !important; height:900px !important; }
        .scripture-canvas { transform:none !important; }
    ` });
    for (const [index, name] of names.entries()) {
        const card = page.locator('.review-card').nth(index);
        await card.scrollIntoViewIfNeeded();
        await card.locator('.scripture-canvas').screenshot({ path: path.join(output, name) });
    }
} finally {
    await browser.close();
}

console.log(`Captured ${names.length} Bible Slide Builder review PNGs in ${path.relative(root, output)}/`);
