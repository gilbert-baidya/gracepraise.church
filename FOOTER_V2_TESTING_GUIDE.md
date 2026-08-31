# Footer V2 Testing & Deployment Guide

## 🎯 Overview
This guide provides testing steps and deployment commands for the Fiddler-inspired global footer (Footer V2).

## 📁 Files Created/Modified

### New Files:
```
partials/site-footer.html          - Footer HTML structure (mount points)
js/footer/footer.config.js         - Single source of truth for all footer data
js/footer/site-footer.js           - Footer renderer with social icons
js/footer/footer-init.js           - Bootstrap script for footer initialization
css/footer-v2.css                  - Fiddler-inspired footer styles
tools/apply-footer-mount.js        - Script to apply footer to all pages
tools/check-footer-links.js        - Link validation utility
```

### Modified Files:
```
js/partials.js                     - Added support for data-partial="site-footer"
platform-runtime.js                - Added footer init and partials:loaded event
50+ HTML files                     - Added footer mount point + CSS/JS includes
```

## ✅ Pre-Testing Checklist

- [x] All footer links validated (33/33 valid)
- [x] Footer mount applied to 50 pages
- [x] CSS and JS includes added to all pages
- [x] Backups created (.backup-footer-v2)
- [ ] Local server running on port 8000

## 🧪 Testing Instructions

### 1. Start Local Server
```bash
cd "/Users/gbaidya/Documents/Project cool/Calendar 2026"
python3 -m http.server 8000
```

### 2. Test Core Pages

**Homepage**
```
http://localhost:8000/index.html
```
✅ Check:
- [ ] CTA band visible with 4 buttons (Plan Visit, Watch Online, Prayer, Give)
- [ ] Brand section shows church name (English + Bengali)
- [ ] 4 navigation columns render
- [ ] Social icons visible (YouTube, Facebook, Instagram)
- [ ] Copyright shows current year (2026)
- [ ] All links clickable

**Prayer Request Page**
```
http://localhost:8000/prayer-request.html
```
✅ Check:
- [ ] Footer matches homepage exactly
- [ ] No duplicate footers
- [ ] Links work correctly

**Daily Devotion Page**
```
http://localhost:8000/daily-devotion.html
```
✅ Check:
- [ ] Footer renders correctly
- [ ] No layout conflicts with devotion content

**Family Devotion Page**
```
http://localhost:8000/family-devotion.html
```
✅ Check:
- [ ] Footer consistent across devotion pages

### 3. Test Subfolder Pages

**Ministries Index**
```
http://localhost:8000/ministries/index.html
```
✅ Check:
- [ ] Footer loads correctly from subfolder
- [ ] CSS/JS paths resolve properly
- [ ] No 404 errors in console

**Kids Games Index**
```
http://localhost:8000/kids/games/index.html
```
✅ Check:
- [ ] Footer renders from nested subfolder

### 4. Responsive Testing

**Desktop (> 900px)**
- [ ] CTA grid shows 2-4 columns
- [ ] Footer columns show 4 columns
- [ ] Social labels visible
- [ ] Hover effects work

**Tablet (520px - 900px)**
- [ ] Footer columns collapse to 2 columns
- [ ] CTA buttons remain usable
- [ ] Bottom bar stacks vertically

**Mobile (< 520px)**
- [ ] Everything stacks to 1 column
- [ ] CTA buttons full width
- [ ] Social labels hidden
- [ ] Tap targets >= 44px

### 5. Accessibility Testing

**Keyboard Navigation**
- [ ] All links focusable with Tab
- [ ] Focus visible (outline appears)
- [ ] No keyboard traps

**Screen Reader**
- [ ] Footer has role="contentinfo"
- [ ] Social links have aria-label
- [ ] Navigation columns have proper labels

**Color Contrast**
- [ ] Text readable in light mode
- [ ] Text readable in dark mode

### 6. Dark Mode Testing
```javascript
// Toggle dark mode in browser console
document.body.setAttribute('data-theme', 'dark');
```
- [ ] Footer background changes
- [ ] Text colors adjust
- [ ] Borders remain visible
- [ ] Icons maintain visibility

