/**
 * ============================================================================
 * SMART SHARE AI V2 - PROFILE STORE
 * ============================================================================
 * Persistent storage for share history and learning patterns
 * ============================================================================
 */

export class ProfileStore {
    constructor() {
        this.storageKey = 'gpbc_smartShareProfileV2';
        this.version = '2.0.0';
        this.load();
    }

    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.profile = JSON.parse(stored);
                
                // Migrate from v1 if needed
                if (this.profile.version !== this.version) {
                    this.migrate();
                }
            } else {
                this.profile = this.createDefault();
            }
        } catch (error) {
            console.warn('[Share AI V2] Failed to load profile:', error);
            this.profile = this.createDefault();
        }
    }

    createDefault() {
        return {
            version: this.version,
            createdAt: Date.now(),
            lastUpdated: Date.now(),
            
            // Strategy performance
            strategies: {
                image: this.createStrategyStats(),
                url: this.createStrategyStats(),
                text: this.createStrategyStats(),
                sms: this.createStrategyStats()
            },
            
            // Theme engagement
            themeShares: {},  // { 'faith': 5, 'hope': 3, ... }
            
            // Time-of-day patterns
            timeWindows: {
                morning: { shares: 0, successes: 0 },    // 5am-11am
                midday: { shares: 0, successes: 0 },     // 11am-2pm
                afternoon: { shares: 0, successes: 0 },  // 2pm-5pm
                evening: { shares: 0, successes: 0 },    // 5pm-9pm
                night: { shares: 0, successes: 0 }       // 9pm-5am
            },
            
            // Device context
            deviceContext: {
                lastDevice: null,
                lastOS: null,
                lastBrowser: null
            },
            
            // Preferences learned
            preferences: {
                preferredStrategy: null,
                preferredTimeWindow: null,
                fastShareEnabled: true
            },
            
            // Aggregate stats (for ministry insights)
            totalShares: 0,
            totalSuccesses: 0,
            firstShareDate: null,
            lastShareDate: null
        };
    }

    createStrategyStats() {
        return {
            attempts: 0,
            successes: 0,
            failures: 0,
            lastSuccess: null,
            lastFailure: null,
            avgResponseTime: 0,
            byDevice: {},
            byNetwork: {},
            byTheme: {}
        };
    }

    migrate() {
        console.log('[Share AI V2] Migrating profile from', this.profile.version, 'to', this.version);
        
        // Preserve v1 data if exists
        if (this.profile.version === '1.0.0') {
            const v1Strategies = this.profile.strategies;
            const newProfile = this.createDefault();
            
            // Migrate basic strategy stats
            for (const [strategy, stats] of Object.entries(v1Strategies)) {
                if (newProfile.strategies[strategy]) {
                    newProfile.strategies[strategy].attempts = stats.attempts || 0;
                    newProfile.strategies[strategy].successes = stats.successes || 0;
                    newProfile.strategies[strategy].lastSuccess = stats.lastSuccess || null;
                }
            }
            
            newProfile.createdAt = this.profile.createdAt;
            this.profile = newProfile;
        }
        
        this.profile.version = this.version;
        this.save();
    }

    /**
     * Record share attempt
     */
    recordAttempt(strategy, context = {}) {
        const stats = this.profile.strategies[strategy];
        if (!stats) return;
        
        stats.attempts++;
        
        // Track by device
        const device = context.deviceType || 'unknown';
        stats.byDevice[device] = (stats.byDevice[device] || 0) + 1;
        
        // Track by network
        const network = context.networkType || 'unknown';
        stats.byNetwork[network] = (stats.byNetwork[network] || 0) + 1;
        
        // Track by theme
        const theme = context.theme || 'unknown';
        stats.byTheme[theme] = (stats.byTheme[theme] || 0) + 1;
        
        // Time window
        const timeWindow = this.getTimeWindow();
        this.profile.timeWindows[timeWindow].shares++;
        
        // Theme shares
        if (theme !== 'unknown') {
            this.profile.themeShares[theme] = (this.profile.themeShares[theme] || 0) + 1;
        }
        
        this.profile.totalShares++;
        if (!this.profile.firstShareDate) {
            this.profile.firstShareDate = Date.now();
        }
        
        this.profile.lastUpdated = Date.now();
        this.save();
    }

    /**
     * Record share success
     */
    recordSuccess(strategy, context = {}) {
        const stats = this.profile.strategies[strategy];
        if (!stats) return;
        
        stats.successes++;
        stats.lastSuccess = Date.now();
        
        // Track response time if provided
        if (context.responseTime) {
            const count = stats.attempts;
            stats.avgResponseTime = ((stats.avgResponseTime * (count - 1)) + context.responseTime) / count;
        }
        
        // Time window
        const timeWindow = this.getTimeWindow();
        this.profile.timeWindows[timeWindow].successes++;
        
        this.profile.totalSuccesses++;
        this.profile.lastShareDate = Date.now();
        
        // Update device context
        this.profile.deviceContext.lastDevice = context.deviceType;
        this.profile.deviceContext.lastOS = context.os;
        this.profile.deviceContext.lastBrowser = context.browser;
        
        // Update preferences
        this.updatePreferences();
        
        this.save();
    }

    /**
     * Record share failure
     */
    recordFailure(strategy, context = {}) {
        const stats = this.profile.strategies[strategy];
        if (!stats) return;
        
        stats.failures++;
        stats.lastFailure = Date.now();
        
        this.save();
    }

    /**
     * Get time window for current time
     */
    getTimeWindow() {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 11) return 'morning';
        if (hour >= 11 && hour < 14) return 'midday';
        if (hour >= 14 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }

    /**
     * Update learned preferences
     */
    updatePreferences() {
        // Preferred strategy (highest success rate with recency weight)
        let bestStrategy = null;
        let bestScore = -1;

        for (const [strategy, stats] of Object.entries(this.profile.strategies)) {
            if (stats.attempts === 0) continue;
            
            const successRate = stats.successes / stats.attempts;
            const recency = stats.lastSuccess ? 
                Math.max(0.1, 1 - ((Date.now() - stats.lastSuccess) / (30 * 24 * 60 * 60 * 1000))) : 0.1;
            
            const score = successRate * recency * (1 + Math.log(stats.attempts + 1) / 10);
            
            if (score > bestScore) {
                bestScore = score;
                bestStrategy = strategy;
            }
        }

        this.profile.preferences.preferredStrategy = bestStrategy;
        
        // Preferred time window
        let bestWindow = null;
        let bestWindowScore = -1;

        for (const [window, stats] of Object.entries(this.profile.timeWindows)) {
            if (stats.shares === 0) continue;
            
            const rate = stats.successes / stats.shares;
            if (rate > bestWindowScore) {
                bestWindowScore = rate;
                bestWindow = window;
            }
        }

        this.profile.preferences.preferredTimeWindow = bestWindow;
    }

    /**
     * Get success rate for strategy
     */
    getSuccessRate(strategy) {
        const stats = this.profile.strategies[strategy];
        if (!stats || stats.attempts === 0) return 0;
        return stats.successes / stats.attempts;
    }

    /**
     * Get strategy score (0-100)
     */
    getStrategyScore(strategy, context = {}) {
        const stats = this.profile.strategies[strategy];
        if (!stats || stats.attempts === 0) return 50; // Neutral score for untried
        
        const successRate = stats.successes / stats.attempts;
        const recency = stats.lastSuccess ? 
            Math.max(0.1, 1 - ((Date.now() - stats.lastSuccess) / (30 * 24 * 60 * 60 * 1000))) : 0.5;
        
        // Context bonuses
        let contextBonus = 0;
        if (context.deviceType && stats.byDevice[context.deviceType]) {
            contextBonus += 0.1;
        }
        if (context.networkType && stats.byNetwork[context.networkType]) {
            contextBonus += 0.1;
        }
        if (context.theme && stats.byTheme[context.theme]) {
            contextBonus += 0.1;
        }
        
        const score = (successRate * 70) + (recency * 20) + (contextBonus * 10);
        return Math.min(100, Math.max(0, score));
    }

    /**
     * Get most shared themes (for ministry insights)
     */
    getTopThemes(limit = 5) {
        return Object.entries(this.profile.themeShares)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([theme, count]) => ({ theme, count }));
    }

    /**
     * Get time distribution
     */
    getTimeDistribution() {
        const total = this.profile.totalShares;
        if (total === 0) return {};
        
        const distribution = {};
        for (const [window, stats] of Object.entries(this.profile.timeWindows)) {
            distribution[window] = {
                percentage: (stats.shares / total) * 100,
                successRate: stats.shares > 0 ? (stats.successes / stats.shares) : 0
            };
        }
        
        return distribution;
    }

    /**
     * Get ministry insights (aggregate, anonymous)
     */
    getMinistryInsights() {
        return {
            totalShares: this.profile.totalShares,
            overallSuccessRate: this.profile.totalShares > 0 ? 
                (this.profile.totalSuccesses / this.profile.totalShares) : 0,
            topThemes: this.getTopThemes(),
            timeDistribution: this.getTimeDistribution(),
            mostSuccessfulStrategy: this.profile.preferences.preferredStrategy,
            preferredTimeWindow: this.profile.preferences.preferredTimeWindow,
            avgSharesPerDay: this.getAvgSharesPerDay(),
            daysActive: this.getDaysActive()
        };
    }

    getAvgSharesPerDay() {
        if (!this.profile.firstShareDate) return 0;
        
        const days = (Date.now() - this.profile.firstShareDate) / (24 * 60 * 60 * 1000);
        return days > 0 ? this.profile.totalShares / days : 0;
    }

    getDaysActive() {
        if (!this.profile.firstShareDate) return 0;
        return Math.floor((Date.now() - this.profile.firstShareDate) / (24 * 60 * 60 * 1000));
    }

    /**
     * Save to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
        } catch (error) {
            console.warn('[Share AI V2] Failed to save profile:', error);
        }
    }

    /**
     * Clear all data
     */
    clear() {
        this.profile = this.createDefault();
        this.save();
    }

    /**
     * Export profile (for debugging)
     */
    export() {
        return JSON.parse(JSON.stringify(this.profile));
    }
}
