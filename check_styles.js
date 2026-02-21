const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto('http://localhost:8080/lent-fasting.html?day=3', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Evaluate computed styles for the text elements
    const styles = await page.evaluate(() => {
        const getStyles = (id) => {
            const el = document.getElementById(id);
            if (!el) return 'Element not found';
            const comp = window.getComputedStyle(el);
            return {
                text: el.textContent.substring(0, 30) + (el.textContent.length > 30 ? '...' : ''),
                color: comp.color,
                opacity: comp.opacity,
                visibility: comp.visibility,
                display: comp.display,
                zIndex: comp.zIndex,
                fontSize: comp.fontSize,
                lineHeight: comp.lineHeight,
                className: el.className
            };
        };

        return {
            verseText: getStyles('verseText'),
            reflectionText: getStyles('reflectionText'),
            prayerText: getStyles('prayerText'),
            theme: document.body.getAttribute('data-theme'),
            bodyBg: window.getComputedStyle(document.body).backgroundColor
        };
    });

    console.log(JSON.stringify(styles, null, 2));

    await browser.close();
})();
