(function () {
    'use strict';

    const root = document.querySelector('.about-v17');
    if (!root) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealItems = root.querySelectorAll('[data-reveal]');

    if (reducedMotion || !('IntersectionObserver' in window)) {
        revealItems.forEach((item) => item.classList.add('is-visible'));
    } else {
        const observer = new IntersectionObserver((entries, revealObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.14, rootMargin: '0px 0px -40px' });

        revealItems.forEach((item) => observer.observe(item));
    }

    root.querySelectorAll('[data-carousel]').forEach((carousel) => {
        const slides = Array.from(carousel.querySelectorAll('[data-testimony]'));
        const previous = carousel.querySelector('[data-carousel-prev]');
        const next = carousel.querySelector('[data-carousel-next]');
        const status = carousel.querySelector('[data-carousel-status]');
        if (slides.length < 2 || !previous || !next || !status) return;

        let activeIndex = 0;

        const render = (nextIndex) => {
            activeIndex = (nextIndex + slides.length) % slides.length;
            slides.forEach((slide, index) => {
                const isActive = index === activeIndex;
                slide.hidden = !isActive;
                slide.setAttribute('aria-hidden', String(!isActive));
            });
            status.textContent = `${activeIndex + 1} / ${slides.length}`;
        };

        previous.addEventListener('click', () => render(activeIndex - 1));
        next.addEventListener('click', () => render(activeIndex + 1));
    });
}());
