/**
 * Share Card Generator for Daily Devotion
 * Creates shareable PNG images of scripture verses
 * Supports Square (1:1) and Story (9:16) formats
 */

/**
 * Sacred Share Card Generator for Daily Devotion
 * "YouVersion-Quality" Engine with Time-Aware Backgrounds
 * Supports Square (1:1) and Story (9:16) formats
 */

(function () {
    'use strict';

    // Only run on Daily Devotion page
    if (!document.body.classList.contains('page-daily-devotion')) {
        return;
    }

    // ============================================================================
    // PRODUCTION HOTFIX — Init Flags for Always-Clickable Share Modal
    // ============================================================================
    window.__SHARE_GENERATOR_READY__ = false;
    window.__SHARE_BINDINGS_DONE__ = false;

    // ============================================================================
    // PRODUCTION HOTFIX — Safe Binding State Initialization
    // Prevents "Cannot read properties of undefined" runtime crashes
    // ============================================================================
    if (typeof window.__SHARE_BIND_STATE__ === 'undefined') {
        window.__SHARE_BIND_STATE__ = {
            boundEscClose: false,
            boundOverlayClose: false,
            boundModalButtons: false,
            bindAttemptCount: 0,
            lastBindAttemptTs: 0
        };
    }

    /**
     * Safe state accessor - guarantees state object exists
     * @returns {Object} Binding state object
     */
    function getBindState() {
        if (!window.__SHARE_BIND_STATE__) {
            window.__SHARE_BIND_STATE__ = {
                boundEscClose: false,
                boundOverlayClose: false,
                boundModalButtons: false,
                bindAttemptCount: 0,
                lastBindAttemptTs: 0
            };
        }
        return window.__SHARE_BIND_STATE__;
    }

    // GPBC WATERMARK SPEC VERSION
    const GPBC_WATERMARK_SPEC_VERSION = "GPBC-WM-V4";

    // ============================================================================
    // PRODUCTION FIX — Global Preloaded Image Promise (Single Source)
    // Guarantees logo ready before canvas render
    // ============================================================================
    window.__GPBC_LOGO_READY__ = new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            console.log('[GPBC Watermark] ✅ Logo loaded: images/new-gpbc-logo-final.svg');
            resolve(img);
        };
        img.onerror = () => {
            console.warn('[GPBC Watermark] ⚠️ Logo load failed — continuing without watermark');
            resolve(null);
        };
        img.src = "images/new-gpbc-logo-final.svg";
    });

    // ============================================================================
    // PRODUCTION HOTFIX — Legacy Watermark State Variables
    // Required for backward compatibility with old preload system
    // ============================================================================
    let watermarkLoadAttempted = false;
    let watermarkLogoImage = null;
    let watermarkLogoReady = false;
    let watermarkLogo = null;

    // Configuration
    const CONFIG = {
        formats: {
            square: { width: 1080, height: 1080, name: 'Square', padding: 80 },
            story: { width: 1080, height: 1920, name: 'Story', padding: 100 }
        },
        // Sacred Gold Tokens - Ultra Ministry Publishing
        brandGold: {
            primary: '#D4AF37',      // Primary Sacred Gold
            highlight: '#F2D16B',    // Highlight Gold
            shadow: 'rgba(212, 175, 55, 0.35)' // Shadow Gold (subtle premium)
        },
        // Sacred Palettes
        palettes: {
            morning: { // 5AM - 11AM: Warm Gold/Peach
                gradient: ['#fff7ed', '#fee2e2'], // Warm parchment/gold
                text: '#431407',
                reference: '#9a3412',
                accent: 'rgba(217, 119, 6, 0.15)', // Warm amber rays
                watermark: 'rgba(67, 20, 7, 0.05)'
            },
            day: { // 11AM - 5PM: Gentle Blue/White
                gradient: ['#f8fafc', '#e0f2fe'], // Sky soft
                text: '#0c4a6e',
                reference: '#0369a1',
                accent: 'rgba(56, 189, 248, 0.1)', // Light blue rays
                watermark: 'rgba(12, 74, 110, 0.05)'
            },
            evening: { // 5PM - 5AM: Deep Navy/Purple (Sacred)
                gradient: ['#0f172a', '#312e81'], // Deep night
                text: '#ffffff',
                reference: '#dda15e', // Gold reference
                accent: 'rgba(255, 255, 255, 0.05)', // Moon rays
                watermark: 'rgba(255, 255, 255, 0.03)'
            },
            sunday: { // Sunday special
                gradient: ['#fffbeb', '#fcd34d'], // Celebratory Gold
                text: '#451a03',
                reference: '#b45309',
                accent: 'rgba(251, 191, 36, 0.2)', // Gold rays
                watermark: 'rgba(69, 26, 3, 0.05)'
            }
        },
        fallback: { // Default Fallback
            gradient: ['#f5f5f4', '#e7e5e4'],
            text: '#1c1917',
            reference: '#57534e',
            accent: 'rgba(0,0,0,0.03)',
            watermark: 'rgba(0,0,0,0.03)'
        }
    };

    let currentFormat = '9:16'; // Ministry UX: Default to story format (social/SMS friendly)
    let canvas = null;
    let ctx = null;

    // ============================================================================
    // SINGLE-TAP MINISTRY SHARE UX — Render Ready State
    // ============================================================================
    window.__SHARE_RENDER_READY__ = false;

    // ============================================================================
    // SHARE RELIABILITY LOCK — Production Stability Layer
    // ============================================================================
    let __SHARE_ACTIVE__ = false;
    let __SHARE_LAST_FORMAT__ = null;

    // ============================================================================
    // TRUE ONE-TAP SHARE — Global Ready Promise System
    // ============================================================================
    
    /**
     * STEP 2 — GENERATOR READY PROMISE
     * Wait for share generator to be fully initialized
     */
    window.waitForShareGeneratorReady = function() {
        return new Promise(resolve => {
            if (window.__SHARE_GENERATOR_READY__ === true) {
                resolve();
                return;
            }
            
            window.addEventListener(
                'gpbc:share-generator-ready',
                () => resolve(),
                { once: true }
            );
        });
    };
    
    /**
     * STEP 4 — WAIT FOR RENDER HELPER
     * Wait for canvas render to complete with timeout safety
     */
    window.waitForShareRenderComplete = function() {
        return new Promise(resolve => {
            window.addEventListener(
                'gpbc:share-render-complete',
                () => resolve(),
                { once: true }
            );
            
            // Safety timeout: resolve after 1200ms regardless
            setTimeout(resolve, 1200);
        });
    };

    // ========================================
    // GPBC LOGO WATERMARK PRELOAD UTILITY
    // ========================================

    /**
     * Preload GPBC logo for watermark rendering
     * Single source with safe state management
     * Caches in memory for reuse
     */
    function preloadWatermarkLogo() {
        if (watermarkLoadAttempted) return;
        watermarkLoadAttempted = true;

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            console.log("[GPBC Watermark] ✅ Logo loaded:", img.src);
            watermarkLogoImage = img;
            watermarkLogo = img;
            watermarkLogoReady = true;
        };

        img.onerror = () => {
            console.warn("[GPBC Watermark] ⚠️ Failed to load:", img.src);
            watermarkLogoReady = false;
        };

        img.src = "images/new-gpbc-logo-final.svg";
    }

    /**
     * Render GPBC logo watermark on canvas
     * SPEC V4: Theme-adaptive, smart placement, fail-safe
     */
    function renderWatermarkLogo(ctx, canvas, format, theme) {
        if (!watermarkLogoReady || !watermarkLogo) {
            return; // Fail gracefully
        }

        const startTime = performance.now();

        // === SIZE SYSTEM (RELATIVE) ===
        const aspectRatio = canvas.width / canvas.height;
        const isSquare = Math.abs(aspectRatio - 1.0) < 0.1;
        
        let logoWidthRatio = isSquare ? 0.18 : 0.16;
        logoWidthRatio = Math.max(0.14, Math.min(0.22, logoWidthRatio));
        
        const logoWidth = canvas.width * logoWidthRatio;
        const logoHeight = logoWidth * (watermarkLogo.height / watermarkLogo.width);

        // === OPACITY SYSTEM (THEME ADAPTIVE) ===
        // Default: 0.06 with range 0.04 - 0.10
        const currentTheme = document.documentElement.dataset.theme || 'light';
        let baseOpacity = 0.06; // Production default
        
        // Theme-specific adjustments (subtle)
        if (currentTheme === 'dark') {
            baseOpacity = 0.055; // Slightly lower for dark backgrounds
        } else {
            baseOpacity = 0.065; // Slightly higher for light backgrounds
        }
        
        // Clamp to allowed range (0.04 - 0.10)
        baseOpacity = Math.max(0.04, Math.min(0.10, baseOpacity));

        // === SMART CONTRAST PROTECTION ===
        // Sample background brightness at center
        const sampleX = Math.floor(canvas.width / 2);
        const sampleY = Math.floor(canvas.height / 2);
        const sampleData = ctx.getImageData(sampleX, sampleY, 1, 1).data;
        const brightness = (sampleData[0] + sampleData[1] + sampleData[2]) / 3;
        const brightnessPercent = brightness / 255;

        let finalOpacity = baseOpacity;
        if (brightnessPercent > 0.7) {
            finalOpacity *= 0.85; // Reduce on bright backgrounds
        } else if (brightnessPercent < 0.3) {
            finalOpacity *= 1.1; // Increase on dark backgrounds
            finalOpacity = Math.min(finalOpacity, currentTheme === 'dark' ? 0.065 : 0.08);
        }

        // === PLACEMENT SYSTEM ===
        // Default: CENTER GHOST MARK
        let drawX = canvas.width / 2;
        let drawY = canvas.height / 2;
        let placement = 'center';

        // Check if verse text would overlap (simple heuristic)
        // If center area is likely text-heavy, move to lower-right
        const centerAreaBusy = brightnessPercent > 0.4 && brightnessPercent < 0.6;
        
        if (centerAreaBusy) {
            drawX = canvas.width * 0.82;
            drawY = canvas.height * 0.86;
            placement = 'lower-right';
        }

        // === RENDER WITH BLEND MODE ===
        ctx.save();
        ctx.globalAlpha = finalOpacity;
        
        // Blend mode: soft-light (with multiply fallback)
        try {
            ctx.globalCompositeOperation = 'soft-light';
        } catch (e) {
            // Fallback to multiply if soft-light not supported
            ctx.globalCompositeOperation = 'multiply';
        }
        
        // Draw centered on position
        ctx.drawImage(
            watermarkLogo,
            drawX - (logoWidth / 2),
            drawY - (logoHeight / 2),
            logoWidth,
            logoHeight
        );
        
        ctx.restore();

        // === DEBUG TELEMETRY ===
        const renderTime = performance.now() - startTime;
        window.__GPBC_WATERMARK_DEBUG__ = {
            version: GPBC_WATERMARK_SPEC_VERSION,
            logoLoaded: watermarkLogoReady,
            lastOpacity: finalOpacity,
            lastPlacement: placement,
            lastRenderTime: renderTime
        };
    }

    /**
     * ============================================================================
     * PRODUCTION HOTFIX — ensureShareModalBindings
     * Binds modal controls DIRECTLY and idempotently (independent of init guards)
     * ============================================================================
     */
    function ensureShareModalBindings() {
        // Safe state tracking
        const bindState = getBindState();
        bindState.bindAttemptCount++;
        bindState.lastBindAttemptTs = Date.now();

        if (window.__SHARE_BINDINGS_DONE__ === true) {
            console.log('[Share Card] Bindings already done — skipping');
            return true;
        }

        const modal = document.getElementById('shareCardModal');
        const overlay = document.getElementById('shareCardOverlay');
        const closeBtn = document.getElementById('shareCardClose');
        const downloadBtn = document.getElementById('downloadCardBtn');
        const shareBtn = document.getElementById('shareCardBtn');
        const copyBtn = document.getElementById('copyCaptionBtn');
        const formatBtns = document.querySelectorAll('.format-btn');

        if (!modal || !overlay || !closeBtn || !downloadBtn || !shareBtn || !copyBtn || !formatBtns.length) {
            console.warn('[Share Card] ensureShareModalBindings: missing DOM nodes', {
                modal: !!modal,
                overlay: !!overlay,
                closeBtn: !!closeBtn,
                downloadBtn: !!downloadBtn,
                shareBtn: !!shareBtn,
                copyBtn: !!copyBtn,
                formatBtns: formatBtns.length
            });
            return false;
        }

        // IMPORTANT: bind handlers ONLY ONCE (no duplicates)
        // Use dataset markers to prevent double-binding
        // PRODUCTION SAFE: Never crashes on missing state
        const once = (el, key, fn, evt = 'click') => {
            if (!el) return;
            
            try {
                // Safe state access - never throw
                const bindState = getBindState();
                
                // Check if already bound via dataset
                if (el.dataset && el.dataset[key] === '1') {
                    return;
                }
                
                // Bind event listener
                el.addEventListener(evt, fn);
                
                // Mark as bound via dataset
                if (el.dataset) {
                    el.dataset[key] = '1';
                }
                
                // Update state tracker (telemetry only, not critical)
                if (bindState && typeof bindState[key] !== 'undefined') {
                    bindState[key] = true;
                }
            } catch (err) {
                // Telemetry-safe logging - never crash generator
                console.warn(`[Share Card] Bind warning for key "${key}":`, err.message);
                // Still attempt bind even if state tracking fails
                try {
                    if (el && el.addEventListener) {
                        el.addEventListener(evt, fn);
                    }
                } catch (bindErr) {
                    console.warn('[Share Card] Bind fallback failed:', bindErr.message);
                }
            }
        };

        // Close handlers
        once(closeBtn, 'boundClose', () => closeModal());
        once(overlay, 'boundOverlayClose', (e) => {
            // click outside modal content closes
            if (e.target === overlay) closeModal();
        });

        // ESC key close
        once(document, 'boundEscClose', (e) => {
            if (e.key === 'Escape') {
                const overlayEl = document.getElementById('shareCardOverlay');
                if (overlayEl && overlayEl.classList.contains('active')) {
                    closeModal();
                }
            }
        }, 'keydown');

        // Format buttons
        formatBtns.forEach(btn => {
            once(btn, 'boundFormat', () => {
                const fmt = btn.dataset.format;
                if (!fmt) return;
                // Call existing setFormat function
                if (typeof setFormat === 'function') {
                    setFormat(fmt);
                } else {
                    formatBtns.forEach(b => b.classList.toggle('active', b === btn));
                    currentFormat = fmt;
                    renderCardToCanvas(fmt);
                }
            });
        });

        // Download
        once(downloadBtn, 'boundDownload', async () => {
            if (typeof downloadCard === 'function') return downloadCard();
        });

        // Share
        once(shareBtn, 'boundShare', async () => {
            if (typeof shareCard === 'function') return shareCard();
        });

        // Copy caption
        once(copyBtn, 'boundCopy', async () => {
            if (typeof copyCaptionToClipboard === 'function') return copyCaptionToClipboard();
        });

        // Bind secondary copy triggers
        document.querySelectorAll('[data-copy-trigger]').forEach(btn => {
            once(btn, 'boundCopySecondary', () => {
                if (typeof copyCaptionToClipboard === 'function') copyCaptionToClipboard();
            });
        });

        // Bind secondary share triggers
        document.querySelectorAll('[data-share-trigger]').forEach(btn => {
            once(btn, 'boundShareSecondary', () => openModal());
        });

        window.__SHARE_BINDINGS_DONE__ = true;
        window.__SHARE_GENERATOR_READY__ = true;
        console.log('[Share Card] ✅ READY — Modal controls bound via ensureShareModalBindings');
        return true;
    }

    /**
     * Initialize the share card generator
     */
    function initShareCardGenerator() {
        console.log('[Share Card] 🔧 Initializing generator...');
        
        const shareRoot = document.querySelector("[data-share-card-root]");
        if (!shareRoot) {
            console.error('[Share Card] ❌ INIT FAILED: [data-share-card-root] not found');
            return false;
        }

        const triggerBtn = document.getElementById('shareCardTrigger');
        const modal = document.getElementById('shareCardModal');
        const overlay = document.getElementById('shareCardOverlay');
        const closeBtn = document.getElementById('shareCardClose');

        // Detailed diagnostic logging
        console.log('[Share Card] Element check:', {
            shareRoot: !!shareRoot,
            triggerBtn: !!triggerBtn,
            modal: !!modal,
            overlay: !!overlay,
            closeBtn: !!closeBtn
        });

        if (!triggerBtn) {
            console.error('[Share Card] ❌ INIT FAILED: #shareCardTrigger not found');
            return false;
        }
        if (!modal) {
            console.error('[Share Card] ❌ INIT FAILED: #shareCardModal not found');
            return false;
        }
        if (!overlay) {
            console.error('[Share Card] ❌ INIT FAILED: #shareCardOverlay not found');
            return false;
        }

        // PHASE 2: Reset ready flag at init start
        window.__SHARE_GENERATOR_READY__ = false;

        // Open modal - primary trigger
        triggerBtn.addEventListener('click', openModal);

        // Bind secondary triggers (data-attribute based)
        document.querySelectorAll('[data-share-trigger]').forEach(btn => {
            btn.addEventListener('click', openModal);
        });

        // Close modal
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Format toggle
        const formatBtns = document.querySelectorAll('.format-btn');
        formatBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                setFormat(format);
            });
        });

        // Action buttons
        document.getElementById('downloadCardBtn')?.addEventListener('click', downloadCard);
        document.getElementById('shareCardBtn')?.addEventListener('click', shareCard);
        document.getElementById('copyCaptionBtn')?.addEventListener('click', copyCaptionToClipboard);

        // Bind secondary copy triggers
        document.querySelectorAll('[data-copy-trigger]').forEach(btn => {
            btn.addEventListener('click', copyCaptionToClipboard);
        });

        // PHASE 2: Mark generator as ready after all listeners bound
        window.__SHARE_GENERATOR_READY__ = true;
        console.log('[Share Card] ✅ INIT COMPLETE — Controls Bound');

        // ESC key logic
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                closeModal();
            }
        });

        return true; // Init successful

        // Invite Copy Buttons
        const inviteTemplates = {
            whatsapp: "Hi! I'd love to invite you to church this Sunday at 5:00 PM. We meet at Grace and Praise Bangladeshi Church. It would be great to see you there! ⛪",
            facebook: "Join us for worship this Sunday at 5:00 PM at Grace and Praise Bangladeshi Church! Everyone is welcome. #GPBC #SundayService",
            sms: "Hey, come to church with me this Sunday at 5:00 PM! Grace and Praise Bangladeshi Church. Let me know if you can make it!"
        };

        const copyInvite = async (type) => {
            const text = inviteTemplates[type];
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                showToast(`✓ ${type.charAt(0).toUpperCase() + type.slice(1)} invite copied!`);
            } catch (err) {
                console.error('Failed to copy:', err);
                showToast('⚠️ Failed to copy invite');
            }
        };

        document.getElementById('inviteWhatsAppBtn')?.addEventListener('click', () => copyInvite('whatsapp'));
        document.getElementById('inviteFacebookBtn')?.addEventListener('click', () => copyInvite('facebook'));
        document.getElementById('inviteSmsBtn')?.addEventListener('click', () => copyInvite('sms'));
    }

    // --- Core Logic ---

    function getSacredTheme() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sunday

        if (day === 0) return CONFIG.palettes.sunday; // Sunday Special
        if (hour >= 5 && hour < 11) return CONFIG.palettes.morning;
        if (hour >= 11 && hour < 17) return CONFIG.palettes.day;
        return CONFIG.palettes.evening;
    }

    async function openModal(logoImg = null) {
        console.log('[Share UX] Opening modal → default 9:16');
        
        const overlay = document.getElementById('shareCardOverlay');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Ministry UX: Default to 9:16 and auto-render
        window.__SHARE_RENDER_READY__ = false;
        disableActionButtons();
        showLoadingState();
        
        // Set format to story (9:16)
        currentFormat = '9:16';
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === '9:16');
        });
        
        // Wait for logo and render
        const logo = logoImg || await window.__GPBC_LOGO_READY__;
        console.log('[Share UX] Rendering started');
        await renderCardToCanvas('9:16', logo);
        
        // Enable buttons after render complete
        window.__SHARE_RENDER_READY__ = true;
        enableActionButtons();
        hideLoadingState();
        console.log('[Share UX] Rendering complete → Ready');
    }

    function closeModal() {
        const overlay = document.getElementById('shareCardOverlay');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    async function setFormat(format) {
        console.log('[Share UX] Format switch requested:', format);
        
        // Disable buttons and set render state to false
        window.__SHARE_RENDER_READY__ = false;
        disableActionButtons();
        showLoadingState();
        
        currentFormat = format;
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === format);
        });
        
        // Wait for logo before re-rendering
        const logoImg = await window.__GPBC_LOGO_READY__;
        await renderCardToCanvas(format, logoImg);
        
        // Re-enable buttons after render
        window.__SHARE_RENDER_READY__ = true;
        enableActionButtons();
        hideLoadingState();
        console.log('[Share UX] Format switch complete → Ready');
    }

    function getVerseData() {
        const verseElement = document.querySelector('[data-devotion-scripture]') || document.getElementById('bibleText');
        const referenceElement = document.getElementById('bibleReference');

        const verse = verseElement?.textContent?.trim() || 'Loading verse...';
        const reference = referenceElement?.textContent?.trim() || '';

        const date = new Date();
        const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        return { verse, reference, date: dateStr };
    }

    function wrapText(context, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (let word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }

    // --- Sacred Rendering Engine ---

    /**
     * STEP 1 — Generate Share Card (Global API)
     * Called by orchestrator or direct invocation
     * Supports ZERO FRICTION SHARE with auto-share mode
     */
    async function generateShareCardImage(devotionDataOrOptions) {
        // ========================================================================
        // STEP 2 — HARD LOCK GENERATION ENTRY
        // ========================================================================
        if (__SHARE_ACTIVE__) {
            console.warn('[Share Lock] Share already active — ignoring duplicate trigger');
            return;
        }
        
        __SHARE_ACTIVE__ = true;
        window.__SHARE_RENDER_READY__ = false;
        
        // Emit telemetry
        window.dispatchEvent(new CustomEvent('gpbc:share-start'));
        
        // ========================================================================
        // STEP 4 — TIMEOUT RECOVERY (4 second safety unlock)
        // ========================================================================
        const timeoutId = setTimeout(() => {
            if (!window.__SHARE_RENDER_READY__) {
                console.warn('[Share Lock] Render timeout → emergency unlock');
                __SHARE_ACTIVE__ = false;
                window.dispatchEvent(new CustomEvent('gpbc:share-error', {
                    detail: { reason: 'render-timeout' }
                }));
            }
        }, 4000);
        
        // Support both legacy (devotionData) and new (options object) calls
        let devotionData, format, autoShare, source;
        
        if (devotionDataOrOptions && typeof devotionDataOrOptions === 'object') {
            if (devotionDataOrOptions.format || devotionDataOrOptions.autoShare) {
                // New options object format
                ({ devotionData, format = '1:1', autoShare = false, source = 'manual' } = devotionDataOrOptions);
            } else {
                // Legacy devotionData object
                devotionData = devotionDataOrOptions;
                format = '1:1';
                autoShare = false;
                source = 'legacy';
            }
        }
        
        // PRODUCTION HOTFIX: Try direct binding before blocking
        if (window.__SHARE_GENERATOR_READY__ !== true) {
            console.warn('[Share Card] 🔄 Generator not ready — attempting ensureShareModalBindings');
            ensureShareModalBindings();
        }

        // PHASE 3: Safe open gate - block if generator still not ready after binding attempt
        if (window.__SHARE_GENERATOR_READY__ !== true) {
            console.error('[Share Card] ❌ BLOCKED: Generator not initialized. Modal open prevented.');
            clearTimeout(timeoutId);
            __SHARE_ACTIVE__ = false;
            return false;
        }

        // PRODUCTION FIX: Wait for logo to be ready before rendering
        console.log('[Share Card] ⏳ Waiting for logo...');
        const logoImg = await window.__GPBC_LOGO_READY__;
        if (logoImg) {
            console.log('[Share Card] ✅ Logo ready, rendering card...');
        } else {
            console.log('[Share Card] ⚠️ No logo available, rendering without watermark...');
        }

        // PHASE 5: Debug telemetry
        console.log('[Share Card] 🎬 Trigger Request — Ready State:', window.__SHARE_GENERATOR_READY__);
        console.log('[ShareCard] 🎨 Generating share card...', { format, autoShare, source });
        
        try {
            // ZERO FRICTION SHARE: Auto-share path
            if (autoShare) {
                console.log('[Share UX] Format Auto Selected:', format);
                
                // Set format without opening modal
                await setFormat(format);
                
                // Wait for render stability
                await waitForRenderStable();
                
                window.__SHARE_RENDER_READY__ = true;
                __SHARE_LAST_FORMAT__ = format;
                clearTimeout(timeoutId);
                
                // Emit ready telemetry
                window.dispatchEvent(new CustomEvent('gpbc:share-ready', {
                    detail: { format, autoShare }
                }));
                
                // Execute auto-share
                console.log('[Share UX] Auto Share Path Executed');
                await safeAutoShare();
                
                return true;
            }
            
            // Standard modal path
            await setFormat(format);
            await waitForRenderStable();
            
            window.__SHARE_RENDER_READY__ = true;
            __SHARE_LAST_FORMAT__ = format;
            clearTimeout(timeoutId);
            
            window.dispatchEvent(new CustomEvent('gpbc:share-ready', {
                detail: { format, autoShare: false }
            }));
            
            openModal(logoImg);
            
            return true;
            
        } catch (error) {
            console.error('[Share Lock] Generation error:', error);
            clearTimeout(timeoutId);
            window.dispatchEvent(new CustomEvent('gpbc:share-error', {
                detail: { error: error.message }
            }));
            fallbackDownload();
        } finally {
            __SHARE_ACTIVE__ = false;
        }
    }

    // STEP 1 — FORCE GLOBAL EXPORT
    if (typeof window !== "undefined") {

       window.generateShareCardImage = generateShareCardImage;
       window.ensureShareModalBindings = ensureShareModalBindings;
       
       // TRUE ONE-TAP SHARE — Export core functions
       window.setShareFormat = setFormat;
       window.shareCard = shareCard;

       window.__GPBC_SHARE_GENERATOR_READY__ = true;

       console.log("[GPBC Share] ✅ Generator attached to window");

       // Initialize watermark logo preload
       preloadWatermarkLogo();

       window.dispatchEvent(
          new CustomEvent("GPBC_SHARE_GENERATOR_READY")
       );
       
       // TRUE ONE-TAP SHARE — Emit standardized ready event
       window.dispatchEvent(
          new CustomEvent("gpbc:share-generator-ready")
       );

       console.log("[GPBC Share] 🚀 READY EVENT FIRED");

    }

    async function renderCardToCanvas(format, logoImg = null) {
        const config = CONFIG.formats[format];
        const theme = getSacredTheme();
        const data = getVerseData();

        const previewContainer = document.getElementById('shareCardPreview');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'shareCardCanvas';
            canvas.className = 'share-card-canvas';
        }

        // Set High-DPI Dimensions
        canvas.width = config.width;
        canvas.height = config.height;
        ctx = canvas.getContext('2d');

        // 1. Background (Gradient)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height); // Top to Bottom
        gradient.addColorStop(0, theme.gradient[0]);
        gradient.addColorStop(1, theme.gradient[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Sacred Light Rays (Radial Gradient from Top Center)
        const rayGradient = ctx.createRadialGradient(
            canvas.width / 2, 0, 0,
            canvas.width / 2, canvas.height / 2, canvas.height
        );
        rayGradient.addColorStop(0, theme.accent);
        rayGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rayGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Watermark removed from center - signature placed after text render

        // 4. Legacy Text Watermark (Deprecated - DISABLED in favor of logo)
        // ctx.save();
        // ctx.translate(canvas.width / 2, canvas.height / 2);
        // ctx.rotate(-Math.PI / 12); // -15 deg rotate
        // ctx.font = 'bold 200px serif';
        // ctx.fillStyle = theme.watermark;
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'middle';
        // ctx.fillText('GPBC', 0, 0);
        // ctx.restore();

        // 5. Content Logic
        const padding = config.padding;
        const availableWidth = canvas.width - (padding * 2);
        const centerY = canvas.height / 2;

        // Verse Text (Hero)
        ctx.fillStyle = theme.text;
        // Adaptive font size based on length
        const fontSize = data.verse.length > 200 ? 56 : (data.verse.length > 100 ? 64 : 72);
        ctx.font = `bold ${fontSize}px Georgia, serif`; // Sacred Serif
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = wrapText(ctx, data.verse, availableWidth);
        const lineHeight = fontSize * 1.4;
        const totalTextHeight = lines.length * lineHeight;

        let startY = centerY - (totalTextHeight / 2) - 40; // Shift up slightly for balance

        // Draw Quotes (Subtle)
        ctx.font = '120px Georgia, serif';
        ctx.globalAlpha = 0.2;
        ctx.fillText('“', canvas.width / 2, startY - 40);
        ctx.globalAlpha = 1;

        // Draw Lines
        ctx.font = `bold ${fontSize}px Georgia, serif`;
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
        });

        // 6. Reference (Bottom of text)
        const refY = startY + totalTextHeight + 60;
        ctx.fillStyle = theme.reference;
        ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`— ${data.reference} —`, canvas.width / 2, refY);
        
        const contentBottomY = refY + 36; // Track content boundary

        // 7. Footer removed - signature handles branding

        // ============================================================================
        // 8. MINISTRY SIGNATURE POLISH LAYER
        // Domain-First Identity: Larger Logo + Glowing Presence
        // SMS Preview Safe + Light/Dark Adaptive
        // ============================================================================
        
        const logoSource = watermarkLogoImage || logoImg;
        
        if (logoSource) {
            console.log('[Share Brand] Rendering Ministry Signature (Polished)');
            
            ctx.save();
            
            // ========================================================================
            // STEP 1 — FORMAT AWARE LOGO SIZE (Larger & Brighter)
            // ========================================================================
            const isStory = canvas.height > canvas.width;
            
            const logoSize = isStory
                ? canvas.width * 0.16   // 16% for story format
                : canvas.width * 0.13;  // 13% for square format
            
            console.log('[Share Brand] Logo size:', logoSize, '| Format:', isStory ? '9:16' : '1:1');
            
            // ========================================================================
            // STEP 3 — SMS SAFE POSITIONING
            // ========================================================================
            const brandY = isStory
                ? canvas.height * 0.80  // Story: 80% down
                : canvas.height - (canvas.width * 0.09); // Square: 9% from bottom
            
            // Safety check - never overlap content
            const safetyMargin = 60;
            const finalBrandY = Math.max(brandY, contentBottomY + safetyMargin);
            
            // ========================================================================
            // DETECT DARK MODE (from background theme)
            // ========================================================================
            const isDarkMode = theme.name === 'night' || theme.name === 'twilight';
            
            // ========================================================================
            // STEP 8 — LIGHT/DARK MICRO POLISH (Dark mode radial vignette)
            // ========================================================================
            if (isDarkMode) {
                const gradient = ctx.createRadialGradient(
                    canvas.width / 2,
                    finalBrandY,
                    0,
                    canvas.width / 2,
                    finalBrandY,
                    canvas.width
                );
                
                gradient.addColorStop(0, 'rgba(201,162,79,0.05)');
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, finalBrandY - 60, canvas.width, 140);
            }
            
            // ========================================================================
            // STEP 5 — GOLD DIVIDER LINE (Liturgical Touch)
            // ========================================================================
            const dividerY = finalBrandY - 40;
            const dividerWidth = canvas.width * 0.25;
            const dividerX = (canvas.width - dividerWidth) / 2;
            
            ctx.strokeStyle = isDarkMode
                ? 'rgba(201,162,79,0.7)'
                : 'rgba(180,150,60,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dividerX, dividerY);
            ctx.lineTo(dividerX + dividerWidth, dividerY);
            ctx.stroke();
            
            // ========================================================================
            // STEP 2 — SMART BRIGHTNESS BOOST (Adaptive Glow)
            // ========================================================================
            ctx.save();
            
            if (isDarkMode) {
                ctx.shadowColor = 'rgba(201,162,79,0.45)';
                ctx.shadowBlur = 18;
            } else {
                ctx.shadowColor = 'rgba(0,0,0,0.18)';
                ctx.shadowBlur = 10;
            }
            
            // ========================================================================
            // STEP 6 — DRAW ORDER: Logo (left aligned)
            // ========================================================================
            const centerX = canvas.width / 2;
            const logoX = centerX - (logoSize * 1.2);
            const logoY = finalBrandY - (logoSize / 2);
            
            ctx.globalAlpha = 0.98;
            ctx.drawImage(
                logoSource,
                logoX,
                logoY,
                logoSize,
                logoSize
            );
            
            ctx.restore();
            
            console.log('[Share Brand] Logo rendered with glow');
            
            // ========================================================================
            // STEP 4 — DOMAIN FIRST SIGNATURE (No church name text)
            // ========================================================================
            const domainText = "www.gracepraise.church";
            
            ctx.font = isStory
                ? `${canvas.width * 0.038}px Inter, system-ui, -apple-system, sans-serif`
                : `${canvas.width * 0.032}px Inter, system-ui, -apple-system, sans-serif`;
            
            ctx.fillStyle = isDarkMode
                ? 'rgba(240,225,185,0.92)'
                : 'rgba(40,40,40,0.85)';
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Position text to right of logo centerline
            const textX = centerX + (logoSize * 0.3);
            
            // ========================================================================
            // STEP 6 — DRAW ORDER: Domain text (right aligned to logo)
            // ========================================================================
            
            // Subtle shadow for depth
            ctx.shadowColor = isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 1;
            
            ctx.fillText(domainText, textX, finalBrandY);
            
            ctx.restore();
            
            console.log('[Share Brand] ✅ Ministry Signature Polish Complete');
            console.log('[Share Brand] Dark mode:', isDarkMode, '| Logo size:', logoSize);
        }

        // ========================================================================
        // STEP 3 — CANVAS RENDER COMPLETE SIGNAL
        // ========================================================================
        window.__LAST_SHARE_RENDER__ = Date.now();
        window.dispatchEvent(new CustomEvent('gpbc:share-render-complete'));
        console.log('[Share Render] ✅ Render complete signal emitted');

        // Preview Render - Update DOM
        const previewContainer = document.getElementById('shareCardPreview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.appendChild(canvas);
        }

        // Remove loading state if present
        const loading = document.querySelector('.preview-loading');
        if (loading) loading.remove();
        
        // Return promise for async/await support
        return Promise.resolve();
    }

    // --- Action Handlers ---

    // ============================================================================
    // ZERO FRICTION SHARE — Render Stability & Auto-Share Engine
    // ============================================================================
    
    /**
     * Wait for render stability before auto-sharing
     * Ensures canvas is fully painted and ready
     */
    async function waitForRenderStable() {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 60);
            });
        });
    }
    
    /**
     * Safe auto-share engine with native share API and fallback
     * Tries native share first, falls back to download if unavailable
     */
    // ========================================================================
    // STEP 5 — SAFE AUTO SHARE (UPGRADED WITH RELIABILITY LOCK)
    // ========================================================================
    async function safeAutoShare() {
        if (!window.__SHARE_RENDER_READY__) {
            console.warn('[Share Lock] Attempted share before ready');
            showToast('⏳ Share card still preparing...');
            return;
        }
        
        if (!canvas) {
            console.error('[Share UX] Canvas not ready for auto-share');
            showToast('⚠️ Unable to generate share card');
            return;
        }
        
        try {
            // STEP 5A — OFFLINE DETECTION
            if (!navigator.onLine) {
                console.warn('[Share Lock] Offline detected → immediate download fallback');
                fallbackDownload();
                window.dispatchEvent(new CustomEvent('gpbc:share-fallback', {
                    detail: { reason: 'offline' }
                }));
                return;
            }
            
            // STEP 6 — SAFE CANVAS EXPORT
            const { file, shareData } = await canvasToBlobSafe();
            
            // Try native share API first
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share(shareData);
                console.log('[Share UX] Native share completed');
                showToast('✓ Shared successfully!');
                window.dispatchEvent(new CustomEvent('gpbc:share-success', {
                    detail: { method: 'native-api' }
                }));
                return;
            }
            
            // Fallback to download if share API not available
            console.log('[Share Lock] Share API unavailable → download fallback');
            fallbackDownload();
            
        } catch (error) {
            // User canceled or error occurred
            if (error.name === 'AbortError') {
                console.log('[Share UX] User canceled share');
                showToast('Share canceled');
                return;
            }
            
            console.warn('[Share Lock] Native share failed → fallback');
            fallbackDownload();
        }
    }
    
    // ========================================================================
    // STEP 6 — SAFE CANVAS EXPORT
    // ========================================================================
    async function canvasToBlobSafe() {
        return new Promise(resolve => {
            canvas.toBlob(blob => {
                const file = new File([blob], 'gpbc-devotion.png', {
                    type: 'image/png'
                });
                
                resolve({
                    file,
                    shareData: {
                        files: [file],
                        title: 'Daily Devotion',
                        text: 'Grace & Praise Bangladeshi Church'
                    }
                });
            }, 'image/png', 1.0);
        });
    }
    
    // ========================================================================
    // STEP 7 — FALLBACK DOWNLOAD (NEVER FAIL PATH)
    // ========================================================================
    function fallbackDownload() {
        console.warn('[Share Lock] Using download fallback');
        try {
            downloadCurrentCanvas();
            showToast('✓ Image downloaded! Ready to share manually.');
            window.dispatchEvent(new CustomEvent('gpbc:share-fallback', {
                detail: { reason: 'no-share-api' }
            }));
        } catch (error) {
            console.error('[Share Lock] Download fallback failed:', error);
            showToast('❌ Unable to download. Please try again.');
            window.dispatchEvent(new CustomEvent('gpbc:share-error', {
                detail: { error: error.message, stage: 'download-fallback' }
            }));
        }
    }
    
    function downloadCurrentCanvas() {
        const date = new Date().toISOString().split('T')[0];
        const filename = `GPBC-Devotion-${date}-${__SHARE_LAST_FORMAT__ || currentFormat}.png`;
        const url = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    /**
     * Download blob as file (legacy compatibility)
     */
    function downloadBlob(blob) {
        const date = new Date().toISOString().split('T')[0];
        const filename = `GPBC-Devotion-${date}-${currentFormat}.png`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // ============================================================================
    // SINGLE-TAP MINISTRY SHARE UX — Button & Loading State Control
    // ============================================================================
    
    function disableActionButtons() {
        const shareBtn = document.getElementById('shareCardBtn');
        const downloadBtn = document.getElementById('downloadCardBtn');
        
        if (shareBtn) {
            shareBtn.disabled = true;
            shareBtn.style.opacity = '0.6';
            shareBtn.style.cursor = 'not-allowed';
        }
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.style.opacity = '0.6';
            downloadBtn.style.cursor = 'not-allowed';
        }
    }
    
    function enableActionButtons() {
        const shareBtn = document.getElementById('shareCardBtn');
        const downloadBtn = document.getElementById('downloadCardBtn');
        
        if (shareBtn) {
            shareBtn.disabled = false;
            shareBtn.style.opacity = '1';
            shareBtn.style.cursor = 'pointer';
        }
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
            downloadBtn.style.cursor = 'pointer';
        }
    }
    
    function showLoadingState() {
        let loadingEl = document.getElementById('shareCardLoadingState');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'shareCardLoadingState';
            loadingEl.style.cssText = `
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 14px;
                font-weight: 500;
            `;
            loadingEl.textContent = 'Preparing your share card…';
            
            const preview = document.getElementById('shareCardPreview');
            if (preview && preview.parentNode) {
                preview.parentNode.insertBefore(loadingEl, preview);
            }
        }
        loadingEl.style.display = 'block';
    }
    
    function hideLoadingState() {
        const loadingEl = document.getElementById('shareCardLoadingState');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    function getFormattedCaption() {
        const data = getVerseData();
        return `✨ Daily Devotion\n\n"${data.verse}"\n\n— ${data.reference} —\n\n🙏 Reflection at:\nhttps://gracepraise.church/daily-devotion\n\n#DailyDevotion #Faith #Jesus #Bible #GPBC`;
    }

    function downloadCard() {
        // ========================================================================
        // STEP 3 — ACTION BUTTON GUARD
        // ========================================================================
        if (!window.__SHARE_RENDER_READY__) {
            console.warn('[Share Lock] Download attempted before ready');
            showToast('⏳ Please wait for preview to finish rendering...');
            return;
        }
        
        console.log('[Share UX] Download invoked');
        if (!canvas) return;
        const formatName = currentFormat;
        const date = new Date().toISOString().split('T')[0];
        const filename = `GPBC-Devotion-${date}-${formatName}.png`;

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('✓ Image downloaded successfully!');
        }, 'image/png');
    }

    async function shareCard() {
        // Ministry UX: Prevent early share
        if (!window.__SHARE_RENDER_READY__) {
            console.warn('[Share UX] Render not ready yet');
            showToast('⏳ Please wait for preview to finish rendering...');
            return;
        }
        
        console.log('[Share UX] Share invoked');
        if (!canvas) return;
        const caption = getFormattedCaption();

        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], 'devotion.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Daily Devotion',
                    text: caption,
                    files: [file]
                });
                showToast('✓ Shared successfully!');
            } else {
                await copyCaptionToClipboard();
                showToast('⚠️ Share API not available. Caption copied! Please download image.');
            }
        } catch (error) {
            console.error('Share failed:', error);
            if (error.name !== 'AbortError') showToast('⚠️ Share failed. Try downloading.');
        }
    }

    async function copyCaptionToClipboard() {
        const caption = getFormattedCaption();
        try {
            await navigator.clipboard.writeText(caption);
            showToast('✓ Caption copied to clipboard!');
        } catch (error) {
            showToast('⚠️ Failed to copy caption');
        }
    }

    function showToast(message) {
        const toast = document.getElementById('shareToast');
        const toastMessage = document.getElementById('shareToastMessage');
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    // ============================================================================
    // PRODUCTION CRITICAL — Safe Bind Bootstrap (Mutation-Safe, DOM-Ready)
    // ============================================================================

    /**
     * Safe binding bootstrap with MutationObserver fallback
     * Prevents infinite retry loop and handles late DOM rendering
     */
    function bootstrapShareBindingsSafe() {
        let modalObserver = null;
        let observerTries = 0;
        const MAX_OBSERVER_TRIES = 50;

        function attemptBind() {
            if (ensureShareModalBindings()) {
                window.__SHARE_GENERATOR_READY__ = true;
                console.log('[Share Card] ✅ SAFE BIND SUCCESS — Generator Ready');
                
                // Cleanup observer if it exists
                if (modalObserver) {
                    modalObserver.disconnect();
                    modalObserver = null;
                }
                return true;
            }
            return false;
        }

        function startModalObserver() {
            console.log('[Share Card] 🔍 Starting MutationObserver for modal detection');
            
            modalObserver = new MutationObserver(() => {
                observerTries++;
                
                if (attemptBind()) {
                    console.log(`[Share Card] ✅ Modal detected via MutationObserver (attempt ${observerTries})`);
                    return;
                }
                
                if (observerTries > MAX_OBSERVER_TRIES) {
                    modalObserver.disconnect();
                    modalObserver = null;
                    console.warn(`[Share Card] ⚠️ Observer stopped after ${MAX_OBSERVER_TRIES} attempts`);
                }
            });

            // Watch for modal insertion in DOM
            modalObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Bootstrap logic
        if (document.readyState === 'loading') {
            // DOM still loading - wait for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[Share Card] 🚀 DOMContentLoaded fired, attempting bind...');
                if (!attemptBind()) {
                    // Modal not ready yet, start observer
                    startModalObserver();
                }
            });
        } else {
            // DOM already loaded - try immediate bind
            console.log('[Share Card] 🚀 DOM already loaded, attempting bind...');
            if (!attemptBind()) {
                // Modal not ready yet, start observer
                startModalObserver();
            }
        }
    }

    // Execute safe bootstrap
    bootstrapShareBindingsSafe();

    // Debug telemetry helper
    window.debugShareClickability = function () {
        const bindState = getBindState();
        return {
            ready: window.__SHARE_GENERATOR_READY__,
            bound: window.__SHARE_BINDINGS_DONE__,
            bindState: bindState,
            modal: !!document.getElementById('shareCardModal'),
            overlay: !!document.getElementById('shareCardOverlay'),
            closeBtn: !!document.getElementById('shareCardClose'),
            downloadBtn: !!document.getElementById('downloadCardBtn'),
            shareBtn: !!document.getElementById('shareCardBtn'),
            copyBtn: !!document.getElementById('copyCaptionBtn'),
            formatBtns: document.querySelectorAll('.format-btn').length
        };
    };

    // STEP 3 — Verify generator loads after script load
    console.log('[ShareCard] ✅ File loaded');

    // STEP 6 — ADD DEBUG VERIFY
    console.log(
        '[GPBC Share] Generator Status:',
        typeof window.generateShareCardImage
    );

})();

