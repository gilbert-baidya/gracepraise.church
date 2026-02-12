/**
 * ============================================================================
 * GPBC AI PROVIDERS CONFIGURATION
 * ============================================================================
 * Centralized AI provider configuration for devotional image generation
 * Supports multiple providers with automatic fallback capability
 */

module.exports = {
    // Primary provider configuration
    primary: {
        name: 'openai',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
        style: 'natural', // natural = photographic, vivid = more artistic
        enabled: true
    },

    // Fallback provider (future support)
    fallback: {
        name: 'gemini',
        model: 'imagen-2',
        enabled: false
    },

    // Generation settings
    generation: {
        concurrency: 2,
        maxRetries: 2,
        retryDelay: 3000, // milliseconds
        timeout: 60000 // 1 minute per image
    },

    // Image quality requirements
    quality: {
        minWidth: 1024,
        minHeight: 1024,
        format: 'png',
        compression: false
    },

    // Safety and content guidelines
    safety: {
        rejectPeople: true,
        rejectText: true,
        rejectLogos: true,
        rejectWatermarks: true,
        worshipSafe: true
    },

    // Prompt engineering base templates
    prompts: {
        basePrefix: "Ultra high quality cinematic nature photography. Calm sacred spiritual atmosphere. God's creation beauty. Soft natural lighting. Peaceful worship reflective mood. ",
        baseSuffix: " No people. No text. No watermark. No logos. Ministry devotional background quality.",
        
        // Lighting styles
        lighting: {
            goldenHour: "golden hour warm glow, soft backlight",
            dawn: "soft dawn light, gentle morning atmosphere",
            dusk: "peaceful evening light, calm sunset tones",
            softOvercast: "soft diffused overcast light, gentle mood"
        },

        // Mood modifiers
        moods: {
            peaceful: "tranquil peaceful serene calm",
            reflective: "contemplative meditative quiet",
            hopeful: "hopeful uplifting inspiring",
            reverent: "reverent sacred holy"
        }
    },

    // Output configuration
    output: {
        directory: 'daily-devotion/images/backgrounds',
        manifestFile: 'background-manifest.json',
        skipExisting: true,
        saveMetadata: true
    }
};
