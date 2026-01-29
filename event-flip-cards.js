/**
 * GSAP ScrollTrigger Animation for Stacking, Fanning and Flipping Cards
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if GSAP and ScrollTrigger are loaded
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.error('GSAP or ScrollTrigger not loaded');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const cards = gsap.utils.toArray('.flip-card');
    const mm = gsap.matchMedia();

    // Create the master timeline with matchMedia
    mm.add({
        // Desktop
        isDesktop: "(min-width: 1025px)",
        // Tablet
        isTablet: "(min-width: 769px) and (max-width: 1024px)",
        // Mobile
        isMobile: "(max-width: 768px)"
    }, (context) => {
        let { isDesktop, isTablet, isMobile } = context.conditions;

        // Spread logic based on screen size
        let xPositions = [-450, -150, 150, 450];
        let yPositions = [0, 0, 0, 0];
        let rotations = [0, 0, 0, 0];
        let scaleVal = 1;

        if (isTablet) {
            xPositions = [-300, -100, 100, 300];
            scaleVal = 0.85;
        } else if (isMobile) {
            // On mobile, we spread them VERTICALLY so they are visible as a stack
            xPositions = [0, 0, 0, 0];
            yPositions = [-30, -10, 10, 30]; // Slight vertical offset to see edges
            rotations = [0, 0, 0, 0];
            scaleVal = 0.8;
        }

        const scrollDistanceMultiplier = 2;
        const mainTl = gsap.timeline({
            scrollTrigger: {
                trigger: ".flip-scroll-section",
                start: "top top",
                end: () => `+=${window.innerHeight * scrollDistanceMultiplier}`,
                scrub: 3,
                pin: true,
                anticipatePin: 1,
            }
        });

        // 1. Initial State
        gsap.set(cards, {
            xPercent: -50,
            yPercent: -50,
            x: 0,
            y: (isMobile || isTablet) ? 0 : -100,
            scale: 0.4,
            opacity: 0,
            rotationZ: 0
        });

        // Entrance
        mainTl.to(cards, {
            opacity: 1,
            scale: isMobile ? scaleVal : 0.8,
            y: 0,
            stagger: 0.1,
            duration: 0.5,
            ease: "power2.out"
        });

        // Spread to final positions
        mainTl.to(cards, {
            x: (i) => xPositions[i],
            y: (i) => yPositions[i],
            rotationZ: (i) => rotations[i],
            scale: scaleVal,
            duration: 1,
            ease: "power2.inOut"
        }, "+=0.2");

        // 2. Flip Logic
        cards.forEach((card, index) => {
            const inner = card.querySelector('.flip-card-inner');

            // Bring card to front as it flips to ensure buttons are clickable
            mainTl.to(card, {
                zIndex: 1000 + index,
                duration: 0.5,
                immediateRender: false
            }, `flip-${index}`);

            mainTl.to(inner, {
                rotationY: 180,
                duration: 0.8,
                ease: "back.out(1.2)"
            }, `flip-${index}`);
        });

        // 3. Title Animation
        mainTl.from(".flip-section-title", {
            y: 30,
            opacity: 0,
            duration: 0.5,
            ease: "power4.out"
        }, 0);

        return () => {
            // Optional cleanup
        };
    });
});
