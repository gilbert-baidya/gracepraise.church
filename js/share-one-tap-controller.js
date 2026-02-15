/**
 * ============================================================================
 * GPBC ONE-TAP SHARE CONTROLLER
 * ============================================================================
 * Frictionless ministry publishing: One tap → Card generates → Auto shares
 * Supports intelligent format selection, background sync, and SMS optimization
 * ============================================================================
 */

(function(window) {
    'use strict';

    // ============================================================================
    // STEP 1 — FORMAT ADAPTER MAP (Contract Safety)
    // Maps any format value to generator CONFIG.formats keys
    // ============================================================================
    const FORMAT_API_TO_GENERATOR = {
        "1:1": "square",
        "9:16": "story",
        "4:5": "square",  // SMS uses square base, cropped later
        "square": "square",
        "story": "story",
        "sms": "square"
    };

    // Share state management
    const ShareState = {
        isSharing: false,
        lastShareCard: null,
        lastShareTimestamp: 0,
        shareCount: 0,
        lockAcquired: false
    };

    /**
     * Smart format auto-selection based on device and context
     */
    function selectBestFormat(options = {}) {
        // Override if explicitly specified
        if (options.format) {
            console.log('[GPBC One Tap Share] Format override:', options.format);
            return options.format;
        }

        // SMS mode always uses portrait crop
        if (options.channel === 'sms') {
            console.log('[GPBC One Tap Share] SMS mode → 4:5 portrait');
            return 'story'; // Will be cropped to 4:5 in SMS optimizer
        }

        // WhatsApp detection (prefers square)
        const userAgent = navigator.userAgent || '';
        if (userAgent.toLowerCase().includes('whatsapp')) {
            console.log('[GPBC One Tap Share] WhatsApp detected → square');
            return 'square';
        }

        // Device-based selection
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent) || window.innerWidth < 768;
        
        if (isMobile) {
            console.log('[GPBC One Tap Share] Mobile device → story (9:16)');
            return 'story';
        } else {
            console.log('[GPBC One Tap Share] Desktop device → square (1:1)');
            return 'square';
        }
    }

    /**
     * Show sacred loading feedback
     */
    function showSacredFeedback(message) {
        let feedbackEl = document.getElementById('gpbc-share-feedback');
        
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.id = 'gpbc-share-feedback';
            feedbackEl.setAttribute('role', 'status');
            feedbackEl.setAttribute('aria-live', 'polite');
            feedbackEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, rgba(253, 251, 247, 0.98), rgba(255, 255, 255, 0.98));
                padding: 24px 40px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(44, 36, 22, 0.16), 0 0 0 1px rgba(201, 162, 79, 0.25);
                z-index: 999999;
                font-family: Georgia, serif;
                font-size: 16px;
                color: #2c2416;
                font-weight: 600;
                letter-spacing: 0.5px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(feedbackEl);
        }

        // Apply dark mode styling if active
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            feedbackEl.style.background = 'linear-gradient(135deg, rgba(26, 31, 46, 0.98), rgba(37, 42, 56, 0.98))';
            feedbackEl.style.color = '#f5f1eb';
            feedbackEl.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(201, 162, 79, 0.35)';
        }

        feedbackEl.textContent = message;
        feedbackEl.style.opacity = '1';

        // Sacred gold shimmer animation
        feedbackEl.style.animation = 'sacred-shimmer 2s ease-in-out infinite';
        
        // Add shimmer keyframes if not already present
        if (!document.getElementById('sacred-shimmer-keyframes')) {
            const style = document.createElement('style');
            style.id = 'sacred-shimmer-keyframes';
            style.textContent = `
                @keyframes sacred-shimmer {
                    0%, 100% { box-shadow: 0 8px 32px rgba(44, 36, 22, 0.16), 0 0 0 1px rgba(201, 162, 79, 0.25); }
                    50% { box-shadow: 0 8px 32px rgba(44, 36, 22, 0.16), 0 0 0 1px rgba(201, 162, 79, 0.5), 0 0 16px rgba(201, 162, 79, 0.25); }
                }
                [data-theme="dark"] #gpbc-share-feedback {
                    animation: sacred-shimmer-dark 2s ease-in-out infinite !important;
                }
                @keyframes sacred-shimmer-dark {
                    0%, 100% { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(201, 162, 79, 0.35); }
                    50% { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 106, 0.6), 0 0 20px rgba(212, 175, 106, 0.3); }
                }
            `;
            document.head.appendChild(style);
        }

        return feedbackEl;
    }

    /**
     * Hide sacred feedback
     */
    function hideSacredFeedback() {
        const feedbackEl = document.getElementById('gpbc-share-feedback');
        if (feedbackEl) {
            feedbackEl.style.opacity = '0';
            setTimeout(() => {
                if (feedbackEl.parentNode) {
                    feedbackEl.parentNode.removeChild(feedbackEl);
                }
            }, 300);
        }
    }

    /**
     * Wait for share generator to be ready
     */
    async function ensureGeneratorReady() {
        if (typeof window.waitForShareGeneratorReady === 'function') {
            await window.waitForShareGeneratorReady();
            console.log('[GPBC One Tap Share] Generator ready');
            return true;
        }

        // Fallback: check global flags
        if (window.__SHARE_GENERATOR_READY__) {
            console.log('[GPBC One Tap Share] Generator already ready');
            return true;
        }

        // Wait with timeout
        console.log('[GPBC One Tap Share] Waiting for generator...');
        const maxWait = 5000;
        const startTime = Date.now();

        while (!window.__SHARE_GENERATOR_READY__ && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (window.__SHARE_GENERATOR_READY__) {
            console.log('[GPBC One Tap Share] Generator ready after wait');
            return true;
        }

        console.warn('[GPBC One Tap Share] Generator not ready after timeout');
        return false;
    }

    /**
     * Generate share card silently (no modal)
     */
    async function generateCardSilently(format, options = {}) {
        console.log('[GPBC One Tap Share] Generating card silently...', format);

        // ========================================================================
        // STEP 2 — FORMAT CONTRACT ADAPTER
        // ========================================================================
        const generatorFormat = FORMAT_API_TO_GENERATOR[format] || "square";
        console.log('[GPBC One Tap Share] Format mapping:', format, '→', generatorFormat);

        // Get current devotion data
        const devotionData = window.__CURRENT_DEVOTION__ || window.__CURRENT_DEVOTION_DATA__;
        
        if (!devotionData) {
            throw new Error('No devotion data available');
        }

        // ========================================================================
        // STEP 3 — SAFE VALIDATION GUARD
        // ========================================================================
        // Note: CONFIG is internal to share-card-generator.js, so we validate
        // by checking if the format is in our known set
        const validFormats = ['square', 'story'];
        if (!validFormats.includes(generatorFormat)) {
            console.error('[GPBC One Tap Share] Invalid format contract:', generatorFormat);
            throw new Error('Invalid share format: ' + generatorFormat);
        }

        // Wait for logo if available
        const logoImg = await window.__GPBC_LOGO_READY__;

        // ========================================================================
        // STEP 4 — CALL GENERATOR WITH SAFE FORMAT
        // ========================================================================
        // Check if renderCardToCanvas exists (from share-card-generator.js)
        if (typeof window.renderCardToCanvas === 'function') {
            // Use existing render function with correct format
            await window.renderCardToCanvas(generatorFormat, logoImg);
            console.log('[GPBC One Tap Share] ✅ Card rendered via renderCardToCanvas');
            
            const canvas = document.getElementById('shareCardCanvas');
            if (!canvas) {
                throw new Error('Canvas not found after render');
            }
            return canvas;
        }

        throw new Error('Share card generator not available');
    }

    /**
     * Convert canvas to File object for sharing
     */
    async function canvasToFile(canvas, filename = 'gpbc-devotion.png', quality = 0.95) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to convert canvas to blob'));
                    return;
                }

                const file = new File([blob], filename, { type: 'image/png' });
                console.log('[GPBC One Tap Share] ✅ File created:', (blob.size / 1024).toFixed(2) + 'KB');
                resolve(file);
            }, 'image/png', quality);
        });
    }

    /**
     * Convert canvas to SMS-optimized file
     */
    async function canvasToSMSFile(canvas) {
        if (typeof window.exportSMSOptimizedCard === 'function') {
            const blob = await window.exportSMSOptimizedCard(canvas);
            const file = new File([blob], 'gpbc-devotion-sms.jpg', { type: 'image/jpeg' });
            console.log('[GPBC One Tap Share] ✅ SMS file created:', (blob.size / 1024).toFixed(2) + 'KB');
            return file;
        }

        // Fallback: regular PNG
        return canvasToFile(canvas, 'gpbc-devotion.png');
    }

    /**
     * Native share via Web Share API
     */
    async function nativeShare(file, devotionData) {
        if (!navigator.share) {
            throw new Error('Web Share API not available');
        }

        if (!navigator.canShare({ files: [file] })) {
            throw new Error('Cannot share files on this device');
        }

        const shareData = {
            title: devotionData.title || 'Daily Devotion',
            text: `${devotionData.verse || ''}\n\nGrace & Praise Bangladeshi Church`,
            files: [file]
        };

        await navigator.share(shareData);
        console.log('[GPBC One Tap Share] ✅ Native share completed');
    }

    /**
     * Copy image to clipboard
     */
    async function copyToClipboard(canvas) {
        if (!navigator.clipboard || !window.ClipboardItem) {
            throw new Error('Clipboard API not available');
        }

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const item = new ClipboardItem({ 'image/png': blob });
        
        await navigator.clipboard.write([item]);
        console.log('[GPBC One Tap Share] ✅ Image copied to clipboard');
    }

    /**
     * Download image as fallback
     */
    function downloadImage(canvas, filename = 'gpbc-devotion.png') {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('[GPBC One Tap Share] ✅ Image downloaded');
    }

    /**
     * Show success toast
     */
    function showSuccessToast(message) {
        const toast = document.createElement('div');
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.style.cssText = `
            position: fixed;
            bottom: 32px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
            padding: 16px 32px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            z-index: 999999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.style.opacity = '1', 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * ONE-TAP DEVOTION SHARE (Main Export)
     * Enterprise-grade multi-tier sharing with fallback ladder
     * Supports modes: "image" (default), "url", "text"
     */
    window.oneTapDevotionShare = async function(options = {}) {
        // Prevent concurrent shares
        if (ShareState.isSharing) {
            console.warn('[GPBC One Tap Share] Share already in progress');
            return { success: false, reason: 'already-sharing' };
        }

        ShareState.isSharing = true;
        ShareState.shareCount++;
        
        console.log('[GPBC One Tap Share] 🚀 Starting one-tap share flow...');
        console.log('[GPBC One Tap Share] Options:', options);

        const shareMode = options.mode || 'image';
        const devotionData = window.__CURRENT_DEVOTION__ || window.__CURRENT_DEVOTION_DATA__ || {};
        
        let feedbackEl = null;

        // ========================================
        // SHARE MODE: SMS (Image + Link for MMS)
        // ========================================
        if (shareMode === 'sms') {
            try {
                feedbackEl = showSacredFeedback('Preparing SMS share…');
                
                // Generate SMS-optimized card
                const generatorReady = await ensureGeneratorReady();
                if (!generatorReady) {
                    throw new Error('Share generator not ready');
                }

                const format = 'story'; // 9:16 works best for SMS
                const canvas = await generateCardSilently(format, { channel: 'sms' });
                
                // Create SMS-optimized file
                const smsFile = await canvasToSMSFile(canvas);
                
                const verseText = devotionData.verseText || '';
                const verse = devotionData.verse || '';
                const reflectionUrl = window.location.href;
                
                const smsText = `${verseText}\n\n${verse}\n\nRead reflection: ${reflectionUrl}\n\nGrace & Praise Bangladeshi Church`;
                
                // Try to share with image + text
                if (navigator.share) {
                    if (navigator.canShare && navigator.canShare({ files: [smsFile] })) {
                        await navigator.share({
                            title: devotionData.title || 'Daily Devotion',
                            text: smsText,
                            files: [smsFile]
                        });
                    } else {
                        // Fallback: share text + download image
                        await navigator.share({
                            title: devotionData.title || 'Daily Devotion',
                            text: smsText
                        });
                        downloadImage(canvas, 'gpbc-devotion-sms.jpg');
                    }
                    
                    hideSacredFeedback();
                    showSuccessToast('✓ Ready to send via SMS');
                    ShareState.isSharing = false;
                    return { success: true, method: 'sms-share', mode: 'sms' };
                } else {
                    throw new Error('Web Share API not available');
                }
            } catch (error) {
                console.log('[GPBC One Tap Share] SMS share failed:', error.message);
                hideSacredFeedback();
                
                if (error.name !== 'AbortError') {
                    showSuccessToast('✗ SMS share not available');
                }
                
                ShareState.isSharing = false;
                return { success: false, reason: error.name === 'AbortError' ? 'user-canceled' : 'not-supported' };
            }
        }

        // ========================================
        // SHARE MODE: TEXT ONLY
        // ========================================
        if (shareMode === 'text') {
            try {
                feedbackEl = showSacredFeedback('Preparing text share…');
                
                const verseText = devotionData.verseText || '';
                const verse = devotionData.verse || '';
                const reflectionUrl = window.location.href;
                
                const textPayload = `${verseText}\n\n${verse}\n\nRead full reflection: ${reflectionUrl}\n\nGrace & Praise Bangladeshi Church`;
                
                if (navigator.share) {
                    await navigator.share({
                        title: devotionData.title || 'Daily Devotion',
                        text: textPayload
                    });
                    
                    hideSacredFeedback();
                    showSuccessToast('✓ Text shared successfully');
                    ShareState.isSharing = false;
                    return { success: true, method: 'text-share', mode: 'text' };
                } else {
                    throw new Error('Web Share API not available');
                }
            } catch (error) {
                console.log('[GPBC One Tap Share] Text share failed:', error.message);
                hideSacredFeedback();
                
                if (error.name !== 'AbortError') {
                    showSuccessToast('✗ Text share not available');
                }
                
                ShareState.isSharing = false;
                return { success: false, reason: error.name === 'AbortError' ? 'user-canceled' : 'not-supported' };
            }
        }

        // ========================================
        // SHARE MODE: URL ONLY
        // ========================================
        if (shareMode === 'url') {
            try {
                feedbackEl = showSacredFeedback('Preparing link share…');
                
                if (navigator.share) {
                    await navigator.share({
                        title: devotionData.title || 'Daily Devotion',
                        text: `${devotionData.verse || 'Daily Devotion'}`,
                        url: window.location.href
                    });
                    
                    hideSacredFeedback();
                    showSuccessToast('✓ Link shared successfully');
                    ShareState.isSharing = false;
                    return { success: true, method: 'url-share', mode: 'url' };
                } else {
                    throw new Error('Web Share API not available');
                }
            } catch (error) {
                console.log('[GPBC One Tap Share] URL share failed:', error.message);
                hideSacredFeedback();
                
                if (error.name !== 'AbortError') {
                    showSuccessToast('✗ Link share not available');
                }
                
                ShareState.isSharing = false;
                return { success: false, reason: error.name === 'AbortError' ? 'user-canceled' : 'not-supported' };
            }
        }

        // ========================================
        // SHARE MODE: IMAGE (DEFAULT)
        // Multi-tier fallback ladder implementation
        // ========================================
        try {
            // STEP 1: Show feedback
            feedbackEl = showSacredFeedback('Generating Sacred Card…');

            // STEP 2: Ensure generator ready
            const generatorReady = await ensureGeneratorReady();
            if (!generatorReady) {
                throw new Error('Share generator not ready');
            }

            // STEP 3: Select best format
            const format = selectBestFormat(options);

            // STEP 4: Update feedback
            if (feedbackEl) feedbackEl.textContent = 'Blessing Image Prepared…';

            // STEP 5: Generate card silently
            const canvas = await generateCardSilently(format, options);

            // STEP 6: Update feedback
            if (feedbackEl) feedbackEl.textContent = 'Ready to Share';

            // STEP 7: Create share file
            let shareFile;
            if (options.channel === 'sms') {
                shareFile = await canvasToSMSFile(canvas);
            } else {
                shareFile = await canvasToFile(canvas);
            }

            // Cache for reuse
            ShareState.lastShareCard = { canvas, file: shareFile, timestamp: Date.now() };

            // ========================================
            // TIER 1: Web Share API with Image File Blob
            // ========================================
            try {
                if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                    console.log('[GPBC One Tap Share] Tier 1: Attempting Web Share with image file');
                    
                    await navigator.share({
                        title: devotionData.title || 'Daily Devotion',
                        text: `${devotionData.verse || ''}\n\nGrace & Praise Bangladeshi Church`,
                        files: [shareFile]
                    });
                    
                    hideSacredFeedback();
                    showSuccessToast('✓ Shared successfully');
                    ShareState.isSharing = false;
                    return { success: true, method: 'native-share-file', tier: 1 };
                } else {
                    throw new Error('File sharing not supported');
                }
            } catch (tier1Error) {
                console.log('[GPBC One Tap Share] Tier 1 failed:', tier1Error.message);
                
                // User canceled - stop here
                if (tier1Error.name === 'AbortError') {
                    hideSacredFeedback();
                    ShareState.isSharing = false;
                    return { success: false, reason: 'user-canceled' };
                }
                
                // ========================================
                // TIER 2: Web Share API with URL + Text
                // ========================================
                try {
                    if (navigator.share) {
                        console.log('[GPBC One Tap Share] Tier 2: Attempting Web Share with URL');
                        
                        await navigator.share({
                            title: devotionData.title || 'Daily Devotion',
                            text: `${devotionData.verse || ''}\n\nGrace & Praise Bangladeshi Church`,
                            url: window.location.href
                        });
                        
                        hideSacredFeedback();
                        showSuccessToast('✓ Link shared (image downloaded)');
                        
                        // Also download the image for user convenience
                        downloadImage(canvas, options.channel === 'sms' ? 'gpbc-devotion-sms.jpg' : 'gpbc-devotion.png');
                        
                        ShareState.isSharing = false;
                        return { success: true, method: 'native-share-url', tier: 2 };
                    } else {
                        throw new Error('Web Share API not available');
                    }
                } catch (tier2Error) {
                    console.log('[GPBC One Tap Share] Tier 2 failed:', tier2Error.message);
                    
                    // User canceled - stop here
                    if (tier2Error.name === 'AbortError') {
                        hideSacredFeedback();
                        ShareState.isSharing = false;
                        return { success: false, reason: 'user-canceled' };
                    }
                    
                    // ========================================
                    // TIER 3: Text-only Share
                    // ========================================
                    try {
                        if (navigator.share) {
                            console.log('[GPBC One Tap Share] Tier 3: Attempting text-only share');
                            
                            const textPayload = `${devotionData.title || 'Daily Devotion'}\n\n${devotionData.verse || ''}\n${devotionData.verseText || ''}\n\nRead more: ${window.location.href}\n\nGrace & Praise Bangladeshi Church`;
                            
                            await navigator.share({ text: textPayload });
                            
                            hideSacredFeedback();
                            showSuccessToast('✓ Text shared (image downloaded)');
                            
                            // Also download the image for user convenience
                            downloadImage(canvas, options.channel === 'sms' ? 'gpbc-devotion-sms.jpg' : 'gpbc-devotion.png');
                            
                            ShareState.isSharing = false;
                            return { success: true, method: 'text-share', tier: 3 };
                        } else {
                            throw new Error('Web Share API not available');
                        }
                    } catch (tier3Error) {
                        console.log('[GPBC One Tap Share] Tier 3 failed:', tier3Error.message);
                        
                        // Final fallback chain
                        if (tier3Error.name !== 'AbortError') {
                            // Try clipboard
                            try {
                                await copyToClipboard(canvas);
                                hideSacredFeedback();
                                showSuccessToast('✓ Image copied to clipboard');
                                ShareState.isSharing = false;
                                return { success: true, method: 'clipboard', tier: 4 };
                            } catch (clipboardError) {
                                // Final: Download
                                downloadImage(canvas, options.channel === 'sms' ? 'gpbc-devotion-sms.jpg' : 'gpbc-devotion.png');
                                hideSacredFeedback();
                                showSuccessToast('✓ Image downloaded');
                                ShareState.isSharing = false;
                                return { success: true, method: 'download', tier: 5 };
                            }
                        } else {
                            hideSacredFeedback();
                            ShareState.isSharing = false;
                            return { success: false, reason: 'user-canceled' };
                        }
                    }
                }
            }

        } catch (error) {
            console.error('[GPBC One Tap Share] ❌ Share failed catastrophically:', error);
            hideSacredFeedback();
            showSuccessToast('✗ Share failed. Please try again.');
            ShareState.isSharing = false;
            return { success: false, error: error.message };
        }
    };

    /**
     * Check if one-tap share is available
     */
    window.isOneTapShareAvailable = function() {
        return !!(navigator.share || navigator.clipboard);
    };

    /**
     * Get share statistics
     */
    window.getShareStats = function() {
        return {
            totalShares: ShareState.shareCount,
            lastShareTimestamp: ShareState.lastShareTimestamp,
            isSharing: ShareState.isSharing,
            hasCachedCard: !!ShareState.lastShareCard
        };
    };

    /**
     * Preload share resources
     */
    window.preloadShareResources = async function() {
        console.log('[GPBC One Tap Share] Preloading share resources...');
        
        // Preload background for current devotion
        if (typeof window.getShareBackgroundForCurrentDevotion === 'function') {
            try {
                await window.getShareBackgroundForCurrentDevotion();
                console.log('[GPBC One Tap Share] ✅ Background preloaded');
            } catch (error) {
                console.warn('[GPBC One Tap Share] Background preload failed:', error);
            }
        }

        // Ensure generator ready
        await ensureGeneratorReady();
    };

    console.log('[GPBC One Tap Share] 🎯 Controller loaded');

})(window);
