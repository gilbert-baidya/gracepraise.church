/**
 * ============================================================================
 * SMART SHARE AI V2 - MINISTRY INSIGHTS
 * ============================================================================
 * Anonymous aggregate analytics for ministry effectiveness
 * NO personal data tracking - counts and patterns only
 * ============================================================================
 */

export class MinistryInsights {
    constructor(profileStore) {
        this.profile = profileStore;
    }

    /**
     * Get overall ministry impact metrics
     */
    getImpactMetrics() {
        const profile = this.profile.profile;
        
        return {
            totalShares: profile.totalShares,
            overallSuccessRate: this.calculateSuccessRate(),
            daysActive: this.profile.getDaysActive(),
            avgSharesPerDay: this.profile.getAvgSharesPerDay(),
            engagement: this.calculateEngagementScore(),
            reach: this.estimateReach()
        };
    }

    /**
     * Get theme distribution (which themes resonate most)
     */
    getThemeDistribution() {
        const topThemes = this.profile.getTopThemes(10);
        const total = this.profile.profile.totalShares;
        
        return {
            topThemes: topThemes.map(({ theme, count }) => ({
                theme,
                count,
                percentage: total > 0 ? (count / total * 100).toFixed(1) : 0,
                category: this.categorizeTheme(theme)
            })),
            diversity: this.calculateThemeDiversity()
        };
    }

    /**
     * Get time distribution (when people share most)
     */
    getTimeDistribution() {
        const dist = this.profile.getTimeDistribution();
        
        const formatted = Object.entries(dist).map(([window, data]) => ({
            timeWindow: window,
            label: this.getTimeLabel(window),
            percentage: data.percentage.toFixed(1),
            successRate: (data.successRate * 100).toFixed(1),
            shares: this.profile.profile.timeWindows[window].shares
        }));

        return {
            distribution: formatted,
            peakWindow: this.getPeakWindow(formatted),
            consistencyScore: this.calculateTimeConsistency(formatted)
        };
    }

    /**
     * Get strategy effectiveness
     */
    getStrategyEffectiveness() {
        const strategies = this.profile.profile.strategies;
        
        return Object.entries(strategies).map(([strategy, stats]) => ({
            strategy,
            attempts: stats.attempts,
            successes: stats.successes,
            successRate: stats.attempts > 0 ? 
                ((stats.successes / stats.attempts) * 100).toFixed(1) : 0,
            avgResponseTime: stats.avgResponseTime ? 
                Math.round(stats.avgResponseTime) : null,
            lastUsed: stats.lastSuccess || stats.lastFailure,
            performance: this.getPerformanceLabel(stats)
        })).sort((a, b) => b.successRate - a.successRate);
    }

