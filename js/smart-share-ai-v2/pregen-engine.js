/**
 * ============================================================================
 * SMART SHARE AI V2 - PRE-GENERATION ENGINE
 * ============================================================================
 * Pre-generates share payloads on devotion load for instant sharing
 * ============================================================================
 */

export class PregenEngine {
    constructor() {
        this.cache = {
            image: null,
            imageBlob: null,
            imageFile: null,
            url: null,
            text: null,
            sms: null,
            timestamp: null,
            devotionId: null
        };
        
        this.isGenerating = false;
        this.generatePromise = null;
    }

    /**
     * Pre-generate share payloads based on prediction
     */
    async pregenerate(formats = ['image', 'url', 'text'], options = {}) {
        if (this.isGenerating) {
            console.log('[Pregen Engine] Already generating, waiting...');
            return this.generatePromise;
        }

        console.log('[Pregen Engine] Starting pre-generation for:', formats);
        this.isGenerating = true;

        this.generatePromise = this.doPregenerate(formats, options);
        
        try {
            await this.generatePromise;
            console.log('[Pregen Engine] ✅ Pre-generation complete');
        } finally {
            this.isGenerating = false;
            this.generatePromise = null;
        }
    }

    async doPregenerate(formats, options) {
        const devotionData = window.__CURRENT_DEVOTION__ || window.__CURRENT_DEVOTION_DATA__ || {};
        const devotionId = devotionData.id || devotionData.date || Date.now();

        // Check if already generated for this devotion
        if (this.cache.devotionId === devotionId && this.cache.timestamp) {
            const age = Date.now() - this.cache.timestamp;
            if (age < 5 * 60 * 1000) { // 5 minutes cache
                console.log('[Pregen Engine] Using cached payloads');
                return;
            }
        }

        this.cache.devotionId = devotionId;
        this.cache.timestamp = Date.now();

        // Generate payloads in parallel
        const tasks = [];

        if (formats.includes('text')) {
            tasks.push(this.pregenerateText(devotionData));
        }

        if (formats.includes('url')) {
            tasks.push(this.pregenerateUrl(devotionData));
        }

        if (formats.includes('image') || formats.includes('sms')) {
            tasks.push(this.pregenerateImage(devotionData, options));
        }

        await Promise.allSettled(tasks);
    }

    /**
     * Pre-generate text payload
     */
    async pregenerateText(devotionData) {
        try {
            const verseText = devotionData.verseText || '';
            const verse = devotionData.verse || '';
            const reflectionUrl = window.location.href;

            this.cache.text = `${verseText}\n\n${verse}\n\nRead full reflection: ${reflectionUrl}\n\nGrace & Praise Bangladeshi Church`;
            
            console.log('[Pregen Engine] ✅ Text payload ready');
        } catch (error) {
            console.error('[Pregen Engine] Text generation failed:', error);
        }
    }

    /**
     * Pre-generate URL payload
     */
    async pregenerateUrl(devotionData) {
        try {
            this.cache.url = {
                title: devotionData.title || 'Daily Devotion',
                text: `${devotionData.verse || 'Daily Devotion'}`,
                url: window.location.href
            };
            
            console.log('[Pregen Engine] ✅ URL payload ready');
        } catch (error) {
            console.error('[Pregen Engine] URL generation failed:', error);
        }
    }

    /**
     * Pre-generate image payload (canvas + blob + file)
     */
    async pregenerateImage(devotionData, options = {}) {
        try {
            // Wait for share generator to be ready
            if (typeof window.waitForShareGeneratorReady === 'function') {
                await window.waitForShareGeneratorReady();
            }

            // Check if canvas already exists (from modal)
            let canvas = document.getElementById('shareCardCanvas');
            
            if (!canvas || !canvas.width || !canvas.height) {
                console.log('[Pregen Engine] No canvas found, skipping image pregen');
                return;
            }

            // Get canvas reference
            this.cache.image = canvas;

            // Generate blob
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to generate blob'));
                }, 'image/png', 0.95);
            });

            this.cache.imageBlob = blob;

            // Generate file
            const file = new File([blob], 'gpbc-devotion.png', { type: 'image/png' });
            this.cache.imageFile = file;

            console.log('[Pregen Engine] ✅ Image payloads ready:', (blob.size / 1024).toFixed(2) + 'KB');
        } catch (error) {
            console.error('[Pregen Engine] Image generation failed:', error);
        }
    }

    /**
     * Get cached payload
     */
    getPayload(format) {
        switch (format) {
            case 'image':
                return {
                    canvas: this.cache.image,
                    blob: this.cache.imageBlob,
                    file: this.cache.imageFile
                };
            case 'url':
                return this.cache.url;
            case 'text':
                return this.cache.text;
            case 'sms':
                return {
                    canvas: this.cache.image,
                    blob: this.cache.imageBlob,
                    file: this.cache.imageFile,
                    text: this.cache.text
                };
            default:
                return null;
        }
    }

    /**
     * Check if payload is ready
     */
    isReady(format) {
        switch (format) {
            case 'image':
                return !!(this.cache.imageFile && this.cache.imageBlob);
            case 'url':
                return !!this.cache.url;
            case 'text':
                return !!this.cache.text;
            case 'sms':
                return !!(this.cache.imageFile && this.cache.text);
            default:
                return false;
        }
    }

    /**
     * Check cache validity
     */
    isValid() {
        if (!this.cache.timestamp) return false;
        
        const age = Date.now() - this.cache.timestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        return age < maxAge;
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache = {
            image: null,
            imageBlob: null,
            imageFile: null,
            url: null,
            text: null,
            sms: null,
            timestamp: null,
            devotionId: null
        };
        
        console.log('[Pregen Engine] Cache cleared');
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            devotionId: this.cache.devotionId,
            timestamp: this.cache.timestamp,
            age: this.cache.timestamp ? Date.now() - this.cache.timestamp : null,
            payloads: {
                image: this.isReady('image'),
                url: this.isReady('url'),
                text: this.isReady('text'),
                sms: this.isReady('sms')
            },
            size: this.cache.imageBlob ? (this.cache.imageBlob.size / 1024).toFixed(2) + 'KB' : null,
            isGenerating: this.isGenerating
        };
    }
}
