#!/usr/bin/env node

/**
 * ============================================================================
 * ULTRA DEVOTION IMAGE GENERATION SYSTEM
 * Grace and Praise Bangladeshi Church (GPBC)
 * ============================================================================
 * 
 * Generates sacred calm devotional background images organized by ministry themes
 * Supports Daily Devotions, SMS sharing, Social posts, and Share Card backgrounds
 * 
 * Features:
 * - Sequential generation with retry logic
 * - Skip existing files
 * - Progress dashboard
 * - Cost-safe batching
 * - Manifest JSON output
 * ============================================================================
 */

require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
    size: process.env.GPBC_IMAGE_SIZE || '1536x1536',
    quality: 'standard',
    batchDelay: parseInt(process.env.GPBC_BATCH_DELAY_MS) || 1500,
    maxRetries: parseInt(process.env.GPBC_MAX_RETRIES) || 2,
    forceRegen: process.env.FORCE_REGEN === 'true',
    baseDir: path.join(process.cwd(), 'daily-devotion', 'images', 'backgrounds')
};

const openai = new OpenAI({ apiKey: CONFIG.apiKey });

// ============================================================================
// MASTER SACRED STYLE INJECTION
// ============================================================================

const SACRED_STYLE_PREFIX = "Calm sacred Christian devotional background, inspired by God's creation, peaceful, reverent, cinematic natural lighting, soft depth of field, no people, no text, no watermark, no logo, negative space for scripture overlay, ministry publishing quality, not stock photo. ";

// ============================================================================
// IMAGE THEME REGISTRY
// ============================================================================

const IMAGE_THEMES = {
    'fruit-of-the-spirit': [
        { name: 'fruit-love', prompt: 'blooming rose garden with morning dew, soft pink and cream tones', count: 4 },
        { name: 'fruit-joy', prompt: 'sunflower field in golden sunlight, bright yellow and warm tones', count: 4 },
        { name: 'fruit-peace', prompt: 'still mountain lake reflection, misty blue and silver tones', count: 4 },
        { name: 'fruit-patience', prompt: 'growing green vine with new buds, soft green and earth tones', count: 4 },
        { name: 'fruit-kindness', prompt: 'gentle rain on flower petals, soft pastels and light blues', count: 4 },
        { name: 'fruit-goodness', prompt: 'ripe wheat field swaying in breeze, golden harvest tones', count: 4 },
        { name: 'fruit-faithfulness', prompt: 'ancient olive tree grove, warm Mediterranean light', count: 4 },
        { name: 'fruit-gentleness', prompt: 'soft white clouds drifting in blue sky, peaceful atmosphere', count: 4 },
        { name: 'fruit-self-control', prompt: 'calm bamboo forest path, zen green and natural tones', count: 4 }
    ],
    
    'calm-creation': [
        { name: 'calm-ocean', prompt: 'peaceful ocean horizon at sunrise, soft coral and blue gradient', count: 3 },
        { name: 'calm-mountain-lake', prompt: 'alpine lake with mountain reflection, crisp blue and white', count: 3 },
        { name: 'calm-stars', prompt: 'night sky with milky way galaxy, deep blue and silver stars', count: 3 },
        { name: 'calm-aurora', prompt: 'northern lights over snowy landscape, ethereal green and blue', count: 2 },
        { name: 'calm-forest-mist', prompt: 'misty forest with light rays through trees, soft green fog', count: 3 },
        { name: 'calm-cloudscape', prompt: 'soft cloud formations in golden hour, warm pink and orange', count: 2 },
        { name: 'calm-hills', prompt: 'rolling green hills in morning light, fresh pastoral tones', count: 3 },
        { name: 'calm-river-valley', prompt: 'winding river through peaceful valley, soft earth tones', count: 3 }
    ],
    
    'sms-readable': [
        { name: 'sms-sky-gradient', prompt: 'simple sky gradient from light blue to white, minimal detail', count: 2 },
        { name: 'sms-parchment', prompt: 'soft natural parchment texture, cream and beige tones', count: 2 },
        { name: 'sms-fog-minimal', prompt: 'minimal fog landscape, soft gray and white blur', count: 2 },
        { name: 'sms-sand-shore', prompt: 'soft sand beach minimal, warm neutral tones', count: 2 },
        { name: 'sms-cloud-soft', prompt: 'soft white clouds on pale blue, high readability', count: 2 }
    ],
    
    'liturgical-seasons': [
        { name: 'lent-desert', prompt: 'quiet desert landscape at dawn, dusty purple and gold tones, reflective mood', count: 3 },
        { name: 'easter-sunrise', prompt: 'brilliant sunrise breaking through clouds, resurrection light, golden white rays', count: 4 },
        { name: 'advent-night-hope', prompt: 'starry night with single bright star, deep blue with warm candlelight glow', count: 3 },
        { name: 'communion-vineyard', prompt: 'vineyard rows in golden light, sacred harvest, deep purple and gold', count: 3 },
        { name: 'pentecost-fire-sky', prompt: 'sky with subtle fiery light glow, holy spirit atmosphere, warm orange and gold', count: 3 }
    ],
    
    'dark-mode-sacred': [
        { name: 'dark-starfield', prompt: 'deep space starfield with nebula, dark blue and purple tones', count: 2 },
        { name: 'dark-moon-water', prompt: 'moonlight reflecting on calm water, dark blue and silver', count: 2 },
        { name: 'dark-night-forest', prompt: 'dark forest with moon rays, mysterious peaceful atmosphere', count: 2 },
        { name: 'dark-twilight-sky', prompt: 'deep twilight gradient, navy to dark purple peaceful tones', count: 2 }
    ]
};

