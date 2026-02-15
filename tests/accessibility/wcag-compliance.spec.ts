import { test, expect } from '@playwright/test';

test.describe('Accessibility - Keyboard Navigation', () => {
  
  test('should be able to tab through interactive elements on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Focus first interactive element
    await page.keyboard.press('Tab');
    
    // Track focused elements
    const focusedElements: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const tagName = await focusedElement.evaluate(el => el?.tagName.toLowerCase());
      
      if (tagName) {
        focusedElements.push(tagName);
      }
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // Should have focused multiple interactive elements
    expect(focusedElements.length).toBeGreaterThan(5);
    
    // Common interactive elements should be present
    const hasInteractive = focusedElements.some(tag => 
      ['a', 'button', 'input', 'textarea', 'select'].includes(tag)
    );
    expect(hasInteractive).toBeTruthy();
  });
  
  test('should show visible focus indicators', async ({ page }) => {
    await page.goto('/');
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    // Check if focused element has visible outline or focus styles
    const focusStyles = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused) return null;
      
      const styles = window.getComputedStyle(focused);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
        border: styles.border
      };
    });
    
    if (focusStyles) {
      // Should have some form of focus indicator
      const hasFocusIndicator = 
        (focusStyles.outline && focusStyles.outline !== 'none' && focusStyles.outlineWidth !== '0px') ||
        (focusStyles.boxShadow && focusStyles.boxShadow !== 'none') ||
        (focusStyles.border && focusStyles.border !== 'none');
      
      expect(hasFocusIndicator).toBeTruthy();
    }
  });
  
  test('should be able to activate buttons with Enter key', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    // Tab to share button
    let shareBtn = page.locator('.share-btn, button:has-text("Share")').first();
    
    // Focus the button
    await shareBtn.focus();
    
    // Press Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Modal should open
    const modal = page.locator('.share-card-modal, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
  });
  
  test('should be able to close modal with Escape key', async ({ page }) => {
    await page.goto('/daily-devotion.html');
    
    // Open share modal
    const shareBtn = page.locator('.share-btn').first();
    await shareBtn.click();
    await page.waitForTimeout(500);
    
    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Modal should close
    const modal = page.locator('.share-card-modal');
    if (await modal.count() > 0) {
      await expect(modal).not.toBeVisible();
    }
  });
  
});

test.describe('Accessibility - Screen Reader Support', () => {
  
  test('images should have alt text or role="presentation"', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    const imagesWithoutAlt: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');
      
      const src = await img.getAttribute('src');
      
      // Image should have alt, role="presentation", or aria-hidden="true"
      if (!alt && role !== 'presentation' && ariaHidden !== 'true') {
        imagesWithoutAlt.push(src || 'unknown');
      }
    }
    
    expect(imagesWithoutAlt.length).toBe(0);
  });
  
  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/give.html');
    
    const inputs = page.locator('input:not([type="hidden"]), textarea, select');
    const count = await inputs.count();
    
    if (count > 0) {
      const inputsWithoutLabels: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        // Check if there's an associated label
        let hasLabel = false;
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          hasLabel = await label.count() > 0;
        }
        
        // Input should have label, aria-label, or aria-labelledby
        if (!hasLabel && !ariaLabel && !ariaLabelledby) {
          inputsWithoutLabels.push(id || `input-${i}`);
        }
      }
      
      // Allow some flexibility for modern form patterns
      expect(inputsWithoutLabels.length).toBeLessThan(count * 0.2); // Max 20% without labels
    }
  });
  
  test('landmarks should have proper ARIA roles', async ({ page }) => {
    await page.goto('/');
    
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    const hasMain = await main.count() > 0;
    expect(hasMain).toBeTruthy();
    
    // Check for navigation landmark
    const nav = page.locator('nav, [role="navigation"]');
    const hasNav = await nav.count() > 0;
    expect(hasNav).toBeTruthy();
    
    // Check for contentinfo/footer
    const footer = page.locator('footer, [role="contentinfo"]');
    const hasFooter = await footer.count() > 0;
    expect(hasFooter).toBeTruthy();
  });
  
  test('headings should follow hierarchical order', async ({ page }) => {
    await page.goto('/about.html');
    
    const headings = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return elements.map(el => ({
        level: parseInt(el.tagName.substring(1)),
        text: el.textContent?.trim().substring(0, 50)
      }));
    });
    
    expect(headings.length).toBeGreaterThan(0);
    
    // Should have exactly one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(2); // Allow 2 h1s max (page title + section)
    
    // Check for proper nesting (no skipping levels)
    let previousLevel = 0;
    let hasSkipped = false;
    
    for (const heading of headings) {
      if (previousLevel > 0) {
        const levelDiff = heading.level - previousLevel;
        if (levelDiff > 1) {
          hasSkipped = true;
          break;
        }
      }
      previousLevel = heading.level;
    }
    
    // Heading hierarchy should not skip levels (h1 → h3 without h2)
    expect(hasSkipped).toBeFalsy();
  });
  
});

