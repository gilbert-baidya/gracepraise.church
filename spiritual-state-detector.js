/**
 * Spiritual State Detector
 * Infers user's spiritual moment (Session Only / Non-PII)
 */

(function (window) {
    'use strict';

    const STATES = {
        SEEKING_COMFORT: { score: 0, theme: ['COMFORT', 'PEACE', 'HEALING'] },
        SEEKING_GUIDANCE: { score: 0, theme: ['GUIDANCE', 'WARNING'] },
        FAITH_GROWTH: { score: 0, theme: ['VICTORY', 'STRENGTH'] },
        CELEBRATING_BLESSING: { score: 0, theme: ['CELEBRATION', 'HOPE'] },
        REPENTANCE_REFLECTION: { score: 0, theme: ['REPENTANCE'] },
        SPIRITUAL_CURIOSITY: { score: 0, theme: [] } // Default new visitor
    };

    const SpiritualStateDetector = {

        currentState: 'SPIRITUAL_CURIOSITY',

        detect: function (context) {
            // context = { theme: 'HOPE', interactions: ['scroll_slow', 'share'] }

            let scores = JSON.parse(JSON.stringify(STATES)); // Deep copy structure

            // 1. Theme Impact
            if (context.theme) {
                for (const [key, config] of Object.entries(STATES)) {
                    if (config.theme.includes(context.theme)) {
                        scores[key].score += 5;
                    }
                }
            }

            // 2. Interaction Impact
            if (context.interactions) {
                if (context.interactions.includes('scroll_slow')) {
                    scores.SEEKING_COMFORT.score += 2;
                    scores.REPENTANCE_REFLECTION.score += 2;
                }
                if (context.interactions.includes('share')) {
                    scores.FAITH_GROWTH.score += 3;
                    scores.CELEBRATING_BLESSING.score += 3;
                }
                if (context.interactions.includes('copy_verse')) {
                    scores.SEEKING_GUIDANCE.score += 3;
                }
            }

            // 3. Determine Winner
            let maxScore = 0;
            let bestState = 'SPIRITUAL_CURIOSITY';

            for (const [key, val] of Object.entries(scores)) {
                if (val.score > maxScore) {
                    maxScore = val.score;
                    bestState = key;
                }
            }

            this.currentState = bestState;
            console.log(`[SpiritualState] Detected: ${bestState}`);
            return bestState;
        },

        getState: function () {
            return this.currentState;
        }
    };

    window.SpiritualStateDetector = SpiritualStateDetector;

})(window);
