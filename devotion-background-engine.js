/**
 * ============================================================================
 * ULTRA DEVOTION BACKGROUND ENGINE - Integration Module
 * Grace and Praise Bangladeshi Church (GPBC)
 * ============================================================================
 * 
 * Integrates generated sacred backgrounds with Daily Devotion experience
 * Supports theme matching, liturgical seasons, and smart selection
 * 
 * Usage:
 * 1. Generate images: node scripts/generate-ultra-devotion-images.js
 * 2. Include this module in daily-devotion.html
 * 3. Call DevotionBackgroundEngine.init()
 * ============================================================================
 */

const DevotionBackgroundEngine = {
    manifest: null,
    basePath: 'daily-devotion/images/backgrounds/',
    
    /**
     * Initialize the background engine
     */
    async init() {
        try {
            const response = await fetch(`${this.basePath}background-manifest.json`);
            this.manifest = await response.json();
            console.log('[Ultra Devotion] Background engine initialized', {
                totalImages: this.manifest.totalImages,
                themes: Object.keys(this.manifest.themes),
                generatedAt: this.manifest.generatedAt
            });
            return true;
        } catch (error) {
            console.warn('[Ultra Devotion] Failed to load manifest:', error);
            return false;
        }
    },
    
    /**
     * Get all available images from a theme
     */
    getThemeImages(themeName) {
        if (!this.manifest) {
            console.error('[Ultra Devotion] Engine not initialized. Call init() first.');
            return [];
        }
        
        const theme = this.manifest.themes[themeName];
        if (!theme) {
            console.warn(`[Ultra Devotion] Theme "${themeName}" not found`);
            return [];
        }
        
        return theme.filter(img => img.status === 'generated');
    },
    
    /**
     * Get random image from a theme
     */
    getRandomFromTheme(themeName) {
        const images = this.getThemeImages(themeName);
        if (images.length === 0) return null;
        
        return images[Math.floor(Math.random() * images.length)];
    },
    
    /**
     * Get image matching specific keyword (e.g., 'peace', 'love', 'ocean')
     */
    getMatchingImage(keyword, themeName = null) {
        if (!this.manifest) return null;
        
        const searchThemes = themeName 
            ? [themeName] 
            : Object.keys(this.manifest.themes);
        
        const allMatches = [];
        
        for (const theme of searchThemes) {
            const images = this.getThemeImages(theme);
            const matches = images.filter(img => 
                img.filename.toLowerCase().includes(keyword.toLowerCase())
            );
            allMatches.push(...matches);
        }
        
        if (allMatches.length === 0) return null;
        return allMatches[Math.floor(Math.random() * allMatches.length)];
    },
    
    /**
     * Get liturgical season background
     */
    getLiturgicalBackground(season) {
        const seasonMap = {
            'lent': 'lent',
            'easter': 'easter',
            'advent': 'advent',
            'christmas': 'advent', // Use advent for Christmas
            'communion': 'communion',
            'pentecost': 'pentecost'
        };
        
        const keyword = seasonMap[season.toLowerCase()];
        if (!keyword) return this.getRandomFromTheme('calm-creation');
        
        return this.getMatchingImage(keyword, 'liturgical-seasons');
    },
    
    /**
     * Get Fruit of the Spirit background
     */
    getFruitBackground(fruit) {
        const fruitMap = {
            'love': 'love',
            'joy': 'joy',
            'peace': 'peace',
            'patience': 'patience',
            'kindness': 'kindness',
            'goodness': 'goodness',
            'faithfulness': 'faithfulness',
            'gentleness': 'gentleness',
            'self-control': 'self-control'
        };
        
        const keyword = fruitMap[fruit.toLowerCase()];
        if (!keyword) return this.getRandomFromTheme('fruit-of-the-spirit');
        
        return this.getMatchingImage(keyword, 'fruit-of-the-spirit');
    },
    
    /**
     * Get SMS-optimized background (high readability)
     */
    getSMSBackground() {
        return this.getRandomFromTheme('sms-readable');
    },
    
    /**
     * Get dark mode background
     */
    getDarkModeBackground() {
        return this.getRandomFromTheme('dark-mode-sacred');
    },
    
    /**
     * Smart background selection based on devotion content
     */
    getSmartBackground(devotionData) {
        // Check for liturgical season
        if (devotionData.season) {
            const seasonal = this.getLiturgicalBackground(devotionData.season);
            if (seasonal) return seasonal;
        }
        
        // Check for fruit of the spirit theme
        if (devotionData.theme) {
            const fruitKeywords = ['love', 'joy', 'peace', 'patience', 'kindness', 
                                   'goodness', 'faithfulness', 'gentleness', 'self-control'];
            const theme = devotionData.theme.toLowerCase();
            
            for (const fruit of fruitKeywords) {
                if (theme.includes(fruit)) {
                    const fruitBg = this.getFruitBackground(fruit);
                    if (fruitBg) return fruitBg;
                }
            }
        }
        
        // Check for dark mode preference
        const isDarkMode = window.matchMedia && 
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (isDarkMode && Math.random() < 0.3) {
            const darkBg = this.getDarkModeBackground();
            if (darkBg) return darkBg;
        }
        
        // Default: random calm creation
        return this.getRandomFromTheme('calm-creation');
    },
    
    /**
     * Apply background to element
     */
    applyBackground(element, imageData) {
        if (!imageData) {
            console.warn('[Ultra Devotion] No image data provided');
            return;
        }
        
        const imagePath = `${this.basePath}${imageData.path}`;
        
        element.style.backgroundImage = `url('${imagePath}')`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.style.backgroundRepeat = 'no-repeat';
        
        console.log('[Ultra Devotion] Background applied:', {
            filename: imageData.filename,
            path: imageData.path,
            prompt: imageData.prompt
        });
    },
    
    /**
     * Preload background image for smooth transition
     */
    async preloadBackground(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const imagePath = `${this.basePath}${imageData.path}`;
            
            img.onload = () => resolve(imagePath);
            img.onerror = () => reject(new Error(`Failed to load ${imagePath}`));
            img.src = imagePath;
        });
    },
    
    /**
     * Get background URL (for use in CSS or canvas)
     */
    getBackgroundURL(imageData) {
        if (!imageData) return null;
        return `${this.basePath}${imageData.path}`;
    },
    
    /**
     * Statistics and debugging
     */
    getStats() {
        if (!this.manifest) return null;
        
        return {
            totalImages: this.manifest.totalImages,
            themes: Object.keys(this.manifest.themes).map(theme => ({
                name: theme,
                count: this.manifest.themes[theme].length,
                generated: this.manifest.themes[theme]
                    .filter(img => img.status === 'generated').length
            })),
            generatedAt: this.manifest.generatedAt,
            version: this.manifest.version
        };
    }
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// Example 1: Initialize and apply random background
await DevotionBackgroundEngine.init();
const randomBg = DevotionBackgroundEngine.getRandomFromTheme('calm-creation');
DevotionBackgroundEngine.applyBackground(document.body, randomBg);

