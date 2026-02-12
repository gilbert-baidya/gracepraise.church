# 🎨 Ultra Devotion Image System - Quick Start

**Generate the complete GPBC sacred background library in 5 minutes**

---

## ⚡ One-Command Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env and add your OpenAI API key
# Change: OPENAI_API_KEY=sk-proj-your-api-key-here
# To:     OPENAI_API_KEY=sk-proj-actual-key

# 3. Generate all images
node scripts/generate-ultra-devotion-images.js
```

---

## 📊 What Will Be Generated

**~92 Sacred Background Images:**

- ✝️ **36** Fruit of the Spirit (9 fruits × 4 variations)
- 🌅 **22** Calm Creation scenes
- 📱 **10** SMS-readable minimal backgrounds
- ⛪ **16** Liturgical season themes
- 🌙 **8** Dark mode sacred backgrounds

**Output Structure:**
```
daily-devotion/images/backgrounds/
├── fruit-of-the-spirit/      (36 images)
├── calm-creation/             (22 images)
├── sms-readable/              (10 images)
├── liturgical-seasons/        (16 images)
├── dark-mode-sacred/          (8 images)
└── background-manifest.json   (complete index)
```

---

## 💰 Cost

- **Standard Quality:** ~$3.68 USD (92 images × $0.04)
- **HD Quality:** ~$7.36 USD (92 images × $0.08)

Default: Standard quality (excellent for web/mobile)

---

## ⏱️ Generation Time

- **Estimated:** 20-30 minutes
- **Safety Features:**
  - Auto-retry failed images
  - Skip existing files
  - Progress dashboard
  - Rate limiting protection

---

## 🎯 Usage Examples

### Random Background for Daily Devotion

```javascript
const manifest = await fetch('daily-devotion/images/backgrounds/background-manifest.json')
  .then(r => r.json());

const fruitImages = manifest.themes['fruit-of-the-spirit']
  .filter(img => img.status === 'generated');

const random = fruitImages[Math.floor(Math.random() * fruitImages.length)];

document.body.style.backgroundImage = 
  `url('daily-devotion/images/backgrounds/${random.path}')`;
```

### Match Background to Devotion Theme

```javascript
// If devotion is about "peace"
const peaceImages = manifest.themes['fruit-of-the-spirit']
  .filter(img => img.filename.includes('peace'));
```

### Liturgical Season Auto-Select

```javascript
// Auto-select for Lent season
const lentImages = manifest.themes['liturgical-seasons']
  .filter(img => img.filename.includes('lent'));
```

---

## 🔧 Configuration Options

Edit `.env` to customize:

```env
# Model (dall-e-3 recommended)
OPENAI_IMAGE_MODEL=dall-e-3

# Size (1536x1536 recommended for quality)
GPBC_IMAGE_SIZE=1536x1536

# Delay between generations (prevent rate limiting)
GPBC_BATCH_DELAY_MS=1500

# Retry attempts for failed images
GPBC_MAX_RETRIES=2

# Force overwrite existing images
FORCE_REGEN=false
```

---

## 🔄 Retry Failed Images

If some images fail during generation:

```bash
# Retry only failed images (smart skip)
node scripts/generate-ultra-devotion-images.js

# Force regenerate everything
FORCE_REGEN=true node scripts/generate-ultra-devotion-images.js
```

---

## 📄 Manifest JSON

After generation, check:

```bash
cat daily-devotion/images/backgrounds/background-manifest.json
```

Contains:
- All generated image paths
- Original prompts used
- Generation timestamps
- Success/fail status
- Complete statistics

---

## ✅ Sacred Style Guarantee

Every image follows:

- ✝️ Calm, reverent, contemplative mood
- 🎨 Cinematic natural lighting
- 🚫 No people, text, logos, watermarks
- 📖 Negative space for scripture overlay
- 🌟 Ministry publishing quality (not stock photo)

---

## 🙏 Ministry Impact

These backgrounds will:

- Enhance Daily Devotion experience
- Support SMS sharing with readable text
- Provide liturgical season themes
- Maintain consistent GPBC sacred brand
- Glorify God through His creation

---

## 📚 Full Documentation

See `README_ULTRA_DEVOTION_IMAGES.md` for complete details.

---

**Ready to generate? Run:**

```bash
node scripts/generate-ultra-devotion-images.js
```

**May these sacred images bless His people. 🙏✨**
