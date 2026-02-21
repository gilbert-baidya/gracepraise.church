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
     * STEP 1 — DEVICE FORMAT AUTO SELECT
     * Get auto share format based on device type
     */
    function getAutoShareFormat() {
        const isMobile = window.innerWidth < 768;
        const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
        
        if (isMobile) {
            console.log('[Share UX] Auto Format: story (9:16 - mobile detected)');
            return 'story';
        }
        if (isTablet) {
            console.log('[Share UX] Auto Format: square (1:1 - tablet detected)');
            return 'square';
        }
        
        console.log('[Share UX] Auto Format: square (1:1 - desktop detected)');
        return 'square';
    }
    
    /**
     * Get smart default format based on device screen ratio (LEGACY - kept for compatibility)
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
    
    // ============================================================================
    // TRUE ONE-TAP SHARE PIPELINE
    // ============================================================================
    
    /**
     * STEP 5 — ONE TAP SHARE PIPELINE
     * Complete share flow without modal interaction
     */
    async function oneTapShare(devotionData) {
        console.log('[One-Tap Share] 🚀 Pipeline initiated');
        
        try {
            // Wait for generator ready
            await window.waitForShareGeneratorReady();
            console.log('[One-Tap Share] ✅ Generator ready');
            
            // Get optimal format for device
            const format = getAutoShareFormat();
            
            // Load devotion data first
            if (window.loadDevotion && typeof window.loadDevotion === 'function') {
                await window.loadDevotion(devotionData);
            }
            
            // Set format and render
            if (window.setShareFormat) {
                console.log('[One-Tap Share] 🎨 Rendering format:', format);
                await window.setShareFormat(format);
            }
            
            // Wait for render complete
            await window.waitForShareRenderComplete();
            console.log('[One-Tap Share] ✅ Render complete');
            
            // Execute share
            if (window.shareCard) {
                console.log('[One-Tap Share] 📤 Initiating share...');
                await window.shareCard();
            } else {
                // STEP 8 — FAIL SAFE: Fallback to download
                console.warn('[One-Tap Share] ⚠️ shareCard not available, falling back to download');
                if (window.downloadCard) {
                    window.downloadCard();
                }
            }
            
            console.log('[One-Tap Share] ✅ Pipeline complete');
            
        } catch (error) {
            console.error('[One-Tap Share] ❌ Pipeline failed:', error);
            
            // STEP 8 — FAIL SAFE: Try download on any error
            if (window.downloadCard) {
                console.log('[One-Tap Share] 🔄 Attempting download fallback');
                window.downloadCard();
            }
        }
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

        // ========================================================================
        // TRUE ONE-TAP SHARE ROUTING
        // ========================================================================
        const btn = event.target.closest('.share-card-trigger, #shareCardTrigger');
        const isAdvancedMode = btn?.dataset?.shareMode === 'advanced';
        
        if (btn) {
            const devotionData = window.CURRENT_DEVOTION_DATA ||
                window.__CURRENT_DEVOTION_DATA__ ||
                window.__CURRENT_DEVOTION__ ||
                window.currentDevotion;
            
            // Check generator ready state before routing
            if (window.__SHARE_GENERATOR_READY__ !== true && typeof window.ensureShareModalBindings === 'function') {
                window.ensureShareModalBindings();
            }
            
            if (window.__SHARE_GENERATOR_READY__ !== true) {
                console.warn('[Share Orchestrator] ⏸️ Generator not ready — aborting');
                removeLoadingState();
                isGenerating = false;
                return;
            }
            
            // STEP 7 — KEEP MODAL FOR POWER USERS
            // Advanced mode opens format selection modal
            if (isAdvancedMode) {
                console.log('[Share UX] 🎛️ Advanced Mode: Opening format selection modal');
                
                if (window.generateShareCardImage) {
                    window.generateShareCardImage(devotionData);
                } else {
                    console.warn('[Share UX] Generator not available');
                }
                
                setTimeout(() => removeLoadingState(), 500);
                return;
            }
            
            // STEP 6 — ORCHESTRATOR HOOK: Default to one-tap share
            console.log('[Share UX] ⚡ One-Tap Share: Initiating direct share flow');
            
            // Use TRUE ONE-TAP SHARE PIPELINE
            oneTapShare(devotionData).then(() => {
                removeLoadingState();
                isGenerating = false;
                console.log('[Share UX] ✅ One-tap share complete');
            }).catch(err => {
                console.error('[Share UX] ❌ One-tap share failed:', err);
                removeLoadingState();
                isGenerating = false;
            });
            
            return;
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
        const startAfterRender = () => {
            if (window.__DEVOTION_RENDER_COMPLETED__) {
                init();
                return;
            }
            document.addEventListener('DEVOTION_RENDER_COMPLETE', init, { once: true });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startAfterRender, { once: true });
        } else {
            startAfterRender();
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
