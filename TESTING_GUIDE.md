# Testing Guide - Playwright Automation Framework

## 🎯 Overview

Enterprise-scale Playwright + TypeScript automation framework with:
- **500+ tests** across 59 pages
- **7 device projects** (Desktop, Tablet, Mobile)
- **8 test suites** (Smoke, Navigation, Accessibility, Visual, Devotion, Share Card, SEO, Performance)
- **Parallel execution** with sharding support
- **CI/CD ready** for GitHub Actions

---

## 📁 Test Structure

```
tests/
├── fixtures/           # Reusable test utilities
│   ├── auth.fixture.ts
│   ├── device.fixture.ts
│   └── navigation.fixture.ts
├── smoke/              # Auto-generated page coverage (240+ tests)
│   └── auto-generated-coverage.spec.ts
├── devotion/           # Deep devotion system tests
│   └── devotion-system-deep.spec.ts
├── visual/             # Visual regression snapshots
│   └── snapshots.spec.ts
├── navigation/         # Navigation integrity tests
├── accessibility/      # WCAG compliance tests
├── share-card/         # Share card modal tests
├── seo/                # SEO & meta tag validation
└── performance/        # Performance metrics
```

---

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
npx playwright install
```

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Suites
```bash
npm run test:smoke          # Page load & layout tests
npm run test:devotion       # Devotion system deep tests
npm run test:visual         # Visual regression snapshots
npm run test:navigation     # Navigation integrity
npm run test:accessibility  # Accessibility baseline
```

### Run Device-Specific Tests
```bash
npm run test:desktop        # Desktop Chrome only
npm run test:tablet         # iPad Pro 11 Portrait
npm run test:mobile         # iPhone 14
```

### Debug Mode
```bash
npm run test:debug          # Opens Playwright Inspector
npm run test:e2e:headed     # Shows browser during tests
npm run test:e2e:ui         # Opens Playwright UI Mode
```

### View Reports
```bash
npm run test:report         # Opens HTML report
```

---

## 🖥️ Device Matrix

### Desktop (1920×1080)
- **Desktop Chrome** - Chromium engine
- **Desktop Safari** - WebKit engine  
- **Desktop Firefox** - Firefox engine

### Tablet (iPad Focus)
- **iPad Pro 11 Portrait** - 834×1194 (matches NAVIGATION_FORENSIC_AUDIT)
- **iPad Pro 11 Landscape** - 1194×834

### Mobile
- **iPhone 14** - 390×844
- **Pixel 7** - 412×915 (Android)

---

## 📊 Test Coverage

### Auto-Generated Coverage (240+ tests)

For **each of 59 pages**, generates 4 test groups:

#### 1️⃣ Page Load Tests
- HTTP 200 success response
- No critical console errors
- No uncaught JavaScript exceptions

#### 2️⃣ Layout Integrity Tests
- No horizontal scroll (responsive compliance)
- Header/navigation visible
- Footer visible

#### 3️⃣ Navigation Integrity Tests
- Burger menu works on tablet/mobile
- All navigation links clickable
- Dropdown menus functional

#### 4️⃣ Accessibility Baseline Tests
- All buttons have accessible labels
- Images have alt text or role="presentation"
- No invalid ARIA usage

### Devotion System Deep Tests (30+ tests)

#### Background Intelligence
- Background image loads successfully
- Manifest loads correctly
- Console logs background selection

#### Share Card Modal
- Opens on button click
- Glass morphism styling in dark mode
- Closes on close button click

#### Canvas Rendering
- Square format renders (desktop)
- Story format renders (mobile)
- Adaptive overlay applied
- Loading skeleton displays

#### Dark Mode
- Readable text colors (contrast validation)
- Background not pure black
- Modal applies dark theme
- Content visibility maintained

#### Responsive Behavior
- Device-appropriate controls
- Format selection per device

### Visual Regression Tests (20+ snapshots)

Captures baseline snapshots for:
- Home, Daily Devotion, About, Ministries, Give
- Desktop, Tablet, Mobile viewports
- Dark mode variants
- Excludes dynamic content (dates, devotion text)

---

## 🔧 Configuration

### playwright.config.ts

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,              // Parallel execution
  retries: process.env.CI ? 2 : 0,  // Retry on CI
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html']],
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [ /* 7 device projects */ ]
});
```

