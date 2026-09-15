/**
 * ============================================================================
 * GPBC DEVOTION BACKGROUND INTELLIGENCE ENGINE
 * ============================================================================
 * Intelligent background selection based on verse mood, theme, and context
 * Syncs devotion backgrounds with share card canvas rendering
 * Supports light/dark mode and SMS-safe exports
 * ============================================================================
 */

(function(window) {
    'use strict';

    const BackgroundIntelligence = {
        manifest: null,
        manifestLoaded: false,
        backgroundCache: new Map(),
        indexByMood: {},
        indexByFruit: {},
        indexByLightDark: { light: [], dark: [] },
        lastSelectedBackgrounds: [],
        maxCacheSize: 3,

        /**
         * Initialize and load background manifest
         */
        async init() {
            if (this.manifestLoaded) return;
            
            try {
                const manifestPath = 'daily-devotion/images/backgrounds/background-manifest.json';
                const response = await fetch(manifestPath);
                
                if (!response.ok) {
                    console.warn('[GPBC Background AI] Manifest not found, using fallback');
                    this.manifestLoaded = true;
                    return;
                }
                
                this.manifest = await response.json();
                this.buildIndexes();
                this.manifestLoaded = true;
                console.log('[GPBC Background AI] ✅ Manifest loaded and indexed');
            } catch (error) {
                console.warn('[GPBC Background AI] Failed to load manifest:', error);
                this.manifestLoaded = true;
            }
        },

        /**
         * Build searchable indexes from manifest
         */
        buildIndexes() {
            if (!this.manifest || !this.manifest.themes) return;

            // Map fruit names to mood categories
            const moodMap = {
                calm: ['peace', 'gentleness'],
                warmth: ['love', 'kindness'],
                hope: ['faithfulness', 'joy'],
                celebration: ['joy', 'goodness'],
                strength: ['faithfulness', 'patience', 'self-control'],
                grace: ['gentleness', 'kindness']
            };

            // Get all fruit-of-the-spirit images
            const fruitImages = this.manifest.themes['fruit-of-the-spirit'] || [];
            
            // Build mood index
            for (const [mood, fruits] of Object.entries(moodMap)) {
                this.indexByMood[mood] = fruitImages
                    .filter(img => img.status === 'success' && 
                           fruits.some(fruit => img.filename.includes(`fruit-${fruit}`)))
                    .map(img => ({
                        theme: 'fruit-of-the-spirit',
                        filename: img.filename,
                        folder: 'fruit-of-the-spirit',
                        path: `daily-devotion/images/backgrounds/${img.path}`
                    }));
            }

            // Build fruit index (by individual fruit name)
            const fruits = ['love', 'joy', 'peace', 'patience', 'kindness', 'goodness', 'faithfulness', 'gentleness', 'self-control'];
            for (const fruit of fruits) {
                this.indexByFruit[fruit] = fruitImages
                    .filter(img => img.status === 'success' && img.filename.includes(`fruit-${fruit}`))
                    .map(img => ({
                        theme: 'fruit-of-the-spirit',
                        filename: img.filename,
                        folder: 'fruit-of-the-spirit',
                        path: `daily-devotion/images/backgrounds/${img.path}`
                    }));
            }

            // Build light/dark index - use all successful images
            const allSuccessImages = fruitImages
                .filter(img => img.status === 'success')
                .map(img => ({
                    theme: 'fruit-of-the-spirit',
                    filename: img.filename,
                    folder: 'fruit-of-the-spirit',
                    path: `daily-devotion/images/backgrounds/${img.path}`
                }));
            
            this.indexByLightDark.light = allSuccessImages;
            this.indexByLightDark.dark = allSuccessImages;

            console.log('[GPBC Background AI] Indexed moods:', Object.keys(this.indexByMood).length, 
                       'Total images per mood:', Object.values(this.indexByMood).map(arr => arr.length));
            console.log('[GPBC Background AI] Indexed fruits:', Object.keys(this.indexByFruit).length,
                       'Total images per fruit:', Object.values(this.indexByFruit).map(arr => arr.length));
            console.log('[GPBC Background AI] Light/dark fallback:', this.indexByLightDark.light.length, 'images');
        },

        /**
         * Get folder name from theme (legacy support)
         */
        getFolderFromTheme(theme) {
            return 'fruit-of-the-spirit';
        },

        /**
         * Build image path (legacy support)
         */
        buildImagePath(theme, filename) {
            return `daily-devotion/images/backgrounds/fruit-of-the-spirit/${filename}`;
        },

        /**
         * Analyze verse mood from devotion data
         */
        analyzeVerseMood(devotionData) {
            if (!devotionData) return 'calm';

            const text = (
                (devotionData.verse || '') + ' ' +
                (devotionData.devotion || '') + ' ' +
                (devotionData.title || '')
            ).toLowerCase();

            const moodKeywords = {
                strength: ['strength', 'power', 'mighty', 'strong', 'courage', 'warrior'],
                calm: ['peace', 'rest', 'still', 'quiet', 'tranquil', 'calm', 'gentle'],
                warmth: ['love', 'kindness', 'compassion', 'mercy', 'tender', 'care'],
                hope: ['faith', 'trust', 'believe', 'hope', 'promise', 'faithful'],
                grace: ['repent', 'mercy', 'forgive', 'grace', 'redemption', 'salvation'],
                celebration: ['joy', 'praise', 'rejoice', 'celebrate', 'glad', 'delight']
            };

            let maxScore = 0;
            let detectedMood = 'calm';

            for (const [mood, keywords] of Object.entries(moodKeywords)) {
                const score = keywords.reduce((sum, keyword) => {
                    const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
                    const matches = text.match(regex);
                    return sum + (matches ? matches.length : 0);
                }, 0);

                if (score > maxScore) {
                    maxScore = score;
                    detectedMood = mood;
                }
            }

            console.log('[GPBC Background AI] Detected mood:', detectedMood, `(score: ${maxScore})`);
            return detectedMood;
        },

        /**
         * Select background by mood and theme
         */
        selectBackgroundByMood(mood, theme = null, isDarkMode = false) {
            if (!this.manifestLoaded) {
                console.warn('[GPBC Background AI] Manifest not loaded, using fallback');
                return null;
            }

            let candidates = [];

            if (theme && this.indexByFruit[theme]) {
                candidates = this.indexByFruit[theme];
                console.log('[GPBC Background AI] Using fruit theme:', theme);
            } else if (this.indexByMood[mood] && this.indexByMood[mood].length > 0) {
                candidates = this.indexByMood[mood];
                console.log('[GPBC Background AI] Using mood:', mood);
            } else {
                candidates = isDarkMode ? this.indexByLightDark.dark : this.indexByLightDark.light;
                console.log('[GPBC Background AI] Using light/dark fallback:', isDarkMode ? 'dark' : 'light');
            }

            if (candidates.length === 0) {
                console.warn('[GPBC Background AI] No candidates found, using fallback');
                return null;
            }

            const filteredCandidates = candidates.filter(
                bg => !this.lastSelectedBackgrounds.includes(bg.path)
            );

            const finalCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidates;
            
            const selectedIndex = this.getDeterministicIndex(finalCandidates.length);
            const selected = finalCandidates[selectedIndex];

            this.lastSelectedBackgrounds.push(selected.path);
            if (this.lastSelectedBackgrounds.length > this.maxCacheSize) {
                this.lastSelectedBackgrounds.shift();
            }

            console.log('[GPBC Background AI] Selected background:', selected.filename);
            return selected;
        },

        /**
         * Get deterministic index based on date (not random)
         */
        getDeterministicIndex(arrayLength) {
            const today = new Date();
            const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
            return dayOfYear % arrayLength;
        },

        /**
         * Get background for devotion data
         */
        async getBackgroundForDevotion(devotionData) {
            await this.init();

            if (!devotionData) {
                console.warn('[GPBC Background AI] No devotion data provided');
                return null;
            }

            const mood = this.analyzeVerseMood(devotionData);
            const theme = devotionData.fruitOfSpirit || null;
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

            const background = this.selectBackgroundByMood(mood, theme, isDarkMode);

            if (background) {
                await this.preloadBackground(background.path);
            }

            return background;
        },

        /**
         * Preload background image with automatic WebP optimization and PNG fallback
         */
        async preloadBackground(imagePath) {
            const webpPath = imagePath.replace(/\.png$/i, '.webp');
            if (this.backgroundCache.has(webpPath)) {
                return this.backgroundCache.get(webpPath);
            }
            if (this.backgroundCache.has(imagePath)) {
                return this.backgroundCache.get(imagePath);
            }

            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.backgroundCache.set(webpPath, img);
                    if (this.backgroundCache.size > this.maxCacheSize * 2) {
                        const firstKey = this.backgroundCache.keys().next().value;
                        this.backgroundCache.delete(firstKey);
                    }
                    resolve(img);
                };
                img.onerror = () => {
                    // Fallback to original PNG if WebP is unavailable
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        this.backgroundCache.set(imagePath, fallbackImg);
                        resolve(fallbackImg);
                    };
                    fallbackImg.onerror = () => resolve(null);
                    fallbackImg.src = imagePath;
                };
                img.src = webpPath;
            });
        },

        /**
         * Get preloaded image from cache
         */
        getCachedBackground(imagePath) {
            return this.backgroundCache.get(imagePath) || null;
        },

        /**
         * Get fallback gradient for mood
         */
        getFallbackGradient(mood = 'calm') {
            const gradients = {
                calm: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                warmth: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
                hope: 'linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)',
                celebration: 'linear-gradient(135deg, #fff9c4 0%, #ffeb3b 100%)',
                strength: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
                grace: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)'
            };

            return gradients[mood] || gradients.calm;
        },

        /**
         * Get dark mode adjusted opacity
         */
        getDarkModeOpacity() {
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            return isDarkMode ? 0.9 : 1.0;
        }
    };

    // Global export for share card integration
    window.getShareBackgroundForCurrentDevotion = async function() {
        if (!window.__CURRENT_DEVOTION__) {
            console.warn('[GPBC Background AI] No current devotion set');
            return null;
        }
        return await BackgroundIntelligence.getBackgroundForDevotion(window.__CURRENT_DEVOTION__);
    };

    window.applyDevotionBackground = async function(devotionData) {
        const background = await BackgroundIntelligence.getBackgroundForDevotion(devotionData);
        
        if (!background) {
            console.log('[GPBC Background AI] Using fallback gradient');
            const mood = BackgroundIntelligence.analyzeVerseMood(devotionData);
            const gradient = BackgroundIntelligence.getFallbackGradient(mood);
            
            const container = document.querySelector('.devotion-container') || 
                            document.querySelector('.daily-devotion-card') ||
                            document.querySelector('main');
            
            if (container) {
                container.style.background = gradient;
                container.style.backgroundAttachment = 'fixed';
            }
            return;
        }

        const container = document.querySelector('.devotion-container') || 
                         document.querySelector('.daily-devotion-card') ||
                         document.querySelector('main');
        
        if (container) {
            const opacity = BackgroundIntelligence.getDarkModeOpacity();
            container.style.backgroundImage = `url('${background.path}')`;
            container.style.backgroundSize = 'cover';
            container.style.backgroundPosition = 'center';
            container.style.backgroundAttachment = 'fixed';
            container.style.opacity = opacity;
        }

        console.log('[GPBC Background AI] ✅ Background applied:', background.filename);
    };

    window.DevotionBackgroundIntelligence = BackgroundIntelligence;

    console.log('[GPBC Background AI] 🧠 Intelligence Engine loaded');

})(window);
