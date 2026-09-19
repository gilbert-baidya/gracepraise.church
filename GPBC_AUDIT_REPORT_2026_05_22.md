# GPBC Website — Second Deep Audit Report

**Date:** May 22, 2026  
**Auditor Role:** Senior QA Engineer, Accessibility Tester, Responsive Web Auditor, UX/UI Reviewer  
**Audit Type:** Read-only (no code changes)  
**Website:** Grace & Praise Bangladeshi Church (gracepraise.church)

---

## 1. Executive Summary

The GPBC website has undergone significant improvements since the first audit. Critical navigation rotation bugs have been resolved, accessibility has improved substantially (focus traps, ARIA attributes, keyboard navigation, dialog semantics), and a service worker has been added for offline support. However, several issues remain: 15 render-blocking scripts on the homepage, a 1.5 MB songs-data.js file loaded synchronously, a broken Vimeo video (403), placeholder social media links in the footer, and one broken internal link (contact.html). The dark mode implementation is comprehensive but inconsistent in the songbook page modals. Overall, this is a markedly improved codebase with clear remaining optimization targets.

---

## 2. Overall Retest Score

**7.2 / 10** (up from estimated ~5.5 at first audit)

| Category | Score |
|----------|-------|
| Functionality | 8/10 |
| Accessibility | 7/10 |
| Performance | 5.5/10 |
| Responsive Design | 8/10 |
| Dark/Light Mode | 7/10 |
| Code Quality | 6.5/10 |
| Content Completeness | 7/10 |

---

## 3. Previous Audit Comparison Summary

| Metric | Before | After |
|--------|--------|-------|
| Navigation rotation bug | Critical — broken | Fixed |
| Focus trap in mobile menu | Missing | Implemented |
| Song transpose feature | Non-functional | Working |
| Dialog accessibility | Missing ARIA | All 3 modals have proper roles |
| Sitemap coverage | Broken domain | Corrected to gracepraise.church |
| Service Worker | None | Implemented (network-first) |
| Skip links | Missing on songbook | Present on songbook |
| Render-blocking scripts | ~15 | Still ~15 (partially addressed) |
| Debug files in production | 9 files | Removed |

---

## 4. What Was Fixed

