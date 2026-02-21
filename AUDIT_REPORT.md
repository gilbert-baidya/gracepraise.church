# GPBC Footer Audit Report
Date: 2026-02-20
Scope: Full-document routes in `tests/data/html-pages-inventory.json` (53 user-facing routes + selected utility pages)

## Executive Summary
- Footer experience was fragmented across 8 template variants, with no single source of truth.
- 11 routes had no rendered footer pattern in source (including key routes like `ministries/index.html`, plus games/utility pages).
- 38 routes still displayed `© 2025`, reducing trust and content freshness.
- 118 footer links were non-functional placeholders (`href="#"`), mostly social links.
- Accessibility and behavior were inconsistent: only 1 footer used `role="contentinfo"`, external-link security was inconsistent, and mobile tap targets were not reliably 44px.

## Audit Method
- Route inventory from `tests/data/html-pages-inventory.json` + `sitemap.xml`.
- Source scan of all HTML footers and footer-related CSS/JS (`platform-runtime.js`, `partials/footer.html`, `redesign-styles.css`, `styles.bundle.css`).
- Footer link validation pass for placeholder/broken patterns and external-link attributes.
- Template fingerprinting of footer markup to identify unique footer systems and duplication.

## Page Inventory
Total `.html` files discovered: 59
- Full-document pages in inventory: 53
- Partial/snippet/non-page docs: 6 (`partials/*`, `navigation-template.html`, `shape-sections.html`, `heptagon-carousel-section.html`, `favicon-snippet.html`)

Primary user-facing route groups:
- Core: `index.html`, `about.html`, `history.html`, `mission.html`, `leadership.html`, `beliefs.html`, `core-values.html`, `position-papers.html`, `testimonies.html`
- Ministries: `ministries.html`, `ministries/index.html`, and 11 ministry detail routes
- Devotion: `daily-devotion.html`, `couples-devotion.html`, `family-devotion.html`, `youth-devotion.html`, `children-devotion.html`, `fasting-21days.html`, `fasting-30days.html`, `fasting-40days.html`, `lent-fasting.html`, `gratitude-fasting.html`
- Engagement: `calendar.html`, `gallery.html`, `plan-visit.html`, `prayer-request.html`, `songbook.html`, `sms-opt-in.html`
- Giving: `give.html`, `give-modern.html`, `give-professional.html`, `give-tailwind.html`, `give-bootstrap.html`, `give-backup.html`
- Legal: `privacy-policy.html`, `terms-conditions.html`

## Unique Footer Templates Identified
1. `Legacy-4col` (33 pages): Quick Links / Ministries / Contact / Connect with placeholder social links.
2. `Sacred-Waymarks` (home + partial-driven lent): richer visual footer with accordion + SVG icons.
3. `Legal-expanded` (privacy/terms): includes oversized nav-like link list in footer.
4. `Devotion-special` (`daily-devotion.html`): partial real social URLs, one placeholder social link.
5. `Give-variant-A` (`give-bootstrap.html`, `give-tailwind.html`, `give-professional.html`): design-framework-specific footer.
6. `Give-variant-B` (`give-modern.html`, `give-backup.html`): reduced, non-social footer.
7. `SMS-minimal` (`sms-opt-in.html`): compliance-only footer.
8. `No-footer` (11 routes): no footer markup or only redirect body.

## Prioritized Issues (P0 / P1 / P2)

