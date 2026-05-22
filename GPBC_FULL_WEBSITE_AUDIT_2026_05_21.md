# GPBC Full Website Audit Report

**Website:** Grace & Praise Bangladeshi Church (GPBC)  
**Audit Date:** May 21, 2026  
**Audit Type:** Comprehensive Professional Audit (Read-Only)  
**Auditor:** Independent Technical Audit  
**Status:** Final Report  

---

## 1. Executive Summary

The GPBC website is a feature-rich, ambitious church web application with strong foundational elements including dark mode support, bilingual content, a custom songbook application, devotional content system, and a well-structured visitor journey. The site demonstrates significant investment in accessibility groundwork (ARIA attributes, skip links, touch targets) and responsive design.

However, the audit identifies several critical and high-priority issues that impact real-world usability — most notably a confirmed mobile burger menu rotation bug, incomplete modal accessibility on the song page, performance concerns from excessive resource loading (14 CSS + 22 JS files on homepage), and inconsistent navigation behavior across orientation changes. The codebase also shows signs of accumulated complexity (duplicate CSS layers, debug files, multiple backup variants) that increases maintenance risk.

**Key Strengths:**
- Comprehensive church content (services, ministries, devotions, visitor info)
- Strong accessibility foundation (ARIA, focus-visible, touch targets)
- Well-designed visitor journey (Plan Visit page, New Here section)
- Dark mode and bilingual support
- Custom songbook with search, filters, and presentation mode

**Key Concerns:**
- Confirmed mobile rotation/submenu bug
- Heavy page weight impacting load performance
- Incomplete dialog/modal accessibility
- CSS complexity and override conflicts
- Missing focus trap in mobile menu

---

## 2. Overall Website Health Score

### **6.5 / 10**

| Category | Score | Notes |
|----------|-------|-------|
| Responsive Design | 6/10 | Good breakpoints but rotation bugs and timing conflicts |
| Navigation | 6/10 | Feature-complete but orientation-change bug is critical |
| Song Page | 7/10 | Strong feature set, accessibility gaps in modals |
| Accessibility | 6/10 | Good foundation, incomplete implementation |
| User Experience | 7/10 | Clear visitor journey, good content organization |
| Visual Design | 7/10 | Consistent design system, minor font-size concerns |
| Performance | 5/10 | Too many resources, no bundling pipeline, no service worker |
| Content | 7/10 | Comprehensive but some placeholder links remain |

---

## 3. Top 5 Critical Issues

### Issue #1: Mobile Burger Menu Submenu Failure After Device Rotation
- **Severity:** Critical
- **Priority:** P1
- **Impact:** Users cannot navigate to submenu pages after rotating device

### Issue #2: Missing Focus Trap in Mobile Navigation Menu
- **Severity:** Critical  
- **Priority:** P1
- **Impact:** Keyboard/assistive technology users can tab outside open menu into hidden content

### Issue #3: Excessive Resource Loading (14 CSS + 22 JS files on homepage)
- **Severity:** High
- **Priority:** P1
- **Impact:** Significantly degrades first paint and time-to-interactive, especially on mobile networks

### Issue #4: Song Page Modals Missing Dialog Accessibility
- **Severity:** High
- **Priority:** P2
- **Impact:** Screen reader users cannot identify modals as dialogs; focus is not managed

### Issue #5: Broken Skip Link Target on Song Page
- **Severity:** High
- **Priority:** P2
- **Impact:** Keyboard users cannot skip to main content; skip link does nothing

---

## 4. Known Mobile Rotation Burger Menu Issue (User-Reported)

**Issue Title:** Mobile Burger Menu Subsections Disappear After Device Rotation

**Affected Page:** All pages with navigation (site-wide)

**Affected View:** Mobile (portrait → landscape → portrait rotation)

**Severity:** Critical

**Priority:** P1

**Steps to Reproduce:**
1. Open the website on a mobile device in portrait mode
2. Rotate the device to landscape orientation
3. Click/tap the burger menu icon
4. Tap any menu section that has subsections (e.g., "About", "Ministries", "Devotion")
5. Observe that the subsection dropdown does not appear
6. Rotate the device again to portrait
7. The subsection becomes visible

**Actual Result:**  
After rotation, tapping a parent menu item with subsections does not reveal the submenu dropdown. The subsection items remain invisible until the device is rotated again.

