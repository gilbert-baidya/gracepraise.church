// =============================================================================
// FOOTER INITIALIZATION BOOTSTRAP
// Grace and Praise Bangladeshi Church
// Listens for partials:loaded event and initializes the footer renderer
// =============================================================================

import { initSiteFooter } from './site-footer.js?v=20260922-v17';

let websiteControlPromise = null;

function ensureWebsiteControl() {
    if (window.GPBCWebsiteControl) return Promise.resolve();
    if (websiteControlPromise) return websiteControlPromise;

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('../../website-control.css', import.meta.url).href;
    stylesheet.dataset.gpbcControlStyle = 'true';
    if (!document.querySelector('link[data-gpbc-control-style]')) {
        document.head.appendChild(stylesheet);
    }

    websiteControlPromise = import('../../shared/website-control-schema.js')
        .then(() => import('../../website-control.js'))
        .then(() => undefined);
    return websiteControlPromise;
}

// Bootstrap the public adapter as soon as the shared footer module is loaded.
// The surface observer will apply the same policy when the footer partial is
// injected later in the page lifecycle.
ensureWebsiteControl();

function initializeFooter() {
    if (!document.querySelector('.site-footer')) {
        return false;
    }

    initSiteFooter();
    ensureWebsiteControl();
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
