/**
 * Devotion Social Funnel
 * Manages Pre-Share "Prayer Intercept" and Post-Share "Invite Toast"
 */

(function (window) {
    'use strict';

    const DevotionSocialFunnel = {

        // State
        sharePending: false,
        pendingFormat: null,

        init: function () {
            // Look for hooks or create them if missing? 
            // Better to assume HTML structure exists or inject minimal dialogs.
            this.injectDialogs();
        },

        injectDialogs: function () {
            if (document.getElementById('socialFunnelDialog')) return;

            const dialogHTML = `
                <div id="socialFunnelDialog" class="social-funnel-overlay" style="display: none;">
                    <div class="social-funnel-card">
                        <h3>Before you share...</h3>
                        <p>Would you like to say a quick prayer for the person receiving this?</p>
                        <div class="social-funnel-actions">
                            <button id="funnelPrayYes" class="funnel-btn primary">Yes, Pray & Share</button>
                            <button id="funnelPrayNo" class="funnel-btn secondary">Just Share</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', dialogHTML);

            // Bind Events
            document.getElementById('funnelPrayYes').addEventListener('click', () => this.handlePrayerResponse(true));
            document.getElementById('funnelPrayNo').addEventListener('click', () => this.handlePrayerResponse(false));
        },

        startShareFlow: function (format) {
            this.pendingFormat = format;

            // Check if user has seen this recently? (Don't annoy)
            // For now, always show as per "Social Curiosity Hook" spec.

            const dialog = document.getElementById('socialFunnelDialog');
            if (dialog) {
                dialog.style.display = 'flex';
                // Trigger animation?
                dialog.classList.add('active');
            } else {
                // Fallback if dialog failed to inject
                this.executeShare();
            }
        },

        handlePrayerResponse: function (prayed) {
            const dialog = document.getElementById('socialFunnelDialog');
            if (dialog) {
                dialog.style.display = 'none';
                dialog.classList.remove('active');
            }

            if (prayed) {
                window.SacredEngagementMetrics.track('prayer_intercept_yes');
                // Could show a brief "Amen!" toast here?
            } else {
                window.SacredEngagementMetrics.track('prayer_intercept_no');
            }

            // Proceed to Share
            this.executeShare();
        },

        executeShare: function () {
            // Call the actual share function from share-card-generator.js
            // We need a way to callback functionality.
            // Dispatch Event? Or valid global function call?
            // Let's fire a custom event that share-card-generator listens to?
            // Or assume renderCardToCanvas/shareCard is globally accessible?
            // shareCard is local to the closure in share-card-generator.

            // Better Pattern: Have share-card-generator call US, and we call IT back via callback?
            // Refactor: We will modify share-card-generator to use this class.

            // Trigger custom event for now
            const event = new CustomEvent('heavenShareApproved', { detail: { format: this.pendingFormat } });
            document.dispatchEvent(event);
        },

        showInviteToast: function () {
            // "Want to invite them to church too?"
            // Use existing toast system but with actions?

            // Let's create a specific Toast for invite
            // Reuse existing toast logic or inject new one.
            // We'll trust the main script to handle standard toasts, but this needs buttons.

            // ... Logic for Post-Share Invite Toast ...
            console.log("Show invite toast");
            window.SacredEngagementMetrics.track('invite_toast_shown');
        }
    };

    window.DevotionSocialFunnel = DevotionSocialFunnel;

    // Add Styles
    const style = document.createElement('style');
    style.textContent = `
        .social-funnel-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        }
        .social-funnel-card {
            background: var(--bg-card, #fff); padding: 32px; border-radius: 24px;
            text-align: center; max-width: 90%; width: 320px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            animation: funnelPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .social-funnel-card h3 { font-family: serif; margin-bottom: 12px; color: var(--text-base); }
        .social-funnel-card p { margin-bottom: 24px; color: var(--text-muted); line-height: 1.5; }
        .social-funnel-actions { display: flex; flex-direction: column; gap: 12px; }
        .funnel-btn { padding: 12px; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
        .funnel-btn:active { transform: scale(0.98); }
        .funnel-btn.primary { background: var(--brand-primary, #6366f1); color: #fff; }
        .funnel-btn.secondary { background: transparent; border: 1px solid var(--border-color, #e5e7eb); color: var(--text-muted); }
        
        @keyframes funnelPop {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', () => DevotionSocialFunnel.init());

})(window);