// ============================================================================
// FOLDER STRUCTURE SETUP
// ============================================================================

async function ensureFolderStructure() {
    console.log('\n[GPBC Ultra Devotion] 📁 Setting up folder structure...\n');
    
    const folders = [
        CONFIG.baseDir,
        ...Object.keys(IMAGE_THEMES).map(theme => path.join(CONFIG.baseDir, theme))
    ];
    
    for (const folder of folders) {
        try {
            await fs.mkdir(folder, { recursive: true });
            console.log(`  ✓ ${path.relative(process.cwd(), folder)}`);
        } catch (error) {
            console.error(`  ✗ Failed to create ${folder}:`, error.message);
        }
    }
    
    console.log('\n[GPBC Ultra Devotion] ✅ Folder structure ready\n');
}

// ============================================================================
// IMAGE GENERATION ENGINE
// ============================================================================

async function generateImage(prompt, outputPath, retries = 0) {
    const fullPrompt = SACRED_STYLE_PREFIX + prompt;
    
    try {
        console.log(`  🎨 Generating... (attempt ${retries + 1}/${CONFIG.maxRetries + 1})`);
        
        const response = await openai.images.generate({
            model: CONFIG.model,
            prompt: fullPrompt,
            n: 1,
            size: CONFIG.size,
            quality: CONFIG.quality,
            response_format: 'url'
        });
        
        const imageUrl = response.data[0].url;
        
        // Download image
        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Save to disk
        await fs.writeFile(outputPath, buffer);
        
        console.log(`  ✅ Saved: ${path.basename(outputPath)}`);
        
        return {
            success: true,
            path: outputPath,
            prompt: fullPrompt,
            url: imageUrl
        };
        
    } catch (error) {
        console.error(`  ❌ Generation failed: ${error.message}`);
        
        if (retries < CONFIG.maxRetries) {
            const waitTime = CONFIG.batchDelay * (retries + 1);
            console.log(`  ⏳ Retrying in ${waitTime}ms...`);
            await sleep(waitTime);
            return generateImage(prompt, outputPath, retries + 1);
        }
        
        return {
            success: false,
            path: outputPath,
            error: error.message
        };
    }
}

// ============================================================================
// BATCH GENERATION ORCHESTRATOR
// ============================================================================

