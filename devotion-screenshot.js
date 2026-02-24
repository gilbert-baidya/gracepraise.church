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
        await page.goto('http://localhost:8080/daily-devotion.html', { waitUntil: 'load', timeout: 5000 }).catch(e => null);
        await page.waitForTimeout(2000); // Let devotion loader inject content

        // Scroll to scripture section
        const element = page.locator('#scriptureSection');
        await element.scrollIntoViewIfNeeded();

        // Capture screenshot of that specific element instead of full page
        await element.screenshot({ path: '/Users/gbaidya/.gemini/antigravity/brain/aed0d3c0-ade4-43cd-96dd-dbfadc581c5f/scripture-mobile.png' });

        // Or full viewport after scrolling
        await page.screenshot({ path: '/Users/gbaidya/.gemini/antigravity/brain/aed0d3c0-ade4-43cd-96dd-dbfadc581c5f/devotion-mobile-viewport.png' });

        console.log('Saved screenshots.');
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