**Expected Result:**  
Tapping a parent menu item should always reveal its submenu dropdown immediately, regardless of prior orientation changes.

**Impact:**  
Users who rotate their device (common on phones and tablets) lose the ability to navigate to any submenu page. This blocks access to approximately 30+ pages including About, Ministries, Devotion sections, and the Song Book.

**Possible Root Cause (Technical Analysis):**

The issue stems from multiple interacting factors identified in `navigation.js` and `styles.bundle.css`:

1. **Debounce function re-creation bug** (`navigation.js` line 832): `debounce(applyNavModeIfChanged, 150)()` creates a NEW debounced function on every resize event instead of reusing a shared instance. This means the mode reconciliation may fire multiple times or inconsistently after orientation change.

2. **Forced dropdown reset on mode switch** (`navigation.js` lines 158-166): When `applyNavModeIfChanged` detects a mode boundary crossing (which orientation change can trigger even when staying in mobile range), it forcibly calls `closeAllDropdowns()`. This closes any open submenu and resets state.

3. **Animation lock gate** (`navigation.js` line 599): During CSS transitions triggered by the orientation reflow hack, taps are blocked by the animation lock. Post-rotation taps may arrive during this window and be silently ignored.

4. **CSS layer conflicts**: Mobile dropdown visibility is defined in at least 4 different CSS locations (`styles.bundle.css` lines 1242, 3819, 5761, 7732). The `display: none` / `display: block` toggle used alongside `max-height` transitions can race with JS state, especially when the body reflow hack (`display: none` → `offsetHeight` → restore) fires during orientation change.

5. **Nested dropdown arrow-only trigger** (`navigation.js` line 636): After state resets, nested submenus require tapping specifically on the dropdown arrow element (a span), not the link text. Users tapping the text label may inadvertently navigate instead of expanding.

6. **Listener cleanup mismatch** (`navigation.js` lines 195-199 vs 829-837): Event listeners use anonymous wrappers on attachment but reference named functions on removal, meaning listeners are never actually removed on re-initialization. Over rotation cycles, duplicate handlers can accumulate.

**Recommendation:**
1. Create a shared debounced resize handler instance (not re-created per event)
2. Suppress forced `closeAllDropdowns` when orientation change stays within the same mode (mobile → mobile)
3. Add a post-rotation delay before re-enabling dropdown interaction to ensure CSS transitions complete
4. Consolidate mobile dropdown CSS rules to a single authoritative location
5. Add integration test covering rotation + menu open + submenu tap sequence

---

## 5. Desktop View Findings

### Issue: Dark Mode Toggle Z-Index Collision Risk
- **Affected Page:** All pages
- **Affected View:** Desktop (narrow widths near 1024px)
- **Severity:** Low
- **Priority:** P3
- **Steps to Reproduce:** Resize desktop browser to ~1024-1100px width; observe toggle position relative to countdown banner
- **Actual Result:** Toggle and countdown banner may overlap at transition widths
- **Expected Result:** Clean separation at all widths
- **Impact:** Visual clutter at edge breakpoint
- **Possible Root Cause:** Both elements use absolute positioning and high z-index without collision detection
- **Recommendation:** Add explicit right-offset adjustment at the 1024-1100px range

### Issue: Footer Social Links Point to Placeholder URLs
- **Affected Page:** All pages (footer)
- **Affected View:** All
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Click any social icon in the footer
- **Actual Result:** Links go to `#TODO-...` placeholder destinations
- **Expected Result:** Links navigate to actual social media profiles
- **Impact:** Reduces credibility and engagement; users may perceive site as incomplete
- **Possible Root Cause:** Social URLs not yet configured in `js/footer/footer.config.js`
- **Recommendation:** Configure real social media URLs or hide social links until ready

### Issue: Duplicate Logo Loading Attributes
- **Affected Page:** Homepage (index.html)
- **Affected View:** Desktop / All
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** Inspect logo image element
- **Actual Result:** Logo has conflicting `loading="lazy"` and `loading="eager"` attributes
- **Expected Result:** Single consistent loading strategy
- **Impact:** Browser behavior unpredictable; may delay logo appearance
- **Possible Root Cause:** Incremental editing without cleanup
- **Recommendation:** Use `loading="eager"` only for logo (above fold, branding critical)

---

## 6. Mobile View Findings

