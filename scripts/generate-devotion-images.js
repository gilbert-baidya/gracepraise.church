#!/usr/bin/env node

/**
 * ============================================================================
 * GPBC ULTRA DEVOTION IMAGE GENERATION SYSTEM
 * ============================================================================
 * Production-grade AI image generation for worship backgrounds
 * 
 * Features:
 * - Sequential safe batch generation
 * - Automatic retry with exponential backoff
 * - Skip existing files
 * - Progress tracking and logging
 * - Manifest generation
 * - Error recovery and continuation
 * 
 * Usage:
 *   node scripts/generate-devotion-images.js
 * 
 * Environment:
 *   OPENAI_API_KEY (required)
 *   GEMINI_API_KEY (optional, for future fallback)
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const pLimit = require('p-limit');
const ProviderRouter = require('../services/ai/provider-router');
const config = require('../config/ai-providers.config');

// ============================================================================
// IMAGE GENERATION THEMES & PROMPTS
// ============================================================================

const IMAGE_THEMES = {
    // Fruits of the Spirit (Galatians 5:22-23)
    'fruit-love': [
        "blooming rose garden with morning dew, soft pink and cream tones",
        "intertwined vines with heart-shaped leaves, golden morning light",
        "cherry blossom tree in full bloom, peaceful pink petals falling",
        "warm sunset over field of red poppies, gentle breeze"
    ],
    'fruit-joy': [
        "sunflower field at golden hour, bright yellow blooms facing sun",
        "rainbow after storm over green valley, rays of hope",
        "bright wildflower meadow, dancing in summer breeze",
        "morning sunrise bursting through clouds, vibrant orange and gold"
    ],
    'fruit-peace': [
        "still mountain lake with perfect reflection, misty morning",
        "quiet stream flowing through mossy forest, soft green light",
        "peaceful beach at dawn, gentle waves, soft pastel sky",
        "zen rock garden with raked sand, minimalist calm"
    ],
    'fruit-patience': [
        "old oak tree weathered by seasons, strong roots visible",
        "slow waterfall cascading over ancient rocks, timeless flow",
        "seedling sprouting through rich soil, new growth beginning",
        "desert landscape at dusk, patient stillness, soft purple sky"
    ],
    'fruit-kindness': [
        "gentle deer drinking from crystal clear stream, soft forest light",
        "helping hands of nature - vine supporting young tree",
        "mother bird feeding babies in nest, tender care",
        "soft moss growing on old stone, nature's gentle touch"
    ],
    'fruit-goodness': [
        "harvest field with golden wheat ready, abundance and provision",
        "fruit tree heavy with ripe apples, generous bounty",
        "garden overflowing with vegetables, earth's goodness",
        "honey flowing from beehive, nature's sweet reward"
    ],
    'fruit-faithfulness': [
        "lighthouse standing firm on rocky coast, steadfast beam",
        "ancient redwood forest, trees standing for centuries",
        "mountain peak rising above clouds, unchanging strength",
        "north star shining bright in clear night sky, constant guide"
    ],
    'fruit-gentleness': [
        "soft morning mist over lavender field, delicate purple haze",
        "butterfly resting on flower petal, weightless and light",
        "feather floating on still pond, gentle ripples",
        "dandelion seeds floating in gentle breeze, soft and free"
    ],
    'fruit-self-control': [
        "balanced rock formation, precise natural equilibrium",
        "single candle flame steady and focused, controlled burn",
        "river flowing in its banks, channeled power",
        "pruned grapevine showing careful cultivation, disciplined growth"
    ],

    // Calm Creation Themes
    'calm-ocean': [
        "vast ocean at sunrise, soft waves, peaceful horizon",
        "tropical beach at dawn, turquoise water, gentle tide",
        "ocean sunset with orange and pink sky reflecting on water",
        "calm sea with distant sailboat, serene blue atmosphere"
    ],
    'calm-mountains': [
        "majestic mountain range at dawn, soft morning mist",
        "snow-capped peaks with valley below, peaceful alpine scene",
        "mountain lake reflection, mirror-like water, surrounding peaks",
        "sunset over mountain silhouettes, layers of purple and gold"
    ],
    'calm-forest': [
        "sun rays piercing through forest canopy, mystical light beams",
        "misty forest path, soft green moss, gentle morning light",
        "autumn forest with golden leaves, peaceful woodland path",
        "pine forest covered in soft snow, winter tranquility"
    ],
    'calm-meadow': [
        "green meadow with wildflowers, soft wind patterns visible",
        "rolling hills covered in grass, gentle curves, morning dew",
        "spring meadow with white flowers, fresh and alive",
        "meadow at golden hour, warm light, peaceful countryside"
    ],
    'calm-sky': [
        "peaceful blue sky with soft white clouds, gentle atmosphere",
        "sunrise sky with soft pink and orange gradient, new day hope",
        "twilight sky with first stars appearing, peaceful evening",
        "aurora borealis over snowy landscape, divine light display"
    ]
};

// ============================================================================
// MAIN GENERATION CLASS
// ============================================================================

class DevotionImageGenerator {
    constructor() {
        this.config = config;
        this.outputDir = path.join(process.cwd(), config.output.directory);
        this.manifestPath = path.join(this.outputDir, config.output.manifestFile);
        this.providerRouter = null;
        
        this.stats = {
            total: 0,
            generated: 0,
            skipped: 0,
            failed: 0,
            startTime: Date.now()
        };

        this.manifest = {
            version: "1.0",
            generatedAt: new Date().toISOString(),
            themes: {}
        };
    }

    /**
     * Initialize the generator
     */
    async initialize() {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  GPBC ULTRA DEVOTION IMAGE GENERATION SYSTEM                  ║');
        console.log('║  Sacred Background Library Builder                            ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        // Ensure output directory exists
        await fs.ensureDir(this.outputDir);
        console.log(`[GPBC] 📁 Output directory ready: ${this.outputDir}\n`);

        // Initialize AI provider
        this.providerRouter = new ProviderRouter(this.config);

        // Calculate total images
        this.stats.total = Object.values(IMAGE_THEMES).reduce(
            (sum, prompts) => sum + prompts.length, 
            0
        );

        console.log(`[GPBC] 📊 Total images to generate: ${this.stats.total}\n`);
        console.log(`[GPBC] ⚙️  Settings:`);
        console.log(`       Model: ${this.config.primary.model}`);
        console.log(`       Size: ${this.config.primary.size}`);
        console.log(`       Quality: ${this.config.primary.quality}`);
        console.log(`       Skip existing: ${this.config.output.skipExisting}\n`);
        console.log('─────────────────────────────────────────────────────────────────\n');
    }

    /**
     * Generate all images
     */
    async generateAll() {
        let imageCounter = 0;

        for (const [themeName, prompts] of Object.entries(IMAGE_THEMES)) {
            console.log(`[Theme: ${themeName}]\n`);
            
            if (!this.manifest.themes[themeName]) {
                this.manifest.themes[themeName] = [];
            }

            for (let i = 0; i < prompts.length; i++) {
                imageCounter++;
                const themePrompt = prompts[i];
                const filename = `${themeName}-${String(i + 1).padStart(2, '0')}.png`;
                const outputPath = path.join(this.outputDir, filename);

                console.log(`[${imageCounter}/${this.stats.total}] ${filename}`);

                // Check if file exists and skip if configured
                if (this.config.output.skipExisting && await fs.pathExists(outputPath)) {
                    console.log(`  ⏭️  Skipped (already exists)\n`);
                    this.stats.skipped++;
                    this.manifest.themes[themeName].push(filename);
                    continue;
                }

                // Generate image
                const fullPrompt = this.providerRouter.buildPrompt(themePrompt);
                const result = await this.providerRouter.generateImage({
                    prompt: fullPrompt,
                    outputPath: outputPath
                });

                if (result.success) {
                    this.stats.generated++;
                    this.manifest.themes[themeName].push(filename);
                    console.log('');
                } else {
                    this.stats.failed++;
                    console.log(`  ❌ Failed after all retries: ${result.error}\n`);
                }

                // Small delay between images to respect rate limits
                if (imageCounter < this.stats.total) {
                    await this.sleep(1500);
                }
            }

            console.log('─────────────────────────────────────────────────────────────────\n');
        }
    }

    /**
     * Save manifest file
     */
    async saveManifest() {
        try {
            await fs.writeJson(this.manifestPath, this.manifest, { spaces: 2 });
            console.log(`[GPBC] 📄 Manifest saved: ${this.manifestPath}\n`);
        } catch (error) {
            console.error(`[GPBC] ❌ Failed to save manifest:`, error.message);
        }
    }

    /**
     * Print final summary
     */
    printSummary() {
        const duration = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(2);
        
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  GPBC DEVOTION IMAGE GENERATION COMPLETE                      ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
        
        console.log(`📊 GENERATION SUMMARY:\n`);
        console.log(`   Total: ${this.stats.total}`);
        console.log(`   Generated: ${this.stats.generated} ✅`);
        console.log(`   Skipped: ${this.stats.skipped} ⏭️`);
        console.log(`   Failed: ${this.stats.failed} ❌`);
        console.log(`   Duration: ${duration} minutes`);
        console.log(`   Manifest Updated: YES ✅\n`);

        const providerStats = this.providerRouter.getStats();
        console.log(`🤖 PROVIDER STATS:\n`);
        console.log(`   Primary Success: ${providerStats.primarySuccess}`);
        console.log(`   Primary Failures: ${providerStats.primaryFailures}`);
        console.log(`   Total Success: ${providerStats.totalSuccess}`);
        console.log(`   Total Failures: ${providerStats.totalFailures}\n`);

        console.log(`📁 Output Location:\n`);
        console.log(`   ${this.outputDir}\n`);
        
        if (this.stats.failed > 0) {
            console.log(`⚠️  WARNING: ${this.stats.failed} images failed to generate.`);
            console.log(`   You can re-run the script to retry failed images.\n`);
        }

        console.log('═════════════════════════════════════════════════════════════════\n');
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Run the complete generation process
     */
    async run() {
        try {
            await this.initialize();
            await this.generateAll();
            await this.saveManifest();
            this.printSummary();
            
            process.exit(0);
        } catch (error) {
            console.error('\n[GPBC] ❌ FATAL ERROR:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// ============================================================================
// EXECUTION
// ============================================================================

if (require.main === module) {
    const generator = new DevotionImageGenerator();
    generator.run();
}

module.exports = DevotionImageGenerator;
