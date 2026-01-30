/**
 * HERO UPGRADE - Interactive Layer
 * Handles mouse parallax, video modal, and subtle dynamic effects for the Hybrid Glassmorphism Hero
 */

document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero-upgrade');
    const meshPoints = document.querySelectorAll('.mesh-point');
    const cards = document.querySelectorAll('.bento-card');
    const videoModal = document.getElementById('heroVideoModal');
    const iframe = document.getElementById('heroStoryVideo');

    // Parallax intensities
    const meshIntensity = 30;
    const cardIntensity = 10;

    if (!hero) return;

    // --- BUTTON GLOW EFFECT ---
    const buttons = document.querySelectorAll('.btn-glass');

    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            btn.style.setProperty('--x', `${x}px`);
            btn.style.setProperty('--y', `${y}px`);
        });
    });

    // --- PARALLAX EFFECT ---
    hero.addEventListener('mousemove', (e) => {
        // Skip parallax on mobile for performance
        if (window.innerWidth < 1024) return;

        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;

        // Calculate offset (normalized from -1 to 1)
        const xOffset = (clientX / innerWidth - 0.5) * 2;
        const yOffset = (clientY / innerHeight - 0.5) * 2;

        // Move mesh points (subtle background movement)
        meshPoints.forEach((point, index) => {
            const factor = (index + 1) * 0.5;
            const x = xOffset * meshIntensity * factor;
            const y = yOffset * meshIntensity * factor;
            point.style.transform = `translate(${x}px, ${y}px)`;
        });

        // Tilt bento cards (depth effect)
        cards.forEach((card, index) => {
            const factor = (index + 1) * 0.2;
            const rotateX = -yOffset * cardIntensity * factor;
            const rotateY = xOffset * cardIntensity * factor;

            // Only apply tilt if not on mobile
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px) scale(1.02)`;
        });
    });

    // Reset on mouse leave
    hero.addEventListener('mouseleave', () => {
        meshPoints.forEach(point => {
            point.style.transform = 'translate(0, 0)';
        });
        cards.forEach(card => {
            card.style.transform = '';
        });
    });

    // --- VIDEO MODAL LOGIC ---
    window.openVideoModal = () => {
        if (videoModal) {
            videoModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scroll

            // Ensure video starts playing or is correctly loaded
            if (iframe) {
                const src = iframe.src;
                if (!src.includes('autoplay=1')) {
                    iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
                }
            }
        }
    };

    window.closeVideoModal = () => {
        if (videoModal) {
            videoModal.classList.remove('active');
            document.body.style.overflow = ''; // Restore scroll

            // Stop video by resetting src
            if (iframe) {
                const src = iframe.src;
                iframe.src = src.replace('&autoplay=1', '').replace('?autoplay=1', '');
            }
        }
    };

    // Close modal on background click
    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeVideoModal();
        }
    });

    // --- SCROLL REVEAL OPTIMIZATION ---
    // (Optional: Add intersection observer for hero elements to play animations once)
});