### Issue: Sub-1rem Font Sizes on Mobile
- **Affected Page:** Multiple pages
- **Affected View:** Mobile
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** View any page on small mobile screen (320-375px width)
- **Actual Result:** Some text renders at 0.6-0.75rem, which is 9.6-12px at default zoom
- **Expected Result:** Minimum 14px readable text on mobile
- **Impact:** Readability degraded for users with normal or reduced vision
- **Possible Root Cause:** CSS rules at `styles.bundle.css` lines 512, 562, 7098 set very small font sizes
- **Recommendation:** Establish minimum 14px (0.875rem) floor for all body text on mobile

### Issue: Dark Mode Toggle Below 44px on Ministries Page
- **Affected Page:** ministries.html
- **Affected View:** Mobile
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** View ministries page on mobile; attempt to tap dark mode toggle
- **Actual Result:** Toggle renders at 36x36px
- **Expected Result:** Minimum 44x44px touch target (WCAG requirement)
- **Impact:** Difficult to tap accurately, especially for users with motor impairments
- **Possible Root Cause:** Page-specific CSS override reduces toggle size below global standard
- **Recommendation:** Enforce minimum 44px touch target consistently across all pages

### Issue: No Focus Trap in Mobile Menu
- **Affected Page:** All pages
- **Affected View:** Mobile
- **Severity:** Critical
- **Priority:** P1
- **Steps to Reproduce:** Open burger menu on mobile; tab through menu items
- **Actual Result:** Focus can escape the open menu and interact with content behind the overlay
- **Expected Result:** Focus should be trapped within the open mobile menu until it is closed
- **Impact:** Keyboard users lose context; screen reader users may not realize menu is open
- **Possible Root Cause:** `inert` attribute is applied to nav but no focus-trapping loop for the menu container
- **Recommendation:** Implement focus trap within mobile menu when open; return focus to burger button on close

### Issue: Body Padding-Top Transition Lag During Orientation Change
- **Affected Page:** All pages
- **Affected View:** Mobile (rotation)
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** Rotate device while scrolled down
- **Actual Result:** Brief content jump as body padding-top transitions (0.3s ease)
- **Expected Result:** Instant reflow without visible shift
- **Impact:** Minor visual jolt on rotation
- **Possible Root Cause:** CSS transition on `padding-top` at `styles.bundle.css` line 219
- **Recommendation:** Disable `padding-top` transition or use instant recalculation during `orientationchange`

---

## 7. iPad/Tablet View Findings

### Issue: Burger Menu Rotation Bug Affects iPad
- **Affected Page:** All pages
- **Affected View:** iPad (portrait ↔ landscape)
- **Severity:** Critical
- **Priority:** P1
- **Steps to Reproduce:** Same as Section 4 (known rotation bug)
- **Actual Result:** Same submenu failure
- **Expected Result:** Submenu always appears
- **Impact:** iPad users during church service (common use case for worship teams) cannot navigate
- **Possible Root Cause:** Same as Section 4
- **Recommendation:** Same as Section 4

### Issue: Coarse Pointer Media Query May Mismatch Tablet Behavior
- **Affected Page:** All pages
- **Affected View:** iPad / Tablets
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** Use iPad with keyboard/trackpad accessory
- **Actual Result:** Pointer media queries may apply touch styles even with precision pointer connected
- **Expected Result:** Should detect actual input modality
- **Impact:** Minor UX mismatch for users switching between touch and keyboard/trackpad
- **Possible Root Cause:** CSS uses `(pointer: coarse)` queries that apply to primary pointer only
- **Recommendation:** Consider `any-pointer` and `any-hover` for hybrid device scenarios

### Issue: Multiple Orientation Handlers May Cause Offset Jitter
- **Affected Page:** Homepage
- **Affected View:** iPad (rotation)
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Rotate iPad on homepage
- **Actual Result:** Possible brief header offset jitter from competing handlers
- **Expected Result:** Smooth single recalculation
- **Impact:** Visual instability during rotation
- **Possible Root Cause:** `navigation.js` and `homepage-responsive-fix.js` both handle orientation with different timers (300ms vs 200ms)
- **Recommendation:** Consolidate orientation handling into a single authoritative handler

---

## 8. Song Page Findings

### Issue: Broken Skip Link Target (#main-content missing)
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** High
- **Priority:** P2
- **Steps to Reproduce:** Press Tab on page load; activate skip link
- **Actual Result:** Nothing happens — no element with `id="main-content"` exists
- **Expected Result:** Focus jumps to main content area
- **Impact:** Keyboard users cannot bypass header navigation
- **Possible Root Cause:** `main` landmark element with matching ID was never added to songbook page
- **Recommendation:** Add `<main id="main-content">` wrapper around song content area

