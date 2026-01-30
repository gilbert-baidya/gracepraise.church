/**
 * ============================================
 * GLOBAL NAVIGATION SYSTEM - LOCKED
 * ============================================
 * 
 * NAVIGATION LOCK — DO NOT MODIFY WITHOUT REVIEW
 * 
 * This file controls ALL navigation behavior across the entire site.
 * Any changes here affect EVERY page.
 * 
 * Desktop: Hover-based dropdowns
 * Mobile: Accordion-style expandable menus
 * 
 * @version 2.1.0 - Mobile menu context-aware navigation
 * @locked true
 */

(function () {
    'use strict';

    // ============================================
    // NAVIGATION LOCK — DO NOT MODIFY WITHOUT REVIEW
    // ============================================

    // Enable JS-dependent features (disables no-JS fallbacks)
    document.documentElement.classList.add('js-enabled');

    // Navigation elements
    const header = document.querySelector('header');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const mobileOverlay = document.querySelector('.mobile-overlay');
    const navDropdowns = document.querySelectorAll('.nav-dropdown');
    const navNestedDropdowns = document.querySelectorAll('.nav-dropdown-nested');
    const root = document.documentElement;
    const countdownBanner = document.getElementById('specialEventBanner') || document.querySelector('.inline-countdown-banner');

    // ============================================
    // SCROLL PADDING — HEADER + BANNER OFFSET
    // ============================================

    function getVisibleHeight(element) {
        if (!element) return 0;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return 0;
        }
        return element.offsetHeight || 0;
    }

    function updateScrollPadding() {
        const headerHeight = header ? header.offsetHeight : 0;
        const bannerHeight = getVisibleHeight(countdownBanner);
        const totalOffset = headerHeight + bannerHeight;
        root.style.scrollPaddingTop = `${totalOffset}px`;
        root.style.setProperty('--scroll-padding-top', `${totalOffset}px`);
    }

    updateScrollPadding();
    window.addEventListener('resize', updateScrollPadding);
    window.addEventListener('orientationchange', updateScrollPadding);

    if (countdownBanner && 'MutationObserver' in window) {
        const bannerObserver = new MutationObserver(updateScrollPadding);
        bannerObserver.observe(countdownBanner, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // ============================================
    // STICKY HEADER BEHAVIOR (DESKTOP)
    // ============================================

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add scrolled class for styling
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
        updateScrollPadding();
    });

    // ============================================
    // MOBILE MENU TOGGLE
    // ============================================

    let scrollPosition = 0;

    function toggleMobileMenu() {
        const isOpening = !navLinks.classList.contains('mobile-open');

        if (isOpening) {
            // Save current scroll position before locking
            scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            document.body.style.top = `-${scrollPosition}px`;
        }

        navLinks.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');

        if (!isOpening) {
            // Restore scroll position after unlocking
            document.body.style.top = '';
            window.scrollTo(0, scrollPosition);
            closeAllDropdowns();
        }
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', toggleMobileMenu);
    }

    // ============================================
    // DROPDOWN MANAGEMENT (MOBILE & DESKTOP)
    // ============================================

    function closeAllDropdowns() {
        navDropdowns.forEach(dropdown => {
            dropdown.classList.remove('mobile-dropdown-open');
            const toggle = dropdown.querySelector(':scope > a');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function initMobileDropdowns() {
        const isTouchDevice = () => (
            window.matchMedia('(hover: none)').matches ||
            window.matchMedia('(pointer: coarse)').matches ||
            'ontouchstart' in window
        );

        const isMobileMenuOpen = () => navLinks && navLinks.classList.contains('mobile-open');
        const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;
        const isTablet = () => isCoarsePointer() && window.innerWidth >= 769;
        const isMobileViewport = () => window.innerWidth <= 768;
        const isTabletOrMobile = () => isTablet() || isMobileViewport();

        navDropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector(':scope > a');
            const arrow = toggle ? toggle.querySelector('.dropdown-arrow') : null;
            const menu = dropdown.querySelector('.dropdown-menu');

            if (!toggle || !menu || !arrow) return;

            // Tablet/mobile: tap-to-toggle regardless of touch detection
            if (isTabletOrMobile()) {
                toggle.addEventListener('click', (e) => {
                    // iPad: always toggle dropdown on tap, navigate via "Overview" item
                    if (isTablet()) {
                        e.preventDefault();
                        e.stopPropagation();

                        // Close other dropdowns (accordion behavior)
                        navDropdowns.forEach(otherDropdown => {
                            if (otherDropdown !== dropdown) {
                                otherDropdown.classList.remove('mobile-dropdown-open');
                                const otherToggle = otherDropdown.querySelector(':scope > a');
                                if (otherToggle) {
                                    otherToggle.setAttribute('aria-expanded', 'false');
                                }
                            }
                        });

                        const isOpen = dropdown.classList.toggle('mobile-dropdown-open');
                        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                        return;
                    }

                    if (isMobileViewport() && isMobileMenuOpen()) {
                        const isOpen = dropdown.classList.contains('mobile-dropdown-open');

                        if (!isOpen) {
                            e.preventDefault();
                            e.stopPropagation();

                            // Close other dropdowns (accordion behavior)
                            navDropdowns.forEach(otherDropdown => {
                                if (otherDropdown !== dropdown) {
                                    otherDropdown.classList.remove('mobile-dropdown-open');
                                    const otherToggle = otherDropdown.querySelector(':scope > a');
                                    if (otherToggle) {
                                        otherToggle.setAttribute('aria-expanded', 'false');
                                    }
                                }
                            });

                            dropdown.classList.add('mobile-dropdown-open');
                            toggle.setAttribute('aria-expanded', 'true');
                            return;
                        }
                    }
                });
            }

            // Close dropdown and menu when submenu item is clicked
            const submenuLinks = menu.querySelectorAll('a');
            submenuLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768 && navLinks.classList.contains('mobile-open')) {
                        toggleMobileMenu();
                        dropdown.classList.remove('mobile-dropdown-open');
                        toggle.setAttribute('aria-expanded', 'false');
                    }
                });
            });
        });

        // Handle nested dropdowns (Ministries submenu)
        navNestedDropdowns.forEach(nestedDropdown => {
            const toggle = nestedDropdown.querySelector(':scope > a');
            const arrow = toggle ? toggle.querySelector('.dropdown-arrow') : null;
            const menu = nestedDropdown.querySelector('.dropdown-menu-nested');

            if (!toggle || !menu || !arrow) return;

            if (isTabletOrMobile()) {
                arrow.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Toggle nested dropdown
                    const isOpen = nestedDropdown.classList.toggle('mobile-dropdown-open');
                    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                });
            }

            // Close everything when nested link is clicked
            const nestedLinks = menu.querySelectorAll('a');
            nestedLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768 && navLinks.classList.contains('mobile-open')) {
                        toggleMobileMenu();
                        nestedDropdown.classList.remove('mobile-dropdown-open');
                        toggle.setAttribute('aria-expanded', 'false');
                    }
                });
            });
        });
    }

    // ============================================
    // ACCESSIBILITY: KEYBOARD NAVIGATION
    // ============================================

    function initKeyboardNavigation() {
        navDropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector(':scope > a');
            const menu = dropdown.querySelector('.dropdown-menu');

            if (!toggle || !menu) return;

            // ESC key closes dropdown
            toggle.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeAllDropdowns();
                }
            });

            // Arrow keys navigation
            const menuLinks = menu.querySelectorAll('a');
            menuLinks.forEach((link, index) => {
                link.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextLink = menuLinks[index + 1] || menuLinks[0];
                        nextLink.focus();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevLink = menuLinks[index - 1] || menuLinks[menuLinks.length - 1];
                        prevLink.focus();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        closeAllDropdowns();
                        toggle.focus();
                    }
                });
            });
        });
    }

    // ============================================
    // CLOSE DROPDOWN ON OUTSIDE CLICK (DESKTOP)
    // ============================================

    document.addEventListener('click', (e) => {
        // Only on desktop
        if (window.innerWidth > 768) {
            const isDropdownClick = e.target.closest('.nav-dropdown');
            if (!isDropdownClick) {
                closeAllDropdowns();
            }
        }
    });

    // ============================================
    // CLOSE MOBILE MENU ON REGULAR LINK CLICK
    // ============================================

    document.querySelectorAll('.nav-links a:not(.nav-dropdown > a)').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('mobile-open')) {
                toggleMobileMenu();
            }
        });
    });

    // ============================================
    // DARK MODE THEME TOGGLE
    // ============================================

    function initThemeToggle() {
        // Check for saved theme preference or default to 'light'
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        document.body.setAttribute('data-theme', currentTheme);

        const darkModeToggle = document.getElementById('darkModeToggle');

        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                let theme = document.documentElement.getAttribute('data-theme');

                // Toggle between light and dark
                if (theme === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.body.setAttribute('data-theme', 'light');
                    localStorage.setItem('theme', 'light');
                    console.log('✓ Switched to light mode');
                } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.body.setAttribute('data-theme', 'dark');
                    localStorage.setItem('theme', 'dark');
                    console.log('✓ Switched to dark mode');
                }

                // Add smooth transition effect
                document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
                setTimeout(() => {
                    document.body.style.transition = '';
                }, 300);
            });
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    // Initialize dropdown functionality
    initMobileDropdowns();
    initKeyboardNavigation();

    // Initialize theme toggle
    initThemeToggle();

    // ============================================
    // NAVIGATION LOCK — DO NOT MODIFY WITHOUT REVIEW
    // ============================================

    console.log('✓ Global navigation system initialized');
    console.log('✓ Theme toggle initialized');

})();