async function generateAllImages() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  GPBC ULTRA DEVOTION IMAGE GENERATION SYSTEM                  ║');
    console.log('║  Sacred Background Library Builder                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    const stats = {
        total: 0,
        generated: 0,
        skipped: 0,
        failed: 0,
        startTime: Date.now()
    };
    
    const manifest = {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        totalImages: 0,
        themes: {}
    };
    
    // Calculate total images
    for (const [theme, images] of Object.entries(IMAGE_THEMES)) {
        for (const img of images) {
            stats.total += img.count;
        }
    }
    
    console.log(`[GPBC] 📊 Total images to generate: ${stats.total}\n`);
    console.log(`[GPBC] ⚙️  Settings:`);
    console.log(`       Model: ${CONFIG.model}`);
    console.log(`       Size: ${CONFIG.size}`);
    console.log(`       Batch delay: ${CONFIG.batchDelay}ms`);
    console.log(`       Max retries: ${CONFIG.maxRetries}`);
    console.log(`       Force regenerate: ${CONFIG.forceRegen}\n`);
    console.log('─────────────────────────────────────────────────────────────────\n');
    
    let imageIndex = 0;
    
    // Generate images by theme
    for (const [theme, images] of Object.entries(IMAGE_THEMES)) {
        console.log(`\n[Theme: ${theme}]\n`);
        
        manifest.themes[theme] = [];
        const themeDir = path.join(CONFIG.baseDir, theme);
        
        for (const img of images) {
            for (let i = 1; i <= img.count; i++) {
                imageIndex++;
                const filename = `${img.name}-${String(i).padStart(2, '0')}.png`;
                const outputPath = path.join(themeDir, filename);
                
                console.log(`[${imageIndex}/${stats.total}] ${filename}`);
                
                // Check if file exists
                try {
                    await fs.access(outputPath);
                    if (!CONFIG.forceRegen) {
                        console.log(`  ⏭️  Skipped (already exists)`);
                        stats.skipped++;
                        
                        manifest.themes[theme].push({
                            filename,
                            path: path.relative(CONFIG.baseDir, outputPath),
                            status: 'skipped',
                            prompt: img.prompt
                        });
                        
                        continue;
                    }
                } catch {
                    // File doesn't exist, continue with generation
                }
                
                // Generate image
                const result = await generateImage(img.prompt, outputPath);
                
                if (result.success) {
                    stats.generated++;
                    manifest.themes[theme].push({
                        filename,
                        path: path.relative(CONFIG.baseDir, outputPath),
                        status: 'generated',
                        prompt: img.prompt,
                        fullPrompt: result.prompt,
                        generatedAt: new Date().toISOString()
                    });
                } else {
                    stats.failed++;
                    manifest.themes[theme].push({
                        filename,
                        path: path.relative(CONFIG.baseDir, outputPath),
                        status: 'failed',
                        prompt: img.prompt,
                        error: result.error
                    });
                }
                
                // Batch delay between images
                if (imageIndex < stats.total) {
                    await sleep(CONFIG.batchDelay);
                }
            }
        }
    }
    
    // Write manifest
    manifest.totalImages = stats.total;
    manifest.stats = stats;
    
    const manifestPath = path.join(CONFIG.baseDir, 'background-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Final summary
    const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2);
    const estimatedCost = stats.generated * 0.04; // DALL-E 3 standard quality cost
    
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  GENERATION COMPLETE                                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Summary:`);
    console.log(`   Total images: ${stats.total}`);
    console.log(`   ✅ Generated: ${stats.generated}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   ⏱️  Duration: ${duration} minutes`);
    console.log(`   💰 Estimated cost: ~$${estimatedCost.toFixed(2)} USD\n`);
    console.log(`📄 Manifest: ${path.relative(process.cwd(), manifestPath)}\n`);
    
    if (stats.failed > 0) {
        console.log(`⚠️  ${stats.failed} images failed. Check manifest for details.\n`);
        console.log(`   Retry failed images:`);
        console.log(`   FORCE_REGEN=true node scripts/generate-ultra-devotion-images.js\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    try {
        // Validate API key
        if (!CONFIG.apiKey) {
            console.error('\n❌ Error: OPENAI_API_KEY not found in environment');
            console.error('   Please set OPENAI_API_KEY in your .env file\n');
            process.exit(1);
        }
        
        // Setup folder structure
        await ensureFolderStructure();
        
        // Generate all images
        await generateAllImages();
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { generateAllImages, IMAGE_THEMES };
