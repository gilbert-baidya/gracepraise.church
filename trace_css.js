const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto('http://localhost:8080/lent-fasting.html?day=3', { waitUntil: 'networkidle' });

    // Evaluate computed styles for the text elements
    const result = await page.evaluate(() => {
        const el = document.getElementById('verseText');
        if (!el) return 'Element not found';

        // Find the matching CSS rule
        let matchedRule = null;
        let stylesheetHref = null;

        for (let i = 0; i < document.styleSheets.length; i++) {
            let sheet = document.styleSheets[i];
            try {
                let rules = sheet.cssRules || sheet.rules;
                for (let j = 0; j < rules.length; j++) {
                    if (rules[j].selectorText && el.matches(rules[j].selectorText)) {
                        if (rules[j].style.display === 'none') {
                            matchedRule = rules[j].cssText;
                            stylesheetHref = sheet.href;
                        }
                    }
                }
            } catch (e) {
                // CORS error on foreign stylesheets
            }
        }

        return {
            inlineStyleDisplay: el.style.display,
            computedDisplay: window.getComputedStyle(el).display,
            matchedRule: matchedRule,
            stylesheetHref: stylesheetHref
        };
    });

    console.log(JSON.stringify(result, null, 2));

    await browser.close();
})();
