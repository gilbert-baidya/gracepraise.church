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
        await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' }).catch(e => null);
        await page.waitForTimeout(1000);

        // Find what element is at the center of the menu button
        const rect = await page.locator('.mobile-menu-btn').boundingBox();
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;

        const hitNode = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                outerHTML: el.outerHTML.substring(0, 150)
            };
        }, { x, y });

        console.log('Element overlapping the button:', hitNode);

        // Verify z-index of button vs the overlapping element
        const zIndexes = await page.evaluate(({ x, y }) => {
            const btn = document.querySelector('.mobile-menu-btn');
            const btnStyle = window.getComputedStyle(btn);
            const el = document.elementFromPoint(x, y);
            const elStyle = window.getComputedStyle(el);
            return {
                buttonZ: btnStyle.zIndex,
                hitNodeZ: elStyle.zIndex
            };
        }, { x, y });
        console.log('Z-Indexes:', zIndexes);

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
