const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await page.goto('http://localhost:8080/index.html');
        await page.waitForTimeout(2000);

        // Scroll to the footer
        const footer = page.locator('.site-footer');
        if (await footer.count() > 0) {
            await footer.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            await footer.screenshot({ path: '/Users/gbaidya/.gemini/antigravity/brain/aed0d3c0-ade4-43cd-96dd-dbfadc581c5f/footer-glowing.png' });
            console.log('Saved footer screenshot.');
        } else {
            console.log('Footer not found.');
        }

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
