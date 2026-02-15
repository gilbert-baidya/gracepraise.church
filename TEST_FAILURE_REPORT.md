# 🐛 Detailed Test Failure Report
**Generated:** February 14, 2026  
**Branch:** automation-playwright  
**Test Suite:** Smoke Tests (auto-generated-coverage.spec.ts)  
**Total Tests Run:** 42 tests  
**Status:** ✅ 36 Passed | ❌ 5 Failed | ⏭️ 1 Interrupted

---

## ❌ Issue #1: Home Page - WebGL Renderer Error

**Test:** `Home - has no console errors`  
**Status:** FAILED  
**Severity:** ⚠️ Medium (Cosmetic)  
**Duration:** 6.6s

### Error Details
```
Expected length: 0
Received length: 1
Received array: ["THREE.WebGLRenderer: Error creating WebGL context."]
```

### Root Cause
The homepage uses THREE.js library for 3D graphics/animations, but WebGL context creation is failing. This could be due to:
- Browser doesn't support WebGL
- Hardware acceleration disabled
- GPU not available in headless mode
- THREE.js initialization error

### Impact
- **User Experience:** 3D animations/graphics may not render
- **Functionality:** Website still works, but visual effects broken
- **SEO:** No impact
- **Accessibility:** No impact

### Affected File(s)
- `/index.html` - Homepage
- Likely uses: `three.js` or `three.min.js`

### Recommended Fix
1. **Add WebGL detection:**
```javascript
// Check WebGL support before initializing THREE.js
function hasWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch(e) {
    return false;
  }
}

if (hasWebGLSupport()) {
  // Initialize THREE.js renderer
} else {
  console.log('WebGL not supported, using fallback');
  // Show static image instead
}
```

2. **Suppress error in tests:** Update error filter to exclude WebGL errors
3. **Add fallback:** Provide static image when WebGL unavailable

### Screenshot Location
`test-results/smoke-auto-generated-cover-91d6f-ome---has-no-console-errors-Desktop-Chrome/test-failed-1.png`

---

## ❌ Issue #2: Admin Panel - Multiple 404 & Connection Errors

**Test:** `Admin Panel - has no console errors`  
**Status:** FAILED  
**Severity:** 🔴 High (Functionality)  
**Duration:** 2.2s

### Error Details
```
Expected length: 0
Received length: 3
Received array: [
  "Failed to load resource: the server responded with a status of 404 (File not found)",
  "Failed to load resource: the server responded with a status of 404 (File not found)",
  "Failed to load resource: net::ERR_CONNECTION_REFUSED"
]
```

### Root Cause
Admin panel (`/admin/index.html`) is trying to load resources that don't exist:
1. **Missing files (404)** - 2 resources not found
2. **Connection refused** - Attempting to connect to external service (likely Firebase)

### Likely Missing Resources
Based on typical admin panels:
- Firebase config files (`firebase-config.js`)
- Google Sheets API credentials
- Admin authentication scripts
- Backend API endpoints

### Impact
- **User Experience:** Admin panel may not function
- **Functionality:** Cannot access admin features
- **Security:** Could expose broken auth flows
- **Business Impact:** Staff cannot manage content

### Affected File(s)
- `/admin/index.html` - Admin panel page
- Likely references missing:
  - `firebase-config.js`
  - Google Sheets API endpoints
  - Admin authentication services

### Recommended Fix

**Option 1: Fix Missing Files**
```bash
# Check what files admin panel expects
cd "/Users/gbaidya/Documents/Project cool/Calendar 2026"
grep -r "firebase-config" admin/
grep -r "googleapis.com" admin/
```

**Option 2: Add Error Handling**
```javascript
// In admin/index.html
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      console.warn(`Failed to load ${src}, continuing without it`);
      resolve(); // Don't fail completely
    };
    document.head.appendChild(script);
  });
};

// Load with error handling
await loadScript('./firebase-config.js').catch(console.warn);
```

**Option 3: Exclude from Tests** (if admin panel is work-in-progress)
```typescript
// In smoke tests, skip admin panel temporarily
const PAGE_ROUTES = [
  // ... other pages
  // { name: 'Admin Panel', path: '/admin/index.html', hasNav: true, hasFooter: true }, // Skip until fixed
];
```

### Screenshot Location
`test-results/smoke-auto-generated-cover-8072f-nel---has-no-console-errors-Desktop-Chrome/test-failed-1.png`

---

## ❌ Issue #3: Fasting 21 Days - Missing Resource

**Test:** `Fasting 21 Days - has no console errors`  
**Status:** FAILED  
**Severity:** ⚠️ Low (Visual)  
**Duration:** 743ms

### Error Details
```
Expected length: 0
Received length: 1
Received array: ["Failed to load resource: the server responded with a status of 404 (File not found)"]
```

### Root Cause
The fasting page is trying to load a resource (likely background image or icon) that doesn't exist on the server.

### Likely Missing Resource
Based on page context:
- Background image: `/backgrounds/fasting-21days-*.png`
- Prayer icon or graphic
- Devotional image

### Impact
- **User Experience:** Missing visual element
- **Functionality:** Page works, just missing image
- **SEO:** Minimal impact
- **Accessibility:** Alternative text should still display

### Affected File(s)
- `/fasting-21days.html`

### Recommended Fix

**Step 1: Find the missing resource**
```bash
cd "/Users/gbaidya/Documents/Project cool/Calendar 2026"
grep -n "src=" fasting-21days.html | grep -v "http"
# Look for broken file references
```

