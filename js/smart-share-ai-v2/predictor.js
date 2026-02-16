/**
 * ============================================================================
 * SMART SHARE AI V2 - PREDICTOR
 * ============================================================================
 * ML-inspired prediction engine for optimal share strategy selection
 * ============================================================================
 */

export class Predictor {
    constructor(capabilityDetector, profileStore) {
        this.capabilities = capabilityDetector;
        this.profile = profileStore;
    }

    /**
     * Predict best strategy with confidence score
     */
    predict(context = {}) {
        const predictions = this.scoreAllStrategies(context);
        
        // Sort by score
        predictions.sort((a, b) => b.score - a.score);
        
        const best = predictions[0];
        
        console.log('[Share AI V2 Predictor] Predictions:', predictions);
        console.log('[Share AI V2 Predictor] Selected:', best.strategy, 'confidence:', best.confidence);
        
        return {
            strategy: best.strategy,
            confidence: best.confidence,
            score: best.score,
            alternatives: predictions.slice(1),
            reasoning: best.reasoning
        };
    }

    /**
     * Score all available strategies
     */
    scoreAllStrategies(context = {}) {
        const strategies = ['image', 'url', 'text', 'sms'];
        const caps = this.capabilities.profile;
        
        return strategies.map(strategy => {
            const score = this.scoreStrategy(strategy, context);
            const confidence = this.calculateConfidence(strategy, score, context);
            const reasoning = this.explainScore(strategy, score, context);
            
            return {
                strategy,
                score,
                confidence,
                reasoning,
                available: this.isStrategyAvailable(strategy)
            };
        }).filter(s => s.available);
    }

