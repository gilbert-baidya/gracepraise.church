/**
 * HOMEPAGE-ONLY JS FIX
 * Dynamically syncs --header-height CSS variable
 * Handles sticky header height changes on scroll
 * Safe, scoped, lightweight
 */

(function() {
    'use strict';
    
    // Only run on homepage (header countdown or legacy banner)
    const isHomepage = document.getElementById('specialEventBanner') ||
        document.querySelector('.inline-countdown-banner');
    if (!isHomepage) return;
    
    const header = document.querySelector('header');
    if (!header) return;

    const headerCountdown = document.getElementById('specialEventBanner') ||
        document.querySelector('.inline-countdown-banner');

    function getVisibleHeight(element) {
        if (!element) return 0;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return 0;
        }
        return element.offsetHeight || 0;
    }
    
    // Function to update header height CSS variable
    function updateHeaderHeight() {
        const headerHeight = header.offsetHeight;
        const bannerHeight = getVisibleHeight(headerCountdown);
        const totalHeight = headerHeight + bannerHeight;
        document.documentElement.style.setProperty('--header-height', `${totalHeight}px`);
    }
    
    // Initial update
    updateHeaderHeight();
    
    // Update on scroll (throttled)
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(function() {
            updateHeaderHeight();
            scrollTimeout = null;
        }, 100);
    }, { passive: true });
    
    // Update on resize (debounced)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateHeaderHeight, 150);
    }, { passive: true });
    
    // Update on orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(updateHeaderHeight, 200);
    });
    
})();
