# HEADER ARCHITECTURE AUDIT & STANDARDIZATION REPORT
**Date:** February 1, 2026  
**Engineer:** Senior Front-End Architecture Specialist  
**Objective:** Standardize ALL pages to match Homepage header as Single Source of Truth

---

## STEP 1: BEFORE AUDIT TABLE

| File | Theme Init | Toggle CSS | Toggle HTML | Icon Visible | Header Height | Countdown | Status |
|------|-----------|------------|-------------|--------------|---------------|-----------|--------|
| **index.html** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ✅ CORRECT | ✅ YES | **GOLD STANDARD** |
| about.html | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ❌ NO | **NEEDS FIX** |
| beliefs.html | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ❌ NO | **NEEDS FIX** |
| calendar.html | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ⚠️ MOBILE ONLY | **NEEDS FIX** |
| daily-devotion.html | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ❌ NO | **NEEDS FIX** |
| gallery.html | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ❌ NO | **NEEDS FIX** |
| give.html | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ❌ NO | **NEEDS FIX** |
| leadership.html | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ❌ NO | **NEEDS FIX** |
| ministries.html | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ❌ NO | **NEEDS FIX** |
| + 18 more pages | ❌ NO | ❌ NO | ✅ YES | ❌ NO | ⚠️ INCONSISTENT | ❌ NO | **NEEDS FIX** |

**Critical Finding:** Only `index.html` has complete header architecture.

---

## STEP 2: MISSING DEPENDENCIES ANALYSIS

### ❌ **CRITICAL: Missing Theme Initialization Script**
**Location in index.html:** Lines 376-391  
**Purpose:** Prevents FOUC (Flash of Unstyled Content), applies theme BEFORE page paint  
**Impact:** All other pages show wrong theme on initial load, causing jarring flash

```html
<!-- Theme & JS Detection — DO NOT REMOVE -->
<script>
    (function () {
        // Instant JS detection
        document.documentElement.classList.add('js-enabled');

        // Theme pre-detection
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.addEventListener('DOMContentLoaded', () => {
                document.body.setAttribute('data-theme', 'dark');
                document.body.classList.add('dark');
            });
        }
    })();
</script>
```

**Missing from:** ALL 26 pages (except index.html)

---

### ❌ **Toggle Icon Visibility Issue**
**Root Cause:** `dark-mode-toggle-position.css` recently added BUT not effective without theme init  
**Why icons invisible:**
1. Theme class not applied to `<html>` on page load
2. CSS rules rely on `body.dark` or `[data-theme="dark"]` selectors
3. Without theme init, selectors don't match → icons hidden

**CSS Evidence from dark-mode-toggle-position.css:**
```css
.dark-mode-toggle {
    position: absolute !important;
    right: calc(var(--container-padding) + 0.25rem) !important;
    top: 6px !important;
    /* Icons rendered via emoji - needs theme for proper display */
}
```

---

### ❌ **Header Height Inconsistency**
**Homepage approach:**
- Uses `dark-mode-toggle-position.css` with `position: absolute`
- Toggle floats above navigation
- Header height naturally adapts

**Other pages problem:**
- Same CSS file added recently
- BUT missing complementary theme initialization
- Results in layout shifts during paint

---

### ❌ **Countdown Pill Missing**
**Homepage has:**
```html
<div id="specialEventBanner" class="hero-countdown-badge header-countdown">
    <!-- Countdown content -->
</div>
```

**Other pages:** Missing entirely (except calendar.html has mobile-only version)

---

## STEP 3: CANONICAL HEADER MODULE (from index.html)

### **Required in `<head>` (BEFORE any other CSS):**

```html
<!-- Theme & JS Detection — MUST BE IN HEAD BEFORE CSS -->
<script>
    (function () {
        document.documentElement.classList.add('js-enabled');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.addEventListener('DOMContentLoaded', () => {
                document.body.setAttribute('data-theme', 'dark');
                document.body.classList.add('dark');
            });
        }
    })();
</script>
```

### **Required CSS imports:**
```html
<link rel="stylesheet" href="logo-loading.css">
<link rel="stylesheet" href="logo-styles.css">
<link rel="stylesheet" href="dark-mode-toggle-position.css">
```

### **Required Header HTML:**
```html
<header>
    <nav>
        <div class="nav-container">
            <a href="index.html#home" class="logo">GPBC</a>
            <button id="darkModeToggle" class="dark-mode-toggle" aria-label="Toggle dark mode">
                <span class="sun-icon">☀️</span>
                <span class="moon-icon">🌙</span>
            </button>
            <button class="mobile-menu-btn" aria-label="Toggle mobile menu">
                <span></span><span></span><span></span>
            </button>
            <ul class="nav-links">
                <!-- Navigation items -->
            </ul>
        </div>
    </nav>
    <!-- Countdown badge -->
    <div id="specialEventBanner" class="hero-countdown-badge header-countdown" role="region" aria-live="off">
        <!-- Countdown content from index.html -->
    </div>
    <div class="mobile-overlay"></div>
</header>
```

### **Required JS before `</body>`:**
```html
<script src="navigation.js?v=20260125c"></script>
<script src="logo-loader.js"></script>
<script src="countdown.js"></script>
```

---

## STEP 4: IMPLEMENTATION PLAN

### **Phase 1: Add Theme Initialization (26 pages)**
- Insert theme script in `<head>` after meta tags, BEFORE CSS
- Prevents FOUC and enables proper dark mode detection

### **Phase 2: Verify CSS Stack (26 pages)**
- Confirm `dark-mode-toggle-position.css` present
- Confirm `logo-loading.css` and `logo-styles.css` present
- Verify proper load order

### **Phase 3: Add Countdown Badge Structure (26 pages)**
- Insert countdown HTML after `</nav>`, before `</header>`
- Maintains consistent header height
- Provides visual consistency

### **Phase 4: Verify JavaScript Stack (26 pages)**
- Confirm `navigation.js` loaded
- Confirm `logo-loader.js` loaded  
- Confirm `countdown.js` loaded

---

## STEP 5: EXPECTED OUTCOMES

### **After Fix:**
✅ Toggle icons visible in light AND dark mode  
✅ No theme flash on page load  
✅ Consistent header height across all pages  
✅ Countdown badge present (or reserved space)  
✅ Smooth theme transitions  
✅ Logo loads properly  
✅ Navigation dropdown works consistently  

---

## STEP 6: MOBILE DROPDOWN AUDIT (DO NOT FIX YET)

### **Findings:**
- Navigation.js handles mobile dropdown logic
- CSS in redesign-styles.css handles mobile styles
- All pages load navigation.js
- Issue likely: Event listener timing or DOM readiness

### **Mobile Dropdown Fix Plan (Future):**
1. Audit navigation.js event binding order
2. Check for conflicting event listeners
3. Verify mobile-menu-btn class consistency
4. Test touch events on actual devices
5. Check z-index stacking for mobile-overlay

**Status:** Documented for future sprint. Not critical for current header standardization.

---

## NEXT STEPS

Execute implementation plan systematically:
1. Add theme init script to all 26 pages
2. Verify CSS imports
3. Add countdown badge HTML
4. Verify JS imports
5. Run after-audit verification
6. Test dark/light mode toggle on all pages
7. Test responsive behavior

**Estimated Time:** 30-45 minutes for systematic implementation
