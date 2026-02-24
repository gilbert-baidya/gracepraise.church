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
        await page.goto('http://localhost:8080/calendar.html', { waitUntil: 'load' });
        await page.waitForTimeout(1000);

        await page.locator('.mobile-menu-btn').tap();
        await page.waitForTimeout(500); // Wait for menu to open

        console.log('Menu opened. Trying to tap "Home" link...');
        const homeLink = page.locator('.nav-links a:has-text("Home")').first();
        const box = await homeLink.boundingBox();
        console.log('Home link box:', box);

        // Wait for potential navigation
        const [response] = await Promise.all([
            page.waitForNavigation({ timeout: 3000 }).catch(e => console.log('No navigation occurred within 3s')),
            homeLink.tap()
        ]);

        if (response) {
            console.log('Successfully navigated to:', page.url());
        }

        // Test dropdown toggle
        await page.goto('http://localhost:8080/calendar.html', { waitUntil: 'load' });
        await page.waitForTimeout(1000);
        await page.locator('.mobile-menu-btn').tap();
        await page.waitForTimeout(500);

        console.log('Trying to tap "About" dropdown toggle...');
        const aboutDropdown = page.locator('.nav-dropdown > a:has-text("About")').first();
        await aboutDropdown.tap();
        await page.waitForTimeout(500);

        const parentClass = await page.locator('.nav-dropdown:has-text("About")').first().getAttribute('class');
        console.log('About dropdown classes after tap:', parentClass);
        if (parentClass.includes('mobile-dropdown-open')) {
            console.log('Dropdown opened successfully!');
        } else {
            console.log('Dropdown failed to open.');
        }

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
})();
