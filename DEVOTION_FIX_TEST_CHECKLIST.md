# Devotion + Navigation Fix - Test Checklist

**Date:** February 18, 2026  
**Branch:** 40-days-fasting  
**Commit:** d46646f

## Files Changed

1. **devotion-unlock-engine.js** - Global unlock override system
2. **lent-fasting.html** - Content rendering fixes + auto-unlock
3. **daily-devotion.html** - Reference mode (no verseText)
4. **Verified:** navigation.js (no changes needed - already correct)

---

## Test Matrix

### 1️⃣ Mobile Navigation (iOS/Android, <1024px)

#### Daily Devotion Page
- [ ] **Mobile burger menu opens/closes**
  - URL: `http://localhost:8000/daily-devotion.html`
  - Tap burger icon → menu slides in from right
  - Tap overlay → menu closes
  
- [ ] **Devotion dropdown works**
  - Tap "Devotion" → dropdown expands (accordion style)
  - Items visible: Today's Devotion, Lent 40 Days, etc.
  - White text on purple background (readable)
  - Tap item → navigates correctly
  
- [ ] **Other dropdowns work**
  - Test "About" dropdown
  - Test "Ministries" dropdown
  - Only one dropdown open at a time (accordion)

#### Lent Page
- [ ] **Mobile burger menu works**
  - URL: `http://localhost:8000/lent-fasting.html`
  - Same burger menu behavior
  - Dropdown items visible and clickable

---

### 2️⃣ iPad Navigation (768px - 1024px)

#### Daily Devotion Page
- [ ] **Burger menu works on iPad**
  - URL: `http://localhost:8000/daily-devotion.html`
  - Rotate to portrait → burger menu appears
  - Rotate to landscape → test both orientations
  
- [ ] **Dropdowns work smoothly**
  - No delay or animation lag
  - Touch targets are ≥44px (tap-friendly)

#### Lent Page
- [ ] **Same iPad behavior**
  - URL: `http://localhost:8000/lent-fasting.html`
  - Consistent with daily devotion page

---

### 3️⃣ Desktop Navigation (>1024px)

#### Daily Devotion Page
- [ ] **Hover dropdowns work**
  - URL: `http://localhost:8000/daily-devotion.html`
  - Hover over "Devotion" → dropdown appears
  - Move mouse away → dropdown disappears
  - No burger menu visible

#### Lent Page
- [ ] **Same desktop behavior**
  - URL: `http://localhost:8000/lent-fasting.html`
  - Hover over "About" / "Ministries" / "Devotion"
  - Dropdowns work consistently

---

### 4️⃣ Daily Devotion - Reference Mode

- [ ] **Bible verse shows reference only**
  - URL: `http://localhost:8000/daily-devotion.html`
  - Scripture section shows: "Philippians 4:6-7 (NIV)" or similar
  - **NO full verse text displayed**
  - "Read on BibleGateway.com" link present
  
- [ ] **Bible Gateway link works**
  - Click "Read on BibleGateway.com" button
  - Opens https://www.biblegateway.com/passage/?search=...
  - Correct verse reference in URL
  
- [ ] **No "Loading verse..." message**
  - Page loads → reference appears immediately
  - No loader/spinner for verse text
  - Share card works without verseText
  
- [ ] **Change date**
  - Navigate to different dates via calendar
  - Each date shows reference + Bible Gateway link
  - No errors in console

---

### 5️⃣ Lent 40 Days - Content Rendering

- [ ] **Day 1 content visible**
  - URL: `http://localhost:8000/lent-fasting.html`
  - Day 1 title: "The Call to the Wilderness"
  - Key Verse: "Matthew 4:1-2 (NIV)"
  - Reflection: Full text visible (no blank card)
  - Prayer: Full text visible (no blank card)
  
- [ ] **Language toggle works**
  - Click "English" → English content only
  - Click "Bangla" → Bangla content only (or fallback message)
  - Click "Both" → Both languages visible
  