    /**
     * Score individual strategy (0-100)
     */
    scoreStrategy(strategy, context = {}) {
        const caps = this.capabilities.profile;
        let score = 0;
        const weights = {
            capability: 0.3,
            history: 0.25,
            network: 0.2,
            context: 0.15,
            time: 0.1
        };

        // 1. Capability score (30%)
        score += this.getCapabilityScore(strategy, caps) * weights.capability;

        // 2. Historical success score (25%)
        score += this.profile.getStrategyScore(strategy, context) * weights.history;

        // 3. Network appropriateness (20%)
        score += this.getNetworkScore(strategy, caps) * weights.network;

        // 4. Context fit (15%)
        score += this.getContextScore(strategy, context, caps) * weights.context;

        // 5. Time-of-day alignment (10%)
        score += this.getTimeScore(strategy) * weights.time;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Capability-based scoring
     */
    getCapabilityScore(strategy, caps) {
        switch (strategy) {
            case 'image':
            case 'sms':
                if (!caps.canShareFiles) return 0;
                if (caps.deviceType === 'iphone' || caps.deviceType === 'ipad') return 100;
                if (caps.deviceType.includes('android')) return 95;
                return 50;

            case 'url':
                if (!caps.canShareUrl && !caps.hasWebShare) return 0;
                return 85;

            case 'text':
                if (!caps.canShareText && !caps.hasWebShare) return 30; // Fallback always works
                return 80;

            default:
                return 50;
        }
    }

    /**
     * Network-based scoring
     */
    getNetworkScore(strategy, caps) {
        const speed = caps.networkSpeed.level;
        const saveData = caps.saveData;

        if (saveData) {
            // User wants to save data
            if (strategy === 'text') return 100;
            if (strategy === 'url') return 80;
            if (strategy === 'image' || strategy === 'sms') return 30;
        }

        switch (speed) {
            case 'fast':
                if (strategy === 'image' || strategy === 'sms') return 100;
                if (strategy === 'url') return 80;
                if (strategy === 'text') return 60;
                break;

            case 'medium':
                if (strategy === 'url') return 100;
                if (strategy === 'image' || strategy === 'sms') return 70;
                if (strategy === 'text') return 90;
                break;

            case 'slow':
                if (strategy === 'text') return 100;
                if (strategy === 'url') return 85;
                if (strategy === 'image' || strategy === 'sms') return 40;
                break;

            default:
                return 70; // Unknown, neutral
        }

        return 70;
    }

    /**
     * Context-based scoring (theme, time, device state)
     */
    getContextScore(strategy, context, caps) {
        let score = 70; // Base score

        // Theme context
        if (context.theme) {
            const themeHistory = this.profile.profile.strategies[strategy]?.byTheme?.[context.theme];
            if (themeHistory && themeHistory > 0) {
                score += 15; // Bonus for proven theme performance
            }
        }

        // Dark mode + image strategy
        if (strategy === 'image' && caps.currentTheme === 'dark') {
            score += 5; // We handle dark mode rendering
        }

        // Device type alignment
        if (strategy === 'sms' && (caps.deviceType === 'iphone' || caps.deviceType === 'android-phone')) {
            score += 10; // SMS on phone is natural
        }

        // Orientation
        if (strategy === 'image' && caps.orientation === 'portrait') {
            score += 5; // Portrait images work well on mobile
        }

        return Math.min(100, score);
    }

    /**
     * Time-of-day scoring
     */
    getTimeScore(strategy) {
        const timeWindow = this.profile.getTimeWindow();
        const timeStats = this.profile.profile.timeWindows[timeWindow];

        if (timeStats.shares === 0) return 70; // No data, neutral

        const successRate = timeStats.successes / timeStats.shares;
        return successRate * 100;
    }

    /**
     * Calculate confidence (0-1)
     */
    calculateConfidence(strategy, score, context) {
        const stats = this.profile.profile.strategies[strategy];
        
        // No history = low confidence
        if (!stats || stats.attempts === 0) {
            return 0.5;
        }

        // Factor in sample size
        const sampleFactor = Math.min(1, Math.log(stats.attempts + 1) / Math.log(20));
        
        // Factor in recency
        const recencyFactor = stats.lastSuccess ? 
            Math.max(0.5, 1 - ((Date.now() - stats.lastSuccess) / (30 * 24 * 60 * 60 * 1000))) : 0.5;
        
        // Factor in score
        const scoreFactor = score / 100;
        
        // Combined confidence
        const confidence = (sampleFactor * 0.4) + (recencyFactor * 0.3) + (scoreFactor * 0.3);
        
        return Math.min(1, Math.max(0, confidence));
    }

    /**
     * Explain scoring reasoning
     */
    explainScore(strategy, score, context) {
        const reasons = [];
        const caps = this.capabilities.profile;

        // Capability reasons
        if (strategy === 'image' && caps.canShareFiles) {
            reasons.push('Device supports file sharing');
        }
        if (strategy === 'url' && caps.hasWebShare) {
            reasons.push('Web Share API available');
        }

        // Historical reasons
        const successRate = this.profile.getSuccessRate(strategy);
        if (successRate > 0.7) {
            reasons.push(`High success rate (${(successRate * 100).toFixed(0)}%)`);
        }

        // Network reasons
        if (caps.networkSpeed.level === 'fast' && (strategy === 'image' || strategy === 'sms')) {
            reasons.push('Fast network supports image sharing');
        }
        if (caps.networkSpeed.level === 'slow' && strategy === 'text') {
            reasons.push('Light payload optimal for slow network');
        }

        // Time reasons
        const timeWindow = this.profile.getTimeWindow();
        if (this.profile.profile.preferences.preferredTimeWindow === timeWindow) {
            reasons.push(`Good performance during ${timeWindow}`);
        }

        // Default reason
        if (reasons.length === 0) {
            reasons.push('General compatibility');
        }

        return reasons.join('; ');
    }

    /**
     * Check if strategy is available
     */
    isStrategyAvailable(strategy) {
        const caps = this.capabilities.profile;

        switch (strategy) {
            case 'image':
            case 'sms':
                return caps.canShareFiles;
            case 'url':
                return caps.canShareUrl || caps.hasWebShare;
            case 'text':
                return true; // Always available as fallback
            default:
                return false;
        }
    }

    /**
     * Should use pre-generated payload?
     */
    shouldPregenerate(context = {}) {
        const caps = this.capabilities.profile;
        
        // Fast network + capable device = pregenerate
        if (caps.networkSpeed.level === 'fast' && caps.canShareFiles) {
            return { pregenerate: true, formats: ['image', 'url', 'text'] };
        }
        
        // Medium network = pregenerate likely
        if (caps.networkSpeed.level === 'medium') {
            const prediction = this.predict(context);
            if (prediction.confidence > 0.7) {
                return { pregenerate: true, formats: [prediction.strategy] };
            }
        }
        
        // Slow network or save data = no pregen
        if (caps.networkSpeed.level === 'slow' || caps.saveData) {
            return { pregenerate: false, formats: [] };
        }
        
        return { pregenerate: true, formats: ['url', 'text'] };
    }
}