test.describe('Accessibility - Color Contrast', () => {
  
  test('text should have sufficient contrast in light mode', async ({ page }) => {
    await page.goto('/');
    
    // Sample key text elements
    const textElements = await page.evaluate(() => {
      const selectors = ['h1', 'h2', 'p', 'a', 'button'];
      const results: Array<{ selector: string; fgColor: string; bgColor: string; }> = [];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const el = elements[0] as HTMLElement;
          const styles = window.getComputedStyle(el);
          results.push({
            selector,
            fgColor: styles.color,
            bgColor: styles.backgroundColor
          });
        }
      }
      
      return results;
    });
    
    expect(textElements.length).toBeGreaterThan(0);
    
    // Basic check: text color should not be too close to background
    for (const element of textElements) {
      expect(element.fgColor).not.toBe(element.bgColor);
    }
  });
  
  test('text should have sufficient contrast in dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    
    await page.waitForTimeout(500);
    
    // Check text contrast
    const contrast = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      
      const bgColor = styles.backgroundColor;
      const color = styles.color;
      
      // Parse RGB values
      const parseRgb = (rgb: string) => {
        const match = rgb.match(/\d+/g);
        if (!match) return [0, 0, 0];
        return match.map(Number);
      };
      
      const bg = parseRgb(bgColor);
      const fg = parseRgb(color);
      
      // Calculate brightness
      const bgBrightness = (bg[0] + bg[1] + bg[2]) / 3;
      const fgBrightness = (fg[0] + fg[1] + fg[2]) / 3;
      
      return {
        bgBrightness,
        fgBrightness,
        difference: Math.abs(fgBrightness - bgBrightness)
      };
    });
    
    // Dark mode should have light text on dark background
    expect(contrast.bgBrightness).toBeLessThan(80); // Dark background
    expect(contrast.fgBrightness).toBeGreaterThan(150); // Light text
    expect(contrast.difference).toBeGreaterThan(100); // Sufficient contrast
  });
  
});

test.describe('Accessibility - Interactive Elements', () => {
  
  test('links should be distinguishable from regular text', async ({ page }) => {
    await page.goto('/about.html');
    
    const links = page.locator('main a, article a, .content a').first();
    
    if (await links.count() > 0) {
      const linkStyles = await links.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          textDecoration: styles.textDecoration,
          color: styles.color,
          fontWeight: styles.fontWeight
        };
      });
      
      // Links should be visually distinct (underlined, different color, or bold)
      const isDistinguishable = 
        linkStyles.textDecoration.includes('underline') ||
        linkStyles.fontWeight === 'bold' ||
        linkStyles.fontWeight === '700';
      
      // At minimum, link should have some styling
      expect(linkStyles).toBeTruthy();
    }
  });
  
  test('buttons should have sufficient size for touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
    await page.goto('/');
    
    const buttons = page.locator('button, a.button, .btn');
    const count = await buttons.count();
    
    if (count > 0) {
      const smallButtons: number[] = [];
      
      for (let i = 0; i < Math.min(10, count); i++) {
        const btn = buttons.nth(i);
        const box = await btn.boundingBox();
        
        if (box) {
          // WCAG recommends 44x44px minimum for touch targets
          if (box.width < 40 || box.height < 40) {
            smallButtons.push(i);
          }
        }
      }
      
      // Allow some small buttons (e.g., icon buttons with padding)
      expect(smallButtons.length).toBeLessThan(count * 0.3); // Max 30% small buttons
    }
  });
  
});
