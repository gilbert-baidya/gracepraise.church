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
        await page.goto('http://localhost:8080/index.html', { waitUntil: 'load', timeout: 5000 }).catch(e => null);
        await page.waitForTimeout(1000); // Let page load fully

        // Tap button
        await page.locator('.mobile-menu-btn').tap();
        await page.waitForTimeout(1000); // wait for menu to animate

        // Check if visible
        const hasClass = await page.evaluate(() => document.querySelector('.nav-links').classList.contains('mobile-open'));
        console.log('mobile-open class is applied:', hasClass);

        await page.screenshot({ path: '/Users/gbaidya/.gemini/antigravity/brain/aed0d3c0-ade4-43cd-96dd-dbfadc581c5f/mobile_after_fix.png', fullPage: true });
        console.log('Saved fixed screenshot');
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
