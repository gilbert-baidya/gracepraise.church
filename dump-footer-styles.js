const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await page.goto('http://localhost:8080/index.html');
        await page.waitForTimeout(2000);

        const footerInfo = await page.evaluate(() => {
            const footer = document.querySelector('.site-footer');
            const ctaBand = document.querySelector('.footer-cta-band');
            const mainGrid = document.querySelector('.footer-main-grid');

            return {
                footerBg: window.getComputedStyle(footer).backgroundColor,
                footerBgImage: window.getComputedStyle(footer).backgroundImage,
                ctaBg: window.getComputedStyle(ctaBand).backgroundColor,
                ctaBgImage: window.getComputedStyle(ctaBand).backgroundImage,
                gridBg: window.getComputedStyle(mainGrid).backgroundColor,
                gridBgImage: window.getComputedStyle(mainGrid).backgroundImage,
            };
        });

        console.log(JSON.stringify(footerInfo, null, 2));

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
