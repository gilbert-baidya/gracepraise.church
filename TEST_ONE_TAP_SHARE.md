# 🧪 ONE-TAP SHARE TESTING GUIDE

## Quick Start: Testing in Browser Console

The page should now be open at: `http://localhost:8000/daily-devotion.html`

---

## ✅ **TEST 1: Verify One-Tap Controller Loaded**

Open Chrome DevTools (⌘+Option+I) and paste:

```javascript
// Check if one-tap controller is loaded
console.log('One-Tap Controller:', typeof window.oneTapDevotionShare);
console.log('Background Intelligence:', typeof window.getBackgroundForDevotion);
console.log('SMS Optimizer:', typeof window.exportSMSOptimizedCard);
console.log('Current Devotion:', window.__CURRENT_DEVOTION__?.title);
```

**Expected Output:**
```
One-Tap Controller: function ✅
Background Intelligence: function ✅
SMS Optimizer: function ✅
Current Devotion: "Today's Title" ✅
```

If you see `undefined` for any of these, the scripts aren't loading.

---

## ✅ **TEST 2: Test Basic One-Tap Share**

In the console, run:

```javascript
// Test auto share (should open native share or download)
window.oneTapDevotionShare();
```

**Expected Behavior:**
1. See feedback message: "Generating Sacred Card…"
2. Brief pause (1-2 seconds)
3. See feedback: "Blessing Image Prepared"
4. Native share sheet opens (iOS/Android) OR image downloads (desktop)

---

## ✅ **TEST 3: Test Channel-Specific Sharing**

### WhatsApp Share
```javascript
window.oneTapDevotionShare({ channel: 'whatsapp' });
```
**Expected:** Generates square format (1:1), opens share

### SMS Share
```javascript
window.oneTapDevotionShare({ channel: 'sms' });
```
**Expected:** Generates SMS format (4:5), < 350KB, opens share

### Facebook Share
```javascript
window.oneTapDevotionShare({ channel: 'facebook' });
```
**Expected:** Generates square format (1:1), opens share

### Instagram Share
```javascript
window.oneTapDevotionShare({ channel: 'instagram' });
```
**Expected:** Generates story format (9:16), opens share

---

## ✅ **TEST 4: Test Share Buttons on Page**

### "Share Today's Devotion" Button
1. Click the **"Share Today's Devotion"** button at the top of the page
2. Should trigger one-tap share (no modal popup)
3. Should open native share sheet

### WhatsApp Button (in share panel)
1. Scroll to the share panel section
2. Click the **WhatsApp** button
3. Should trigger one-tap share with WhatsApp optimization

### Facebook Button
1. Click the **Facebook** button
2. Should trigger one-tap share with square format

---

## ✅ **TEST 5: Verify Intelligent Background**

```javascript
// Check what background was selected for current devotion
const devotion = window.__CURRENT_DEVOTION__;
if (devotion) {
    const mood = window.analyzeVerseMood?.(devotion);
    const bg = window.getBackgroundForDevotion?.(devotion);
    
    console.log('Detected Mood:', mood);
    console.log('Selected Background:', bg?.filename);
    console.log('Background Theme:', bg?.theme);
    console.log('Background Path:', bg?.path);
}
```

**Expected Output:**
```
Detected Mood: { primary: 'calm', confidence: 0.8, ... }
Selected Background: peace-01.png
Background Theme: fruits
Background Path: daily-devotion/images/backgrounds/fruit-of-the-spirit/peace-01.png
```

---

## ✅ **TEST 6: Verify SMS Optimization**

```javascript
// Test SMS size optimization
async function testSMSSize() {
    const canvas = document.getElementById('shareCardCanvas');
    if (!canvas) {
        console.log('❌ Canvas not ready. Generate a card first.');
        return;
    }
    
    const smsBlob = await window.exportSMSOptimizedCard(canvas);
    const sizeKB = (smsBlob.size / 1024).toFixed(2);
    
    console.log('SMS Image Size:', sizeKB, 'KB');
    console.log('Target: < 400KB');
    console.log(sizeKB < 400 ? '✅ PASS' : '❌ FAIL');
}

// First generate a card, then test
window.oneTapDevotionShare({ channel: 'sms' }).then(() => {
    setTimeout(testSMSSize, 2000);
});
```

**Expected Output:**
```
SMS Image Size: 287.34 KB
Target: < 400KB
✅ PASS
```

---

## ✅ **TEST 7: Test Advanced Modal (Fallback)**

```javascript
// Force show advanced modal (old behavior)
window.oneTapDevotionShare({ showAdvanced: true });
```

**Expected:** Traditional modal opens with format selector and advanced options

---

## ✅ **TEST 8: Verify Background Manifest**

