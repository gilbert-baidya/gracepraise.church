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

    let currentFormat = 'square';
    let canvas = null;
    let ctx = null;

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

    function openModal(logoImg = null) {
        const overlay = document.getElementById('shareCardOverlay');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => renderCardToCanvas(currentFormat, logoImg), 100);
    }

    function closeModal() {
        const overlay = document.getElementById('shareCardOverlay');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    async function setFormat(format) {
        currentFormat = format;
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === format);
        });
        // Wait for logo before re-rendering
        const logoImg = await window.__GPBC_LOGO_READY__;
        renderCardToCanvas(format, logoImg);
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
     */
    async function generateShareCardImage(devotionData) {
        // PRODUCTION HOTFIX: Try direct binding before blocking
        if (window.__SHARE_GENERATOR_READY__ !== true) {
            console.warn('[Share Card] 🔄 Generator not ready — attempting ensureShareModalBindings');
            ensureShareModalBindings();
        }

        // PHASE 3: Safe open gate - block if generator still not ready after binding attempt
        if (window.__SHARE_GENERATOR_READY__ !== true) {
            console.error('[Share Card] ❌ BLOCKED: Generator not initialized. Modal open prevented.');
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
        console.log('[ShareCard] 🎨 Generating share card...', devotionData);
        
        // Open modal and generate card with logo
        openModal(logoImg);
        
        return true;
    }

    // STEP 1 — FORCE GLOBAL EXPORT
    if (typeof window !== "undefined") {

       window.generateShareCardImage = generateShareCardImage;
       window.ensureShareModalBindings = ensureShareModalBindings;

       window.__GPBC_SHARE_GENERATOR_READY__ = true;

       console.log("[GPBC Share] ✅ Generator attached to window");

       // Initialize watermark logo preload
       preloadWatermarkLogo();

       window.dispatchEvent(
          new CustomEvent("GPBC_SHARE_GENERATOR_READY")
       );

       console.log("[GPBC Share] 🚀 READY EVENT FIRED");

    }

    function renderCardToCanvas(format, logoImg = null) {
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

        // 3. GPBC Logo Watermark (PRODUCTION FIX: Direct render if available)
        if (logoImg) {
            ctx.save();
            ctx.globalAlpha = 0.06;
            const size = canvas.width * 0.18;
            ctx.drawImage(
                logoImg,
                canvas.width / 2 - size / 2,
                canvas.height / 2 - size / 2,
                size,
                size
            );
            ctx.globalAlpha = 1;
            ctx.restore();
        } else if (watermarkLogoImage) {
            // HOTFIX FALLBACK — Use legacy preloaded image if available
            ctx.save();
            ctx.globalAlpha = 0.06;
            const size = canvas.width * 0.18;
            ctx.drawImage(
                watermarkLogoImage,
                canvas.width / 2 - size / 2,
                canvas.height / 2 - size / 2,
                size,
                size
            );
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // 4. Legacy Text Watermark (Deprecated - keeping for fallback)
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 12); // -15 deg rotate
        ctx.font = 'bold 200px serif';
        ctx.fillStyle = theme.watermark;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GPBC', 0, 0);
        ctx.restore();

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

        // 7. Footer (Fixed Bottom)
        const footerY = canvas.height - padding;
        ctx.fillStyle = theme.text;
        ctx.globalAlpha = 0.5;
        ctx.font = '24px sans-serif';
        ctx.fillText('Grace and Praise Bangladeshi Church', canvas.width / 2, footerY - 40);

        ctx.font = '20px sans-serif';
        ctx.fillText('gracepraise.church', canvas.width / 2, footerY);
        ctx.globalAlpha = 1;

        // Preview Render
        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);

        // Remove loading state if present
        const loading = previewContainer.querySelector('.preview-loading');
        if (loading) loading.remove();
    }

    // --- Action Handlers ---

    function getFormattedCaption() {
        const data = getVerseData();
        return `✨ Daily Devotion\n\n"${data.verse}"\n\n— ${data.reference} —\n\n🙏 Reflection at:\nhttps://gracepraise.church/daily-devotion\n\n#DailyDevotion #Faith #Jesus #Bible #GPBC`;
    }

    function downloadCard() {
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