- [ ] **Day 2 content visible**
  - Navigate to Day 2
  - Title: "A Sincere Return"
  - Key Verse: "Joel 2:12-13"
  - Reflection and Prayer both visible
  
- [ ] **Test multiple days (random sample)**
  - Day 5, Day 15, Day 25, Day 40
  - Each day shows title, verse reference, reflection, prayer
  - No blank content cards

---

### 6️⃣ Unlock Requirement

#### Option A: Global Flag
- [ ] **Set window.FORCE_DEVOTION_UNLOCK = true**
  - Open browser console
  - Type: `window.FORCE_DEVOTION_UNLOCK = true`
  - Reload page
  - All 40 days unlocked in dropdown
  - Can navigate to any day directly
  
#### Option B: Query Parameter
- [ ] **Use ?unlock=1**
  - URL: `http://localhost:8000/lent-fasting.html?unlock=1`
  - All days unlocked
  - No lock icons in day selector
  
#### Option C: JSON Flag
- [ ] **Set devUnlockAllDays in JSON**
  - Open `lent-fasting-devotions.json`
  - Set `"devUnlockAllDays": true` at top level
  - Reload page
  - All days unlocked automatically
  - Console log: "devUnlockAllDays=true detected"

#### Verification
- [ ] **Day 40 accessible**
  - Select "Day 40" from dropdown
  - Content loads (not locked)
  - No lock overlay appears

---

### 7️⃣ Favicon Fixes

- [ ] **No 404 errors in console**
  - URL: `http://localhost:8000/daily-devotion.html`
  - Open DevTools → Network tab
  - Check for favicon requests
  - All should return 200 OK (no 404)
  
- [ ] **Favicon appears in browser tab**
  - GPBC logo visible in tab
  - Correct icon on mobile home screen (if added)

---

### 8️⃣ Cross-Browser Tests

- [ ] **Chrome Desktop**
  - Navigation dropdowns work
  - Reference mode works
  - Lent content visible
  
- [ ] **Safari Desktop**
  - Same checks as Chrome
  
- [ ] **Firefox Desktop**
  - Same checks as Chrome
  
- [ ] **Chrome Mobile (Android)**
  - Burger menu works
  - Touch targets easy to tap
  - Dropdowns open/close correctly
  
- [ ] **Safari Mobile (iOS)**
  - Same checks as Chrome Mobile

---

## Expected Results Summary

✅ **Navigation:**
- Mobile: Burger menu + accordion dropdowns
- iPad: Same as mobile (responsive breakpoint)
- Desktop: Hover dropdowns (no burger menu)

✅ **Daily Devotion:**
- Verse reference displayed (e.g., "John 3:16 (NIV)")
- "Read on BibleGateway.com" link present
- No "Loading verse..." or blank verse text

✅ **Lent 40 Days:**
- Day 1-40 all show title, verse, reflection, prayer
- Language toggle works (English/Bangla/Both)
- No blank content cards

✅ **Unlock:**
- window.FORCE_DEVOTION_UNLOCK = true unlocks all
- ?unlock=1 query param unlocks all
- devUnlockAllDays: true in JSON auto-unlocks all

✅ **Favicon:**
- No 404 errors in console
- GPBC logo visible in browser tab

---

## Bug Report Template

If you find issues, report using this format:

```
**Page:** [URL]
**Device:** [Mobile/iPad/Desktop + OS/Browser]
**Issue:** [Description]
**Steps to Reproduce:**
1. 
2. 
3. 
**Expected:** [What should happen]
**Actual:** [What actually happens]
**Console Errors:** [Copy from DevTools Console]
```

---

## Notes

- All changes are **minimal** - only fixed broken functionality
- No redesign or new features added
- Navigation.js verified as already correct (single delegated handler)
- Changes are backwards-compatible with existing devotion pages
