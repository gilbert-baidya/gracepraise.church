/* Give V14 interactions. Payment handling remains in donations.js. */
(function () {
    function initGivePage() {
        document.querySelectorAll('[data-scroll-to]').forEach(function (trigger) {
            trigger.addEventListener('click', function () {
                var target = document.getElementById(trigger.getAttribute('data-scroll-to'));
                if (!target) return;
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                window.setTimeout(function () {
                    target.focus({ preventScroll: true });
                }, 350);
            });
        });

        document.querySelectorAll('.give-v14-copy').forEach(function (button) {
            button.addEventListener('click', function () {
                var text = button.getAttribute('data-copy');
                if (!text) return;

                var original = button.textContent;
                var done = function () {
                    button.textContent = 'Copied';
                    button.classList.add('copied');
                    window.setTimeout(function () {
                        button.textContent = original;
                        button.classList.remove('copied');
                    }, 2200);
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done).catch(function () {
                        window.prompt('Copy this giving email:', text);
                    });
                } else {
                    window.prompt('Copy this giving email:', text);
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGivePage);
    } else {
        initGivePage();
    }
})();
