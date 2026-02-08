# GPBC Website Comprehensive Audit Report

**Date:** 2026-02-07  
**Auditor:** AntiGravity Web Audit Lead  
**Scope:** Performance, Security, Functional, Backend/API, UI/UX, Accessibility  
**Target:** Grace and Praise Bangladeshi Church (GPBC) Localhost/Codebase

---

## 1. Executive Summary

### Overall Health Score
| Category | Grade | Score | Summary |
| :--- | :---: | :---: | :--- |
| **Performance** | **B+** | **8.5/10** | Assets are manageable, but multiple CSS files (8+) block rendering. JS payloads (jQuery, Slick) are heavy for simple needs. |
| **Security** | **B** | **8.0/10** | Basic headers present (OG, Twitter). Missing HSTS, CSP, and strict permission policies. Forms lack explicit CSRF protection visible in frontend code. |
| **Functional** | **C-** | **4.0/10** | **CRITICAL FAIL**: Calendar page does not render events despite fetching data. Daily Devotion works well. Mobile menu functions correctly. |
| **Backend/API** | **B** | **8.0/10** | Relies on Google Sheets (Fragile but working) and EmailJS. Error handling logic exists but UI feedback for failures is minimal. |
| **UI/UX** | **C** | **5.5/10** | **Significant Layout Shifts**: Header overlaps hero content on multiple pages (Ministries). Text overlaps on Mobile Home. Inconsistent gaps (Give page). |
| **Accessibility** | **B-** | **6.5/10** | Good semantic basics (skip links, alt tags). **Fail**: Low contrast text on Ministries (Blue on Blue) and Devotions (Gray on Gray). Touch targets small on mobile. |

### Top 5 Risks
1.  **Calendar Rendering Failure (Critical)**: Users cannot see any upcoming events or services on the Calendar page. Debugging reveals data fetching succeeds but rendering logic fails (likely date format mismatch).
2.  **Navigation/Header Overlap (High)**: On `ministries.html` and other subpages, the sticky header height exceeds the top padding of the hero section, obscuring titles.
3.  **Mobile Layout Overlaps (High)**: Homepage text elements stack on top of each other on iPhone-sized screens, making content unreadable.
4.  **Contrast Violations (Medium)**: "Our Ministries" text is unreadable against the branded background. Devotion headers have poor contrast in Day mode.
5.  **Render Blocking Resources (Medium)**: 8+ separate CSS files and jQuery in `<head>` delay First Contentful Paint (FCP).

### Biggest Quick Wins
*   **Fix Header Padding**: Increase top padding on `ministries.html` and `give.html` to `140px` to clear the sticky header.
*   **Calendar Date Parse**: Update `calendar.js` to handle flexible date formats from Google Sheets.
*   **Contrast Fix**: Change "Our Ministries" text color to white or a high-contrast warm gold.

---

## 2. Findings Table

