/**
 * ============================================================================
 * GPBC DEVOTION BACKGROUND LOADER
 * ============================================================================
 * Runtime utility for loading and selecting devotional background images
 * 
 * Usage:
 *   const loader = new DevotionBackgroundLoader();
 *   const bg = loader.getRandomDevotionBackground('fruit-love');
 *   const fruitBg = loader.getFruitBackground('peace');
 *   const calmBg = loader.getCalmBackground();
 */

class DevotionBackgroundLoader {
    constructor() {
        this.manifestPath = 'daily-devotion/images/backgrounds/background-manifest.json';
        this.basePath = 'daily-devotion/images/backgrounds';
        this.manifest = null;
        this.loaded = false;
    }

    /**
     * Load manifest from server
     * @returns {Promise<void>}
     */
    async loadManifest() {
        if (this.loaded) return;
        
        try {
            const response = await fetch(this.manifestPath);
            if (!response.ok) {
                throw new Error(`Failed to load manifest: ${response.status}`);
            }
            this.manifest = await response.json();
            this.loaded = true;
        } catch (error) {
            console.error('[DevotionBackgroundLoader] Failed to load manifest:', error);
            this.manifest = { images: {} };
            this.loaded = true;
        }
    }

    /**
     * Get random background from specific theme
     * @param {string} theme - Theme name (e.g., 'fruit-love', 'nature-ocean')
     * @returns {Promise<string|null>} Image path or null
     */
    async getRandomDevotionBackground(theme) {
        await this.loadManifest();
        
        if (!this.manifest.images[theme]) {
            console.warn(`[DevotionBackgroundLoader] Theme not found: ${theme}`);
            return null;
        }
        
        const images = this.manifest.images[theme].filter(img => img.status === 'generated');
        
        if (images.length === 0) {
            console.warn(`[DevotionBackgroundLoader] No generated images for theme: ${theme}`);
            return null;
        }
        
        const randomImage = images[Math.floor(Math.random() * images.length)];
        
        // Determine folder from theme prefix
        let folder = 'nature';
        if (theme.startsWith('fruit-')) folder = 'fruits';
        else if (theme.startsWith('calm-')) folder = 'calm';
        else if (theme.startsWith('light-')) folder = 'light';
        else if (theme.startsWith('dark-')) folder = 'dark';
        
        return `${this.basePath}/${folder}/${randomImage.filename}`;
    }

    /**
     * Get background for specific Fruit of the Spirit
     * @param {string} fruitName - Fruit name (e.g., 'love', 'joy', 'peace')
     * @returns {Promise<string|null>} Image path or null
     */
    async getFruitBackground(fruitName) {
        const theme = `fruit-${fruitName.toLowerCase()}`;
        return this.getRandomDevotionBackground(theme);
    }

    /**
     * Get random calm background from all calm/nature themes
     * @returns {Promise<string|null>} Image path or null
     */
    async getCalmBackground() {
        await this.loadManifest();
        
        const calmThemes = Object.keys(this.manifest.images).filter(theme => 
            theme.startsWith('calm-') || theme.startsWith('nature-')
        );
        
        if (calmThemes.length === 0) {
            console.warn('[DevotionBackgroundLoader] No calm themes found');
            return null;
        }
        
        const randomTheme = calmThemes[Math.floor(Math.random() * calmThemes.length)];
        return this.getRandomDevotionBackground(randomTheme);
    }

    /**
     * Get all available themes
     * @returns {Promise<string[]>} Array of theme names
     */
    async getAvailableThemes() {
        await this.loadManifest();
        return Object.keys(this.manifest.images);
    }

    /**
     * Get theme statistics
     * @param {string} theme - Theme name
     * @returns {Promise<Object>} Theme stats
     */
    async getThemeStats(theme) {
        await this.loadManifest();
        
        if (!this.manifest.images[theme]) {
            return { total: 0, generated: 0, failed: 0 };
        }
        
        const images = this.manifest.images[theme];
        return {
            total: images.length,
            generated: images.filter(img => img.status === 'generated').length,
            failed: images.filter(img => img.status === 'failed').length
        };
    }

    /**
     * Preload background images for better performance
     * @param {string[]} themes - Array of theme names to preload
     * @returns {Promise<void>}
     */
    async preloadBackgrounds(themes) {
        await this.loadManifest();
        
        const preloadPromises = [];
        
        for (const theme of themes) {
            if (!this.manifest.images[theme]) continue;
            
            const images = this.manifest.images[theme].filter(img => img.status === 'generated');
            
            for (const imageData of images) {
                let folder = 'nature';
                if (theme.startsWith('fruit-')) folder = 'fruits';
                else if (theme.startsWith('calm-')) folder = 'calm';
                else if (theme.startsWith('light-')) folder = 'light';
                else if (theme.startsWith('dark-')) folder = 'dark';
                
                const imagePath = `${this.basePath}/${folder}/${imageData.filename}`;
                
                const img = new Image();
                const promise = new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                img.src = imagePath;
                preloadPromises.push(promise.catch(() => {})); // Ignore errors
            }
        }
        
        await Promise.all(preloadPromises);
    }

    /**
     * Get random background suitable for share cards (safe center zone)
     * @returns {Promise<string|null>} Image path or null
     */
    async getShareCardSafeBackground() {
        // Prefer calm, nature, and light themes for share cards
        const safeThemes = [
            'nature-ocean',
            'nature-mountain',
            'calm-forest',
            'calm-river',
            'light-sky',
            'light-meadow',
            'fruit-peace',
            'fruit-joy'
        ];
        
        const randomTheme = safeThemes[Math.floor(Math.random() * safeThemes.length)];
        return this.getRandomDevotionBackground(randomTheme);
    }

    /**
     * Get dark mode suitable backgrounds
     * @returns {Promise<string|null>} Image path or null
     */
    async getDarkModeBackground() {
        await this.loadManifest();
        
        const darkThemes = Object.keys(this.manifest.images).filter(theme => 
            theme.startsWith('dark-')
        );
        
        if (darkThemes.length === 0) {
            // Fallback to calm themes
            return this.getCalmBackground();
        }
        
        const randomTheme = darkThemes[Math.floor(Math.random() * darkThemes.length)];
        return this.getRandomDevotionBackground(randomTheme);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DevotionBackgroundLoader;
}