### Issue: Song Modal Missing Dialog Semantics
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** High
- **Priority:** P2
- **Steps to Reproduce:** Open any song; inspect modal with screen reader
- **Actual Result:** Modal has no `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`
- **Expected Result:** Modal announced as dialog with title
- **Impact:** Screen reader users do not know they are in a modal; cannot identify purpose
- **Possible Root Cause:** Modals built with generic div without dialog attributes
- **Recommendation:** Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to song title

### Issue: Presentation Modal Missing Dialog Semantics
- **Affected Page:** songbook.html
- **Affected View:** All (especially iPad during worship service)
- **Severity:** High
- **Priority:** P2
- **Steps to Reproduce:** Start presentation mode; use screen reader
- **Actual Result:** No dialog role or accessible labeling
- **Expected Result:** Announced as dialog/presentation
- **Impact:** Accessibility gap for worship team members using assistive technology
- **Possible Root Cause:** Same as above — generic div modal
- **Recommendation:** Add dialog semantics and focus management to presentation modal

### Issue: Modal Close Button is a Span (Not a Button)
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** Medium
- **Priority:** P2
- **Steps to Reproduce:** Try to close song modal via keyboard (Tab to close, Enter)
- **Actual Result:** Span is not keyboard-focusable by default
- **Expected Result:** Close control is focusable and activatable
- **Impact:** Keyboard-only users cannot close modal without Escape key
- **Possible Root Cause:** Close element is `<span>` instead of `<button>`
- **Recommendation:** Change close span to `<button>` with accessible label "Close"

### Issue: Song Cards Are Non-Semantic Clickable Divs
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Tab through song list
- **Actual Result:** Song cards are not focusable or keyboard-activatable
- **Expected Result:** Cards behave as buttons/links and are keyboard accessible
- **Impact:** Keyboard users cannot navigate or select songs
- **Possible Root Cause:** `songbook-app.js` renders cards as `<div onclick="...">` without tabindex or role
- **Recommendation:** Add `role="button"`, `tabindex="0"`, and keyboard event handler to song cards

### Issue: Filter Tabs Lack Tab-List Semantics
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Use screen reader on filter tabs
- **Actual Result:** Tabs not identified as a tablist; no aria-selected state
- **Expected Result:** Tabs announced with role and selection state
- **Impact:** Reduced usability for assistive technology users
- **Possible Root Cause:** Filter buttons are generic elements without ARIA tab pattern
- **Recommendation:** Implement `role="tablist"`, `role="tab"`, and `aria-selected` pattern

### Issue: Transpose Feature Appears Non-Functional
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Open a song with chords; adjust transpose control
- **Actual Result:** `currentTranspose` value changes but rendered chord output may not update
- **Expected Result:** Displayed chords shift by selected semitones
- **Impact:** Worship team cannot use transpose for different vocalists
- **Possible Root Cause:** `transposeChord` function exists but output pipeline may not re-render chords after state change
- **Recommendation:** Verify and complete the chord transposition rendering pipeline

### Issue: Chord Formatting Inconsistencies in Data
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** Browse songs with chords; compare formatting
- **Actual Result:** Chord notation has inconsistent spacing and tokenization (e.g., "BF#" vs "B F#")
- **Expected Result:** Consistent, readable chord formatting
- **Impact:** Worship musicians may misread chords
- **Possible Root Cause:** Manual data entry without validation/normalization in `songs-data.js`
- **Recommendation:** Normalize chord data; consider structured chord fields separate from lyrics

### Issue: Category Granularity is Low
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** Browse filter categories
- **Actual Result:** Most songs have category "Worship" only
- **Expected Result:** Richer categorization (praise, hymn, communion, Christmas, Easter, etc.)
- **Impact:** Filter feature less useful; harder to find specific song types
- **Possible Root Cause:** Data field not fully populated
- **Recommendation:** Review and enrich song categorization for better filtering

