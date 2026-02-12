# GPBC Ultra Devotion Image Generation System

Production-grade AI image generation system for Grace & Praise Bangladeshi Church devotional backgrounds.

## 🎯 Overview

This system generates **ultra-high quality cinematic nature photography** for worship backgrounds using OpenAI DALL-E 3, featuring:

- 🌟 **Fruits of the Spirit** themes (love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control)
- 🌊 **Calm Creation** themes (ocean, mountains, forest, meadow, sky)
- 🔄 **Automatic retry** with exponential backoff
- 📊 **Progress tracking** and detailed logging
- 💾 **Manifest generation** for easy asset management
- ⏭️ **Skip existing files** (smart resume capability)

## 📦 Installation

```bash
npm install openai dotenv axios fs-extra p-limit
```

## ⚙️ Configuration

Create a `.env` file in the project root:

```env
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Future fallback support
GEMINI_API_KEY=your-gemini-api-key-here
```

## 🚀 Usage

### Generate All Images

```bash
node scripts/generate-devotion-images.js
```

### What It Does

1. **Initializes** AI provider (OpenAI DALL-E 3)
2. **Creates** folder structure automatically
3. **Generates** images sequentially with retry logic
4. **Saves** high-quality PNG files (1024x1024)
5. **Creates** manifest JSON for asset tracking
6. **Skips** existing files (resume-safe)
7. **Reports** detailed statistics on completion

## 📁 Output Structure

```
daily-devotion/images/backgrounds/
├── fruit-love-01.png
├── fruit-love-02.png
├── fruit-love-03.png
├── fruit-love-04.png
├── fruit-joy-01.png
├── fruit-joy-02.png
├── ... (36 Fruits of Spirit images)
├── calm-ocean-01.png
├── calm-mountains-01.png
├── ... (20 Calm Creation images)
└── background-manifest.json
```

## 🎨 Image Themes

### Fruits of the Spirit (36 images)
- **Love** (4 variations) - Rose gardens, intertwined vines, cherry blossoms
- **Joy** (4 variations) - Sunflower fields, rainbows, wildflowers
- **Peace** (4 variations) - Mountain lakes, quiet streams, peaceful beaches
- **Patience** (4 variations) - Oak trees, waterfalls, seedlings
- **Kindness** (4 variations) - Gentle deer, helping vines, mother bird
- **Goodness** (4 variations) - Harvest fields, fruit trees, gardens
- **Faithfulness** (4 variations) - Lighthouse, redwood forest, mountains
- **Gentleness** (4 variations) - Lavender fields, butterflies, feathers
- **Self-Control** (4 variations) - Balanced rocks, candle flame, flowing river

### Calm Creation (20 images)
- **Ocean** (4 variations) - Sunrise, tropical beach, sunset, calm sea
- **Mountains** (4 variations) - Dawn peaks, snow-capped, lake reflection
- **Forest** (4 variations) - Sun rays, misty paths, autumn, winter
- **Meadow** (4 variations) - Wildflowers, rolling hills, spring, golden hour
- **Sky** (4 variations) - Blue sky, sunrise, twilight, aurora

## 🛡️ Safety Features

- ✅ **No hardcoded API keys** (environment only)
- ✅ **Automatic retry** on failures (max 2 retries)
- ✅ **Rate limiting** (1.5s delay between images)
- ✅ **Error recovery** (continues batch if one fails)
- ✅ **Skip existing files** (safe re-runs)
- ✅ **Detailed logging** (progress tracking)

## 📊 Generation Summary

Upon completion, you'll see:

```
╔════════════════════════════════════════════════════════════════╗
║  GPBC DEVOTION IMAGE GENERATION COMPLETE                      ║
╚════════════════════════════════════════════════════════════════╝

📊 GENERATION SUMMARY:

   Total: 56
   Generated: 54 ✅
   Skipped: 0 ⏭️
   Failed: 2 ❌
   Duration: 4.23 minutes
   Manifest Updated: YES ✅

🤖 PROVIDER STATS:

   Primary Success: 54
   Primary Failures: 2
   Total Success: 54
   Total Failures: 2

📁 Output Location:

   /path/to/daily-devotion/images/backgrounds
```

## 🎨 Image Quality Specifications

- **Model**: DALL-E 3
- **Size**: 1024x1024 (square)
- **Quality**: HD
- **Style**: Natural (photographic)
- **Format**: PNG
- **Min File Size**: 50KB (quality validation)
- **Average File Size**: 1.3-1.7MB

## 🔧 Architecture

### Core Components

1. **`config/ai-providers.config.js`** - Centralized configuration
2. **`services/ai/openai-provider.js`** - OpenAI DALL-E 3 provider
3. **`services/ai/provider-router.js`** - Provider routing with fallback
4. **`scripts/generate-devotion-images.js`** - Main generation script

### Prompt Engineering

Each image uses a structured prompt:

```
Base Prefix:
"Ultra high quality cinematic nature photography. Calm sacred spiritual 
atmosphere. God's creation beauty. Soft natural lighting. Peaceful worship 
reflective mood."

+ Theme-Specific Description

Base Suffix:
"No people. No text. No watermark. No logos. Ministry devotional 
background quality."
```

## 🚨 Troubleshooting

### API Key Not Found
```bash
Error: OPENAI_API_KEY not found in environment
```
**Solution**: Ensure `.env` file exists in project root with valid API key

### Rate Limit Errors
```bash
Error: 429 Too Many Requests
```
**Solution**: Script automatically retries with exponential backoff

### Failed Images
**Solution**: Re-run script - it will skip successful images and retry failed ones

## 📝 Manifest Structure

`background-manifest.json`:

```json
{
  "version": "1.0",
  "generatedAt": "2026-02-12T16:49:23.456Z",
  "themes": {
    "fruit-love": [
      "fruit-love-01.png",
      "fruit-love-02.png",
      "fruit-love-03.png",
      "fruit-love-04.png"
    ],
    "fruit-joy": [
      "fruit-joy-01.png",
      "fruit-joy-02.png",
      "fruit-joy-03.png",
      "fruit-joy-04.png"
    ]
  }
}
```

## 🔮 Future Enhancements

- [ ] Gemini fallback provider integration
- [ ] Additional image sizes (1024x1792 portrait)
- [ ] Image compression and optimization
- [ ] Admin UI for background selection
- [ ] Seasonal rotation logic
- [ ] Batch regeneration interface
- [ ] Cost estimation and budgeting

## 📄 License

Proprietary - Grace & Praise Bangladeshi Church

## 🙏 Purpose

These sacred backgrounds enhance the worship experience in GPBC's digital devotional content, bringing God's creation beauty to daily spiritual practices.

---

**Generated with ❤️ for GPBC Ministry**
