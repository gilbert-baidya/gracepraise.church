/**
 * Share Card Generator for Daily Devotion
 * Creates shareable PNG images of scripture verses
 * Supports Square (1:1) and Story (9:16) formats
 */

(function () {
    'use strict';

    // Only run on Daily Devotion page
    if (!document.body.classList.contains('page-daily-devotion')) {
        return;
    }

    // Configuration
    const CONFIG = {
        formats: {
            square: { width: 1080, height: 1080, name: 'Square' },
            story: { width: 1080, height: 1920, name: 'Story' }
        },
        colors: {
            light: {
                gradient: ['#1e3a8a', '#7c3aed'],
                text: '#ffffff',
                reference: '#d4a017'
            },
            dark: {
                gradient: ['#0f172a', '#1e293b'],
                text: '#ffffff',
                reference: '#d4a017'
            }
        }
    };

    let currentFormat = 'square';
    let canvas = null;
    let ctx = null;

    /**
     * Initialize the share card generator
     */
    function initShareCardGenerator() {
        // SAFETY: Check for root element first
        const shareRoot = document.querySelector("[data-share-card-root]");
        if (!shareRoot) {
            console.warn("Share card root missing — skipping share init");
            return;
        }

        const triggerBtn = document.getElementById('shareCardTrigger');
        const modal = document.getElementById('shareCardModal');
        const overlay = document.getElementById('shareCardOverlay');
        const closeBtn = document.getElementById('shareCardClose');

        if (!triggerBtn || !modal || !overlay) {
            console.warn('Share card elements not found');
            return;
        }

        // Open modal
        triggerBtn.addEventListener('click', openModal);

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

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                closeModal();
            }
        });

        // --- Invite Funnel Logic ---

        // 1. Share Verse (Reuses Share Card Modal)
        const funnelShareBtn = document.getElementById('funnelShareBtn');
        if (funnelShareBtn) {
            funnelShareBtn.addEventListener('click', () => {
                openModal();
                // Optionally scroll to top if needed, but modal is fixed
            });
        }

        // 2. Invite Copy Buttons
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

    /**
     * Open the modal and render initial card
     */
    function openModal() {
        const overlay = document.getElementById('shareCardOverlay');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Render card after a short delay to ensure modal is visible
        setTimeout(() => {
            renderCardToCanvas(currentFormat);
        }, 100);
    }

    /**
     * Close the modal
     */
    function closeModal() {
        const overlay = document.getElementById('shareCardOverlay');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Set the format and re-render
     */
    function setFormat(format) {
        currentFormat = format;

        // Update button states
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === format);
        });

        // Re-render canvas
        renderCardToCanvas(format);
    }

    /**
     * Get verse data from the page
     */
    function getVerseData() {
        // Use data attribute for scripture content
        const verseElement = document.querySelector('[data-devotion-scripture]') || document.getElementById('bibleText');
        const referenceElement = document.getElementById('bibleReference');
        const titleElement = document.getElementById('devotionTitle');

        const verse = verseElement?.textContent?.trim() || 'Loading verse...';
        const reference = referenceElement?.textContent?.trim() || '';
        const title = titleElement?.textContent?.trim() || 'Daily Devotion';

        // Get current date
        const date = new Date();
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        return { verse, reference, title, date: dateStr };
    }

    /**
     * Detect if dark mode is active
     */
    function isDarkMode() {
        return document.body.classList.contains('dark') ||
            document.body.getAttribute('data-theme') === 'dark' ||
            document.documentElement.classList.contains('dark');
    }

    /**
     * Wrap text to fit within a given width
     */
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

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    /**
     * Render the card to canvas
     */
    function renderCardToCanvas(format) {
        const formatConfig = CONFIG.formats[format];
        const isDark = isDarkMode();
        const colors = isDark ? CONFIG.colors.dark : CONFIG.colors.light;
        const data = getVerseData();

        // Create or get canvas
        const previewContainer = document.getElementById('shareCardPreview');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'shareCardCanvas';
            canvas.className = 'share-card-canvas';
        }

        canvas.width = formatConfig.width;
        canvas.height = formatConfig.height;
        ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, colors.gradient[0]);
        gradient.addColorStop(1, colors.gradient[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add subtle pattern overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for (let i = 0; i < canvas.height; i += 40) {
            ctx.fillRect(0, i, canvas.width, 20);
        }

        // Draw church logo watermark (text-based)
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 60px serif';
        ctx.textAlign = 'center';

        if (format === 'square') {
            ctx.fillText('GPBC', canvas.width / 2, 100);
        } else {
            ctx.fillText('GPBC', canvas.width / 2, 150);
        }
        ctx.restore();

        // Draw date
        ctx.fillStyle = colors.text;
        ctx.globalAlpha = 0.8;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';

        if (format === 'square') {
            ctx.fillText(data.date, canvas.width / 2, 160);
        } else {
            ctx.fillText(data.date, canvas.width / 2, 220);
        }
        ctx.globalAlpha = 1;

        // Draw verse text (centered)
        const maxWidth = canvas.width - 180;
        const centerY = canvas.height / 2;

        ctx.fillStyle = colors.text;
        ctx.font = format === 'square' ? 'bold 42px serif' : 'bold 48px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = wrapText(ctx, data.verse, maxWidth);
        const lineHeight = format === 'square' ? 60 : 70;
        const totalHeight = lines.length * lineHeight;
        let startY = centerY - (totalHeight / 2);

        // Add opening quote mark
        ctx.font = format === 'square' ? '80px serif' : '90px serif';
        ctx.globalAlpha = 0.3;
        ctx.fillText('"', canvas.width / 2 - maxWidth / 2 - 40, startY);
        ctx.globalAlpha = 1;

        // Draw verse lines
        ctx.font = format === 'square' ? 'bold 42px serif' : 'bold 48px serif';
        lines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
        });

        // Add closing quote mark
        ctx.font = format === 'square' ? '80px serif' : '90px serif';
        ctx.globalAlpha = 0.3;
        ctx.fillText('"', canvas.width / 2 + maxWidth / 2 + 40, startY + totalHeight);
        ctx.globalAlpha = 1;

        // Draw reference (bottom)
        ctx.fillStyle = colors.reference;
        ctx.font = format === 'square' ? 'bold 32px sans-serif' : 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const bottomY = canvas.height - (format === 'square' ? 100 : 150);
        ctx.fillText(data.reference, canvas.width / 2, bottomY);

        // Draw church name
        ctx.fillStyle = colors.text;
        ctx.globalAlpha = 0.6;
        ctx.font = '20px sans-serif';
        ctx.fillText('Grace and Praise Bangladeshi Church', canvas.width / 2, bottomY + 40);
        ctx.globalAlpha = 1;

        // Update preview
        previewContainer.innerHTML = '';
        previewContainer.appendChild(canvas);
    }

    /**
     * Download the card as PNG
     */
    function downloadCard() {
        if (!canvas) return;

        const data = getVerseData();
        const formatName = currentFormat === 'square' ? 'square' : 'story';
        const date = new Date().toISOString().split('T')[0];
        const filename = `devotion-${date}-${formatName}.png`;

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

    /**
     * Share the card using Web Share API
     */
    async function shareCard() {
        if (!canvas) return;

        const data = getVerseData();
        const caption = `${data.verse}\n\n— ${data.reference}\n\nGrace and Praise Bangladeshi Church`;

        try {
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });

            const file = new File([blob], 'devotion.png', { type: 'image/png' });

            // Check if Web Share API is supported
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Daily Devotion',
                    text: caption,
                    files: [file]
                });
                showToast('✓ Shared successfully!');
            } else {
                // Fallback: copy caption and show message
                await copyCaptionToClipboard();
                showToast('⚠️ Share not supported. Caption copied! Download image to share manually.');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                showToast('⚠️ Share failed. Try downloading instead.');
            }
        }
    }

    /**
     * Copy caption to clipboard
     */
    async function copyCaptionToClipboard() {
        const data = getVerseData();
        const caption = `${data.verse}\n\n— ${data.reference}\n\n${data.date}\nGrace and Praise Bangladeshi Church\nhttps://gilbert-baidya.github.io/gracepraise.church/daily-devotion.html`;

        try {
            await navigator.clipboard.writeText(caption);
            showToast('✓ Caption copied to clipboard!');
        } catch (error) {
            console.error('Copy failed:', error);
            showToast('⚠️ Failed to copy caption');
        }
    }

    /**
     * Show toast notification
     */
    function showToast(message) {
        const toast = document.getElementById('shareToast');
        const toastMessage = document.getElementById('shareToastMessage');

        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.add('show');

            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShareCardGenerator);
    } else {
        initShareCardGenerator();
    }

})();
