/**
 * Heaven-Level Share Engine
 * Core Logic: Emotion Detection & Share Streak Tracking
 */

(function (window) {
    'use strict';

    // =========================================================================
    // 1. EMOTION KNOWLEDGE BASE
    // =========================================================================

    const EMOTIONS = {
        COMFORT: {
            keywords: ['comfort', 'peace', 'rest', 'sleep', 'quiet', 'still', 'calm', 'heart', 'soul', 'weary', 'burden'],
            intensity: 0.8
        },
        HOPE: {
            keywords: ['hope', 'wait', 'future', 'plan', 'trust', 'morning', 'rise', 'new', 'promise', 'expect'],
            intensity: 0.9
        },
        VICTORY: {
            keywords: ['victory', 'overcome', 'conquer', 'win', 'triumph', 'power', 'might', 'strength', 'battle', 'defeat'],
            intensity: 1.0
        },
        WARNING: {
            keywords: ['warn', 'beware', 'watch', 'flee', 'sin', 'judgment', 'fire', 'darkness', 'wicked', 'turn'],
            intensity: 0.95
        },
        CELEBRATION: {
            keywords: ['praise', 'sing', 'shout', 'joy', 'glad', 'rejoice', 'dance', 'glory', 'hallelujah', 'amen'],
            intensity: 0.9
        },
        HEALING: {
            keywords: ['heal', 'cure', 'broken', 'bind', 'wound', 'sickness', 'restore', 'health', 'whole'],
            intensity: 0.85
        },
        REPENTANCE: {
            keywords: ['sorry', 'confess', 'forgive', 'clean', 'wash', 'mercy', 'grace', 'sinner', 'redeem'],
            intensity: 0.85
        },
        GUIDANCE: {
            keywords: ['guide', 'lead', 'path', 'way', 'walk', 'step', 'light', 'follow', 'direct', 'teach'],
            intensity: 0.75
        }
    };

    // =========================================================================
    // 2. CORE LOGIC
    // =========================================================================

    const HeavenShareEngine = {

        /**
         * Detect Emotion from text
         * @param {string} text 
         * @returns {Object} { type: 'COMFORT', intensity: 0.8 }
         */
        detectEmotion: function (text) {
            if (!text) return { type: 'HOPE', intensity: 0.8 }; // Default
            const lower = text.toLowerCase();
            let bestMatch = 'HOPE';
            let maxScore = 0;

            for (const [key, config] of Object.entries(EMOTIONS)) {
                let score = 0;
                config.keywords.forEach(word => {
                    if (lower.includes(word)) score++;
                });

                // Boost score slightly for multi-word matches or frequency?
                // For now, simple count is good enough.
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = key;
                }
            }

            return {
                type: bestMatch,
                intensity: EMOTIONS[bestMatch].intensity,
                score: maxScore
            };
        },

        /**
         * Get current share streak
         */
        getStreak: function () {
            try {
                const streak = localStorage.getItem('gpbc_share_streak');
                return streak ? parseInt(streak, 10) : 0;
            } catch (e) {
                return 0;
            }
        },

        /**
         * Track a successful share
         */
        trackShare: function () {
            try {
                let streak = this.getStreak();
                const lastShare = localStorage.getItem('gpbc_last_share_date');
                const today = new Date().toISOString().slice(0, 10);

                if (lastShare !== today) {
                    // Start new streak check
                    // Ideally check if lastShare was yesterday to increment, otherwise reset?
                    // "Streak" vs "Total Shares". Let's do Total Shares for simplicity/positivity first.
                    // Or "Days Shared".
                    // Logic: If lastShare was NOT today, increment.
                    streak++;
                    localStorage.setItem('gpbc_share_streak', streak);
                    localStorage.setItem('gpbc_last_share_date', today);
                }
                return streak;
            } catch (e) {
                return 0;
            }
        },

        /**
         * Get Reward Title based on Streak
         */
        getRewardTitle: function (streak) {
            if (streak >= 30) return "Kingdom Messenger";
            if (streak >= 7) return "Light Bearer";
            if (streak >= 3) return "Faith Encourager";
            return "";
        }
    };

    window.HeavenShareEngine = HeavenShareEngine;

})(window);