// Example 2: Theme-specific background
const peaceBg = DevotionBackgroundEngine.getFruitBackground('peace');
DevotionBackgroundEngine.applyBackground(document.querySelector('.devotion-container'), peaceBg);

// Example 3: Smart background based on devotion content
const devotion = {
    season: 'lent',
    theme: 'Patience in trials',
    date: '2026-02-12'
};
const smartBg = DevotionBackgroundEngine.getSmartBackground(devotion);
DevotionBackgroundEngine.applyBackground(document.body, smartBg);

// Example 4: SMS-optimized background for share card
const smsBg = DevotionBackgroundEngine.getSMSBackground();
console.log('SMS Background:', DevotionBackgroundEngine.getBackgroundURL(smsBg));

// Example 5: Dark mode background
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    const darkBg = DevotionBackgroundEngine.getDarkModeBackground();
    DevotionBackgroundEngine.applyBackground(document.body, darkBg);
}

// Example 6: Preload for smooth transition
const nextBg = DevotionBackgroundEngine.getRandomFromTheme('fruit-of-the-spirit');
await DevotionBackgroundEngine.preloadBackground(nextBg);
DevotionBackgroundEngine.applyBackground(document.body, nextBg);

// Example 7: Get statistics
console.log(DevotionBackgroundEngine.getStats());

*/

// ============================================================================
// AUTO-INITIALIZE (Optional)
// ============================================================================

// Uncomment to auto-initialize on page load
// document.addEventListener('DOMContentLoaded', async () => {
//     await DevotionBackgroundEngine.init();
//     console.log('[Ultra Devotion] Ready:', DevotionBackgroundEngine.getStats());
// });

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DevotionBackgroundEngine;
}
