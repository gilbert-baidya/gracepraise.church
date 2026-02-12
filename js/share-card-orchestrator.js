/**
 * GPBC Share Card Orchestrator
 * YouVersion-Level Experience for Daily Devotion
 * 
 * Features:
 * - Instant visual feedback (<100ms)
 * - Preview modal in <400ms
 * - Native Share API (mobile priority)
 * - Graceful fallback chain
 * - Zero pipeline interference
 * 
 * Safe: Never breaks devotion render pipeline
 * Cooperative: Works WITH existing share-card-generator.js
 */

(function () {
    'use strict';

    // Only run on Daily Devotion page
    if (!document.body.classList.contains('page-daily-devotion')) {
        return;
    }

    console.log('[GPBC Share] Orchestrator initializing...');

    // ============================================================================
    // ZERO FRICTION SHARE — Smart Default Format Detection
    // ============================================================================
    
    /**
     * Get smart default format based on device screen ratio
     * Tall screens (ratio > 1.75) → 9:16 story format (safe for mobile sharing)
     * Everything else → 1:1 square format (SMS + universal safe)
     */
    function getSmartDefaultFormat() {
        const h = window.innerHeight;
        const w = window.innerWidth;
        const ratio = h / w;
        
        // Tall screens → story safe
        if (ratio > 1.75) {
            console.log('[Share UX] Smart Format: 9:16 (tall screen detected)');
            return '9:16';
        }
        
        // Everything else → SMS safe default
        console.log('[Share UX] Smart Format: 1:1 (universal/SMS safe)');
        return '1:1';
    }

    // State
    let isGenerating = false;
    let buttonElement = null;
    let originalClickHandler = null;

    /**
     * Initialize orchestrator after DOM ready
     */
    function init() {
        // Check if generator is already ready
        if (window.__SHARE_GENERATOR_READY__ === true) {
            console.log('[GPBC Share] Generator ready, orchestrator binding now...');
            setupOrchestrator();
        } else {
            console.log('[GPBC Share] Orchestrator waiting for generator...');
            // Listen for generator readiness event
            window.addEventListener('gpbc:share-generator-ready', () => {
                console.log('[GPBC Share] Generator ready, orchestrator binding now...');
                setupOrchestrator();
            }, { once: true });
            
            // Fallback timeout in case event missed (safety net)
            setTimeout(() => {
                if (window.__SHARE_GENERATOR_READY__ === true && buttonElement === null) {
                    console.log('[GPBC Share] Fallback init triggered');
                    setupOrchestrator();
                }
            }, 3000);
        }
    }

    /**
     * Setup orchestrator to enhance existing behavior
     */
    function setupOrchestrator() {
        // Find share card button
        buttonElement = document.getElementById('shareCardTrigger');

        if (!buttonElement) {
            console.log('[GPBC Share] Button not found - exiting silently');
            return;
        }

        console.log('[GPBC Share] Button found, enhancing with orchestrator');

        // Wrap existing click handler with loading state
        buttonElement.addEventListener('click', handlePreClick, { capture: true });

        // Add post-modal-open enhancement
        observeModalOpening();

        // Accessibility setup
        buttonElement.setAttribute('aria-live', 'polite');

        console.log('[GPBC Share] ✅ Orchestrator ready (cooperative mode)');
    }

    /**
     * Pre-click handler - adds instant feedback
     * Supports both quick share (default) and advanced modal (optional)
     */
    function handlePreClick(event) {
        // Prevent double-tap
        if (isGenerating) {
            event.preventDefault();
            event.stopPropagation();
            console.log('[GPBC Share] ⏸️ Generation in progress, ignoring click');
            return;
        }

        console.log('[GPBC Share] 🎬 Share card request initiated');

        // Lock button immediately
        isGenerating = true;

        // Apply instant loading state (<100ms)
        applyLoadingState();

        // ZERO FRICTION SHARE: Check if advanced mode requested
        const btn = event.target.closest('.share-card-trigger, #shareCardTrigger');
        const isAdvancedMode = btn?.dataset?.shareMode === 'advanced';
        
        if (btn) {
            console.log('[GPBC Share] 🔀 Routed from PreClick');
            
            const devotionData = window.__CURRENT_DEVOTION__;
            
            // PHASE 4: Check generator ready state before routing
            // PRODUCTION HOTFIX: Try ensureShareModalBindings before blocking
            if (window.__SHARE_GENERATOR_READY__ !== true && typeof window.ensureShareModalBindings === 'function') {
                window.ensureShareModalBindings();
            }
            
            if (window.__SHARE_GENERATOR_READY__ !== true) {
                console.warn('[Share Orchestrator] ⏸️ Generator not ready — aborting open request');
                removeLoadingState();
                isGenerating = false;
                return;
            }
            
            // ZERO FRICTION PATH: Auto-generate and share
            if (!isAdvancedMode) {
                console.log('[Share UX] Quick Share Triggered');
                const format = getSmartDefaultFormat();
                
                if (window.generateShareCardImage) {
                    window.generateShareCardImage({
                        format: format,
                        autoShare: true,
                        source: 'quick-share',
                        devotionData: devotionData
                    }).then(() => {
                        removeLoadingState();
                        isGenerating = false;
                    }).catch(err => {
                        console.error('[Share UX] Auto-share failed:', err);
                        removeLoadingState();
                        isGenerating = false;
                    });
                } else {
                    console.warn('[Share UX] Generator not available');
                    removeLoadingState();
                    isGenerating = false;
                }
                return;
            }
            
            // ADVANCED MODE: Open format selection modal
            console.log('[Share UX] Modal Fallback Used');
            if (window.generateShareCardImage) {
                window.generateShareCardImage(devotionData);
            } else {
                console.warn('[ShareCard] ⏳ Waiting for generator ready event...');
                
                window.addEventListener(
                    'GPBC_SHARE_GENERATOR_READY',
                    () => {
                        console.log('[ShareCard] ✅ Generator ready — executing');
                        if (window.__SHARE_GENERATOR_READY__ === true && window.generateShareCardImage) {
                            window.generateShareCardImage(devotionData);
                        }
                    },
                    { once: true }
                );
            }
        }

        // Auto-remove loading state after modal opens (or timeout)
        setTimeout(() => {
            removeLoadingState();
        }, 500);
    }

    /**
     * Apply instant loading state (YouVersion feel)
     */
    function applyLoadingState() {
        if (!buttonElement) return;

        // Visual feedback
        buttonElement.classList.add('is-generating');
        buttonElement.setAttribute('aria-busy', 'true');

        console.log('[GPBC Share] ⚡ Loading state applied');
    }

    /**
     * Remove loading state
     */
    function removeLoadingState() {
        if (!buttonElement) return;

        buttonElement.classList.remove('is-generating');
        buttonElement.setAttribute('aria-busy', 'false');

        isGenerating = false;

        console.log('[GPBC Share] ✅ Loading state removed');
    }

    /**
     * Observe modal opening to remove loading state immediately
     */
    function observeModalOpening() {
        const overlay = document.getElementById('shareCardOverlay');
        if (!overlay) return;

        // Watch for modal activation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (overlay.classList.contains('active')) {
                        console.log('[GPBC Share] 📱 Modal opened, removing loading state');
                        removeLoadingState();
                    }
                }
            });
        });

        observer.observe(overlay, { attributes: true });
    }

    /**
     * Show toast notification
     */
    function showToast(message) {
        // Check if existing toast system exists
        if (typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }

        // Create minimal toast
        const toast = document.createElement('div');
        toast.className = 'gpbc-share-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: gpbcToastFade 3s ease-out;
            pointer-events: none;
        `;

        // Add animation
        if (!document.getElementById('gpbc-toast-style')) {
            const style = document.createElement('style');
            style.id = 'gpbc-toast-style';
            style.textContent = `
                @keyframes gpbcToastFade {
                    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                    10% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    90% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);

        console.log('[GPBC Share] 🍞 Toast shown:', message);
    }

    /**
     * Safe initialization with proper timing
     */
    function safeInit() {
        // Wait for DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            // DOM already ready, init immediately
            init();
        }
    }

    // Start orchestrator
    safeInit();

    // Expose minimal API for debugging
    window.GPBCShareOrchestrator = {
        version: '1.0.0',
        isGenerating: () => isGenerating,
        reset: () => {
            isGenerating = false;
            removeLoadingState();
        }
    };

})();
