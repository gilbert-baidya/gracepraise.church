/**
 * GPBC Apostolic Digital Discipleship Engine — Safe Loader
 * 
 * RESPONSIBILITIES:
 * 1. Fail-Safe Protection: Wraps engine loading in try/catch
 * 2. Lazy Loading: Loads engines only after interaction or content render
 * 3. Performance Guardrails: Uses requestIdleCallback
 * 4. Ministry Safety: Enforces rules (no popups on load, etc.)
 * 5. Feature Flag: Checks window.GPBC_DISCIPLESHIP_ENABLED
 */

(function () {
    'use strict';

    // ============================================
    // 1. CONFIGURATION & STATE
    // ============================================

    // Feature Flag Kill Switch (Step 12)
    window.GPBC_DISCIPLESHIP_ENABLED = true;

    const CONFIG = {
        namespace: '[GPBC-Discipleship]',
        modules: [
            'spiritual-state-detector.js',
            'sacred-ai-personalization.js',
            'discipleship-journey-engine.js',
            'prayer-followup-engine.js',
            'testimony-generator-engine.js',
            'church-connection-layer.js',
            'share-card-generator.js' // Included for fail-safe loading
        ],
        maxRetries: 1,
        loadDelayDelay: 2000 // ms to wait after interaction before loading remaining engines
    };

    const STATE = {
        enginesLoaded: false,
        userInteracted: false,
        sessionPromptsShown: 0,
        maxPromptsPerSession: 1 // Ministry Safety Rule (Step 5)
    };

    // ============================================
    // 2. UTILITIES (Step 4 & 9)
    // ============================================

    function log(level, message, ...args) {
        // Convert errors to warnings (Step 9)
        const prefix = CONFIG.namespace;
        if (level === 'error') {
            console.warn(`${prefix} ⚠️ Handled Error: ${message}`, ...args);
        } else {
            console.log(`${prefix} ${message}`, ...args);
        }
    }

    // Global DOM Safety Utilities (Step 4)
    window.safeSetText = function (selector, text) {
        try {
            const el = document.querySelector(selector);
            if (el) {
                el.textContent = text;
                return true;
            } else {
                log('warn', `safeSetText: Element not found -> ${selector}`);
                return false;
            }
        } catch (e) {
            log('error', `safeSetText failed for ${selector}`, e);
            return false;
        }
    };

    window.safeSetHTML = function (selector, html) {
        try {
            const el = document.querySelector(selector);
            if (el) {
                el.innerHTML = html;
                return true;
            } else {
                log('warn', `safeSetHTML: Element not found -> ${selector}`);
                return false;
            }
        } catch (e) {
            log('error', `safeSetHTML failed for ${selector}`, e);
            return false;
        }
    };

    // Ministry Safety Check (Step 5)
    window.canTriggerDiscipleshipPrompt = function () {
        if (STATE.sessionPromptsShown >= STATE.maxPromptsPerSession) {
            log('info', 'Ministry Safety: Max prompts reached for session.');
            return false;
        }
        return true;
    };

    window.recordDiscipleshipPrompt = function () {
        STATE.sessionPromptsShown++;
    };

    // ============================================
    // 3. ENGINE LOADER (Step 1, 2, 3)
    // ============================================

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                log('info', `Loaded: ${src}`);
                resolve(src);
            };

            script.onerror = () => {
                log('error', `Failed to load: ${src}`);
                // Resolve anyway to not block other scripts
                resolve(null);
            };

            document.body.appendChild(script);
        });
    }

    async function loadAllEngines() {
        if (STATE.enginesLoaded) return;

        // Feature Flag Check (Step 12)
        if (!window.GPBC_DISCIPLESHIP_ENABLED) {
            log('warn', 'Discipleship Engine Disabled via Feature Flag');
            return;
        }

        STATE.enginesLoaded = true;
        log('info', '🚀 Initializing Apostolic Discipleship Engines...');

        // STEP 6 — ENGINE LOADER SAFETY: Wrap in requestAnimationFrame so render happens first
        requestAnimationFrame(() => {
            // Performance Guardrail: requestIdleCallback (Step 3)
            const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

            idleCallback(async () => {
                try {
                    // Load critical modules first or in parallel?
                    // Parallel is faster, but we wrap in try/catch block concept
                    const promises = CONFIG.modules.map(src => loadScript(src));
                    const results = await Promise.allSettled(promises);

                    log('info', '✅ All engines initialization sequence complete.');

                    // Check if share-card-generator.js loaded successfully
                    const shareGeneratorIndex = CONFIG.modules.indexOf('share-card-generator.js');
                    if (shareGeneratorIndex !== -1 && results[shareGeneratorIndex]?.value) {
                        // Set readiness flag
                        window.__SHARE_GENERATOR_READY__ = true;
                        // Dispatch share-specific readiness event
                        window.dispatchEvent(new CustomEvent('gpbc:share-generator-ready'));
                        log('info', '🎨 Share Card Generator ready');
                    }

                    // Trigger an event for other scripts to know engines are ready
                    window.dispatchEvent(new CustomEvent('gpbc-engines-ready'));

                } catch (e) {
                    log('error', 'Critical Loader Failure', e);
                }
            });
        });
    }

    // ============================================
    // 4. TRIGGERS (Step 2)
    // ============================================

    function onInteraction() {
        if (STATE.userInteracted) return;
        STATE.userInteracted = true;

        // Remove listeners
        ['click', 'scroll', 'touchstart', 'keydown'].forEach(evt =>
            window.removeEventListener(evt, onInteraction, { passive: true })
        );

        // Load engines
        loadAllEngines();
    }

    // Trigger 1: Interaction
    ['click', 'scroll', 'touchstart', 'keydown'].forEach(evt =>
        window.addEventListener(evt, onInteraction, { passive: true, once: true })
    );

    // Trigger 2: Content Ready (Custom Event from daily-devotion.html if needed)
    // Or just a timeout as fallback for "readiness"
    // Requirement says: "Devotion content fully rendered"
    // We can listen for the 'devotionsLoaded' event or check DOM

    function checkContentReady() {
        const content = document.getElementById('devotionContent');
        if (content && content.style.display !== 'none' && content.innerHTML.trim().length > 0) {
            // Content is visible, maybe wait a bit then load? 
            // Actually, user said: "Load only AFTER: Devotion content fully rendered OR user first interaction"
            // If content renders, we can trigger it.
            setTimeout(loadAllEngines, 3000); // 3s delay after content render to ensure high TTI
        } else {
            // Check again
            setTimeout(checkContentReady, 1000);
        }
    }

    // Start checking for content readiness
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkContentReady);
    } else {
        checkContentReady();
    }

    // ============================================
    // 5. SESSION STORAGE (Step 11)
    // ============================================
    // Enforce session storage usage for tracking
    try {
        if (!window.sessionStorage) {
            log('warn', 'SessionStorage not available. Modules may degrade gracefully.');
        }
    } catch (e) {
        log('error', 'SessionStorage blocked', e);
    }

})();
