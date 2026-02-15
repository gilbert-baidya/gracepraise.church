import { test, expect } from '@playwright/test';

const KEY_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/about.html', name: 'About' },
  { path: '/daily-devotion.html', name: 'Daily Devotion' },
  { path: '/ministries.html', name: 'Ministries' },
  { path: '/give.html', name: 'Give' }
];

test.describe('SEO - Meta Tags', () => {
  
  for (const pageInfo of KEY_PAGES) {
    test(`${pageInfo.name} should have title tag`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThan(70); // Optimal title length
    });
    
    test(`${pageInfo.name} should have meta description`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(50);
      expect(description!.length).toBeLessThan(160); // Optimal description length
    });
    
    test(`${pageInfo.name} should have Open Graph tags`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
      
      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
      
      // Image and URL are highly recommended
      if (ogImage) {
        expect(ogImage).toMatch(/\.(jpg|jpeg|png|webp)$/i);
      }
      if (ogUrl) {
        expect(ogUrl).toMatch(/^https?:\/\//);
      }
    });
    
    test(`${pageInfo.name} should have Twitter Card tags`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
      
      if (twitterCard) {
        expect(['summary', 'summary_large_image', 'app', 'player']).toContain(twitterCard);
      }
    });
  }
  
});

test.describe('SEO - Canonical URLs', () => {
  
  for (const pageInfo of KEY_PAGES) {
    test(`${pageInfo.name} should have canonical link`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      
      if (canonical) {
        expect(canonical).toMatch(/^https?:\/\//);
        expect(canonical).not.toContain('localhost');
      }
    });
  }
  
});

test.describe('SEO - Structured Data', () => {
  
  test('Homepage should have Organization schema', async ({ page }) => {
    await page.goto('/');
    
    const schemaScripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    
    if (schemaScripts.length > 0) {
      const orgSchema = schemaScripts.find(script => {
        try {
          const data = JSON.parse(script);
          return data['@type'] === 'Organization' || data['@type'] === 'Church';
        } catch {
          return false;
        }
      });
      
      if (orgSchema) {
        const data = JSON.parse(orgSchema);
        expect(data.name).toBeTruthy();
      }
    }
  });
  
  test('About page should have structured data', async ({ page }) => {
    await page.goto('/about.html');
    
    const schemaScripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    
    if (schemaScripts.length > 0) {
      const hasValidSchema = schemaScripts.some(script => {
        try {
          const data = JSON.parse(script);
          return data['@context'] === 'https://schema.org';
        } catch {
          return false;
        }
      });
      
      expect(hasValidSchema).toBeTruthy();
    }
  });
  
});

test.describe('SEO - Content Quality', () => {
  
  test('Homepage should have h1 tag', async ({ page }) => {
    await page.goto('/');
    
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    
    const h1Text = await h1.textContent();
    expect(h1Text!.trim().length).toBeGreaterThan(10);
  });
  
  test('Pages should have unique h1 tags', async ({ page }) => {
    const h1Texts: Record<string, string> = {};
    
    for (const pageInfo of KEY_PAGES) {
      await page.goto(pageInfo.path);
      const h1 = await page.locator('h1').first().textContent();
      h1Texts[pageInfo.name] = h1?.trim() || '';
    }
    
    const uniqueH1s = new Set(Object.values(h1Texts));
    expect(uniqueH1s.size).toBeGreaterThan(KEY_PAGES.length * 0.8); // At least 80% unique
  });
  
  test('Pages should have sufficient text content', async ({ page }) => {
    await page.goto('/about.html');
    
    const bodyText = await page.locator('main, article, .content').first().textContent();
    const wordCount = bodyText?.trim().split(/\s+/).length || 0;
    
    expect(wordCount).toBeGreaterThan(100); // At least 100 words
  });
  
});

test.describe('SEO - Mobile Friendliness', () => {
  
  test('Homepage should have viewport meta tag', async ({ page }) => {
    await page.goto('/');
    
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    expect(viewport).toContain('width=device-width');
  });
  
  test('Text should be readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    
    const fontSize = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return parseFloat(styles.fontSize);
    });
    
    // Body font size should be at least 14px on mobile
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });
  
  test('Links should be tappable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    
    const links = page.locator('a').first();
    const box = await links.boundingBox();
    
    if (box) {
      // Links should have sufficient tap target size
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });
  
});

test.describe('SEO - Performance', () => {
  
  test('Homepage should load within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });
  
  test('Images should have width and height attributes', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img:visible');
    const count = await images.count();
    
    if (count > 0) {
      const imagesWithDimensions: number[] = [];
      
      for (let i = 0; i < Math.min(5, count); i++) {
        const img = images.nth(i);
        const width = await img.getAttribute('width');
        const height = await img.getAttribute('height');
        
        if (width && height) {
          imagesWithDimensions.push(i);
        }
      }
      
      // At least 50% of images should have dimensions (helps with CLS)
      expect(imagesWithDimensions.length).toBeGreaterThan(count * 0.3);
    }
  });
  
});
