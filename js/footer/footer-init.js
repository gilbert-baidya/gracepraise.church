// =============================================================================
// FOOTER INITIALIZATION BOOTSTRAP
// Grace and Praise Bangladeshi Church
// Listens for partials:loaded event and initializes the footer renderer
// =============================================================================

import { initSiteFooter } from './site-footer.js';

// Wait for partials to load, then initialize footer
document.addEventListener('partials:loaded', () => {
    console.log('[Footer Init] Partials loaded, initializing footer...');
    initSiteFooter(document);
});

// Fallback: If partials are already loaded when this script runs
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Check if footer mount point exists
    const footerMount = document.querySelector('[data-partial="site-footer"]');
    if (footerMount && footerMount.querySelector('.site-footer')) {
        console.log('[Footer Init] Footer already in DOM, initializing...');
        initSiteFooter(document);
    }
}
