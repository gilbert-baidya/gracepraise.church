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

    /**
     * Initialize the share card generator
     */
    function initShareCardGenerator() {
        const shareRoot = document.querySelector("[data-share-card-root]");
        if (!shareRoot) return;

        const triggerBtn = document.getElementById('shareCardTrigger');
        const modal = document.getElementById('shareCardModal');
        const overlay = document.getElementById('shareCardOverlay');
        const closeBtn = document.getElementById('shareCardClose');

        if (!triggerBtn || !modal || !overlay) return;

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

        // ESC key logic
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                closeModal();
            }
        });

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

    function openModal() {
        const overlay = document.getElementById('shareCardOverlay');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => renderCardToCanvas(currentFormat), 100);
    }

    function closeModal() {
        const overlay = document.getElementById('shareCardOverlay');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function setFormat(format) {
        currentFormat = format;
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.format === format);
        });
        renderCardToCanvas(format);
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

    function renderCardToCanvas(format) {
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

        // 3. Watermark (GPBC)
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 12); // -15 deg rotate
        ctx.font = 'bold 200px serif';
        ctx.fillStyle = theme.watermark;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GPBC', 0, 0);
        ctx.restore();

        // 4. Content Logic
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

        // 5. Reference (Bottom of text)
        const refY = startY + totalTextHeight + 60;
        ctx.fillStyle = theme.reference;
        ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`— ${data.reference} —`, canvas.width / 2, refY);

        // 6. Footer (Fixed Bottom)
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

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShareCardGenerator);
    } else {
        initShareCardGenerator();
    }

})();
