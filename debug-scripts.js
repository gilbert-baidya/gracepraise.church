const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen for all network requests to see what JS is loaded
    const jsFiles = [];
    page.on('response', response => {
        if (response.request().resourceType() === 'script') {
            jsFiles.push(response.url());
        }
    });

    try {
        await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
        console.log('JS scripts loaded:');
        jsFiles.forEach(url => {
            if (url.includes('ocalhost')) {
                console.log(url.split('localhost:8080/')[1]);
            } else {
                console.log(url);
            }
        });

        // Also check document.scripts
        const scripts = await page.evaluate(() => {
            return Array.from(document.scripts).map(s => s.src);
        });
        console.log('\nScripts in DOM:');
        scripts.forEach(s => console.log(s ? s.split('localhost:8080/')[1] : 'inline'));
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