```javascript
// Check if background manifest loaded correctly
if (window.backgroundManifest) {
    const manifest = window.backgroundManifest;
    console.log('Total Backgrounds:', manifest.backgrounds?.length || 0);
    console.log('Fruits:', manifest.backgrounds?.filter(b => b.theme === 'fruits').length);
    console.log('Calm:', manifest.backgrounds?.filter(b => b.theme === 'calm').length);
    console.log('Manifest loaded:', '✅');
} else {
    console.log('❌ Manifest not loaded');
}
```

---

## ✅ **TEST 9: Test Error Resilience**

### Test with no native share support
```javascript
// Temporarily disable native share
const originalShare = navigator.share;
navigator.share = undefined;

window.oneTapDevotionShare().then(result => {
    console.log('Fallback Result:', result);
    console.log('Expected: clipboard or download');
});

// Restore
navigator.share = originalShare;
```

---

## ✅ **TEST 10: Mobile Testing**

### Open on your phone:
1. Get your local IP: In terminal run: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Open on phone: `http://YOUR_IP:8000/daily-devotion.html`
3. Tap "Share Today's Devotion"
4. Should see native iOS/Android share sheet

**Expected on Mobile:**
- Generates story format (9:16) automatically
- Native share sheet appears
- Can share to Messages, WhatsApp, Instagram, etc.

---

## 🐛 **TROUBLESHOOTING**

### Problem: "oneTapDevotionShare is undefined"

**Solution 1 - Check script order:**
```javascript
// In browser console
document.querySelectorAll('script[src*="share"]').forEach(s => {
    console.log(s.src);
});
```
Should see:
- `devotion-background-intelligence.js`
- `sms-share-optimizer.js`
- `share-one-tap-controller.js`

**Solution 2 - Hard refresh:**
- Press ⌘+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Clears browser cache

---

### Problem: "No devotion data available"

**Solution:**
```javascript
// Check if devotion loaded
console.log('Devotion loaded:', window.__CURRENT_DEVOTION__);

// If null, wait for page to fully load
setTimeout(() => {
    window.oneTapDevotionShare();
}, 2000);
```

---

### Problem: Share doesn't open

**Solution - Check console errors:**
1. Open DevTools Console (⌘+Option+J)
2. Look for red error messages
3. Check if canvas is ready:

```javascript
console.log('Canvas exists:', !!document.getElementById('shareCardCanvas'));
console.log('Generator ready:', window.__SHARE_CARD_RENDER_READY__);
```

---

### Problem: Background not showing on share card

**Solution - Verify background system:**
```javascript
// Check background status
const bg = window.getShareBackgroundForCurrentDevotion?.();
console.log('Background for share card:', bg);

// If null, check manifest
console.log('Manifest loaded:', !!window.backgroundManifest);
console.log('Total backgrounds:', window.backgroundManifest?.backgrounds?.length);
```

**If manifest has 0 backgrounds:**
The background images haven't been generated yet. The system will use gradient fallback (which still works beautifully).

---

## 📊 **SUCCESS CRITERIA**

After testing, you should see:

✅ One-tap share completes in < 2 seconds  
✅ Native share sheet opens on mobile  
✅ Clipboard/download fallback works on desktop  
✅ SMS images are < 350KB  
✅ Intelligent backgrounds apply (if generated)  
✅ Sacred gold feedback appears and dismisses  
✅ No console errors  
✅ All share buttons work  
✅ Advanced modal still accessible  
✅ Old share features still work as fallback  

---

## 🎯 **COMPARISON TEST**

### OLD WAY (Still works as fallback):
1. Scroll to share panel
2. Click "Share Card" button in panel
3. Modal opens
4. Select format from dropdown
5. Click "Generate"
6. Wait for card
7. Click "Download" or "Share"

### NEW WAY (One-Tap):
1. Click "Share Today's Devotion" at top
2. Done! ✨

**Test both** to see the difference in speed and friction.

---

## 🔍 **ENABLE DEBUG MODE**

For detailed logging:

```javascript
// Enable debug mode
localStorage.setItem('GPBC_SHARE_DEBUG', 'true');

// Reload page
location.reload();

// Now you'll see detailed logs:
// [GPBC One Tap Share] Starting share flow: { channel: 'auto' }
// [GPBC One Tap Share] Smart format selected: story
// [GPBC One Tap Share] ✅ Native share successful
```

---

## 📱 **QUICK MOBILE TEST**

If you have an iPhone/Android nearby:

1. Get your Mac's IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

2. On your phone, open Safari/Chrome and go to:
```
http://YOUR_IP_HERE:8000/daily-devotion.html
```

3. Tap "Share Today's Devotion"
4. Should see native share sheet instantly

---

## ✅ **READY TO TEST!**

Start with **TEST 1** to verify everything loaded, then try **TEST 2** for the core experience.

The page is already open in Chrome. Open DevTools (⌘+Option+I) and start testing! 🚀
