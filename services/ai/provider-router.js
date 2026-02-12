/**
 * ============================================================================
 * GPBC AI PROVIDER ROUTER
 * ============================================================================
 * Smart routing between AI providers with automatic fallback
 * Currently supports: OpenAI (primary), Gemini (future)
 */

const OpenAIProvider = require('./openai-provider');

class ProviderRouter {
    constructor(config) {
        this.config = config;
        this.primaryProvider = null;
        this.fallbackProvider = null;
        this.stats = {
            primarySuccess: 0,
            primaryFailures: 0,
            fallbackSuccess: 0,
            fallbackFailures: 0
        };

        this.initialize();
    }

    /**
     * Initialize providers
     */
    initialize() {
        console.log('[Provider Router] 🔧 Initializing providers...\n');

        // Initialize primary provider (OpenAI)
        if (this.config.primary.enabled) {
            try {
                this.primaryProvider = new OpenAIProvider(this.config);
                console.log('[Provider Router] ✅ Primary provider (OpenAI) ready\n');
            } catch (error) {
                console.error('[Provider Router] ❌ Primary provider failed:', error.message);
            }
        }

        // Initialize fallback provider (Gemini - future)
        if (this.config.fallback.enabled) {
            console.log('[Provider Router] ⚠️  Fallback provider not yet implemented\n');
        }

        if (!this.primaryProvider && !this.fallbackProvider) {
            throw new Error('[Provider Router] No providers available');
        }
    }

    /**
     * Generate image with automatic fallback
     * @param {Object} params - Generation parameters
     * @returns {Promise<Object>} Generation result
     */
    async generateImage(params) {
        // Try primary provider
        if (this.primaryProvider) {
            const result = await this.primaryProvider.generateImage(params);
            
            if (result.success) {
                this.stats.primarySuccess++;
                return result;
            }

            this.stats.primaryFailures++;
            console.warn('  ⚠️  Primary provider failed, attempting fallback...');
        }

        // Try fallback provider
        if (this.fallbackProvider) {
            const result = await this.fallbackProvider.generateImage(params);
            
            if (result.success) {
                this.stats.fallbackSuccess++;
                return result;
            }

            this.stats.fallbackFailures++;
        }

        // All providers failed
        return {
            success: false,
            error: 'All providers failed'
        };
    }

    /**
     * Build prompt using primary provider's template
     * @param {string} themePrompt - Theme-specific prompt
     * @returns {string} Complete prompt
     */
    buildPrompt(themePrompt) {
        if (this.primaryProvider) {
            return this.primaryProvider.buildPrompt(themePrompt);
        }
        
        // Fallback to basic prompt construction
        return `${this.config.prompts.basePrefix}${themePrompt}${this.config.prompts.baseSuffix}`;
    }

    /**
     * Get router statistics
     * @returns {Object} Router stats
     */
    getStats() {
        return {
            ...this.stats,
            totalSuccess: this.stats.primarySuccess + this.stats.fallbackSuccess,
            totalFailures: this.stats.primaryFailures + this.stats.fallbackFailures
        };
    }

    /**
     * Get provider status
     * @returns {Object} Status of all providers
     */
    getStatus() {
        return {
            primary: this.primaryProvider ? this.primaryProvider.getStatus() : null,
            fallback: this.fallbackProvider ? this.fallbackProvider.getStatus() : null
        };
    }
}

module.exports = ProviderRouter;
