/**
 * ============================================================================
 * GPBC SMS-OPTIMIZED SHARE CARD EXPORT
 * ============================================================================
 * Exports share cards optimized for SMS/MMS delivery
 * Target: < 400KB, center-safe crop, high quality JPEG
 * ============================================================================
 */

(function(window) {
    'use strict';

    /**
     * Export SMS-optimized share card
     * @param {HTMLCanvasElement} sourceCanvas - Original share card canvas
     * @param {string} filename - Output filename
     * @returns {Promise<Blob>} Optimized JPEG blob
     */
    async function exportSMSOptimizedCard(sourceCanvas, filename = 'gpbc-devotion-sms.jpg') {
        if (!sourceCanvas) {
            throw new Error('Source canvas required for SMS export');
        }

        console.log('[GPBC SMS Export] Starting optimization...');

        // SMS-safe dimensions (1080x1350 portrait, 4:5 ratio)
        const SMS_WIDTH = 1080;
        const SMS_HEIGHT = 1350;
        const JPEG_QUALITY = 0.85;
        const MAX_FILE_SIZE = 400 * 1024; // 400KB

        // Create optimization canvas
        const smsCanvas = document.createElement('canvas');
        smsCanvas.width = SMS_WIDTH;
        smsCanvas.height = SMS_HEIGHT;
        const smsCtx = smsCanvas.getContext('2d');

        // Calculate center-safe crop from source
        const sourceAspect = sourceCanvas.width / sourceCanvas.height;
        const targetAspect = SMS_WIDTH / SMS_HEIGHT;

        let sx, sy, sw, sh;

        if (sourceAspect > targetAspect) {
            // Source is wider, crop horizontally (keep vertical center)
            sh = sourceCanvas.height;
            sw = sh * targetAspect;
            sx = (sourceCanvas.width - sw) / 2;
            sy = 0;
        } else {
            // Source is taller, crop vertically (keep horizontal center)
            sw = sourceCanvas.width;
            sh = sw / targetAspect;
            sx = 0;
            sy = (sourceCanvas.height - sh) / 2;
        }

        // Draw cropped and scaled image
        smsCtx.fillStyle = '#ffffff';
        smsCtx.fillRect(0, 0, SMS_WIDTH, SMS_HEIGHT);
        smsCtx.drawImage(
            sourceCanvas,
            sx, sy, sw, sh,
            0, 0, SMS_WIDTH, SMS_HEIGHT
        );

        // Convert to JPEG blob
        const blob = await new Promise((resolve) => {
            smsCanvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
        });

        const sizeKB = (blob.size / 1024).toFixed(2);
        console.log('[GPBC SMS Export] ✅ Optimized:', sizeKB + 'KB');

        if (blob.size > MAX_FILE_SIZE) {
            console.warn(`[GPBC SMS Export] ⚠️ File size ${sizeKB}KB exceeds 400KB target`);
        }

        return blob;
    }

    /**
     * Download SMS-optimized card
     */
    async function downloadSMSCard(sourceCanvas, filename = 'gpbc-devotion-sms.jpg') {
        try {
            const blob = await exportSMSOptimizedCard(sourceCanvas, filename);
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('[GPBC SMS Export] ✅ Download complete');
        } catch (error) {
            console.error('[GPBC SMS Export] ❌ Export failed:', error);
            throw error;
        }
    }

    /**
     * Share SMS-optimized card via Web Share API
     */
    async function shareSMSCard(sourceCanvas, title = 'GPBC Daily Devotion') {
        try {
            const blob = await exportSMSOptimizedCard(sourceCanvas);
            const file = new File([blob], 'gpbc-devotion-sms.jpg', { type: 'image/jpeg' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: title,
                    text: 'Daily devotion from Grace & Praise Bangladeshi Church',
                    files: [file]
                });
                console.log('[GPBC SMS Export] ✅ Shared successfully');
            } else {
                // Fallback to download
                console.log('[GPBC SMS Export] Web Share not available, downloading instead');
                await downloadSMSCard(sourceCanvas);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[GPBC SMS Export] Share canceled by user');
            } else {
                console.error('[GPBC SMS Export] ❌ Share failed:', error);
                throw error;
            }
        }
    }

    // Global exports
    window.exportSMSOptimizedCard = exportSMSOptimizedCard;
    window.downloadSMSCard = downloadSMSCard;
    window.shareSMSCard = shareSMSCard;

    console.log('[GPBC SMS Export] 📱 SMS optimization module loaded');

})(window);
