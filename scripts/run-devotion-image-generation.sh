#!/bin/bash

###############################################################################
# GPBC ULTRA DEVOTION IMAGE GENERATION - QUICK START
###############################################################################
# This script demonstrates how to run the image generation system
# and provides helpful commands for monitoring and validation
###############################################################################

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  GPBC ULTRA DEVOTION IMAGE GENERATION - QUICK START           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo ""
    echo "Create .env file with:"
    echo "OPENAI_API_KEY=your-key-here"
    echo ""
    exit 1
fi

# Check if dependencies are installed
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install openai dotenv axios fs-extra p-limit
    echo ""
fi

echo "🚀 Starting GPBC Ultra Devotion Image Generation..."
echo ""
echo "This will generate 56 high-quality worship background images:"
echo "  • 36 Fruits of the Spirit images"
echo "  • 20 Calm Creation images"
echo ""
echo "Estimated time: 5-7 minutes"
echo "Estimated cost: ~$3-4 (OpenAI DALL-E 3)"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# Run the generator
node scripts/generate-devotion-images.js

# After completion, show validation commands
echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "VALIDATION COMMANDS"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "Count generated images:"
echo "  find daily-devotion/images/backgrounds -name '*.png' | wc -l"
echo ""
echo "Check manifest:"
echo "  cat daily-devotion/images/backgrounds/background-manifest.json"
echo ""
echo "View random sample images:"
echo "  ls daily-devotion/images/backgrounds/fruit-*.png | head -5"
echo ""
echo "Check total file size:"
echo "  du -sh daily-devotion/images/backgrounds/"
echo ""