| ID | Category | Page(s) | Severity | Symptom/Evidence | Root Cause Hypothesis | Recommended Fix (Conceptual) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | **Functional** | Calendar | **CRITICAL** | Events fetched (log: "13 events") but grid is blank. | `calendar.js` strict date parsing (`YYYY-MM-DD`) fails against Google Sheets format (likely `M/D/YYYY`). | Sanitize date strings in `loadEventsFromGoogleSheets` before passing to render logic. |
| **U-01** | **UI/UX** | Ministries | **High** | "Our Ministries" title hidden behind header. | `ministries-hero` padding-top (`6rem` / 96px) < Header Height (`~134px`). | Increase hero padding-top to `var(--header-total-height)` + `4rem`. |
| **U-02** | **UI/UX** | Home (Mobile) | **High** | Hero text overlaps subtitle. | Absolute positioning or fixed heights in `hero-upgrade.css` without mobile media queries. | Use `flex-direction: column` and `height: auto` for mobile hero text container. |
| **U-03** | **UI/UX** | Give | **Medium** | Huge white gap above content. | Double padding: `body` padding-top (JS added) + `give-hero` padding-top. | Remove `padding-top` from `give-hero` or adjust based on header state. |
| **A-01** | **A11y** | Ministries | **Medium** | Blue text on Blue gradient. | `h3` color is `var(--brand-primary)` (#2563eb) on `brand-primary` bg. | Change `h3` color in hero to `white` or `var(--text-gold)`. |
| **P-01** | **Perf** | All | **Medium** | 8+ CSS files requested in head. | Unbundled CSS files (`redesign.css`, `hero.css`, `countdown.css`, `shape.css`, etc.). | Bundle CSS into `main.min.css` or critical-inline + deferred load. |
| **B-01** | **Backend** | Calendar | **Low** | No visual error if Sheet fetch fails. | `console.error` exists but no UI feedback toast/banner. | Add a UI "fallback mode" banner using `localStorage` data if API fails. |
| **S-01** | **Security** | Forms | **Low** | No visible CSRF token. | Static contact forms. | Ensure API endpoints (Formspree/Google Script) validate origin and implement rate limiting. |

---

## 3. Page Inventory & Coverage

| URL | Type | Status | Issues Found |
| :--- | :--- | :--- | :--- |
| `index.html` | Home | ✅ Reachable | Mobile text overlap, GSAP console warnings. |
| `daily-devotion.html` | App/Content | ✅ Reachable | Low contrast headers. Loading spinner works correctly. |
| `ministries.html` | Hub | ✅ Reachable | Header overlap, Contrast failure. |
| `calendar.html` | App | ❌ Broken | **Events do not render.** |
| `give.html` | Transactional | ✅ Reachable | Layout whitespace issues. Form requires scrolling. |
| `about.html` | Content | ✅ Reachable | Header overlap probable (shares template). |
| `ministries/*.html` | Subpages | ✅ Reachable | Checked one (Men Fellowship); inherits header issues. |

---

## 4. Device Matrix Findings

*   **Desktop (1920x1080)**:
    *   Calendar grid empty.
    *   Ministries header slightly cut off.
    *   Animations smooth.
*   **Laptop (1366x768)**:
    *   "Ways to Serve" grid tight but usable.
    *   Header takes up significant vertical space (~18% of screen).
*   **Mobile (iPhone X - 375x812)**:
    *   **FAIL**: Hero text overlaps.
    *   **PASS**: Hamburger menu overlays correctly.
    *   **FAIL**: Devotion date pills too small for touch targets (< 44px).

---

## 5. Color Issues Deep Dive

**Primary Violation**: "Blue on Blue"
*   **Location**: Ministries styling.
*   **Token Clash**: `var(--brand-primary)` text used on `linear-gradient(var(--brand-primary), ...)` background.
*   **Fix**: Use `var(--text-inverse)` (white) for text on Primary backgrounds.

**Secondary Violation**: "Gray on Gray"
*   **Location**: Daily Devotion metadata.
*   **Token Clash**: `var(--text-muted)` (#64748b) on `var(--bg-section)` (#f8fafc) is borderline WCAG AA (4.5:1).
*   **Fix**: Darken `text-muted` to #475569 for better readability.

---

## 6. Fix Roadmap (Concept Only)

### Phase 1: Critical Fixes (Immediate)
1.  **Debug Calendar Date Parsing**: Ensure `calendar.js` can handle `M/D/YYYY` and `YYYY-MM-DD` formats from Google Sheets.
2.  **Fix Header Overlaps**: Globally increase `padding-top` for all non-home pages to `140px` (or dynamically set via JS to `header.offsetHeight + 20px`).

### Phase 2: UI/UX Consistency (High Impact)
1.  **Mobile Hero Layout**: Refactor Homepage Hero CSS to stack text vertically on screens < 768px.
2.  **Contrast Sweep**: Update Ministries and Devotion CSS to use high-contrast text tokens.

### Phase 3: Performance & Polish
1.  **CSS Bundling**: Concatenate the 8 CSS files into one `styles.min.css`.
2.  **Date Pill Touch Targets**: Increase padding on Devotion date selector pills to min `44px` height.
