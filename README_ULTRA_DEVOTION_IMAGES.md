# GPBC Ultra Devotion Image System

**Sacred Background Library Generator for Ministry Publishing**

Grace and Praise Bangladeshi Church (GPBC)

---

## 📋 Overview

The Ultra Devotion Image System generates a comprehensive library of sacred, calm devotional background images optimized for:

- **Daily Devotions** - Rich, contemplative backgrounds
- **SMS Sharing** - High-readability minimal backgrounds
- **Social Media** - Story-format optimized images
- **Share Cards** - Ministry-grade publishing quality
- **Liturgical Seasons** - Themed images for church calendar

---

## 🎨 Image Themes

### **Fruit of the Spirit** (36 images)
Nine biblical fruits, 4 variations each:
- Love, Joy, Peace, Patience, Kindness
- Goodness, Faithfulness, Gentleness, Self-Control

### **Calm Creation** (22 images)
Natural scenes inspired by God's creation:
- Ocean sunrises, Mountain lakes, Starry skies
- Forest mist, Cloud formations, Rolling hills

### **SMS Readable** (10 images)
Minimal backgrounds optimized for text overlay:
- Sky gradients, Soft textures, Minimal landscapes

### **Liturgical Seasons** (16 images)
Church calendar themed imagery:
- **Lent** - Desert reflection, dusty tones
- **Easter** - Resurrection sunrise light
- **Advent** - Night hope, stars, candlelight
- **Communion** - Vineyard harvest, sacred table
- **Pentecost** - Fire sky, holy spirit glow

### **Dark Mode Sacred** (8 images)
Deep, peaceful backgrounds for dark mode UX:
- Starfields, Moonlit water, Night forest, Twilight

**Total Library: ~92 Sacred Images**

---

## 🚀 Quick Start

### **1. Install Dependencies**

```bash
npm install openai dotenv
```

### **2. Configure Environment**

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_IMAGE_MODEL=dall-e-3
GPBC_IMAGE_SIZE=1536x1536
GPBC_BATCH_DELAY_MS=1500
GPBC_MAX_RETRIES=2
```

### **3. Generate Images**

```bash
node scripts/generate-ultra-devotion-images.js
```

---

## ⚙️ Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *required* | Your OpenAI API key |
| `OPENAI_IMAGE_MODEL` | `dall-e-3` | Image generation model |
| `GPBC_IMAGE_SIZE` | `1536x1536` | Output resolution (1024x1024 or 1536x1536) |
| `GPBC_BATCH_DELAY_MS` | `1500` | Delay between generations (rate limiting) |
| `GPBC_MAX_RETRIES` | `2` | Max retry attempts for failed generations |
| `FORCE_REGEN` | `false` | Force regenerate existing images |

---

## 📁 Output Structure

```
daily-devotion/images/backgrounds/
├── fruit-of-the-spirit/
│   ├── fruit-love-01.png
│   ├── fruit-love-02.png
│   └── ...
├── calm-creation/
│   ├── calm-ocean-01.png
│   ├── calm-mountain-lake-01.png
│   └── ...
├── sms-readable/
│   ├── sms-sky-gradient-01.png
│   └── ...
├── liturgical-seasons/
│   ├── lent-desert-01.png
│   ├── easter-sunrise-01.png
│   └── ...
├── dark-mode-sacred/
│   ├── dark-starfield-01.png
│   └── ...
└── background-manifest.json
```

---

## 📊 Manifest JSON

After generation, a manifest file is created at:

```
daily-devotion/images/backgrounds/background-manifest.json
```

**Structure:**

```json
{
  "generatedAt": "2026-02-12T10:30:00.000Z",
  "version": "1.0.0",
  "totalImages": 92,
  "themes": {
    "fruit-of-the-spirit": [
      {
        "filename": "fruit-love-01.png",
        "path": "fruit-of-the-spirit/fruit-love-01.png",
        "status": "generated",
        "prompt": "blooming rose garden with morning dew",
        "fullPrompt": "Calm sacred Christian devotional background...",
        "generatedAt": "2026-02-12T10:32:15.000Z"
      }
    ]
  },
  "stats": {
    "total": 92,
    "generated": 90,
    "skipped": 0,
    "failed": 2
  }
}
```

---

## 🎯 Sacred Style Guidelines

**Every image follows these principles:**

✅ **Calm & Reverent** - Peaceful, contemplative mood  
✅ **Ministry Quality** - Cinematic natural lighting  
✅ **No People** - Focus on God's creation  
✅ **No Text/Logo** - Negative space for scripture overlay  
✅ **Not Stock Photo** - Unique, authentic feel  
✅ **Soft Depth of Field** - Professional depth  
✅ **Natural Lighting** - God's creation as inspiration  

---

## 💰 Cost Estimation

**DALL-E 3 Pricing (as of 2026):**
- Standard Quality (1536x1536): ~$0.04 per image
- HD Quality (1536x1536): ~$0.08 per image

**Full Library Generation:**
- 92 images × $0.04 = **~$3.68 USD** (standard quality)
- 92 images × $0.08 = **~$7.36 USD** (HD quality)

---

## 🔄 Retry Failed Generations

If some images fail during generation:

```bash
# Retry only failed images
node scripts/generate-ultra-devotion-images.js

