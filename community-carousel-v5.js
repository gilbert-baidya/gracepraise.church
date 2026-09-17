document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('.community-v5');
    if (!root) return;

    const stage = root.querySelector('.community-v5__stage');
    const slides = Array.from(root.querySelectorAll('.community-v5__slide'));
    const dots = Array.from(root.querySelectorAll('.community-v5__dot'));
    const prevBtn = root.querySelector('.community-v5__prev');
    const nextBtn = root.querySelector('.community-v5__next');

    if (!stage || slides.length === 0) return;

    let currentIndex = 0;
    let touchStartX = 0;

    function normalizeIndex(index) {
        return (index + slides.length) % slides.length;
    }

    function updateCarousel(nextIndex) {
        currentIndex = normalizeIndex(nextIndex);

        slides.forEach((slide, index) => {
            const offset = ((index - currentIndex + slides.length) % slides.length);
            const normalized = offset > slides.length / 2 ? offset - slides.length : offset;
            const abs = Math.abs(normalized);

            const isActive = abs === 0;
            const isVisible = abs <= 2;
            const translateX = normalized * 235;
            const rotateY = normalized * 18;
            const scale = isActive ? 1 : 1 - (abs * 0.12);
            const opacity = isActive ? 1 : abs === 1 ? 0.82 : abs === 2 ? 0.24 : 0;
            const depth = isActive ? 0 : -abs * 160;
            const yOffset = isActive ? 0 : abs * 10;
            const zIndex = isActive ? 30 : 20 - abs;
            const pointerEvents = isVisible ? 'auto' : 'none';

            slide.style.transform = `translate(-50%, -50%) translate3d(${translateX}px, ${yOffset}px, ${depth}px) rotateY(${rotateY}deg) scale(${scale})`;
            slide.style.opacity = String(opacity);
            slide.style.zIndex = String(zIndex);
            slide.style.pointerEvents = pointerEvents;
            slide.classList.toggle('is-active', isActive);
            slide.setAttribute('aria-hidden', String(!isActive));
            slide.tabIndex = isActive ? 0 : -1;
        });

        dots.forEach((dot, index) => {
            const isActive = index === currentIndex;
            dot.classList.toggle('is-active', isActive);
            dot.setAttribute('aria-current', isActive ? 'true' : 'false');
            dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    function goToSlide(index) {
        updateCarousel(index);
    }

    function nextSlide() {
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        goToSlide(currentIndex - 1);
    }

    slides.forEach((slide, index) => {
        slide.addEventListener('click', () => {
            if (index !== currentIndex) {
                goToSlide(index);
            }
        });

        slide.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                goToSlide(index);
            }
        });
    });

    prevBtn?.addEventListener('click', prevSlide);
    nextBtn?.addEventListener('click', nextSlide);

    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            goToSlide(Number(dot.dataset.index));
        });
    });

    stage.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            prevSlide();
        }
        if (event.key === 'ArrowRight') {
            nextSlide();
        }
    });

    stage.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    stage.addEventListener('touchend', (event) => {
        const touchEndX = event.changedTouches[0].screenX;
        const delta = touchEndX - touchStartX;

        if (Math.abs(delta) > 40) {
            if (delta < 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }, { passive: true });

    updateCarousel(0);
});