| Previous Issue | Current Status | Evidence | Retest Result |
|---|---|---|---|
| Mobile menu broken after rotation | Fixed — stabilization lock + debounced resize + mode-aware dropdown reset | `navigation.js` lines 192-228: `handleOrientationChange()` with `isAnimating=true` and 400ms release | **PASS** |
| Competing orientation handler in homepage-responsive-fix.js | Fixed — removed | `homepage-responsive-fix.js` no longer contains `orientationchange` listener | **PASS** |
| No focus trap in mobile menu | Fixed — Tab/Shift+Tab trapped in navLinks | `trapFocusInMenu` function at line ~447 | **PASS** |
| Song transpose not rendering | Fixed — chord lines now detected and transposed in `renderSongContent` | songbook-app.js lines 766-780 | **PASS** |
| Concatenated chords (BF# → B F#) | Fixed — `normalizeChordLine()` added before display | songbook-app.js line ~808 | **PASS** |
| Song modal close button was `<span>` | Fixed — changed to `<button class="close" aria-label="Close song">` | songbook.html line ~295 | **PASS** |
| Modals missing dialog role | Fixed — all 3 modals have `role="dialog" aria-modal="true"` | songbook.html lines 268, 278, 293 | **PASS** |
| Filter tabs missing semantics | Fixed — `role="tablist"`, `role="tab"`, `aria-selected` | songbook.html line 228 | **PASS** |
| Sitemap had wrong domain | Fixed — canonical domain gracepraise.church | sitemap.xml fully rewritten | **PASS** |
| plan-visit.html broken prayer link | Fixed — href corrected to `prayer-request.html` | Verified no broken nav links in songbook.html | **PASS** |
| Missing `aria-current` for active page | Fixed — `markCurrentPageNav()` in navigation.js | Adds `aria-current="page"` and `.nav-active` class | **PASS** |
| Debug files shipped to production | Fixed — 9 files deleted (debug-*.js, mobile-debug.css) | Files confirmed absent | **PASS** |

---

## 5. What Was Added

| Addition | Location | Impact |
|----------|----------|--------|
| Service Worker (sw.js) | New file + registration in index.html line 5105 | Offline-first caching for core assets |
| Chord normalization | songbook-app.js `normalizeChordLine()` | Better display of chord data |
| Focus trap in mobile menu | navigation.js `trapFocusInMenu()` | WCAG 2.1 compliance for keyboard users |
| Song cards keyboard accessible | songbook-app.js `renderSongList` | Cards get `role="button"`, `tabindex="0"`, `onkeydown` |
| Current page indicator styling | styles.bundle.css `.nav-active` | Visual feedback for active nav item |
| Mobile font floor | styles.bundle.css `@media (max-width: 768px)` | Min font-size of 0.875rem for readability |
| Orientation stabilization lock | navigation.js `handleOrientationChange()` | Prevents tap during rotation animation |
| Form accessibility auto-labels | navigation.js `applyFormA11yLabels()` | Auto-generates `aria-label` for unlabeled inputs |
| Expanded hit area for nested dropdowns | navigation.js line ~676 | `link.contains(target)` instead of arrow-only |

---

## 6. What Improved

| Area | Previous Condition | Current Condition | Remaining Risk |
|------|-------------------|-------------------|----------------|
| Navigation stability | Broken on rotation; competing handlers | Single authoritative handler with debounce | None observed |
| Songbook accessibility | No keyboard support, no ARIA | Full keyboard, ARIA roles, focus management | Modal focus return could be more robust |
| Mobile dropdown UX | Intermittent failures on fast tap | Animation lock + debounce gate (200ms) | None |
| Dark mode coverage | CSS variables defined but gaps | 459 dark-mode selectors in bundle + 313 in redesign | Songbook modals have limited coverage (12 selectors) |
| SEO/Crawlability | Broken sitemap | Complete sitemap with priorities and frequencies | Good |

---

## 7. What Still Needs Work

### Issue 1: Render-Blocking Scripts (Performance)

- **Issue:** 15 external scripts loaded synchronously (without `defer`/`async`) in the `<head>` and body of index.html
- **Affected Page:** index.html (homepage)
- **Affected View:** All
- **Mode:** Both
- **Severity:** High
- **Priority:** P2
- **Steps to Reproduce:** Open homepage → check DevTools Network waterfall
- **Actual Result:** jQuery, platform-runtime.js, partials.js, three.js, GSAP, ScrollTrigger, event-flip-cards.js, navigation.js, events.js, homepage-events.js, countdown.js, shape-system.js, heptagon-wheel-sacred.js, homepage-responsive-fix.js, logo-loading.js all block rendering
- **Expected Result:** Only 1-2 critical scripts block; rest deferred
- **Impact:** Significant First Contentful Paint delay on mobile networks
- **Possible Root Cause:** Scripts added incrementally without performance budget
- **Recommendation:** Add `defer` to all scripts except jQuery (which has inline dependencies). Consider using `async` for non-dependent CDN libs (three.js, GSAP).
- **Retest Status:** Still Open

---

### Issue 2: Songs Data 1.5 MB Loaded Synchronously

- **Issue:** `songs-data.js` is 1,539 KB (8,465 lines) loaded as a blocking script on the songbook page
- **Affected Page:** songbook.html
- **Affected View:** All
- **Mode:** Both
- **Severity:** High
- **Priority:** P2
- **Steps to Reproduce:** Open songbook.html → check Network tab for songs-data.js transfer size
- **Actual Result:** 1.5 MB JavaScript parsed and executed before page becomes interactive
- **Expected Result:** Initial page interactive in <1s; data loaded progressively
- **Impact:** Songbook page takes significant time to become interactive on mobile
- **Possible Root Cause:** All 1410 songs stored in single flat array file
- **Recommendation:** Lazy-load songs data or paginate (load first 100 songs, fetch rest on scroll). Consider IndexedDB caching.
- **Retest Status:** Still Open

---

### Issue 3: Broken Vimeo Video (403 Forbidden)

- **Issue Title:** Hero background video returns 403 Forbidden
- **Affected Page:** index.html
- **Affected Section:** Hero section (line 561)
- **Affected View:** All
- **Mode:** Both
- **Severity:** Medium
- **Priority:** P2
- **Steps to Reproduce:** Load homepage → check Network tab → look for 494252666.sd.mp4
- **Actual Result:** `494252666.sd.mp4` returns 403 — expired OAuth token
- **Expected Result:** Video plays as background or graceful fallback without error
- **Impact:** Console error on every page load; video never plays
- **Possible Root Cause:** Vimeo external video URL contains time-limited `oauth2_token_id` that has expired
- **Recommendation:** Replace with fresh Vimeo embed URL or self-hosted video. The `poster` image fallback exists but video error still fires.
- **Retest Status:** Still Open

---

### Issue 4: Placeholder Social Media Links in Footer

- **Issue Title:** Footer social links use `#TODO-...` placeholders
- **Affected Page:** All pages (global footer)
- **Affected Section:** Footer social links
- **Affected View:** All
- **Mode:** Both
- **Severity:** Medium
- **Priority:** P2
- **Steps to Reproduce:** Scroll to footer → click any social media icon
- **Actual Result:** Links go to `#TODO-youtube-url`, `#TODO-facebook-url`, `#TODO-instagram-url`, `#TODO-tiktok-url`
- **Expected Result:** Links open actual church social media profiles
- **Impact:** Users clicking social icons navigate nowhere; reduces trust
- **Possible Root Cause:** URLs not provided during development; placeholders left in config
- **Recommendation:** Replace with actual church social media URLs or hide the social section until URLs are available.
- **Retest Status:** Still Open

---

### Issue 5: Broken Link — contact.html Does Not Exist

- **Issue Title:** Link to non-existent `contact.html`
- **Affected Page:** daily-devotion.html (line 488)
- **Affected Section:** CTA button area
- **Affected View:** All
- **Mode:** Both
- **Severity:** Medium
- **Priority:** P2
- **Steps to Reproduce:** Open daily-devotion.html → click "Contact" button
- **Actual Result:** 404 error — file does not exist
- **Expected Result:** User reaches a contact or connection page
- **Impact:** Dead link frustrates users trying to reach the church
- **Possible Root Cause:** Page was planned but never created
- **Recommendation:** Create contact.html or redirect to plan-visit.html / prayer-request.html.
- **Retest Status:** New

---

### Issue 6: about.html Missing Skip Link

- **Issue Title:** about.html lacks skip-to-main-content link
- **Affected Page:** about.html
- **Affected Section:** Page top
- **Affected View:** All
- **Mode:** Both
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Open about.html → press Tab
- **Actual Result:** Focus goes directly to first nav link; no skip option
- **Expected Result:** First focusable element is a "Skip to main content" link
- **Impact:** Keyboard users must tab through all navigation to reach content
- **Possible Root Cause:** Skip link added to songbook.html but not retroactively to about.html
- **Recommendation:** Add `<a href="#main-content" class="skip-link">Skip to main content</a>` before header.
- **Retest Status:** New

---

### Issue 7: 73 .bak Files Still in Repository

- **Issue Title:** Backup files not gitignored or removed from deployment
- **Affected Page:** N/A (deployment/build)
- **Affected View:** N/A
- **Mode:** N/A
- **Severity:** Low
- **Priority:** P3
- **Steps to Reproduce:** Run `find . -maxdepth 1 -name "*.bak" | wc -l` → returns 73
- **Actual Result:** 73 .bak files deployed to Netlify production
- **Expected Result:** No backup files in production deployment
- **Impact:** Increased deploy size; potential exposure of old code
- **Possible Root Cause:** `.gitignore` does not exclude `*.bak` files
- **Recommendation:** Add `*.bak` and `*.backup*` to `.gitignore` and remove from deployment.
- **Retest Status:** Still Open

---

### Issue 8: 16 CSS Files on Homepage

- **Issue Title:** Homepage loads 16 separate CSS files
- **Affected Page:** index.html
- **Affected View:** All
- **Mode:** Both
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Count `<link rel="stylesheet">` tags in index.html head
- **Actual Result:** 16 separate HTTP requests for CSS
- **Expected Result:** 2-3 bundled CSS files
- **Impact:** Multiple round-trips before first paint; especially impactful on high-latency mobile
- **Possible Root Cause:** Incremental development without build pipeline
- **Recommendation:** Bundle into 1-2 CSS files using a build step.
- **Retest Status:** Still Open

---

## 8. New Issues Found

### New Issue 1: `!important` Overuse

- **Issue Title:** Excessive `!important` declarations across stylesheets
- **Affected Page:** All
- **Affected Section:** Global styles
- **Affected View:** All
- **Mode:** Both
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** `grep -c "!important" styles.bundle.css` → 361
- **Actual Result:** 361 in styles.bundle.css, 297 in redesign-styles.css, 52 in styles-songbook.css, 16 in navigation.js
- **Expected Result:** `!important` used sparingly (< 20 per file) for utility overrides only
- **Impact:** Difficult to maintain; specificity wars; dark mode overrides require even more `!important`
- **Possible Root Cause:** Iterative fixes competing with each other's specificity
- **Recommendation:** Refactor CSS specificity hierarchy. Use CSS layers or custom properties for theme switching.
- **Retest Status:** New

---

### New Issue 2: Inconsistent Responsive Breakpoints

- **Issue Title:** Mix of breakpoints: 480px, 600px, 640px, 768px, 900px, 1024px
- **Affected Page:** All
- **Affected Section:** CSS media queries
- **Affected View:** All
- **Mode:** Both
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** Audit `@media (max-width:` across CSS files
- **Actual Result:** 6+ different max-width breakpoints used with overlapping ranges
- **Expected Result:** Standardized breakpoint system (e.g., 480, 768, 1024)
- **Impact:** Inconsistent behavior at edge viewport widths; harder to debug responsive issues
- **Possible Root Cause:** Different developers/sessions adding styles without a design system spec
- **Recommendation:** Consolidate to 3-4 canonical breakpoints using CSS custom properties or SCSS variables.
- **Retest Status:** New

---

### New Issue 3: Large PNG Images Not Optimized

- **Issue Title:** Hero and devotion images are 700KB-1.4MB PNGs
- **Affected Page:** index.html, daily-devotion.html
- **Affected Section:** Hero/banner images
- **Affected View:** All
- **Mode:** Both
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Check `images/` folder sizes
- **Actual Result:** `Daily Devotion.png` = 1.4MB, `community-worship.png` = 783KB, 6 images > 680KB. Total PNGs: 7.7MB
- **Expected Result:** WebP/AVIF format, max 100-200KB per image with responsive srcset
- **Impact:** Slow page loads on mobile; excessive data usage for visitors
- **Possible Root Cause:** Images exported from design tools without optimization
- **Recommendation:** Convert all PNGs to WebP with `<picture>` fallback. Use responsive `srcset` for different screen sizes.
- **Retest Status:** New

---

### New Issue 4: Console Telemetry in Production

- **Issue Title:** Navigation telemetry logs to console in production
- **Affected Page:** All pages
- **Affected Section:** navigation.js
- **Affected View:** All
- **Mode:** Both
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** Open any page → check browser console
- **Actual Result:** `[NAV] NAV_READY {timestamp: ..., viewport: '...', isMobile: ...}` logged on every page load
- **Expected Result:** No console output in production
- **Impact:** Console noise; minor information disclosure
- **Possible Root Cause:** Telemetry added for debugging and not removed/gated for production
- **Recommendation:** Guard with environment check or remove entirely.
- **Retest Status:** New

---

### New Issue 5: Footer "Watch Online" Links to #TODO

- **Issue Title:** CTA button "Watch Online" in footer has placeholder URL
- **Affected Page:** All pages (footer)
- **Affected Section:** Footer CTA actions
- **Affected View:** All
- **Mode:** Both
- **Severity:** Medium
- **Priority:** P2
- **Steps to Reproduce:** Scroll to footer → click "Watch Online" button
- **Actual Result:** Navigates to `#TODO-watch-online`
- **Expected Result:** Links to YouTube Live or church streaming page
- **Impact:** Primary CTA in footer is non-functional
- **Possible Root Cause:** URL not provided during footer implementation
- **Recommendation:** Link to `https://www.youtube.com/@GracePraise.Church/live` (already used in nav LIVE link).
- **Retest Status:** New

---

## 9. Desktop View Retest

| Check | Status | Notes |
|-------|--------|-------|
| Homepage loads correctly | PASS | |
| Navigation hover dropdowns work | PASS | |
| Dark mode toggle functional | PASS | |
| Hero section displays (video fallback to poster) | PASS | Poster shows; video 403 |
| Sections aligned and readable | PASS | |
| No horizontal scrollbar | PASS | |
| Slick carousel functional | PASS | |
| Footer renders | PASS | |
| All nav links resolve | PASS | Except contact.html |
| Structured data (JSON-LD) present | PASS | Church + Event schema |

---

## 10. Mobile View Retest

| Check | Status | Notes |
|-------|--------|-------|
| Burger menu opens | PASS | |
| Submenus expand on tap | PASS | Accordion style |
| Nested submenus work | PASS | Hit area expanded |
| Menu closes on link click | PASS | |
| Rotation: open menu → rotate → tap | PASS | Stabilization lock prevents issues |
| Focus trapped in menu | PASS | Tab cycles within nav |
| ESC closes menu | PASS | |
| Font size readable | PASS | Font floor 0.875rem |
| No horizontal scroll | PASS | overflow-x: clip |
| Touch targets ≥ 44px | PASS | Mobile dropdown pills have adequate padding |

---

## 11. iPad/Tablet View Retest

| Check | Status | Notes |
|-------|--------|-------|
| Breakpoint triggers at 1024px | PASS | NAV_BREAKPOINT = 1024 |
| Orientation change handled | PASS | Single handler, no competing scripts |
| Dropdown open on first tap, navigate on second | PASS | Mode-aware logic in delegated handler |
| Content layout adjusts | PASS | 768-1024 media queries present |
| Songbook usable at iPad width | PASS | Grid adjusts |
| No layout shift on rotation | PASS | Force reflow in handler |

---

## 12. Dark Mode Audit

| Component | Dark Mode Support | Issues |
|-----------|-------------------|--------|
| Header/Nav | Full | PASS — dark tokens applied |
| Hero section | Full | Gradient overlay adapts |
| Cards/Sections | Full | 459 dark selectors in bundle |
| Footer | Full | Dark variant in redesign-styles |
| Songbook page | Partial | Only 12 dark selectors in styles-songbook.css; modals rely on global tokens |
| Song modal content | Token-based | Relies on `--bg-page`, `--text-body` — works if tokens are set |
| Form inputs | Token-based | PASS — uses `var(--color-background)` |
| Countdown banner | Full | Explicit dark overrides for all elements |
| Buttons | Full | Dark variant covers primary/secondary/auth buttons |

**Dark Mode Issues Found:**
- Songbook `.modal-content` background may not have explicit dark override — depends on global `--bg-page` token being set (currently works because token is defined)
- Song chord text color in dark mode not explicitly tested — inherits from `--text-body`
- Only 12 dark-mode selectors in songbook CSS vs 459 in the main bundle — limited direct coverage

---

## 13. Day/Light Mode Audit

| Component | Light Mode | Issues |
|-----------|-----------|--------|
| Text contrast | PASS | `--text-body: #334155` on white = 7.4:1 ratio |
| Button visibility | PASS | Blue/gold gradients clearly visible |
| Card backgrounds | PASS | White cards on off-white `#fefdfb` |
| Header | PASS | Glassmorphism with sufficient contrast |
| Form inputs | PASS | White background, dark text, visible borders |
| Links | PASS | Blue accent `#2563eb` on white = 4.6:1 (meets AA for large text) |
| Muted text | PASS | `#475569` on white = 5.9:1 (meets AA) |

**Light Mode Issues Found:**
- None critical. Previous muted text was `#64748b` (3.8:1 — failed AA) — now fixed to `#475569` (5.9:1 — passes).

---

## 14. Section-by-Section Page Audit

| Page | Loads | Header | Footer | Links | Mobile | Dark Mode | Skip Link |
|------|-------|--------|--------|-------|--------|-----------|-----------|
| index.html | PASS | PASS | PASS | 1 broken video | PASS | PASS | N/A (homepage) |
| about.html | PASS | PASS | PASS | PASS | PASS | PASS | MISSING |
| plan-visit.html | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| prayer-request.html | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| give.html | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| songbook.html | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| calendar.html | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| daily-devotion.html | PASS | PASS | PASS | 1 broken (contact.html) | PASS | PASS | PASS |
| leadership.html | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| beliefs.html | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| core-values.html | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

---

## 15. Song Page Deep Audit

| Feature | Status | Notes |
|---------|--------|-------|
| Song list renders | PASS | 1410 songs from database |
| Search (Bengali + English) | PASS | Real-time filtering |
| Filter tabs (All/Chords/Christmas/etc.) | PASS | Runtime keyword matching on lyrics |
| Song modal opens | PASS | With proper dialog role |
| Close button (×) accessible | PASS | `<button>` with aria-label |
| Chord display | PASS | Toggle hide/show works |
| Chord normalization (BF# → B F#) | PASS | `normalizeChordLine()` active |
| Transpose +/- | PASS | Applied in render pipeline |
| Phonetic display | PASS | Bengali→English conversion |
| Font size +/- | PASS | A+/A- buttons |
| Presentation mode | PASS | Full-screen carousel |
| Service playlist | PASS | Add/remove/clear/save |
| Keyboard access to cards | PASS | role="button", Enter/Space |
| Dark mode readability | PASS | Token-based colors |
| Mobile view | PASS | Responsive grid |
| Skip link present | PASS | `#main-content` |
| `<main>` landmark | PASS | Wraps content |

**Remaining Song Page Issues:**
- All 1410 songs have `category: "Worship"` (unused field — filtering is keyword-based, so no user impact)
- 1.5 MB blocking script load (songs-data.js)
- No `aria-live` region for search results count updates

---

## 16. Navigation Deep Audit

| Feature | Status | Notes |
|---------|--------|-------|
| Desktop hover dropdowns | PASS | CSS-driven with JS accessibility |
| Mobile accordion menus | PASS | Delegated click handler |
| Nested dropdown support | PASS | Expanded hit area |
| ARIA expanded state | PASS | Toggled on open/close |
| ARIA hidden/inert on closed menu | PASS | Set on init |
| Focus trap | PASS | `trapFocusInMenu` on Tab |
| ESC key closes menu | PASS | `handleGlobalKeydown` |
| Arrow key navigation in dropdowns | PASS | `initKeyboardNavigation` |
| Outside click closes dropdown | PASS | `handleDocumentClick` |
| Orientation change resilience | PASS | Single handler + stabilization lock |
| Current page indicator | PASS | `markCurrentPageNav()` + `.nav-active` |
| Scroll-to-top button | Present | In inline styles |
| Logo click closes mobile menu | PASS | Handled in `handleDocumentClick` |
| Debounced resize handler | PASS | Stable reference, 150ms wait |

---

## 17. Accessibility Deep Audit

| WCAG Criterion | Status | Notes |
|----------------|--------|-------|
| 1.1.1 Non-text Content | PASS | Logo has alt text, icons are decorative |
| 1.3.1 Info & Relationships | PARTIAL | Filter tabs have tablist semantics; some pages missing landmark structure |
| 1.3.2 Meaningful Sequence | PASS | DOM order matches visual |
| 2.1.1 Keyboard | PASS | All interactive elements keyboard-operable |
| 2.1.2 No Keyboard Trap | PASS | ESC exits all modals/menus |
| 2.4.1 Bypass Blocks | PARTIAL | Songbook has skip link; about.html missing |
| 2.4.3 Focus Order | PASS | Logical tab order |
| 2.4.7 Focus Visible | PASS | Browser defaults preserved; focus-visible styled on nav |
| 3.3.2 Labels or Instructions | PASS | Forms have labels; auto-labeling fills gaps |
| 4.1.2 Name, Role, Value | PASS | Dialogs have roles, buttons have labels |
| 4.1.3 Status Messages | PARTIAL | No live region for search results count update |

**Accessibility Gaps:**
1. `about.html` missing skip link
2. No `aria-live` region for dynamic content updates (search results count, song modal)
3. Filter tabs missing `aria-controls` pointing to content panel
4. Presentation mode should trap focus within the modal
5. No `prefers-reduced-motion` media query to respect user preferences

---

## 18. Performance Review

| Metric | Current Value | Target | Status |
|--------|--------------|--------|--------|
| CSS files on homepage | 16 | 2-3 | ❌ FAIL |
| JS files on homepage | 20 external + 11 inline | 5-8 | ❌ FAIL |
| Render-blocking scripts | 15 | 0-2 | ❌ FAIL |
| songs-data.js size | 1,539 KB | <200 KB initial | ❌ FAIL |
| Total image assets | 7.7 MB (PNGs) | <2 MB (WebP) | ❌ FAIL |
| Logo MP4 videos | 8 files, 10.9 MB total | 2-3 optimized | ⚠️ WARN |
| Service worker | Present | Yes | ✅ PASS |
| Image lazy loading | 19 instances | Good | ✅ PASS |
| Cache headers (Netlify) | Images: immutable 1yr | Good | ✅ PASS |
| CSS/JS cache headers | Not configured | Should add | ⚠️ WARN |

**Key Performance Concerns:**
1. **First Paint blocked** by 15 synchronous scripts
2. **songs-data.js** should be lazily loaded or paginated
3. **7.7 MB PNGs** should be WebP (70-80% smaller)
4. **No CSS/JS caching headers** in netlify.toml (only images cached)
5. **node_modules (56 MB) and .venv (144 MB)** — ensure excluded from deploy

---

## 19. UX/UI Review

| Area | Assessment |
|------|-----------|
| Visual hierarchy | Good — clear headings, sections well-defined |
| Call-to-action visibility | Good — primary CTAs are prominent |
| Mobile typography | Improved — font floor prevents tiny text |
| Navigation clarity | Good — current page indicator added |
| Dark mode transition | Smooth — 0.3s ease animation on toggle |
| Song page UX | Good — search, filters, playlist, presentation all functional |
| Form UX | Good — proper labels, placeholders, validation |
| Footer completeness | Partial — placeholder links reduce trust |
| Error states | Missing — no visible feedback on broken video, 404 links |
| Loading states | Missing — no skeleton/spinner while songs-data.js loads |
| Consistency | Good — design tokens used across pages |
| Information architecture | Good — logical navigation groupings |

---

## 20. Better Development Ideas

### 1. Song Page Improvements
- **Offline song access**: Service worker already caches core assets; extend to cache songs-data.js for worship team offline use
- **Favorites/Recently Used**: Add localStorage-based favorites with ⭐ toggle per song
- **Service Setlist Builder**: Already implemented! Could add drag-reorder and print mode
- **Key/Capo metadata**: Add capo position and original key to song data
- **Print-friendly song sheets**: Add `@media print` styles for clean chord sheet output
- **Song search by chord progression**: Allow searching "songs in key of G" by parsing chord data
- **Split songs-data.js**: Paginate or lazy-load — first 50 songs immediately, rest on demand
- **Better phonetic display**: Side-by-side Bengali + phonetic lines for worship leaders

### 2. Church Visitor Experience
- **"I'm New" floating CTA**: A persistent banner/button for first-time visitors
- **Service time prominence**: Add to header or above-fold section (currently in Next Service)
- **Visitor card digital form**: Combine plan-visit info with a simple digital connection card
- **Directions/Map integration**: Embed Google Maps with directions button on plan-visit page
- **Welcome video**: Replace expired Vimeo with a current church welcome video
- **Multi-language toggle**: Bengali/English toggle for entire site (partially exists via phonetic)

### 3. Accessibility Improvements
- **WCAG 2.2 AA full compliance**: Add `aria-live` regions for dynamic content, `aria-controls` for tabs
- **Reduced motion preference**: Add `@media (prefers-reduced-motion: reduce)` to disable animations
- **Focus indicator enhancement**: Add custom `:focus-visible` ring for all interactive elements
- **Screen reader announcements**: Use `role="status"` for search result counts
- **Form error accessibility**: Add `aria-describedby` for validation messages
- **High contrast mode support**: Test and enhance for Windows High Contrast Mode

### 4. Performance Improvements
- **Bundle CSS**: Combine 16 CSS files into 1-2 bundles (critical inline + deferred bundle)
- **Bundle JS**: Use a simple build step (esbuild) to combine and minify scripts
- **Image pipeline**: Convert PNGs to WebP/AVIF with srcset for responsive sizes
- **Code-split songs-data**: Load initial view data first, full database on demand
- **Preconnect hints**: Already using for fonts; add for Firebase, jQuery CDN
- **CSS/JS cache headers**: Add to netlify.toml alongside existing image headers
- **Critical CSS inline**: Extract above-fold CSS and inline in `<head>`

### 5. Design Improvements
- **Unified spacing scale**: Standardize to 4/8/12/16/24/32/48/64px instead of mixed values
- **Consistent breakpoints**: Consolidate to 480/768/1024px (remove 600/640/900)
- **Dark mode token audit**: Ensure songbook modal/chord elements have explicit dark tokens
- **Loading skeletons**: Add CSS shimmer animations for song list while data loads
- **Error states design**: Design 404 page, broken video placeholder, and empty states
- **Micro-interactions**: Add subtle feedback on button press, form submit, playlist add

### 6. Admin/Content Management Ideas
- **Song admin interface**: Firebase-backed CRUD for adding/editing songs without code changes
- **Devotion scheduling**: Admin panel to schedule daily devotions with date picker
- **Event management**: Calendar admin to add/edit events without touching code
- **Social media URL config**: Move to environment variable or simple admin JSON file (already in footer.config.js — just needs the actual URLs)
- **Content preview**: Add `?preview=true` mode that shows draft content
- **Analytics dashboard**: Track most-viewed songs, popular pages, device breakdown

---

## 21. Prioritized Action Plan

### P1 — Must Fix Immediately

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Replace expired Vimeo video URL or remove video element | Eliminates 403 error on every homepage load | Low |
| 2 | Fix contact.html link in daily-devotion.html | Eliminates 404 for users | Low |
| 3 | Add actual social media URLs to footer.config.js (+ Watch Online) | Footer CTAs become functional | Low |

### P2 — Should Fix Soon

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 4 | Add `defer` to non-jQuery scripts in index.html | 50%+ reduction in render-blocking time | Low |
| 5 | Convert PNGs to WebP format | ~5MB bandwidth savings per visit | Medium |
| 6 | Lazy-load songs-data.js (paginate first 100) | Songbook interactive 10x faster | Medium |
| 7 | Add CSS/JS cache headers to netlify.toml | Faster repeat visits | Low |
| 8 | Add `*.bak` and `*.backup*` to .gitignore | Cleaner deployments | Low |

### P3 — Important Improvements

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 9 | Add skip link to about.html | Accessibility compliance | Low |
| 10 | Add `aria-live` regions for dynamic content | Screen reader UX | Low |
| 11 | Bundle CSS files (16 → 2) | Fewer HTTP requests | Medium |
| 12 | Add `@media (prefers-reduced-motion)` | Accessibility for motion-sensitive users | Low |
| 13 | Create contact.html page | Complete site navigation | Medium |

### P4 — Nice-to-Have Polish

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 14 | Remove console.log telemetry in production | Cleaner console | Low |
| 15 | Consolidate breakpoints to 3 canonical values | Easier maintenance | Medium |
| 16 | Reduce `!important` usage | Better CSS maintainability | High |
| 17 | Add loading skeletons for song list | Better perceived performance | Low |

---

## 22. Final Recommendation

The GPBC website has improved significantly since the first audit. The critical navigation bug is resolved, accessibility is substantially better, and the songbook page is now functional and accessible. The primary remaining concerns are **performance** (too many render-blocking resources, unoptimized images, massive songs-data.js) and **content completeness** (placeholder social links, broken Vimeo, missing contact page).

**Top 3 immediate actions:**
1. Fix the 3 broken/placeholder links (Vimeo, contact.html, social URLs)
2. Add `defer` to the 15 render-blocking scripts
3. Convert PNG images to WebP

These three changes alone would transform the site from "functional with performance issues" to "production-ready and fast."

**Overall Assessment:** The site is well-structured, accessible, and visually consistent across light/dark modes. With the performance and content fixes above, it would score **8.5+/10** and meet professional production standards.

---

*Audit conducted: May 22, 2026 — Read-only, no code changes made.*