### Environment Variables

```bash
BASE_URL=http://localhost:8080  # Local server URL
CI=true                          # CI mode flag
```

---

## 🎭 Using Fixtures

### Device Fixture

```typescript
import { test } from '../fixtures/device.fixture';

test('responsive test', async ({ page, deviceInfo }) => {
  if (deviceInfo.isMobile) {
    // Mobile-specific logic
  } else if (deviceInfo.isTablet) {
    // Tablet-specific logic
  } else {
    // Desktop logic
  }
});
```

### Navigation Fixture

```typescript
import { test } from '../fixtures/navigation.fixture';

test('navigation test', async ({ page, navigation }) => {
  await navigation.openBurgerMenu();
  await navigation.selectMenuItem('Devotion');
});
```

---

## 🚦 CI/CD Integration

### GitHub Actions Workflow

`.github/workflows/playwright-ci.yml`

**Features:**
- Runs on push to `main` and `automation-playwright`
- Sharded execution (4 parallel jobs)
- Ubuntu runners (free tier)
- Automatic browser installation
- HTML report upload as artifact
- Report retention: 30 days

**Trigger Manually:**
```bash
gh workflow run playwright-ci.yml
```

**View Results:**
- Go to Actions tab → Select workflow run → Download artifacts

---

## 📈 Scalability Design

### Current Scale
- **500+ tests** across 59 pages
- **7 device projects**
- **8 test suites**

### Future Scale Target
- **2000+ tests** supported
- Parallel execution safe
- Device parallelization safe
- Shard-friendly architecture

### Performance Optimizations
- Fully parallel test execution
- Sharding for CI (4 shards default)
- Worker pools per device
- Incremental test discovery

---

## 🐛 Debugging

### Common Issues

#### Tests Fail Locally
```bash
# Ensure server is running
python3 -m http.server 8080

# Run in debug mode
npm run test:debug
```

#### Canvas Tests Fail
```bash
# Canvas rendering needs time
await page.waitForTimeout(2000);

# Check console logs
page.on('console', msg => console.log(msg.text()));
```

#### Visual Tests Fail
```bash
# Update snapshots
npx playwright test --update-snapshots

# Compare differences
npm run test:report
```

### Playwright Inspector

```bash
npm run test:debug

# Then use:
# - Pause execution
# - Step through tests
# - Inspect selectors
# - View screenshots
```

---

## 📝 Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/page.html');
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Using Page Objects

```typescript
import { PageRegistry } from '../pages/page-registry';

test('use POM', async ({ page }) => {
  const registry = new PageRegistry(page);
  const homepage = registry.getPage('index');
  
  await homepage.goto();
  await homepage.clickElement('.button');
});
```

---

## 🎯 Best Practices

### ✅ Do
- Use semantic selectors (`button:has-text("Share")`)
- Wait for network idle before assertions
- Exclude dynamic content from snapshots
- Group related tests in `describe` blocks
- Use fixtures for reusable logic

### ❌ Don't
- Modify runtime website code from tests
- Hard-code delays (`waitForTimeout` sparingly)
- Use brittle selectors (`.btn-123`)
- Skip accessibility tests
- Ignore console errors

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Visual Regression Best Practices](https://playwright.dev/docs/test-snapshots)

---

## 🆘 Support

**Issues:**
- Check GitHub Actions logs
- Review Playwright HTML report
- Enable debug mode
- Check browser console errors

**Maintenance:**
- Regenerate POMs: `npm run pom:generate`
- Update snapshots: `npx playwright test --update-snapshots`
- Clear test cache: `rm -rf test-results playwright-report`

---

**Framework Version:** 1.0.0  
**Last Updated:** February 14, 2026  
**Maintainer:** GPBC Automation Team
