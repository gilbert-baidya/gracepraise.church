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

    // Define target X positions for fanning out (adjust based on design)
    // For 4 cards, we spread them centered across the container
    const xPositions = [-450, -150, 150, 450];
    const rotations = [-10, -5, 5, 10]; // Slight rotation for the fanned-out look

    // Create the master timeline
    const mainTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".flip-scroll-section",
            start: "top top",
            end: "bottom bottom",
            scrub: 1, // Smooth scrolling
            pin: true, // Pin the sticky wrapper while animating
            anticipatePin: 1,
        }
    });

    // 1. Initial Entrance & Fan Out
    // Cards start overlapping at center, small and high
    gsap.set(cards, {
        x: 0,
        y: -100,
        scale: 0.4,
        opacity: 0,
        rotationZ: 0
    });

    // Fan out animation
    mainTl.to(cards, {
        opacity: 1,
        scale: 0.8,
        y: 0,
        stagger: 0.1,
        duration: 0.5,
        ease: "power2.out"
    });

    // Spread to final positions
    mainTl.to(cards, {
        x: (i) => xPositions[i],
        rotationZ: (i) => rotations[i],
        scale: 1,
        duration: 1,
        ease: "power2.inOut"
    }, "+=0.2"); // Start spreading after small delay

    // 2. Clear Z-rotations for clean flipping
    mainTl.to(cards, {
        rotationZ: 0,
        duration: 0.3,
        ease: "none"
    });

    // 3. Sequential Flip
    cards.forEach((card, index) => {
        const inner = card.querySelector('.flip-card-inner');

        mainTl.to(inner, {
            rotationY: 180,
            duration: 0.8,
            ease: "back.out(1.2)"
        }, `flip-${index}`); // Dynamic Label
    });

    // 4. Extra "Padded" scroll at the end 
    // This gives users time to read the cards after they've all flipped
    mainTl.to({}, { duration: 0.1 });

    // Title entrance - Integrated into main timeline to prevent independent scrolling/ghosting
    mainTl.from(".flip-section-title", {
        y: 30,
        opacity: 0,
        duration: 0.5,
        ease: "power4.out"
    }, 0); // Start at the beginning of the timeline
});