    /**
     * Get device distribution
     */
    getDeviceDistribution() {
        const strategies = this.profile.profile.strategies;
        const deviceCounts = {};

        // Aggregate device data across all strategies
        for (const strategy of Object.values(strategies)) {
            if (strategy.byDevice) {
                for (const [device, count] of Object.entries(strategy.byDevice)) {
                    deviceCounts[device] = (deviceCounts[device] || 0) + count;
                }
            }
        }

        const total = Object.values(deviceCounts).reduce((sum, count) => sum + count, 0);

        return Object.entries(deviceCounts)
            .map(([device, count]) => ({
                device,
                count,
                percentage: total > 0 ? (count / total * 100).toFixed(1) : 0,
                label: this.getDeviceLabel(device)
            }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get growth trends
     */
    getGrowthTrends() {
        const profile = this.profile.profile;
        
        if (!profile.firstShareDate) {
            return {
                trend: 'insufficient-data',
                direction: 'neutral'
            };
        }

        const daysActive = this.profile.getDaysActive();
        const avgPerDay = this.profile.getAvgSharesPerDay();

        // Simple trend analysis
        let trend = 'stable';
        if (avgPerDay > 2) trend = 'growing';
        if (avgPerDay < 0.5) trend = 'declining';

        return {
            trend,
            avgSharesPerDay: avgPerDay.toFixed(2),
            daysActive,
            totalShares: profile.totalShares,
            momentum: this.calculateMomentum()
        };
    }

    /**
     * Get ministry recommendations
     */
    getRecommendations() {
        const recommendations = [];
        const profile = this.profile.profile;

        // Strategy recommendation
        if (profile.preferences.preferredStrategy) {
            recommendations.push({
                type: 'strategy',
                title: 'Optimize Share Experience',
                message: `${this.strategyLabel(profile.preferences.preferredStrategy)} works best for your congregation`,
                priority: 'high'
            });
        }

        // Time recommendation
        if (profile.preferences.preferredTimeWindow) {
            recommendations.push({
                type: 'timing',
                title: 'Best Sharing Times',
                message: `${this.getTimeLabel(profile.preferences.preferredTimeWindow)} shows highest engagement`,
                priority: 'medium'
            });
        }

        // Theme recommendation
        const topThemes = this.profile.getTopThemes(3);
        if (topThemes.length > 0) {
            recommendations.push({
                type: 'content',
                title: 'Popular Themes',
                message: `"${topThemes[0].theme}" resonates most with your community`,
                priority: 'medium'
            });
        }

        // Engagement recommendation
        const successRate = this.calculateSuccessRate();
        if (successRate < 0.5) {
            recommendations.push({
                type: 'engagement',
                title: 'Improve Share Success',
                message: 'Consider encouraging mobile sharing for better results',
                priority: 'high'
            });
        }

        return recommendations;
    }

    /**
     * Generate ministry report
     */
    generateReport() {
        return {
            reportDate: new Date().toISOString(),
            version: '2.0.0',
            metrics: this.getImpactMetrics(),
            themes: this.getThemeDistribution(),
            timing: this.getTimeDistribution(),
            strategies: this.getStrategyEffectiveness(),
            devices: this.getDeviceDistribution(),
            trends: this.getGrowthTrends(),
            recommendations: this.getRecommendations()
        };
    }

    // Helper methods

    calculateSuccessRate() {
        const profile = this.profile.profile;
        if (profile.totalShares === 0) return 0;
        return profile.totalSuccesses / profile.totalShares;
    }

    calculateEngagementScore() {
        const successRate = this.calculateSuccessRate();
        const frequency = this.profile.getAvgSharesPerDay();
        const diversity = this.calculateThemeDiversity();

        // Engagement score (0-100)
        return Math.min(100, 
            (successRate * 40) + 
            (Math.min(frequency * 10, 30)) + 
            (diversity * 30)
        );
    }

    estimateReach() {
        // Conservative estimate: 5-10 people see each successful share
        const successes = this.profile.profile.totalSuccesses;
        return {
            min: successes * 5,
            max: successes * 10,
            estimated: Math.round(successes * 7.5)
        };
    }

    calculateThemeDiversity() {
        const themes = Object.values(this.profile.profile.themeShares);
        if (themes.length === 0) return 0;

        // Shannon entropy-inspired diversity
        const total = themes.reduce((sum, count) => sum + count, 0);
        const probabilities = themes.map(count => count / total);
        const entropy = -probabilities.reduce((sum, p) => sum + (p * Math.log(p)), 0);
        
        // Normalize to 0-1
        const maxEntropy = Math.log(themes.length);
        return maxEntropy > 0 ? entropy / maxEntropy : 0;
    }

    calculateTimeConsistency(distribution) {
        const percentages = distribution.map(d => parseFloat(d.percentage));
        const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
        const variance = percentages.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / percentages.length;
        
        // Lower variance = more consistent
        return Math.max(0, 1 - (Math.sqrt(variance) / 20));
    }

    calculateMomentum() {
        // Simple momentum: recent activity vs historical average
        const recent = 0.7; // Placeholder - would need time-series data
        return recent > 0.5 ? 'positive' : recent < -0.5 ? 'negative' : 'neutral';
    }

    categorizeTheme(theme) {
        const categories = {
            faith: ['faith', 'believe', 'trust'],
            hope: ['hope', 'promise', 'future'],
            love: ['love', 'compassion', 'kindness'],
            prayer: ['prayer', 'worship', 'praise'],
            wisdom: ['wisdom', 'guidance', 'understanding']
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(kw => theme.toLowerCase().includes(kw))) {
                return category;
            }
        }

        return 'general';
    }

    getPeakWindow(distribution) {
        return distribution.reduce((peak, current) => 
            parseFloat(current.percentage) > parseFloat(peak.percentage) ? current : peak
        );
    }

    getPerformanceLabel(stats) {
        if (stats.attempts === 0) return 'Untested';
        const rate = stats.successes / stats.attempts;
        if (rate > 0.8) return 'Excellent';
        if (rate > 0.6) return 'Good';
        if (rate > 0.4) return 'Fair';
        return 'Needs improvement';
    }

    getTimeLabel(window) {
        const labels = {
            morning: 'Morning (5am-11am)',
            midday: 'Midday (11am-2pm)',
            afternoon: 'Afternoon (2pm-5pm)',
            evening: 'Evening (5pm-9pm)',
            night: 'Night (9pm-5am)'
        };
        return labels[window] || window;
    }

    getDeviceLabel(device) {
        const labels = {
            'iphone': 'iPhone',
            'ipad': 'iPad',
            'android-phone': 'Android Phone',
            'android-tablet': 'Android Tablet',
            'desktop': 'Desktop',
            'tablet': 'Tablet',
            'mobile': 'Mobile'
        };
        return labels[device] || device;
    }

    strategyLabel(strategy) {
        const labels = {
            'image': 'Image sharing',
            'url': 'Link sharing',
            'text': 'Text sharing',
            'sms': 'SMS sharing'
        };
        return labels[strategy] || strategy;
    }
}
