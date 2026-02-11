/**
 * Sacred Engagement Metrics
 * Privacy-First Analytics for Share/Invite Interactions
 */

(function (window) {
    'use strict';

    const SacredEngagementMetrics = {
        track: function (eventName, properties = {}) {
            // Log to console for dev validation (as per spec)
            // In prod, this would fire to GA4 or custom backend.
            // For this project: Internal Logging / LocalStorage Aggregate?

            console.log(`[SacredMetrics] ${eventName}`, properties);

            // Simple Aggregate Counters in LocalStorage
            try {
                const key = `gpbc_metric_${eventName}`;
                let count = parseInt(localStorage.getItem(key) || '0', 10);
                count++;
                localStorage.setItem(key, count);
            } catch (e) { }
        }
    };

    window.SacredEngagementMetrics = SacredEngagementMetrics;

})(window);
