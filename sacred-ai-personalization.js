/**
 * Sacred AI Personalization
 * Adapts micro-copy and UI based on Spiritual State
 */

(function (window) {
    'use strict';

    const MICRO_ENCOURAGEMENTS = {
        SEEKING_COMFORT: "God sees you today.",
        SEEKING_GUIDANCE: "God is leading you step by step.",
        FAITH_GROWTH: "Keep walking faithfully.",
        CELEBRATING_BLESSING: "Rejoice in His goodness!",
        REPENTANCE_REFLECTION: "His mercy is new every morning.",
        SPIRITUAL_CURIOSITY: "Welcome. We're glad you're here."
    };

    const SacredAIPersonalization = {

        injectEncouragement: function (state) {
            const text = MICRO_ENCOURAGEMENTS[state] || MICRO_ENCOURAGEMENTS.SPIRITUAL_CURIOSITY;

            // Where to inject?
            // Maybe a subtle banner or below the date?
            // Or replace "Daily Devotion" subtitle?
            // Let's create a specific hook container if missing.

            let container = document.getElementById('sacredPersonalizationHook');
            if (!container) {
                // Try to find a good spot, e.g., below #heroSubtitle
                const sub = document.getElementById('heroSubtitle');
                if (sub) {
                    container = document.createElement('div');
                    container.id = 'sacredPersonalizationHook';
                    container.className = 'sacred-personalization-text';
                    container.style.cssText = "font-size: 0.9em; opacity: 0.9; margin-top: 8px; font-style: italic; font-family: serif;";
                    sub.parentNode.insertBefore(container, sub.nextSibling);
                }
            }

            if (container) {
                container.textContent = text;
                container.style.animation = 'fadeIn 1s ease';
            }
        },

        adaptUI: function (state) {
            this.injectEncouragement(state);
            // Could simpler color tweaks or icon changes happen here too?
        }
    };

    window.SacredAIPersonalization = SacredAIPersonalization;

})(window);
