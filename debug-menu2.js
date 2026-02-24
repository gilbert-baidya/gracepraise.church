const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('http://localhost:8080/calendar.html', { waitUntil: 'load', timeout: 5000 }).catch(e => console.log('goto timeout caught, proceeding.'));
        await page.waitForTimeout(2000); // let JS run

        const btnBox = await page.locator('.mobile-menu-btn').boundingBox();
        console.log('Mobile (390px) Box:', btnBox);

        if (btnBox) {
            const result = await page.evaluate((b) => {
                const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
                return el ? { tag: el.tagName, class: el.className, id: el.id } : null;
            }, btnBox);
            console.log('Top element over button:', result);
        }

        // Check if there are error logs locally
        const isAnimatingVal = await page.evaluate(() => typeof isAnimating !== 'undefined' ? isAnimating : 'unknown');
        console.log('isAnimating global var:', isAnimatingVal);

        console.log('Clicking button directly via JS event to test logic...');
        const clickResult = await page.evaluate(() => {
            document.querySelector('.mobile-menu-btn').click();
            return document.querySelector('.nav-links').className;
        });
        console.log('Nav classes after JS click:', clickResult);

    } catch (e) {
        console.error('Test error:', e);
    } finally {
        await browser.close();
    }
})();
