# Playwright + TypeScript POM Automation

This repository now includes a generated Playwright Page Object Model layer that maps every `.html` file to a corresponding TypeScript class.

## What Was Added

- `playwright.config.ts`: Playwright test configuration.
- `tsconfig.json`: TypeScript configuration for automation code.
- `pages/base-page.ts`: Shared base class for all page objects.
- `pages/generated/**`: One generated POM class per `.html` file.
- `pages/page-registry.ts`: Typed registry that maps HTML path -> POM class.
- `tests/all-pages.pom.spec.ts`: Smoke coverage test that runs through the full registry.
- `tests/data/html-pages-inventory.json`: Machine-readable page inventory.
- `tests/data/html-pages-inventory.md`: Human-readable page inventory.
- `scripts/generate-playwright-poms.js`: Generator script.

## Commands

Install dependencies:

```bash
npm install
```

Generate or refresh page objects and inventory:

```bash
npm run pom:generate
```

Run Playwright smoke suite:

```bash
npm run test:e2e
```

Run headed:

```bash
npm run test:e2e:headed
```

## Base URL

Default base URL is:

- `http://127.0.0.1:8080`

Override with:

```bash
BASE_URL=http://localhost:8000 npm run test:e2e
```

## POM Usage Pattern

Use registry-driven lookup:

```ts
import { createPageByPath } from '../pages/page-registry';

const pom = createPageByPath(page, 'daily-devotion.html');
await pom.goto();
await pom.assertCoreReady();
```

Or instantiate a generated class directly from `pages/generated/**`.

## Notes

- The generator is additive and intended to be re-runnable.
- Generated classes include route path, expected title (if available), and critical selectors derived from source HTML.
- If new `.html` files are added, run `npm run pom:generate` to keep POM coverage aligned.