# Force regenerate ALL images (overwrites existing)
FORCE_REGEN=true node scripts/generate-ultra-devotion-images.js
```

---

## 🛡️ Safety Features

✅ **Skip Existing Files** - Never overwrites unless `FORCE_REGEN=true`  
✅ **Automatic Retry** - Retries failed generations up to max attempts  
✅ **Progress Logging** - Real-time dashboard of generation status  
✅ **Cost Safe** - Batch delay prevents rate limiting  
✅ **Error Recovery** - Continues generation even if some images fail  
✅ **Manifest Tracking** - Complete audit trail in JSON  

---

## 📱 Usage in Daily Devotion App

### **1. Random Background Selection**

```javascript
// In daily-devotion.html or devotion-background-engine.js
const manifest = await fetch('daily-devotion/images/backgrounds/background-manifest.json');
const data = await manifest.json();

// Get random fruit of the spirit image
const fruitImages = data.themes['fruit-of-the-spirit']
    .filter(img => img.status === 'generated');
const randomFruit = fruitImages[Math.floor(Math.random() * fruitImages.length)];

// Set as background
document.body.style.backgroundImage = 
    `url('daily-devotion/images/backgrounds/${randomFruit.path}')`;
```

### **2. Theme-Based Selection**

```javascript
// Match background to devotion theme
const devotionTheme = 'peace'; // from devotion data

const peaceImages = data.themes['fruit-of-the-spirit']
    .filter(img => img.filename.includes('peace'));
```

### **3. Liturgical Season Matching**

```javascript
// Auto-select based on church calendar
const currentSeason = 'lent'; // from church calendar API

const seasonImages = data.themes['liturgical-seasons']
    .filter(img => img.filename.includes(currentSeason));
```

---

## 🎨 Custom Prompt Registry

View all prompts used for generation:

```bash
cat scripts/prompt-registry.json
```

This file contains the complete prompt library for reproducibility and future enhancements.

---

## 🔧 Troubleshooting

### **"OPENAI_API_KEY not found"**
- Ensure `.env` file exists in project root
- Verify API key is correctly set in `.env`
- Check that `.env` is not in `.gitignore` (for local use only)

### **"Rate limit exceeded"**
- Increase `GPBC_BATCH_DELAY_MS` in `.env` (try 2000 or 3000)
- OpenAI has rate limits, script will auto-retry

### **"401 Incorrect API key"**
- Verify API key is valid at https://platform.openai.com/account/api-keys
- Ensure key has image generation permissions
- Check API key format starts with `sk-proj-` or `sk-`

### **Images too dark/bright**
- The script uses professional prompts optimized for text overlay
- If needed, regenerate specific images with `FORCE_REGEN=true`

---

## 📚 Integration with Share Card Generator

The Ultra Devotion Image System integrates seamlessly with the existing Share Card Generator:

```javascript
// In share-card-generator.js
// Use manifest to select appropriate background
const manifest = await fetch('daily-devotion/images/backgrounds/background-manifest.json');

// Use calm-creation for general devotions
// Use liturgical-seasons for special church calendar dates
// Use sms-readable for text-heavy cards
```

---

## 🙏 Ministry Impact

This system ensures every devotional moment is accompanied by:
- **Theologically Sound Imagery** - Reflects God's creation
- **Culturally Appropriate** - Suitable for diverse global audience
- **Professionally Designed** - Ministry publishing quality
- **Consistent Brand** - GPBC sacred aesthetic
- **Optimized Delivery** - Fast, efficient, mobile-friendly

---

## 📄 License

© 2026 Grace and Praise Bangladeshi Church (GPBC)  
For ministry use only. Not for commercial redistribution.

---

## 🤝 Support

For issues or enhancements:
- Check manifest JSON for generation status
- Review error logs in console output
- Contact: GPBC Technical Ministry Team

---

**May these sacred images glorify God and bless His people. 🙏**
