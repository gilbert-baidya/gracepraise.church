/**
 * Discipleship Journey Engine
 * Central Orchestrator for the Digital Discipleship Experience
 */

(function (window) {
    'use strict';

    const STAGES = {
        VISITOR: 0,
        READER: 1, // 2+ visits
        ENGAGED: 2, // Shared or Prayed
        DISCIPLE: 3 // consistent return + engagement
    };

    const DiscipleshipJourneyEngine = {

        stage: STAGES.VISITOR,
        visitCount: 0,

        init: function () {
            this.loadState();
            this.trackVisit();

            // Wait for other modules to load then coordinate
            setTimeout(() => this.coordinate(), 500);
        },

        loadState: function () {
            try {
                this.visitCount = parseInt(localStorage.getItem('gpbc_visit_count') || '0', 10);
                // Determine stage based on history
                if (this.visitCount > 5) this.stage = STAGES.DISCIPLE;
                else if (this.visitCount > 1) this.stage = STAGES.READER;

                // Check engagement
                if (localStorage.getItem('gpbc_has_engaged')) this.stage = Math.max(this.stage, STAGES.ENGAGED);
            } catch (e) { }
        },

        trackVisit: function () {
            try {
                const lastVisit = localStorage.getItem('gpbc_last_visit_date');
                const today = new Date().toISOString().slice(0, 10);

                if (lastVisit !== today) {
                    this.visitCount++;
                    localStorage.setItem('gpbc_visit_count', this.visitCount);
                    localStorage.setItem('gpbc_last_visit_date', today);
                }
            } catch (e) { }
        },

        coordinate: function () {
            // 1. Detect Spiritual State
            if (window.SpiritualStateDetector && window.HeavenShareEngine) {
                // Get theme from Verse Text if possible, or wait for HeavenEngine result
                // We'll pass a dummy context or detect from DOM
                const verseText = document.getElementById('bibleText')?.textContent || '';
                const emotion = window.HeavenShareEngine.detectEmotion(verseText);

                const state = window.SpiritualStateDetector.detect({
                    theme: emotion.type,
                    interactions: [] // Initial load has no interactions
                });

                // 2. Personalize UI
                if (window.SacredAIPersonalization) {
                    window.SacredAIPersonalization.adaptUI(state);
                }

                // 3. Show Return Visitor Banner?
                if (this.visitCount > 1 && this.visitCount % 5 === 0) {
                    // Milestone welcome
                    // "Thank you for growing with us."
                    // Implement specific logic or reuse Personalization
                }
            }
        }
    };

    window.DiscipleshipJourneyEngine = DiscipleshipJourneyEngine;

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DiscipleshipJourneyEngine.init());
    } else {
        DiscipleshipJourneyEngine.init();
    }

})(window);
