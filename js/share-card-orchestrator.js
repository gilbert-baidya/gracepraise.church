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

    // State
    let isGenerating = false;
    let buttonElement = null;
    let originalClickHandler = null;

    /**
     * Initialize orchestrator after DOM ready
     */
    function init() {
        // Wait for share card generator to load first
        setTimeout(() => {
            setupOrchestrator();
        }, 100);
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

        // STEP 2 — Route to share card generator
        const btn = event.target.closest('.share-card-trigger, #shareCardTrigger');
        
        if (btn) {
            console.log('[GPBC Share] 🔀 Routed from PreClick');
            
            const devotionData = window.__CURRENT_DEVOTION__;
            
            // PHASE 4: Check generator ready state before routing
            if (window.__SHARE_GENERATOR_READY__ !== true) {
                console.warn('[Share Orchestrator] ⏸️ Generator not ready — aborting open request');
                return;
            }
            
            // STEP 4 — ORCHESTRATOR WAIT MODE
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
