// Prayer V15 page-only interaction helpers.
// Submission, validation, loading, success and error behavior remain in prayer-form.js.

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const prayerCta = document.querySelector('[data-prayer-focus]');
        const prayerFormSection = document.getElementById('prayer-form-section');
        const firstField = document.getElementById('prayer-name');

        if (!prayerCta || !prayerFormSection) return;

        prayerCta.addEventListener('click', function () {
            window.setTimeout(function () {
                if (firstField) {
                    firstField.focus({ preventScroll: true });
                }
            }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
        });
    });
})();