### Issue: Copy Protection Blocks Right-Click for All Users
- **Affected Page:** songbook.html
- **Affected View:** All
- **Severity:** Low
- **Priority:** P4
- **Steps to Reproduce:** Right-click on page; try Ctrl/Cmd+C
- **Actual Result:** Context menu and copy blocked for unauthorized users
- **Expected Result:** Church members may need to copy song text for legitimate use
- **Impact:** Frustrating for authorized users; may feel hostile
- **Possible Root Cause:** Copy protection applied globally before auth check
- **Recommendation:** Only apply copy protection after confirming user is not authorized; consider less aggressive approach

---

## 9. Navigation Findings

### Issue: Confirmed Rotation Bug (Covered in Section 4)
- **Priority:** P1 — See Section 4 for full details

### Issue: Nested Dropdown Arrow Target Too Small/Specific
- **Affected Page:** All pages
- **Affected View:** Mobile
- **Severity:** Medium
- **Priority:** P2
- **Steps to Reproduce:** Open burger menu; tap text of a nested submenu parent (not the arrow icon)
- **Actual Result:** May navigate instead of expanding submenu
- **Expected Result:** Tapping anywhere on the parent item should expand the submenu
- **Impact:** Users accidentally navigate away instead of seeing submenu options
- **Possible Root Cause:** `navigation.js` line 636 checks for `dropdown-arrow` class on the tapped element; full link area does not trigger expand
- **Recommendation:** Expand nested dropdown toggle hit area to include the full parent link text

### Issue: No Visual Indicator of Current Page in Navigation
- **Affected Page:** All pages
- **Affected View:** All
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Navigate to About page; look at navigation menu
- **Actual Result:** No menu item is highlighted as "current"
- **Expected Result:** Active page should be visually distinguished (bold, underline, different color)
- **Impact:** Users lose orientation within the site
- **Possible Root Cause:** No `aria-current="page"` or active class logic
- **Recommendation:** Add current-page detection and visual indicator

### Issue: Menu Does Not Close After Submenu Link Click on Mobile
- **Affected Page:** All pages
- **Affected View:** Mobile
- **Severity:** Medium
- **Priority:** P3
- **Steps to Reproduce:** Open mobile menu; expand dropdown; tap a submenu link
- **Actual Result:** Page navigates but on same-page links, menu may remain open
- **Expected Result:** Mobile menu closes after any navigation selection
- **Impact:** Users must manually close menu if link is same-page anchor
- **Possible Root Cause:** Close logic may not trigger on same-page hash navigation
- **Recommendation:** Add menu close on any link click within mobile nav

---

## 10. Accessibility Findings

### Critical Severity

| # | Issue | Pages Affected |
|---|-------|---------------|
| 1 | No focus trap in mobile menu | All |
| 2 | Song modal missing `role="dialog"`, `aria-modal` | songbook.html |
| 3 | Song cards not keyboard accessible | songbook.html |

### High Severity

| # | Issue | Pages Affected |
|---|-------|---------------|
| 4 | Broken skip link on songbook page | songbook.html |
| 5 | Modal close button is span not button | songbook.html |
| 6 | Presentation modal missing dialog semantics | songbook.html |
| 7 | No focus return to trigger on menu close | All |

### Medium Severity

| # | Issue | Pages Affected |
|---|-------|---------------|
| 8 | Filter tabs missing tablist/tab roles | songbook.html |
| 9 | White text at 60% opacity (contrast risk) | Multiple sections |
| 10 | Dark mode toggle below 44px on some pages | ministries.html |
| 11 | No inline validation feedback on forms | prayer-request.html |
| 12 | No `aria-describedby` for error states | prayer-request.html |
| 13 | About page missing skip link | about.html |
| 14 | No `aria-current="page"` on active nav item | All |

### Low Severity

| # | Issue | Pages Affected |
|---|-------|---------------|
| 15 | innerHTML usage without sanitization (injection risk if data becomes user-editable) | songbook-app.js |
| 16 | Copy protection intercepts standard user interactions | songbook.html |
| 17 | Some images may lack alt text (runtime-rendered content) | Dynamic sections |

---

## 11. UX/UI Improvement Opportunities

### First-Time Church Visitor Perspective
- **Strength:** "Plan Your Visit" page is excellent with clear service times, location, what to expect
- **Strength:** Homepage "New Here" section addresses visitor anxiety well
- **Gap:** No visible phone number on homepage hero/above-fold area
- **Gap:** No childcare/kids information in service logistics section
- **Gap:** No accessibility accommodations statement
- **Recommendation:** Add phone + childcare + accessibility info to "New Here" or service section

