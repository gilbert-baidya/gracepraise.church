/**
 * Church Connection Layer
 * Soft Invites based on Engagement Triggers
 */

(function (window) {
    'use strict';

    const ChurchConnectionLayer = {

        checkTriggers: function () {
            // Check for Post-Share Invite
            document.addEventListener('heavenShareApproved', () => {
                setTimeout(() => this.showInvite('SERVICE'), 5000);
            });

            // Check for Streak Invite (Small Group)
            if (window.HeavenShareEngine) {
                const streak = window.HeavenShareEngine.getStreak();
                if (streak === 3) {
                    // Show small group invite?
                }
            }
        },

        showInvite: function (type) {
            // Toast notification
            const msg = type === 'SERVICE' ? "Join us for service this Sunday?" : "Connect with a small group?";
            // Use standard Toast for now
            const toast = document.getElementById('shareToast');
            if (toast) {
                document.getElementById('shareToastMessage').textContent = msg;
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 4000);
            }
        }
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ChurchConnectionLayer.checkTriggers());
    } else {
        ChurchConnectionLayer.checkTriggers();
    }

    window.ChurchConnectionLayer = ChurchConnectionLayer;

})(window);
