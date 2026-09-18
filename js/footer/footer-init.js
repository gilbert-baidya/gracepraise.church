// =============================================================================
// FOOTER INITIALIZATION BOOTSTRAP
// Grace and Praise Bangladeshi Church
// Listens for partials:loaded event and initializes the footer renderer
// =============================================================================

import { initSiteFooter } from './site-footer.js';

function initializeFooter() {
    if (!document.querySelector('.site-footer')) {
        return false;
    }

    initSiteFooter();
    return true;
}

document.addEventListener('partials:loaded', initializeFooter);

if (!initializeFooter()) {
    const observer = new MutationObserver(() => {
        if (initializeFooter()) {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
}
