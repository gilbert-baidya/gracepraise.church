/**
 * Prayer Follow-up Engine
 * Handles "Pray with you?" interactions
 */

(function (window) {
    'use strict';

    const PrayerFollowupEngine = {

        triggerFollowup: function () {
            // Show Toast or Dialog
            // "Would you like us to pray with you?"
            // Actions: "Submit Request", "Not Now"

            this.createDialog();
        },

        createDialog: function () {
            if (document.getElementById('prayerFollowupDialog')) {
                document.getElementById('prayerFollowupDialog').classList.add('active');
                return;
            }

            const html = `
                <div id="prayerFollowupDialog" class="social-funnel-overlay" style="display: flex;">
                    <div class="social-funnel-card">
                        <h3>We are here for you.</h3>
                        <p>Would you like our prayer team to pray for you specifically?</p>
                        <div class="social-funnel-actions">
                            <button id="prayReqYes" class="funnel-btn primary">Submit Prayer Request</button>
                            <button id="prayReqNo" class="funnel-btn secondary">No, I'm okay</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);

            document.getElementById('prayReqYes').addEventListener('click', () => {
                // Link to prayer request form or show form
                // For now, simple alert or link
                window.open('/prayer-request', '_blank'); // Placeholder
                this.closeDialog();
                window.SacredEngagementMetrics.track('prayer_request_click');
            });

            document.getElementById('prayReqNo').addEventListener('click', () => {
                this.closeDialog();
                window.SacredEngagementMetrics.track('prayer_request_dismiss');
            });
        },

        closeDialog: function () {
            const d = document.getElementById('prayerFollowupDialog');
            if (d) {
                d.style.display = 'none';
                d.classList.remove('active');
            }
        }
    };

    window.PrayerFollowupEngine = PrayerFollowupEngine;

})(window);