**Step 2: Check if file exists**
```bash
# Common locations
ls -la backgrounds/ | grep fasting
ls -la images/ | grep fasting
ls -la assets/ | grep fasting
```

**Step 3: Add missing file or fix path**
```html
<!-- Option A: Fix path if file exists elsewhere -->
<img src="/images/fasting-background.jpg" alt="Fasting">

<!-- Option B: Use fallback if file missing -->
<img src="/images/fasting-background.jpg" 
     onerror="this.src='/images/default-devotion-bg.jpg'"
     alt="Fasting">

<!-- Option C: Use placeholder if needed -->
<img src="https://via.placeholder.com/1200x600/667eea/ffffff?text=21+Days+Fasting"
     alt="21 Days Fasting">
```

### Screenshot Location
`test-results/smoke-auto-generated-cover-8ed41-ays---has-no-console-errors-Desktop-Chrome/test-failed-1.png`

---

## ❌ Issue #4: Fasting 30 Days - Missing Resource

**Test:** `Fasting 30 Days - has no console errors`  
**Status:** FAILED  
**Severity:** ⚠️ Low (Visual)  
**Duration:** 734ms

### Error Details
```
Expected length: 0
Received length: 1
Received array: ["Failed to load resource: the server responded with a status of 404 (File not found)"]
```

### Root Cause
Same as Issue #3 - Missing background image or resource for 30-day fasting page.

### Impact
- Identical to Issue #3
- Affects visual presentation only

### Affected File(s)
- `/fasting-30days.html`

### Recommended Fix
Same approach as Issue #3:
1. Locate missing resource reference
2. Add missing file or update path
3. Add fallback image handler

### Screenshot Location
`test-results/smoke-auto-generated-cover-17795-ays---has-no-console-errors-Desktop-Chrome/test-failed-1.png`

---

## ❌ Issue #5: Fasting 40 Days - Missing Resource

**Test:** `Fasting 40 Days - has no console errors`  
**Status:** FAILED  
**Severity:** ⚠️ Low (Visual)  
**Duration:** 739ms

### Error Details
```
Expected length: 0
Received length: 1
Received array: ["Failed to load resource: the server responded with a status of 404 (File not found)"]
```

### Root Cause
Same pattern as Issues #3 and #4 - Missing background image or resource.

### Impact
- Identical to Issues #3 and #4
- Visual presentation affected

### Affected File(s)
- `/fasting-40days.html`

### Recommended Fix
Same approach as Issues #3 and #4.

### Screenshot Location
`test-results/smoke-auto-generated-cover-d767c-ays---has-no-console-errors-Desktop-Chrome/test-failed-1.png`

---

## 📊 Summary & Priority

### Severity Breakdown
- 🔴 **High Priority:** 1 issue (Admin Panel)
- ⚠️ **Medium Priority:** 1 issue (WebGL on Homepage)
- ⚠️ **Low Priority:** 3 issues (Fasting pages missing images)

### Recommended Action Plan

#### Immediate (This Sprint)
1. **Fix Admin Panel** (Issue #2)
   - Add missing Firebase config or graceful error handling
   - Test admin functionality works properly
   - Priority: 🔴 HIGH

#### Short Term (Next Sprint)
2. **Fix Fasting Pages** (Issues #3, #4, #5)
   - Batch fix - all three pages have same issue
   - Add missing background images or fix paths
   - Add image fallback handlers
   - Priority: ⚠️ MEDIUM

3. **WebGL Homepage** (Issue #1)
   - Add WebGL detection and fallback
   - Suppress console error with try/catch
   - Priority: ⚠️ MEDIUM

#### Long Term (Backlog)
4. **Improve Error Handling**
   - Add global image onerror handler
   - Implement resource preloading validation
   - Add monitoring for 404s in production

### Test Configuration Notes

**Why Tests Failed on Missing Resources:**
The smoke tests check for **zero console errors**, which is a strict standard. This helps catch:
- Broken links
- Missing assets
- JavaScript errors
- API connection issues

**To Adjust Tolerance:**
If you want to allow some 404s (e.g., optional images), update the test filter:

```typescript
// In auto-generated-coverage.spec.ts line ~95
const criticalErrors = consoleErrors.filter(err => 
  !err.includes('favicon.ico') && 
  !err.includes('devtools.json') &&
  !err.includes('net::ERR_FILE_NOT_FOUND') &&
  !err.includes('backgrounds/fasting') // <-- Add this to ignore fasting images
);
```

---

## 🎯 Success Metrics

**What's Working Well:**
- ✅ 36 out of 42 tests passed (85.7% pass rate)
- ✅ All page loads return HTTP 200
- ✅ No JavaScript exceptions (except WebGL)
- ✅ Navigation functional on all tested pages
- ✅ Layout integrity maintained (no horizontal scroll)

**Test Framework Performance:**
- ⚡ Average test duration: ~1.2s per test
- 📸 Automatic screenshot capture on failure
- 🎥 Video recording for debugging
- 📊 Real-time dashboard reporting

---

## 📸 View Detailed Evidence

**Interactive HTML Report:**
```bash
npx playwright show-report
# Opens at http://localhost:9323
```

**Screenshot Locations:**
All failure screenshots saved in:
```
test-results/smoke-auto-generated-cover-*/test-failed-1.png
```

**Video Recordings:**
All failure videos saved in:
```
test-results/smoke-auto-generated-cover-*/video.webm
```

---

**Report Generated By:** Playwright Test Automation Framework  
**Framework Version:** 1.51.1  
**Node Version:** 23.7.0  
**Test Config:** playwright.config.ts
