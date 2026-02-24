const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:8080/calendar.html', { waitUntil: 'networkidle' });

    // Wait a bit for JS to init
    await page.waitForTimeout(1000);

    const btn = page.locator('.mobile-menu-btn');
    const box = await btn.boundingBox();
    console.log('Mobile (390px) Button Box:', box);

    // Check what element is at the center of the button
    if (box) {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const targetHandle = await page.evaluateHandle(({ x, y }) => document.elementFromPoint(x, y), { x: cx, y: cy });
        const targetTag = await targetHandle.evaluate(el => el.tagName + '.' + el.className);
        console.log('Element at button center:', targetTag);
    }

    try {
        await btn.click({ timeout: 2000 });
        console.log('Clicked gracefully.');
    } catch (e) {
        console.log('Graceful click failed:', e.message);
    }

    const classes = await page.locator('.nav-links').getAttribute('class');
    console.log('Nav-links classes after click:', classes);

    // Now try iPad
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:8080/calendar.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('\n--- iPad (768px) ---');
    const btnTablet = page.locator('.mobile-menu-btn');
    const boxTablet = await btnTablet.boundingBox();
    console.log('Tablet Button Box:', boxTablet);

    if (boxTablet) {
        const cx = boxTablet.x + boxTablet.width / 2;
        const cy = boxTablet.y + boxTablet.height / 2;
        const targetHandle = await page.evaluateHandle(({ x, y }) => document.elementFromPoint(x, y), { x: cx, y: cy });
        const targetTag = await targetHandle.evaluate(el => el.tagName + '.' + el.className);
        console.log('Element at button center:', targetTag);
    }

    try {
        await btnTablet.click({ timeout: 2000 });
        console.log('Clicked gracefully.');
    } catch (e) {
        console.log('Graceful click failed:', e.message);
    }

    const classesTablet = await page.locator('.nav-links').getAttribute('class');
    console.log('Nav-links classes after click:', classesTablet);

    await browser.close();
})();
