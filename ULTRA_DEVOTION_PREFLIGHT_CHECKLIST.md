# Ultra Devotion Image System - Pre-Flight Checklist

## ✅ Setup Verification

### 1. Environment Configuration
```bash
# Verify .env file exists and has valid API key
cat .env | grep OPENAI_API_KEY
```

**Expected:** `OPENAI_API_KEY=sk-proj-...` (starts with `sk-proj-` or `sk-`)

### 2. Dependencies Check
```bash
# Verify Node.js version (need 18+)
node --version

# Verify OpenAI SDK installed
npm list openai dotenv
```

**Expected:**
- Node v18.0.0 or higher
- openai@6.x.x
- dotenv@17.x.x

### 3. File Structure Verification
```bash
# Verify all scripts created
ls -la scripts/generate-ultra-devotion-images.js
ls -la scripts/prompt-registry.json
ls -la devotion-background-engine.js
ls -la README_ULTRA_DEVOTION_IMAGES.md
```

**Expected:** All files exist

### 4. Test Script Execution (Dry Run)
```bash
# This will validate setup without generating images
node -e "
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('\\n🔍 Ultra Devotion System Pre-Flight Check\\n');

// Check API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
}
if (!apiKey.startsWith('sk-')) {
    console.error('❌ API key format invalid (should start with sk-)');
    process.exit(1);
}
console.log('✅ API key configured:', apiKey.substring(0, 10) + '...' + apiKey.slice(-4));

// Check OpenAI module
try {
    const OpenAI = require('openai');
    console.log('✅ OpenAI SDK loaded');
} catch (e) {
    console.error('❌ OpenAI SDK not found:', e.message);
    process.exit(1);
}

// Check script exists
const scriptPath = path.join(__dirname, 'scripts', 'generate-ultra-devotion-images.js');
if (!fs.existsSync(scriptPath)) {
    console.error('❌ Generation script not found:', scriptPath);
    process.exit(1);
}
console.log('✅ Generation script exists');

// Check configuration
console.log('\\n⚙️  Configuration:');
console.log('   Model:', process.env.OPENAI_IMAGE_MODEL || 'dall-e-3');
console.log('   Size:', process.env.GPBC_IMAGE_SIZE || '1536x1536');
console.log('   Batch delay:', process.env.GPBC_BATCH_DELAY_MS || '1500', 'ms');
console.log('   Max retries:', process.env.GPBC_MAX_RETRIES || '2');

console.log('\\n✅ All pre-flight checks passed!');
console.log('\\n🚀 Ready to generate. Run:');
console.log('   node scripts/generate-ultra-devotion-images.js\\n');
"
```

---

## 🚀 Generation Commands

### Full Library Generation
```bash
# Generate all 92 images (~$3.68 USD, 20-30 minutes)
node scripts/generate-ultra-devotion-images.js
```

### Retry Failed Images Only
```bash
# If some images failed, retry them (skips successful ones)
node scripts/generate-ultra-devotion-images.js
```

### Force Regenerate Everything
```bash
# Overwrite all existing images (use with caution)
FORCE_REGEN=true node scripts/generate-ultra-devotion-images.js
```

---

## 📊 Post-Generation Verification

### 1. Check Manifest
```bash
# Verify manifest was created
cat daily-devotion/images/backgrounds/background-manifest.json | head -n 30
```

### 2. Count Generated Images
```bash
# Count total images
find daily-devotion/images/backgrounds -name "*.png" | wc -l
```

**Expected:** ~92 PNG files

### 3. Verify Folder Structure
```bash
# List all theme folders
ls -la daily-devotion/images/backgrounds/
```

**Expected Folders:**
- fruit-of-the-spirit/
- calm-creation/
- sms-readable/
- liturgical-seasons/
- dark-mode-sacred/

### 4. Sample Image Check
```bash
# Check file size of random images (should be 500KB-2MB each)
ls -lh daily-devotion/images/backgrounds/fruit-of-the-spirit/ | head -n 5
```

### 5. Test Integration Module
```bash
# Quick test of background engine
node -e "
const DevotionBackgroundEngine = require('./devotion-background-engine.js');

(async () => {
    await DevotionBackgroundEngine.init();
    console.log('Stats:', DevotionBackgroundEngine.getStats());
    
    const peaceBg = DevotionBackgroundEngine.getFruitBackground('peace');
    console.log('Peace background:', peaceBg ? peaceBg.filename : 'Not found');
})();
"
```

