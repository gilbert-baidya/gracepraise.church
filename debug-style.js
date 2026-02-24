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
        await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle', timeout: 5000 }).catch(e => null);

        await page.locator('.mobile-menu-btn').tap();
        await page.waitForTimeout(500); // let menu slide in

        const navLinksStyle = await page.evaluate(() => {
            const el = document.querySelector('.nav-links');
            const style = window.getComputedStyle(el);
            return {
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                transform: style.transform,
                position: style.position,
                zIndex: style.zIndex,
                width: style.width,
                height: style.height,
                pointerEvents: style.pointerEvents,
                right: style.right,
                left: style.left
            };
        });

        console.log('Nav Links Computed Style:', navLinksStyle);

        // Also check if `.nav-links.mobile-open` exists
        const hasClass = await page.evaluate(() => document.querySelector('.nav-links').classList.contains('mobile-open'));
        console.log('Has mobile-open class:', hasClass);

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