### Church Member Perspective
- **Strength:** Calendar, prayer request, and devotional content are comprehensive
- **Gap:** No member portal or quick-access to frequently used features
- **Gap:** Social links are non-functional placeholders
- **Recommendation:** Configure social links; consider "Quick Links" member toolbar

### Worship Team Member (Song Page) Perspective
- **Strength:** Presentation mode is excellent concept
- **Strength:** Service playlist builder is useful
- **Gap:** Transpose may not work correctly
- **Gap:** No key/capo indicator per song
- **Gap:** Chord formatting inconsistent
- **Gap:** No setlist sharing between team members
- **Recommendation:** Complete transpose feature; add key metadata; normalize chords

### Mobile User Perspective
- **Strength:** Touch targets mostly meet 44px minimum
- **Strength:** Dark mode available
- **Gap:** Rotation bug blocks navigation
- **Gap:** Some font sizes too small
- **Gap:** No PWA offline support
- **Recommendation:** Fix rotation bug; enforce font minimums; add service worker

### iPad User During Church Service
- **Strength:** Presentation mode fills screen
- **Gap:** Same rotation bug affects iPad
- **Gap:** No landscape-optimized worship view
- **Recommendation:** Fix rotation; consider landscape-optimized presentation layout

---

## 12. Performance Improvement Opportunities

### Critical Performance Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| 14 CSS files on homepage | Render-blocking; delays FCP | P1 |
| 22 JS files on homepage | Blocks TTI; excessive network requests | P1 |
| No build/bundle pipeline | Assets served individually, no minification/concatenation | P2 |
| Render-blocking scripts in `<head>` without defer/async | Delays parsing and first paint | P2 |
| Multiple inline style blocks | Increases HTML size; prevents caching | P3 |

### Performance Optimization Recommendations

1. **Bundle CSS** — Combine 14 CSS files into 2-3 (critical above-fold + async remainder)
2. **Bundle JS** — Combine/defer 22 scripts; use `defer` on all non-critical scripts
3. **Add build pipeline** — Implement Vite or similar for production bundling/minification
4. **Preload LCP image** — Add `<link rel="preload">` for hero image
5. **Lazy-load heavy libraries** — three.js, GSAP, ScrollTrigger should load on scroll/interaction
6. **Add caching headers for CSS/JS** — Currently only images have cache policies in netlify.toml
7. **Compress/relocate MP4 assets** — Video files in images/ folder may be large
8. **Implement service worker** — Enable offline access for repeat visitors
9. **Remove jQuery dependency** — Only used for Slick carousel; modern CSS or lightweight alternative available
10. **Externalize inline scripts** — Improve cacheability

### Estimated Impact
- Implementing items 1-4 alone could reduce First Contentful Paint by 40-60%
- Adding service worker enables offline worship access (critical for church service use)

---

## 13. Content Improvement Opportunities

### Content Quality Issues