---

## 🎨 Integration Steps

### Step 1: Add Background Engine to HTML
```html
<!-- In daily-devotion.html, before closing </body> -->
<script src="devotion-background-engine.js"></script>
```

### Step 2: Initialize in Your Code
```javascript
// In your main devotion script
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize background engine
    await DevotionBackgroundEngine.init();
    
    // Get smart background based on current devotion
    const devotion = getCurrentDevotion(); // your existing function
    const background = DevotionBackgroundEngine.getSmartBackground(devotion);
    
    // Apply to page
    DevotionBackgroundEngine.applyBackground(document.body, background);
});
```

### Step 3: Update Share Card Generator
```javascript
// In share-card-generator.js, update background selection
async function getShareCardBackground() {
    if (window.DevotionBackgroundEngine && window.DevotionBackgroundEngine.manifest) {
        // Use SMS-readable for text-heavy cards
        const bg = DevotionBackgroundEngine.getSMSBackground();
        if (bg) {
            return DevotionBackgroundEngine.getBackgroundURL(bg);
        }
    }
    
    // Fallback to existing gradient
    return null;
}
```

---

## 🐛 Troubleshooting

### Issue: "OPENAI_API_KEY not found"
**Solution:**
```bash
# Ensure .env exists
cp .env.example .env
# Edit .env and add your actual API key
```

### Issue: "401 Incorrect API key"
**Solution:**
- Verify API key at https://platform.openai.com/account/api-keys
- Ensure key starts with `sk-proj-` or `sk-`
- Check key has not expired

### Issue: "Rate limit exceeded"
**Solution:**
```bash
# Increase batch delay in .env
GPBC_BATCH_DELAY_MS=2500
```

### Issue: Images too dark/bright
**Solution:**
- The sacred style prompt is optimized for text overlay
- If specific images need adjustment, regenerate them:
```bash
# Delete problematic image and regenerate
rm daily-devotion/images/backgrounds/fruit-of-the-spirit/fruit-love-01.png
node scripts/generate-ultra-devotion-images.js
```

### Issue: Generation fails midway
**Solution:**
- Script auto-saves progress
- Simply re-run to continue from where it stopped:
```bash
node scripts/generate-ultra-devotion-images.js
```
- Check manifest for failed images and retry

---

## 💰 Cost Tracking

### Current API Pricing (as of 2026)
- DALL-E 3 Standard (1536x1536): $0.04 per image
- DALL-E 3 HD (1536x1536): $0.08 per image

### Full Library Cost
| Quality | Images | Cost per Image | Total Cost |
|---------|--------|----------------|------------|
| Standard | 92 | $0.04 | **$3.68** |
| HD | 92 | $0.08 | **$7.36** |

### Regeneration Cost
If you need to regenerate specific images:
- 1 image: $0.04 (standard) or $0.08 (HD)
- 10 images: $0.40 (standard) or $0.80 (HD)

---

## 📚 Documentation Reference

- **Quick Start:** `ULTRA_DEVOTION_QUICK_START.md`
- **Full Guide:** `README_ULTRA_DEVOTION_IMAGES.md`
- **Prompt Registry:** `scripts/prompt-registry.json`
- **Sample Manifest:** `background-manifest-SAMPLE.json`

---

## 🙏 Final Notes

**Before Running:**
1. ✅ Verify API key is valid and funded
2. ✅ Confirm ~$3.68 budget approved
3. ✅ Ensure stable internet connection (20-30 min generation)
4. ✅ Terminal window won't be interrupted

**During Generation:**
- Monitor console for progress
- Script shows: [X/92] filename, status, retries
- Safe to Ctrl+C and restart (skips existing)

**After Generation:**
- Review manifest for failed images
- Test random backgrounds in browser
- Integrate with daily-devotion.html
- Commit generated images to Git (large files)

---

**Ready to generate 92 sacred backgrounds? Run:**

```bash
node scripts/generate-ultra-devotion-images.js
```

**May this library glorify God and bless His people. 🙏✨**
