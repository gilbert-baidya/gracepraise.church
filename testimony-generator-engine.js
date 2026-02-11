/**
 * Testimony Generator Engine
 * Creates "God is working" share cards
 */

(function (window) {
    'use strict';

    const TestimonyGeneratorEngine = {

        openGenerator: function () {
            // UI to input reflection?
            // Reuse Share Logic but different template.

            // For MVP, standard share is verse.
            // Testimony mode adds "God is working" header.
            // Let's modify the ShareCardGenerator to support a "TESTIMONY" mode.
            // This engine can just trigger that mode.

            if (window.renderCardToCanvas) {
                // We need to inject a way to switch modes in the UI? 
                // Or this is a separate button?
                // "Share Testimony" button.
                console.log("Opening Testimony Generator");
                // TODO: Extend ShareCardGenerator or build specific UI
            }
        }
    };

    window.TestimonyGeneratorEngine = TestimonyGeneratorEngine;

})(window);