// STEP 1 — HARD GLOBAL REGISTER & READY EVENT DISPATCH
// This runs AFTER the IIFE completes, ensuring generator is fully initialized
(function registerGPBCGenerator() {

   if (typeof window === "undefined") return;

   if (typeof window.generateShareCardImage === "function") {

      console.log("[GPBC Share] ✅ Generator function confirmed");

      window.__GPBC_SHARE_GENERATOR_READY__ = true;

      // STEP 3 — DISPATCH READY EVENT
      window.dispatchEvent(
         new CustomEvent("GPBC_SHARE_GENERATOR_READY")
      );

      console.log("[GPBC Share] 🚀 READY EVENT DISPATCHED");

   } else {

      console.error("[GPBC Share] ❌ Generator function missing at register time");
      console.error("[GPBC Share] window.generateShareCardImage:", typeof window.generateShareCardImage);

   }

})();

// STEP 2 — FINAL GLOBAL BIND VERIFICATION AT VERY BOTTOM OF FILE
(function GPBC_SHARE_GLOBAL_BIND() {

   try {

      if (typeof window.generateShareCardImage === "function") {

         // Already bound, just dispatch event
         window.__GPBC_SHARE_GENERATOR_READY__ = true;

         console.log("[GPBC Share] ✅ Generator bound to window");

         window.dispatchEvent(
            new CustomEvent("GPBC_SHARE_GENERATOR_READY")
         );

         console.log("[GPBC Share] 🚀 READY EVENT FIRED");

      } else {

         console.error("[GPBC Share] ❌ generateShareCardImage NOT FOUND");

      }

   } catch (e) {

      console.error("[GPBC Share] ❌ Generator bind crash", e);

   }

})();
