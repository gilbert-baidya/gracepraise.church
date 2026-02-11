/**
 * Sacred AI Background Engine
 * Generates emotional, scripture-matching backgrounds for Devotion Share Cards & Hero Sections.
 */
(function (window) {
    'use strict';

    // =========================================================================
    // 1. KNOWLEDGE BASE (Themes & Seasons)
    // =========================================================================

    const THEMES = {
        HOPE: {
            keywords: ['hope', 'wait', 'future', 'plan', 'trust', 'morning', 'rise', 'new', 'promise'],
            palette: {
                gradient: ['#fff7ed', '#fee2e2'], // Warm Peach/Gold
                text: '#431407',
                accent: 'rgba(217, 119, 6, 0.15)',
                watermark: 'sunburst'
            }
        },
        PEACE: {
            keywords: ['peace', 'rest', 'still', 'sleep', 'comfort', 'quiet', 'calm', 'heart', 'soul'],
            palette: {
                gradient: ['#f0f9ff', '#e0f2fe'], // Gentle Sky
                text: '#0c4a6e',
                accent: 'rgba(56, 189, 248, 0.1)',
                watermark: 'cloud'
            }
        },
        SALVATION: {
            keywords: ['save', 'cross', 'blood', 'jesus', 'sin', 'life', 'redeemn', 'savior', 'christ', 'died'],
            palette: {
                gradient: ['#fef2f2', '#fee2e2'], // Red Tint (Blood/Love) -> Soft
                text: '#7f1d1d',
                accent: 'rgba(220, 38, 38, 0.1)',
                watermark: 'cross'
            }
        },
        GUIDANCE: {
            keywords: ['guide', 'path', 'way', 'light', 'step', 'lead', 'walk', 'direct', 'follow'],
            palette: {
                gradient: ['#ecfccb', '#d9f99d'], // Light Lime/Green (Growth/Path)
                text: '#365314',
                accent: 'rgba(101, 163, 13, 0.15)',
                watermark: 'path'
            }
        },
        STRENGTH: {
            keywords: ['strong', 'rock', 'shield', 'fortress', 'power', 'might', 'courage', 'fear', 'bold'],
            palette: {
                gradient: ['#f3f4f6', '#e5e7eb'], // Stone/Grey (Rock)
                text: '#111827',
                accent: 'rgba(75, 85, 99, 0.15)',
                watermark: 'shield'
            }
        },
        DEFAULT: {
            keywords: [],
            palette: {
                gradient: ['#fafafa', '#f4f4f5'],
                text: '#18181b',
                accent: 'rgba(0,0,0,0.05)',
                watermark: 'logo'
            }
        }
    };

    const SEASONS = {
        LENT: { start: '02-18', end: '04-02', palette: { gradient: ['#f3e8ff', '#e9d5ff'], text: '#581c87' } }, // Muted Purple
        EASTER: { start: '04-05', end: '04-12', palette: { gradient: ['#fffbeb', '#fcd34d'], text: '#78350f' } }, // Gold Celebration
        ADVENT: { start: '11-29', end: '12-24', palette: { gradient: ['#1e1b4b', '#312e81'], text: '#ffffff' } }, // Deep Night Purple
        CHRISTMAS: { start: '12-25', end: '12-25', palette: { gradient: ['#fff1f2', '#fda4af'], text: '#881337' } }  // Red/Gold
    };

    // =========================================================================
    // 2. INFERENCE ENGINE
    // =========================================================================

    function detectTheme(text) {
        if (!text) return 'DEFAULT';
        const lower = text.toLowerCase();
        let bestMatch = 'DEFAULT';
        let maxScore = 0;

        for (const [key, config] of Object.entries(THEMES)) {
            if (key === 'DEFAULT') continue;
            let score = 0;
            config.keywords.forEach(word => {
                if (lower.includes(word)) score++;
            });
            if (score > maxScore) {
                maxScore = score;
                bestMatch = key;
            }
        }
        return bestMatch;
    }

    function detectSeason(dateObj) {
        // Simple string comparison MM-DD (Works for fixed dates, movable feasts require complex calc but hardcoded for 2026 as per plan)
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        const current = `${m}-${d}`;

        // Check Hardcoded Ranges
        for (const [name, config] of Object.entries(SEASONS)) {
            if (current >= config.start && current <= config.end) return name;
        }
        return 'ORDINARY';
    }

    function getTimeOfDay(dateObj) {
        const h = dateObj.getHours();
        if (h >= 5 && h < 11) return 'MORNING';
        if (h >= 11 && h < 17) return 'DAY';
        return 'EVENING';
    }

    // =========================================================================
    // 3. PUBLIC API
    // =========================================================================

    // Utility to get random item from array
    function randomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Utility to mix two hex colors (simple averaging for now, or just return first)
    // For MVP, we stick to the main detected palette logic.

    window.SacredBackgroundEngine = {

        /**
         * Generate a Sacred Background Configuration
         * @param {string} text - The verse or reflection text to analyze
         * @returns {Object} Config object with gradient, text color, accent
         */
        generate: function (text) {
            const now = new Date();

            // 1. Detect Context
            const themeKey = detectTheme(text);
            const seasonKey = detectSeason(now);
            const timeOfDay = getTimeOfDay(now);
            const isSunday = now.getDay() === 0;

            console.log(`[SacredEngine] Theme: ${themeKey}, Season: ${seasonKey}, Time: ${timeOfDay}, Sunday: ${isSunday}`);

            // 2. Resolve Palette priority: Season > Sunday > Theme > Time
            // Start with Theme
            let palette = { ...THEMES[themeKey].palette };

            // Apply Season Override
            if (seasonKey !== 'ORDINARY') {
                // We don't want to completely overwrite, maybe just gradient?
                // For now, simple override of gradient/text
                palette.gradient = SEASONS[seasonKey].palette.gradient;
                palette.text = SEASONS[seasonKey].palette.text;
            }

            // Apply Sunday Override (if Ordinary season)
            if (seasonKey === 'ORDINARY' && isSunday) {
                palette.gradient = ['#fffbeb', '#fcd34d']; // Gold
                palette.text = '#451a03';
                palette.accent = 'rgba(251, 191, 36, 0.25)';
            }

            // Apply Evening Mode (Darkness)
            if (timeOfDay === 'EVENING') {
                palette.gradient = ['#0f172a', '#1e293b']; // Deep Night
                palette.text = '#ffffff';
                palette.accent = 'rgba(255, 255, 255, 0.1)';
            }

            return {
                theme: themeKey,
                season: seasonKey,
                gradient: palette.gradient,
                text: palette.text,
                accent: palette.accent,
                watermark: palette.watermark
            };
        }
    };

})(window);
