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
    const heroVideo = document.querySelector('.video-background video');
    const heroVideoSources = heroVideo ? heroVideo.querySelectorAll('source[data-src]') : [];
    let lastFocusedElement = null;
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex=\"-1\"])';
    const modalParent = videoModal ? videoModal.parentElement : null;
    const modalNextSibling = videoModal ? videoModal.nextSibling : null;

    // Parallax intensities
    const meshIntensity = 30;
    const cardIntensity = 10;

    if (!hero) return;

    const setPageInert = (isInert) => {
        const targets = [document.querySelector('header'), document.querySelector('main'), document.querySelector('footer')];
        targets.forEach((target) => {
            if (!target) return;
            if (isInert) {
                target.setAttribute('aria-hidden', 'true');
                target.setAttribute('inert', '');
            } else {
                target.removeAttribute('aria-hidden');
                target.removeAttribute('inert');
            }
        });
    };

    const getFocusableElements = () => {
        if (!videoModal) return [];
        return Array.from(videoModal.querySelectorAll(focusableSelector)).filter((el) => {
            if (el.hasAttribute('disabled')) return false;
            if (el.getAttribute('aria-hidden') === 'true') return false;
            return true;
        });
    };

    const trapFocus = (event) => {
        if (event.key !== 'Tab') return;
        const focusables = getFocusableElements();
        if (!focusables.length) {
            event.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const loadHeroVideo = () => {
        if (!heroVideo || heroVideoSources.length === 0) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        heroVideoSources.forEach((source) => {
            if (!source.src) {
                source.src = source.dataset.src || '';
            }
        });
        heroVideo.load();
        const playPromise = heroVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadHeroVideo, { timeout: 2000 });
    } else {
        setTimeout(loadHeroVideo, 1500);
    }

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
            if (modalParent && modalParent !== document.body) {
                document.body.appendChild(videoModal);
            }
            videoModal.classList.add('active');
            videoModal.setAttribute('aria-hidden', 'false');
            setPageInert(true);
            videoModal.addEventListener('keydown', trapFocus);
            lastFocusedElement = document.activeElement;
            document.body.style.overflow = 'hidden'; // Prevent scroll

            // Ensure video starts playing or is correctly loaded
            if (iframe) {
                const baseSrc = iframe.getAttribute('data-src') || iframe.src || '';
                if (baseSrc && !iframe.src) {
                    iframe.src = baseSrc;
                }
                const src = iframe.src || baseSrc;
                if (src && !src.includes('autoplay=1')) {
                    iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
                }
            }

            const closeButton = videoModal.querySelector('.close-modal');
            if (closeButton) {
                setTimeout(() => closeButton.focus(), 0);
            } else {
                videoModal.focus();
            }
        }
    };

    window.closeVideoModal = () => {
        if (videoModal) {
            videoModal.classList.remove('active');
            videoModal.setAttribute('aria-hidden', 'true');
            setPageInert(false);
            videoModal.removeEventListener('keydown', trapFocus);
            document.body.style.overflow = ''; // Restore scroll

            // Stop video by resetting src
            if (iframe) {
                const baseSrc = iframe.getAttribute('data-src');
                if (baseSrc) {
                    iframe.src = baseSrc;
                } else {
                    const src = iframe.src;
                    iframe.src = src.replace('&autoplay=1', '').replace('?autoplay=1', '');
                }
            }

            if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
            }

            if (modalParent && modalParent !== document.body) {
                if (modalNextSibling && modalNextSibling.parentNode === modalParent) {
                    modalParent.insertBefore(videoModal, modalNextSibling);
                } else {
                    modalParent.appendChild(videoModal);
                }
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
        if (e.key === 'Escape' && videoModal && videoModal.classList.contains('active')) {
            closeVideoModal();
        }
    });

    // --- SCROLL REVEAL OPTIMIZATION ---
    // (Optional: Add intersection observer for hero elements to play animations once)
});
