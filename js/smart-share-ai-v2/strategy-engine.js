/**
 * ============================================================================
 * SMART SHARE AI V2 - STRATEGY ENGINE
 * ============================================================================
 * Executes optimal share strategy with pre-generation support
 * ============================================================================
 */

export class StrategyEngine {
    constructor(predictor, pregenEngine, profileStore, capabilityDetector) {
        this.predictor = predictor;
        this.pregen = pregenEngine;
        this.profile = profileStore;
        this.capabilities = capabilityDetector;
    }

    /**
     * Execute share with optimal strategy
     */
    async execute(options = {}) {
        const startTime = Date.now();
        
        // Get devotion context
        const devotionData = window.__CURRENT_DEVOTION__ || window.__CURRENT_DEVOTION_DATA__ || {};
        const context = {
            theme: devotionData.theme,
            deviceType: this.capabilities.profile.deviceType,
            os: this.capabilities.profile.os,
            browser: this.capabilities.profile.browser,
            networkType: this.capabilities.profile.networkType
        };

        // Get prediction or use override
        let strategy;
        let prediction;
        
        if (options.mode) {
            // Manual override
            strategy = options.mode;
            console.log('[Strategy Engine] Using manual override:', strategy);
        } else {
            // AI prediction
            prediction = this.predictor.predict(context);
            strategy = prediction.strategy;
            console.log('[Strategy Engine] AI predicted:', strategy, 'confidence:', prediction.confidence);
        }

        // Record attempt
        this.profile.recordAttempt(strategy, context);

        // Check if pre-generated payload available
        const usePregen = this.pregen.isReady(strategy) && this.pregen.isValid();
        
        if (usePregen) {
            console.log('[Strategy Engine] Using pre-generated payload');
        }

        try {
            let result;

            // Execute based on strategy
            if (usePregen) {
                result = await this.executeWithPregen(strategy, options, context);
            } else {
                result = await this.executeNormal(strategy, options, context);
            }

            // Record success
            const responseTime = Date.now() - startTime;
            this.profile.recordSuccess(strategy, { ...context, responseTime });

            return {
                success: true,
                strategy,
                method: result.method,
                tier: result.tier,
                pregenerated: usePregen,
                responseTime,
                prediction: prediction || null,
                aiRecommended: !options.mode
            };

        } catch (error) {
            console.error('[Strategy Engine] Execution failed:', error);
            
            // Record failure
            this.profile.recordFailure(strategy, context);

            // User canceled vs real error
            if (error.name === 'AbortError' || error.message?.includes('cancel')) {
                return {
                    success: false,
                    strategy,
                    reason: 'user-canceled',
                    responseTime: Date.now() - startTime
                };
            }

            return {
                success: false,
                strategy,
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Execute with pre-generated payload
     */
    async executeWithPregen(strategy, options, context) {
        const payload = this.pregen.getPayload(strategy);
        
        if (!payload) {
            throw new Error('Pre-generated payload not available');
        }

        // Delegate to existing oneTapDevotionShare with pre-gen hint
        if (typeof window.oneTapDevotionShare === 'function') {
            return await window.oneTapDevotionShare({
                ...options,
                mode: strategy,
                pregenPayload: payload
            });
        }

        throw new Error('oneTapDevotionShare not available');
    }

    /**
     * Execute normal (generate on-demand)
     */
    async executeNormal(strategy, options, context) {
        // Delegate to existing oneTapDevotionShare
        if (typeof window.oneTapDevotionShare === 'function') {
            return await window.oneTapDevotionShare({
                ...options,
                mode: strategy
            });
        }

        throw new Error('oneTapDevotionShare not available');
    }

    /**
     * Trigger pre-generation for next share
     */
    async triggerPregen(context = {}) {
        const decision = this.predictor.shouldPregenerate(context);
        
        if (!decision.pregenerate) {
            console.log('[Strategy Engine] Pre-generation not recommended');
            return;
        }

        console.log('[Strategy Engine] Triggering pre-generation for:', decision.formats);
        
        // Run in background
        this.pregen.pregenerate(decision.formats).catch(error => {
            console.error('[Strategy Engine] Pre-generation failed:', error);
        });
    }

    /**
     * Get recommendations
     */
    getRecommendations(context = {}) {
        const prediction = this.predictor.predict(context);
        
        return {
            primary: {
                strategy: prediction.strategy,
                confidence: prediction.confidence,
                score: prediction.score,
                reasoning: prediction.reasoning
            },
            alternatives: prediction.alternatives.map(alt => ({
                strategy: alt.strategy,
                score: alt.score,
                confidence: alt.confidence,
                reasoning: alt.reasoning
            })),
            pregenStatus: {
                available: this.pregen.isValid(),
                formats: Object.keys(this.pregen.cache).filter(k => 
                    this.pregen.isReady(k)
                ),
                stats: this.pregen.getStats()
            }
        };
    }
}
