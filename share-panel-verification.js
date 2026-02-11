/**
 * GPBC Share Panel Surface Verification
 * Runtime verification to ensure Sacred Glass surface is active
 */

(function() {
    'use strict';

    function verifySharePanelSurface() {
        const panel = document.querySelector('.devotion-share-panel');
        
        if (!panel) {
            console.warn('[GPBC] Share panel missing - verification skipped');
            return;
        }

        const computed = getComputedStyle(panel);
        const bg = computed.backgroundColor;
        const bgImage = computed.backgroundImage;
        const backdropFilter = computed.backdropFilter || computed.webkitBackdropFilter;
        const borderRadius = computed.borderRadius;
        
        console.group('[GPBC] 📊 Share Panel Surface Verification');
        console.log('Background Color:', bg);
        console.log('Background Image:', bgImage);
        console.log('Backdrop Filter:', backdropFilter);
        console.log('Border Radius:', borderRadius);

        // Sacred Glass Detection Logic
        const isPureBlack =
            bg === 'rgb(0, 0, 0)' ||
            bg === 'rgba(0, 0, 0, 1)';

        const isTransparent =
            bg === 'rgba(0, 0, 0, 0)' ||
            bg === 'transparent';

        const hasGradient =
            bgImage && bgImage !== 'none' && bgImage.includes('gradient');

        const hasBlur =
            backdropFilter && backdropFilter !== 'none';

        const hasRadius =
            borderRadius && borderRadius !== '0px';

        // FAIL if transparent background with no gradient AND no blur
        const isInvalidTransparent =
            isTransparent && !hasGradient && !hasBlur;

        const isSacredGlass =
            (hasGradient || hasBlur) && hasRadius && !isPureBlack && !isInvalidTransparent;

        // Debug logging
        console.log('[GPBC] Glass Detection →', {
            hasGradient,
            hasBlur,
            hasRadius,
            isPureBlack,
            isTransparent,
            isInvalidTransparent
        });

        console.groupEnd();

        // Theme detection
        const theme = document.documentElement.getAttribute('data-theme') || 
                     (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        console.log(`[GPBC] Current Theme: ${theme}`);

        // Mobile detection
        const isMobile = window.innerWidth <= 768;
        console.log(`[GPBC] Mobile Mode: ${isMobile ? 'YES' : 'NO'}`);

        // Final verification result
        if (isSacredGlass) {
            console.log(
                '%c[GPBC] ✅ VERIFICATION PASSED (Sacred Glass Detected)',
                'color:#22c55e;font-weight:bold;font-size:14px;'
            );
        } else {
            console.error(
                '%c[GPBC] ❌ VERIFICATION FAILED (Sacred Surface Missing)',
                'color:#ef4444;font-weight:bold;font-size:14px;'
            );
        }
    }

    // Run verification on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', verifySharePanelSurface);
    } else {
        verifySharePanelSurface();
    }

    // Re-verify on theme change
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                console.log('[GPBC] Theme changed - re-verifying...');
                setTimeout(verifySharePanelSurface, 100);
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
    });

    // Re-verify on window resize (mobile detection)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            console.log('[GPBC] Window resized - re-verifying...');
            verifySharePanelSurface();
        }, 300);
    });

    // Expose verification function globally for manual testing
    window.verifySharePanel = verifySharePanelSurface;
    console.log('[GPBC] 💡 Run window.verifySharePanel() to manually verify');

})();