### 7. Link Testing

Run automated link checker:
```bash
node tools/check-footer-links.js
```
Expected: ✅ All 33 links valid

Manual verification:
- [ ] Click each CTA button
- [ ] Test column links in each section
- [ ] Verify social links open in new tab
- [ ] Check legal links work

### 8. Console Error Check

Open browser DevTools (F12) and check:
- [ ] No JavaScript errors
- [ ] No 404 errors for CSS/JS
- [ ] Footer module logs: "[Footer] ✅ Footer initialized successfully"
- [ ] Partials event: "[Footer Init] Partials loaded, initializing footer..."

## 🚀 Deployment Commands

### 1. Check Git Status
```bash
git status
```

### 2. Review Changes
```bash
git diff css/footer-v2.css
git diff js/footer/site-footer.js
```

### 3. Stage All Changes
```bash
git add partials/site-footer.html
git add js/footer/
git add css/footer-v2.css
git add tools/apply-footer-mount.js
git add tools/check-footer-links.js
git add js/partials.js
git add platform-runtime.js
git add '*.html'
```

### 4. Commit
```bash
git commit -m "feat: add Fiddler-inspired global footer v2 with CTA band

- Create modular footer system with partial injection
- Add single-source config (footer.config.js)
- Implement responsive 4-column layout
- Add CTA band: Plan Visit, Watch Online, Prayer, Give
- Include real SVG social icons (YouTube, Facebook, Instagram)
- Apply to 50 website pages
- Support dark mode
- Ensure accessibility (ARIA labels, keyboard nav)
- Auto-year in copyright
- External links open in new tab"
```

### 5. Push to Branch
```bash
git push -u origin feat/footer-v2-fiddler
```

## 📝 GitHub Pages Testing

After pushing, test on GitHub Pages:

**Main site:**
```
https://gracepraise.church/
```

**Test pages:**
```
https://gracepraise.church/prayer-request.html
https://gracepraise.church/daily-devotion.html
https://gracepraise.church/ministries/index.html
```

## 🐛 Troubleshooting

### Footer Not Appearing
1. Check browser console for errors
2. Verify `data-partial="site-footer"` exists in HTML
3. Check if `footer-init.js` is loaded as module
4. Verify `partials:loaded` event fires

### CSS Not Loading
1. Check CSS path in HTML (should be relative to page)
2. Verify `footer-v2.css` exists in `css/` folder
3. Check browser DevTools Network tab for 404s

### Links Not Working
1. Run: `node tools/check-footer-links.js`
2. Check console for "NOT FOUND" warnings
3. Verify files exist at specified paths

### Dark Mode Issues
1. Check if `data-theme="dark"` attribute works
2. Verify CSS variables are defined in `sacred-tokens.css`
3. Test color contrast in DevTools

## 📊 Success Criteria

- ✅ Footer visible on all 50 pages
- ✅ Consistent appearance everywhere
- ✅ All 33 links functional
- ✅ No console errors
- ✅ Responsive on all screen sizes
- ✅ Accessible (keyboard + screen reader)
- ✅ Dark mode compatible
- ✅ Social icons render (no placeholder text)
- ✅ Copyright shows 2026
- ✅ External links open new tab

## 🔄 Rollback Plan (If Needed)

If issues arise:

```bash
# Restore backups
find . -name "*.backup-footer-v2" -exec sh -c 'mv "$1" "${1%.backup-footer-v2}"' _ {} \;

# Remove new files
rm partials/site-footer.html
rm -rf js/footer/
rm css/footer-v2.css
rm tools/apply-footer-mount.js
rm tools/check-footer-links.js

# Reset modified files
git checkout js/partials.js platform-runtime.js

# Commit rollback
git add .
git commit -m "revert: rollback footer-v2 changes"
git push
```

## 📞 Support

Questions or issues? Check:
1. Browser console for error messages
2. `tools/check-footer-links.js` output
3. Backup files (`.backup-footer-v2`)
4. This testing guide

---

**Branch:** `feat/footer-v2-fiddler`  
**Date:** February 21, 2026  
**Pages Modified:** 50  
**Links Validated:** 33/33 ✅