| Priority | Issue | Why It Hurts Users | Recommended Fix Approach |
|---|---|---|---|
| P0 | Footer inconsistency across templates | Users lose orientation and trust; navigation expectations break between pages | Ship one reusable footer component rendered on all public routes |
| P0 | Missing footer on multiple routes | No persistent wayfinding/contact on affected routes | Runtime-level footer mount for all full-document pages |
| P0 | 118 placeholder footer links (`#`) | Dead clicks hurt confidence and conversion, especially social proof | Centralized config with only valid links; CI link-check gate |
| P0 | Outdated legal/trust metadata (`© 2025` on 38 pages) | Looks stale and unmanaged | Dynamic year in shared footer component |
| P1 | External-link handling inconsistent (`noopener` without `noreferrer`) | Security/privacy inconsistency and auditing debt | Enforce `_blank` + `rel="noopener noreferrer"` in component renderer |
| P1 | A11y semantics inconsistent (missing `contentinfo`, no skip-to-footer pattern) | Screen reader and keyboard users get uneven landmarks | Add semantic footer landmark, heading structure, and skip-to-footer support |
| P1 | Mobile touch targets unreliable in legacy footer variants | Hard-to-tap links reduce completion on phones | Mobile-first footer layout with all actionable targets >=44px |
| P2 | Visual hierarchy/spacing uneven across variants | Footer feels unfinished and inconsistent with brand | Introduce unified spacing/type tokenized footer styling |
| P2 | Footer IA too broad in legal/footer variants | Footer becomes mini-sitemap, reducing scanability | Limit to 3-4 clear columns + compact resource set |

## Problems by Category

### Footer Visual Quality
- Mixed footer systems (minimal, legacy, premium, framework-specific) caused different spacing, type scale, and visual hierarchy per route.
- Legacy pages relied on generic footer styles; modern premium style existed only on home/partial flow.
- In light mode, small footer metadata colors fell below ideal AA contrast targets in key combinations.

### Link Groups / IA
- Legacy footer grouped too many mixed-purpose links (quick links + ministries + games) with low prioritization.
- Legal pages embedded large nav structures in footer, diluting primary actions.
- Give variants used outdated/irrelevant destinations (e.g., “Home” -> redesign mockup route).

### Social Icons
- Large portion of pages used text placeholders (`[Facebook Icon]`, emoji icons, or `#` links).
- Icon styles varied heavily by page/template (text placeholders, emoji, SVG circles).
- Real social URLs were not consistently present.

### Behavior (Targets, Broken Links, External Rules)
- Placeholder links were widespread.
- External target/rel behavior was inconsistent between templates.
- Footer behavior differed by page type (accordion on some pages, static lists on others).

### Mobile Responsiveness
- Multiple templates had different stacking and spacing logic.
- Legacy footer links were often inline text-style, not clearly finger-optimized.
- No stable, shared mobile-first footer behavior existed.

### Accessibility
- Landmark consistency was poor (`role="contentinfo"` mostly absent).
- No consistent skip-to-footer affordance.
- Inconsistent focus and icon-label semantics across variants.

## Issues by Page Template

### Template: Legacy-4col (33 pages)
- Placeholder social links (`#`) and text placeholders.
- Outdated copyright year.
- Weak touch-target ergonomics.
- No standardized external-link behavior.

### Template: Sacred-Waymarks (home + lent partial)
- Better visual quality but not reused globally.
- External links missing `noreferrer` on home variant.
- Duplicated policy links in both trust column and bottom bar.

### Template: Legal-expanded (privacy/terms)
- Footer acts as dense secondary sitemap; too much cognitive load.
- Still includes placeholder social links.

### Template: Give variants
- Multiple designs and IA patterns across give pages.
- Some variants route “Home” to redesign mockup instead of canonical homepage.
- Social links often placeholder-only.

### Template: No-footer routes
- Missing persistent trust/contact/wayfinding surface.

## Quick Wins vs Bigger Refactor

### Quick Wins
- Replace placeholder social URLs with real links.
- Update copyright to dynamic current year.
- Enforce external link policy (`_blank` + `noopener noreferrer`).
- Add `role="contentinfo"` and icon `aria-label` consistency.

### Bigger Refactor
- Move all routes to one shared, config-driven footer component.
- Add dedicated footer style layer independent of legacy page CSS.
- Add route-wide component tests + CI link-check script.

## Assumptions
- Admin/CMS (`admin/index.html`) is intentionally non-marketing and may keep separate layout policy.
- Utility/test pages can still render shared footer for consistency unless explicitly excluded.
- Church contact/social data in current content is authoritative unless future PM/content updates say otherwise.