| Issue | Page | Priority |
|-------|------|----------|
| Social media links are placeholders (#TODO-...) | Footer (all pages) | P2 |
| No visible phone number above fold on homepage | index.html | P3 |
| No childcare/kids logistics in service info | index.html, plan-visit.html | P3 |
| No accessibility accommodations statement | plan-visit.html | P3 |
| Possible broken link: `prayer-req.html` (should be `prayer-request.html`) | plan-visit.html | P2 |
| Sitemap uses github.io domain instead of canonical domain | sitemap.xml | P3 |
| Sitemap incomplete — many pages not listed | sitemap.xml | P3 |
| Song categories underutilized (most are "Worship") | songs-data.js | P4 |
| No pastor/leadership contact on homepage | index.html | P4 |

### Content Recommendations
1. Configure real social media URLs immediately
2. Fix broken prayer request link on Plan Visit page
3. Add phone number and childcare info to visitor-facing sections
4. Expand sitemap to include all public pages with canonical domain
5. Enrich song categorization data for better filtering
6. Add accessibility statement to Plan Visit and About pages

---

## 14. Recommended Development Improvements

### Architecture & Maintenance

| # | Recommendation | Priority | Effort |
|---|----------------|----------|--------|
| 1 | Implement build pipeline (Vite/Rollup) for bundling, minification, tree-shaking | P2 | High |
| 2 | Consolidate duplicate CSS rule locations for mobile dropdown (4 locations → 1) | P2 | Medium |
| 3 | Remove or isolate debug CSS/JS files from production deployment | P2 | Low |
| 4 | Clean up .bak and .backup files from repository | P3 | Low |
| 5 | Consolidate orientation-change handling into single module | P2 | Medium |
| 6 | Fix debounce re-creation bug in resize listener | P1 | Low |
| 7 | Fix event listener cleanup mismatch (memory leak risk) | P2 | Low |
| 8 | Add integration tests for rotation + menu scenarios | P2 | Medium |
| 9 | Implement proper focus trap utility for modals and mobile menu | P1 | Medium |
| 10 | Replace innerHTML usage with safe DOM construction or sanitization | P3 | Medium |

### Testing Gaps
- No automated rotation + interaction test coverage
- Playwright tests exist but no specific orientation-change scenarios confirmed
- No accessibility automated testing (axe-core or similar) in pipeline

---

## 15. Prioritized Action Plan

### Phase 1: Critical Fixes (P1) — Immediate
| # | Action | Estimated Impact |
|---|--------|-----------------|
| 1 | Fix debounce re-creation in resize handler | Eliminates root cause of rotation timing issues |
| 2 | Suppress forced dropdown close when staying in same mode during rotation | Fixes submenu disappearing |
| 3 | Add focus trap to mobile menu | Resolves critical accessibility violation |
| 4 | Add `defer` attribute to non-critical head scripts | Immediate performance gain |
| 5 | Fix broken link `prayer-req.html` → `prayer-request.html` | Prevents 404 for visitors |

### Phase 2: High Priority Fixes (P2) — Within 2 Sprints
| # | Action | Estimated Impact |
|---|--------|-----------------|
| 6 | Add dialog semantics to all song page modals | Accessibility compliance |
| 7 | Fix skip link target on songbook page | Keyboard navigation restored |
| 8 | Change modal close span to button element | Keyboard accessibility |
| 9 | Configure real social media URLs | User trust and engagement |
| 10 | Consolidate mobile dropdown CSS rules | Reduces override conflicts |
| 11 | Fix listener cleanup mismatch in navigation.js | Prevents memory leaks |
| 12 | Expand nested dropdown trigger hit area | Mobile navigation usability |
| 13 | Add post-rotation stabilization delay | Prevents tap-during-transition failures |

### Phase 3: Medium Priority (P3) — Within 1-2 Months
| # | Action | Estimated Impact |
|---|--------|-----------------|
| 14 | Implement build/bundle pipeline | Major performance improvement |
| 15 | Enforce minimum 14px font size on mobile | Readability improvement |
| 16 | Add current-page indicator to navigation | User orientation |
| 17 | Add phone/childcare info to visitor sections | Visitor experience |
| 18 | Update sitemap with all pages + canonical domain | SEO improvement |
| 19 | Add integration tests for rotation scenarios | Regression prevention |
| 20 | Consolidate orientation handling modules | Code maintainability |

### Phase 4: Polish & Enhancement (P4) — Ongoing
| # | Action | Estimated Impact |
|---|--------|-----------------|
| 21 | Remove duplicate/backup files from repository | Repository cleanliness |
| 22 | Enrich song categorization data | Better song filtering |
| 23 | Normalize chord formatting in song data | Worship team usability |
| 24 | Add service worker for offline support | Progressive web app |
| 25 | Consider landscape-optimized presentation mode | iPad worship enhancement |
| 26 | Add accessibility accommodations statement | Inclusive welcome |

---

## 16. Final Recommendation

The GPBC website is a commendable effort with strong church content and genuine accessibility investment. The most urgent action is resolving the **mobile rotation/submenu bug** (Section 4), which directly blocks navigation for mobile and tablet users — the majority use case for church members accessing the site during or between services.

The second priority should be **performance optimization** through bundling and deferring resources. The current 36-file load on homepage is unsustainable for mobile networks and significantly harms the first-visit experience that church outreach depends on.

The third priority is **completing accessibility work** already started — the foundation (ARIA, focus-visible, touch targets) is strong, but the song page modals and mobile menu focus management need completion to meet WCAG 2.1 AA compliance.

With the Phase 1 critical fixes implemented, the website health score would improve from **6.5/10 to approximately 8/10**. Completing through Phase 3 would bring it to a professional-grade **9/10** suitable for a growing church's digital presence.

---

*End of Audit Report*  
*Report generated: May 21, 2026*  
*Classification: Internal — Development Team Use*
