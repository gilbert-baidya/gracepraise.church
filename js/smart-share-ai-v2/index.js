/**
 * ============================================================================
 * SMART SHARE AI V2 - PREDICTIVE MINISTRY ENGINE
 * ============================================================================
 * Main orchestrator integrating all modules
 * Safe additive wrapper - does not modify existing systems
 * ============================================================================
 */

import { CapabilityDetector } from './capability-detector.js';
import { ProfileStore } from './profile-store.js';
import { Predictor } from './predictor.js';
import { PregenEngine } from './pregen-engine.js';
import { StrategyEngine } from './strategy-engine.js';
import { MinistryInsights } from './ministry-insights.js';

class SmartShareAIv2 {
    constructor() {
        this.version = '2.0.0';
        this.initialized = false;
        
        // Initialize modules
        this.capability = new CapabilityDetector();
        this.profile = new ProfileStore();
        this.predictor = new Predictor(this.capability, this.profile);
        this.pregen = new PregenEngine();
        this.strategy = new StrategyEngine(this.predictor, this.pregen, this.profile);
        this.insights = new MinistryInsights(this.profile);

        console.log('[Smart Share AI V2] Modules loaded');
    }

    /**
     * Initialize the engine
     */
    async init() {
        if (this.initialized) {
            console.log('[Smart Share AI V2] Already initialized');
            return;
        }

        console.log('[Smart Share AI V2] Initializing...');

        try {
            // Detect capabilities
            const caps = this.capability.profile;
            console.log('[Smart Share AI V2] Capabilities detected:', {
                score: this.capability.getCapabilityScore(),
                canShareFiles: caps.canShareFiles,
                canShareText: caps.canShareText,
                hasClipboard: caps.hasClipboard,
                deviceType: caps.deviceType
            });

            // Load profile
            this.profile.load();
            console.log('[Smart Share AI V2] Profile loaded:', {
                totalShares: this.profile.profile.totalShares,
                preferredStrategy: this.profile.profile.preferences.preferredStrategy
            });

            this.initialized = true;
            console.log('[Smart Share AI V2] ✅ Ready');

            // Auto-trigger pre-generation if devotion data available
            this.autoPregenerate();

        } catch (error) {
            console.error('[Smart Share AI V2] Initialization failed:', error);
            this.initialized = false;
        }
    }

    /**
     * Auto-trigger pre-generation on devotion load
     */
    autoPregenerate() {
        // Wait for devotion data to be available
        const checkDevotionData = () => {
            const devotionData = window.currentDevotionData || 
                                 window.todaysDevotionData ||
                                 this.extractDevotionFromDOM();

            if (devotionData) {
                console.log('[Smart Share AI V2] Devotion data found, triggering pre-generation');
                this.strategy.triggerPregen(devotionData);
            } else {
                // Retry after 1 second
                setTimeout(checkDevotionData, 1000);
            }
        };

        // Start checking after 500ms (let page load first)
        setTimeout(checkDevotionData, 500);
    }

    /**
     * Extract devotion data from DOM (fallback)
     */
    extractDevotionFromDOM() {
        try {
            const title = document.querySelector('.devotion-title')?.textContent.trim();
            const verse = document.querySelector('.verse-reference')?.textContent.trim();
            const content = document.querySelector('.devotion-content')?.textContent.trim();
            const theme = document.querySelector('.devotion-theme')?.textContent.trim();

            if (title || verse || content) {
                return { title, verse, content, theme };
            }
        } catch (error) {
            console.warn('[Smart Share AI V2] Could not extract devotion from DOM:', error);
        }

        return null;
    }

    /**
     * Execute smart share (main API)
     */
    async smartShare(devotionData, options = {}) {
        if (!this.initialized) {
            console.warn('[Smart Share AI V2] Not initialized, calling init()');
            await this.init();
        }

        console.log('[Smart Share AI V2] Smart share requested');

        try {
            // Execute with strategy engine
            const result = await this.strategy.execute(devotionData, options);

            console.log('[Smart Share AI V2] Share completed:', {
                strategy: result.prediction.strategy,
                confidence: result.prediction.confidence,
                success: result.success,
                usedPregen: result.usedPregen
            });

            return result;

        } catch (error) {
            console.error('[Smart Share AI V2] Share failed:', error);
            return {
                success: false,
                error: error.message,
                prediction: null
            };
        }
    }

    /**
     * Get share recommendation without executing
     */
    async getRecommendation(devotionData) {
        if (!this.initialized) {
            await this.init();
        }

        return this.strategy.getRecommendations(devotionData);
    }

    /**
     * Manually trigger pre-generation
     */
    async pregenerate(devotionData) {
        if (!this.initialized) {
            await this.init();
        }

        return this.strategy.triggerPregen(devotionData);
    }

    /**
     * Get ministry insights
     */
    getInsights() {
        return this.insights.generateReport();
    }

    /**
     * Get quick stats
     */
    getStats() {
        return {
            version: this.version,
            initialized: this.initialized,
            profile: {
                totalShares: this.profile.profile.totalShares,
                successRate: this.insights.calculateSuccessRate(),
                preferredStrategy: this.profile.profile.preferences.preferredStrategy
            },
            pregen: this.pregen.getStats(),
            capability: {
                score: this.capability.lastDetection?.score || null,
                device: this.capability.lastDetection?.device.type || null
            }
        };
    }

    /**
     * Clear profile (for testing or reset)
     */
    clearProfile() {
        this.profile.clear();
        console.log('[Smart Share AI V2] Profile cleared');
    }

    /**
     * Get diagnostic info
     */
    getDiagnostics() {
        return {
            version: this.version,
            initialized: this.initialized,
            modules: {
                capability: !!this.capability,
                profile: !!this.profile,
                predictor: !!this.predictor,
                pregen: !!this.pregen,
                strategy: !!this.strategy,
                insights: !!this.insights
            },
            stats: this.getStats(),
            profile: this.profile.profile,
            pregenStatus: this.pregen.getStats()
        };
    }
}

// Export as global API
window.SmartShareAIv2 = SmartShareAIv2;

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('[Smart Share AI V2] DOM ready, auto-initializing');
        window.smartShareAI = new SmartShareAIv2();
        await window.smartShareAI.init();
    });
} else {
    console.log('[Smart Share AI V2] DOM already loaded, initializing immediately');
    window.smartShareAI = new SmartShareAIv2();
    window.smartShareAI.init();
}

console.log('[Smart Share AI V2] Orchestrator loaded');

export default SmartShareAIv2;
