# V21 Route Control — Phase 7

Phase 7 adds the second controlled public route, `pages.planVisit`, at the existing canonical path `/plan-visit.html`. The checked-in public mode remains `SHADOW`; ACTIVE behavior is covered only by local Playwright fixtures and emulator tests.

## Plan Your Visit audit

- Canonical HTML entry point: `plan-visit.html`; no `/plan-visit` alias was discovered in `netlify.toml`.
- Page-specific CSS: `plan-visit-v21.css`; shared layout, theme, logo, and footer styles remain in their existing files.
- Shared runtime: platform runtime, partials, navigation, events, logo loaders, and the injected site footer.
- Page-specific behavior was previously inline for language switching, event highlights, and calendar links. It now lives in `plan-visit.js` and is dynamically loaded only after a LIVE route decision (or the normal fallback path).
- Stable route marker: `main[data-gpbc-route-feature="pages.planVisit"]`.
- Existing external directions, prayer, mailto, calendar, and language behavior remain intact.
- The current header has no Plan Your Visit navigation item. The navigation framework is therefore preserved without inventing a new nav entry.
- The footer has five Plan Your Visit references. They now receive stable semantic dependency markers when the footer renderer creates them.

## Dependency architecture

Feature dependency metadata remains separate from public surface metadata. Admin dependency impact reporting continues to use the existing `homepage.planVisit` / `pages.planVisit` relationship. The new `CONTROLLED_SURFACE_DEFINITIONS` registry describes the actual public surfaces and their state source:

- homepage Plan Your Visit section;
- homepage Plan Your Visit CTAs;
- About, Contact, and Position Papers CTAs;
- registered desktop/mobile navigation links, if introduced later;
- injected footer links.

The adapter applies the registry generically. A configured `ADMIN_PREVIEW` surface resolves to public HIDDEN. HIDDEN surfaces use native `hidden`, `aria-hidden`, `inert`, and `tabIndex=-1`; Coming Soon surfaces remain visible, preserve their destination, and receive an accessible “coming soon” label plus subtle non-colour treatment. A mutation observer reapplies only registered surface policies when the footer is injected.

The route registry now contains exactly two controlled routes: `/gallery.html` and `/plan-visit.html`. No other route is ACTIVE-controlled.

## Homepage/page matrix

| Homepage state | Page state | Public result |
| --- | --- | --- |
| LIVE | LIVE | Section and all registered links behave normally. |
| HIDDEN | LIVE | Homepage section is hidden; the page remains available through other approved surfaces. |
| LIVE | HIDDEN | Homepage section remains visible; destination CTAs collapse without leaving broken links. |
| LIVE | COMING_SOON | Section and destination links remain discoverable; route renders Coming Soon. |
| LIVE | ADMIN_PREVIEW | Public destination surfaces hide and the route behaves as HIDDEN. |
| HIDDEN | HIDDEN | Neither the homepage section nor registered destination links are exposed. |

## Safety and SEO

Published configuration is still read-only, schema-validated, revision-checked, and bounded by the existing timeout. Delivery failures (404, 500, timeout, offline, malformed JSON, unsupported schema, missing revision/feature, and malformed metadata) keep the existing Plan Your Visit page and links functional; no failure path infers HIDDEN.

ACTIVE route states protect against content flash with the existing pending boundary. HIDDEN, COMING_SOON, and public ADMIN_PREVIEW route states update title/social metadata and add `noindex, nofollow`. Query strings, LocalStorage values, and public classes do not grant preview access.

## Validation

- Schema and browser/Admin registry alignment: 50 feature IDs and 7 controlled surfaces.
- Plan Your Visit/public adapter: 20/20 Desktop Chrome tests passed sequentially.
- Public Chromium regression set: 53 passed, 5 skipped, 0 failed.
- Admin Control Center: 7/7 passed, including dependency-note visibility.
- Trusted backend unit/lint: 5/5 unit tests passed; lint passed.
- Firestore/Auth emulator rules: 6/6 passed.
- Functions emulator integration: 1/1 passed.

No production deployment, merge, `main` update, `netlify-live` update, DNS change, or public mode activation was performed.
