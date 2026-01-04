# iOS Safari Real Device Horizontal Scroll Fix

## Problem Statement
Real iPhone Safari devices were allowing horizontal scroll (left/right swipe) even though desktop mobile emulation showed no issues. This is a known iOS Safari bug where the browser handles viewport width calculations differently than other browsers.

## Root Cause
iOS Safari has specific rendering quirks:
1. **Viewport Width Bug**: iOS Safari calculates `100vw` including the scrollbar width, making elements wider than the actual viewport
2. **Flex/Grid Overflow**: Flex and grid children don't automatically shrink to fit their containers
3. **Scrollable Element Leaking**: Elements with `overflow-x: auto` can leak width to their parents if not properly contained

## Solution Implemented

### 1. Global Layout Lock (All Pages)
Added to all 32 HTML pages:
```css
/* GLOBAL LAYOUT LOCK — SAFE, DO NOT REMOVE */
*,
*::before,
*::after {
    box-sizing: border-box;
}

html,
body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
}

/* iOS SAFARI OVERFLOW GUARD — REAL DEVICE FIX */
@supports (-webkit-touch-callout: none) {
    body {
        overflow-x: hidden !important;
        position: relative;
    }
}
```

### 2. Scrollable Element Containment (daily-devotion.html)
Enhanced the date strip wrapper to properly contain its scrollable child:
```css
.date-strip-wrapper {
    overflow: hidden; /* Contain scrollable children */
    width: 100%;
    max-width: 100%;
}

.date-strip {
    overflow-x: auto;
    overflow-y: hidden; /* Only horizontal scroll */
    min-width: 0; /* Allow flex shrinking */
}
```

## Files Modified
✅ 32 HTML files with iOS Safari overflow guard:
- index.html
- about.html, history.html, mission.html, beliefs.html, core-values.html, position-papers.html, leadership.html
- family-devotion.html, children-devotion.html, youth-devotion.html, couples-devotion.html
- daily-devotion.html (enhanced with date-strip containment)
- fasting-21days.html, fasting-30days.html, fasting-40days.html, gratitude-fasting.html
- give.html, give-modern.html, give-tailwind.html, give-professional.html, give-backup.html, give-bootstrap.html
- gallery.html, prayer-request.html, calendar.html, testimonies.html
- terms-conditions.html, privacy-policy.html
- redesign-mockup.html
- songbook.html, songbook-new.html, plan-visit.html

## Testing Checklist

### Critical Pages (Must Test on Real iPhone)
- [ ] **Daily Devotion** (`daily-devotion.html`)
  - [ ] Portrait mode: No horizontal scroll
  - [ ] Landscape mode: No horizontal scroll
  - [ ] Date carousel: Scrolls ONLY the carousel, not the page
  - [ ] Navigate between dates: No page-wide scroll
  
- [ ] **Calendar** (`calendar.html`)
  - [ ] Portrait mode: No horizontal scroll
  - [ ] Landscape mode: No horizontal scroll
  - [ ] Month/day navigation: Contained properly
  
- [ ] **Gallery** (`gallery.html`)
  - [ ] Portrait mode: No horizontal scroll
  - [ ] Landscape mode: No horizontal scroll
  - [ ] Image grid: Responsive without overflow

### Secondary Pages (Spot Check)
- [ ] Homepage (`index.html`): Portrait & landscape
- [ ] About page (`about.html`): Portrait & landscape
- [ ] Give page (`give.html`): Portrait & landscape

### Test Devices
- [ ] iPhone Safari (Real device - PRIMARY)
- [ ] iPad Safari (Real device - SECONDARY)
- [ ] Desktop Chrome (Verify no regressions)
- [ ] Android Chrome (Verify no regressions)

## Verification Steps

### On Real iPhone Safari:
1. Open each critical page
2. Try to swipe left/right anywhere on the page
3. Expected: Page should NOT scroll horizontally
4. For scrollable elements (like date carousel):
   - The specific element should scroll
   - The page body should NOT scroll

### Signs of Success:
✅ No horizontal scrollbar appears
✅ Cannot swipe left/right on page body
✅ Intentional scrollable elements (like date carousel) still work
✅ All content visible without horizontal scrolling
✅ No visual changes to layout
✅ Desktop and Android unaffected

## Technical Details

### Why `@supports (-webkit-touch-callout: none)`?
This CSS feature query specifically targets iOS Safari without affecting other browsers. It's a reliable way to apply iOS-specific fixes.

### Why `overflow-x: hidden !important`?
The `!important` flag ensures this rule takes precedence over any conflicting styles that might be inherited or applied later in the cascade.

### Why `position: relative` on body?
This creates a containing block that helps prevent absolutely positioned elements from causing overflow.

## Rollback Plan
If issues arise:
1. Revert changes to specific problematic files
2. The fix is isolated to `<style>` blocks in each HTML file
3. Look for the comment `/* iOS SAFARI OVERFLOW GUARD — REAL DEVICE FIX */`
4. Remove only the `@supports` block if needed (keep the rest of the global layout lock)

## References
- iOS Safari Viewport Width Bug: Known issue since iOS 8
- CSS Feature Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/@supports
- Webkit Touch Callout: iOS-specific CSS property for text selection
