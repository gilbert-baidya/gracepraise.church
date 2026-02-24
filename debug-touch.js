const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
    });
    const page = await context.newPage();
    try {
        await page.goto('http://localhost:8080/calendar.html', { waitUntil: 'load' });

        // Wait for js init
        await page.waitForTimeout(1000);

        console.log('--- Initial State ---');
        console.log('Nav classes:', await page.locator('.nav-links').getAttribute('class'));

        const btnBox = await page.locator('.mobile-menu-btn').boundingBox();
        console.log('Button box:', btnBox);

        // Click it using Playwright's simulated touch/click
        console.log('Initiating Playwright tap/click on .mobile-menu-btn...');
        await page.locator('.mobile-menu-btn').tap();

        await page.waitForTimeout(500); // Wait for transitions

        const classAfter = await page.locator('.nav-links').getAttribute('class');
        console.log('Nav classes after tap:', classAfter);

        if (!classAfter.includes('mobile-open')) {
            console.log('BUG DETECTED: Tap failed to open menu!');

            // Let's see if there is an overlapping element using pointer-events
            const overlay = await page.evaluate((box) => {
                const el = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
                return el ? el.outerHTML.substring(0, 100) : 'none';
            }, btnBox);
            console.log('Element at click coordinates:', overlay);
        } else {
            console.log('Menu opened successfully upon tap!');
        }

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
