/* ========================================
   SHAPE SYSTEM JAVASCRIPT
   Grace and Praise Bangladeshi Church
   
   Interactive behaviors for shape-based UI
   ======================================== */

(function () {
    'use strict';

    // ========================================
    // CIRCLE CAROUSEL - Community & Eternity
    // ========================================

    class CircleCarousel {
        constructor(element) {
            this.carousel = element;
            this.slides = this.carousel.querySelectorAll('.circle-carousel-item');
            this.dots = this.carousel.parentElement.querySelectorAll('.circle-dot');
            this.currentIndex = 0;
            this.autoPlayInterval = null;
            this.autoPlayDelay = 5000; // 5 seconds - worship pace

            this.init();
        }

        init() {
            if (this.slides.length === 0) return;

            // Show first slide
            this.showSlide(0);

            // Bind dot navigation
            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    this.goToSlide(index);
                });
            });

            // Keyboard navigation
            this.carousel.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.prevSlide();
                if (e.key === 'ArrowRight') this.nextSlide();
            });

            // Touch swipe support
            this.addSwipeSupport();

            // Auto-play
            this.startAutoPlay();

            // Pause on hover
            this.carousel.addEventListener('mouseenter', () => this.pauseAutoPlay());
            this.carousel.addEventListener('mouseleave', () => this.startAutoPlay());
        }

        showSlide(index) {
            if (index === this.currentIndex) return;

            // FIX: Staged transition — ensure old slide is fully deactivated
            // BEFORE new slide begins fading in. This prevents two slides
            // existing at non-zero opacity simultaneously (ghost text cause).

            // Step 1: Deactivate ALL slides immediately
            this.slides.forEach(slide => slide.classList.remove('active'));
            this.dots.forEach(dot => dot.classList.remove('active'));

            // Step 2: Update dots immediately (no compositing impact)
            this.dots[index].classList.add('active');

            // Step 3: Small delay before activating new slide.
            // Gives mobile compositor time to finish hiding old slide
            // before promoting the new slide layer.
            const activateNext = () => {
                this.slides[index].classList.add('active');
                this.currentIndex = index;
            };

            // Use rAF + microtask to batch with next paint frame
            requestAnimationFrame(() => {
                requestAnimationFrame(activateNext);
            });
        }

        goToSlide(index) {
            this.showSlide(index);
            this.resetAutoPlay();
        }

        nextSlide() {
            const nextIndex = (this.currentIndex + 1) % this.slides.length;
            this.goToSlide(nextIndex);
        }

        prevSlide() {
            const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
            this.goToSlide(prevIndex);
        }

        startAutoPlay() {
            if (this.autoPlayInterval) return;
            this.autoPlayInterval = setInterval(() => {
                this.nextSlide();
            }, this.autoPlayDelay);
        }

        pauseAutoPlay() {
            if (this.autoPlayInterval) {
                clearInterval(this.autoPlayInterval);
                this.autoPlayInterval = null;
            }
        }

        resetAutoPlay() {
            this.pauseAutoPlay();
            this.startAutoPlay();
        }

        addSwipeSupport() {
            let touchStartX = 0;
            let touchEndX = 0;

            this.carousel.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            });

            this.carousel.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
            });

            const handleSwipe = () => {
                const swipeThreshold = 50;
                if (touchEndX < touchStartX - swipeThreshold) {
                    this.nextSlide();
                }
                if (touchEndX > touchStartX + swipeThreshold) {
                    this.prevSlide();
                }
            };

            this.handleSwipe = handleSwipe;
        }
    }

    // ========================================
    // TRAPEZOID SLIDER - Growth & Movement
    // ========================================

    class TrapezoidSlider {
        constructor(element) {
            this.slider = element;
            this.slides = this.slider.querySelectorAll('.trapezoid-slide');
            this.leftArrow = this.slider.querySelector('.trapezoid-arrow.left');
            this.rightArrow = this.slider.querySelector('.trapezoid-arrow.right');
            this.currentIndex = 0;
            this.isAnimating = false;

            this.init();
        }

        init() {
            if (this.slides.length === 0) return;

            // Show first slide
            this.showSlide(0);

            // Arrow navigation
            if (this.leftArrow) {
                this.leftArrow.addEventListener('click', () => this.prevSlide());
            }
            if (this.rightArrow) {
                this.rightArrow.addEventListener('click', () => this.nextSlide());
            }

            // Keyboard navigation
            this.slider.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.prevSlide();
                if (e.key === 'ArrowRight') this.nextSlide();
            });
        }

        showSlide(index) {
            if (this.isAnimating) return;
            this.isAnimating = true;

            const currentSlide = this.slides[this.currentIndex];
            const nextSlide = this.slides[index];

            // Slide out current
            currentSlide.style.transform = 'translateX(-100%)';
            currentSlide.style.opacity = '0';

            // Slide in next
            setTimeout(() => {
                currentSlide.style.display = 'none';
                nextSlide.style.display = 'block';
                nextSlide.style.transform = 'translateX(100%)';
                nextSlide.style.opacity = '0';

                setTimeout(() => {
                    nextSlide.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                    nextSlide.style.transform = 'translateX(0)';
                    nextSlide.style.opacity = '1';

                    this.currentIndex = index;

                    setTimeout(() => {
                        this.isAnimating = false;
                    }, 800);
                }, 50);
            }, 400);
        }

        nextSlide() {
            if (this.isAnimating) return;
            const nextIndex = (this.currentIndex + 1) % this.slides.length;
            this.showSlide(nextIndex);
        }

        prevSlide() {
            if (this.isAnimating) return;
            const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
            this.showSlide(prevIndex);
        }
    }

    // ========================================
    // SQUARE HOVER EFFECTS - Service & Structure
    // ========================================

    function initSquareCards() {
        const squares = document.querySelectorAll('.shape-square');

        squares.forEach(square => {
            square.addEventListener('mouseenter', function () {
                // Add gentle lift animation
                this.style.transform = 'translateY(-8px) scale(1.03)';
            });

            square.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0) scale(1)';
            });

            // Accessibility: Space/Enter to activate
            square.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const link = this.querySelector('a');
                    if (link) link.click();
                }
            });
        });
    }

    // ========================================
    // HEPTAGON SACRED PULSE - Spiritual Depth
    // ========================================

    function initHeptagonPulse() {
        const heptagon = document.querySelector('.shape-heptagon');
        if (!heptagon) return;

        // Verify only ONE heptagon per page (rule enforcement)
        const heptagonCount = document.querySelectorAll('.shape-heptagon').length;
        if (heptagonCount > 1) {
            console.warn('⚠️ SHAPE SYSTEM VIOLATION: Multiple heptagons detected. Maximum ONE per page.');
        }

        // Add sacred number badge if not present
        if (!heptagon.querySelector('.heptagon-badge')) {
            const badge = document.createElement('div');
            badge.className = 'heptagon-badge';
            badge.textContent = 'Biblical Number 7';
            heptagon.parentElement.insertBefore(badge, heptagon);
        }
    }

    // ========================================
    // ACCESSIBILITY - REDUCED MOTION SUPPORT
    // ========================================

    function handleReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        function applyReducedMotion() {
            if (prefersReducedMotion.matches) {
                document.body.classList.add('reduced-motion');

                // Stop all autoplay
                document.querySelectorAll('.circle-carousel').forEach(carousel => {
                    const instance = carousel.carouselInstance;
                    if (instance) instance.pauseAutoPlay();
                });
            } else {
                document.body.classList.remove('reduced-motion');
            }
        }

        applyReducedMotion();
        prefersReducedMotion.addEventListener('change', applyReducedMotion);
    }

    // ========================================
    // PARALLAX - SLOW, WORSHIP-LIKE
    // ========================================

    function initParallax() {
        const parallaxElements = document.querySelectorAll('.slow-parallax');

        if (parallaxElements.length === 0) return;

        let ticking = false;

        function updateParallax() {
            const scrolled = window.pageYOffset;

            parallaxElements.forEach(element => {
                const speed = element.dataset.parallaxSpeed || 0.3;
                const yPos = -(scrolled * speed);
                element.style.transform = `translate3d(0, ${yPos}px, 0)`;
            });

            ticking = false;
        }

        function requestTick() {
            if (!ticking) {
                window.requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestTick);
    }

    // ========================================
    // SCROLL REVEAL - GENTLE FADE IN
    // ========================================

    function initScrollReveal() {
        // Fallback: immediately reveal all elements to prevent hidden content bugs
        document.querySelectorAll('.gentle-fade-in').forEach(element => {
            element.classList.add('revealed');
        });
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // Initialize Circle Carousels
        document.querySelectorAll('.circle-carousel').forEach(carousel => {
            carousel.carouselInstance = new CircleCarousel(carousel);
        });

        // Initialize Trapezoid Sliders
        document.querySelectorAll('.trapezoid-slider').forEach(slider => {
            new TrapezoidSlider(slider);
        });

        // Initialize Square Cards
        initSquareCards();

        // Initialize Heptagon (Sacred Focus)
        initHeptagonPulse();

        // Accessibility
        handleReducedMotion();

        // Visual Effects
        initParallax();
        initScrollReveal();

        // console.log('✨ Shape System initialized - ONE SHAPE = ONE PURPOSE'); // Removed for production
    }

    // Start initialization
    init();

})();
