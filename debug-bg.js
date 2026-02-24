const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'dark'
    });
    const page = await context.newPage();
    try {
        await page.goto('http://localhost:8080/daily-devotion.html', { waitUntil: 'load' }).catch(e => null);
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.classList.add('dark');
        });
        await page.waitForTimeout(500);

        const bgInfo = await page.evaluate(() => {
            function getBg(el) {
                return window.getComputedStyle(el).background;
            }
            return {
                html: getBg(document.documentElement),
                body: getBg(document.body),
                devotionContainer: document.querySelector('.devotion-container') ? getBg(document.querySelector('.devotion-container')) : 'null',
                scriptureSection: document.querySelector('#scriptureSection') ? getBg(document.querySelector('#scriptureSection')) : 'null',
                bodyId: document.body.id,
                bodyClasses: document.body.className
            };
        });

        console.log("Background rules in dark mode:", bgInfo);
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
