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
        await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle', timeout: 8000 }).catch(e => console.log('goto timeout'));
        await page.waitForTimeout(1000);

        await page.screenshot({ path: '/Users/gbaidya/.gemini/antigravity/brain/aed0d3c0-ade4-43cd-96dd-dbfadc581c5f/mobile_before.png', fullPage: true });

        await page.locator('.mobile-menu-btn').tap();
        await page.waitForTimeout(1000); // let menu slide in

        await page.screenshot({ path: '/Users/gbaidya/.gemini/antigravity/brain/aed0d3c0-ade4-43cd-96dd-dbfadc581c5f/mobile_after.png', fullPage: true });

        console.log('Screenshots saved.');
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
