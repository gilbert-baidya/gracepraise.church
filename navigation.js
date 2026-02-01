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
        const bannerInHeader = header && countdownBanner ? header.contains(countdownBanner) : false;
        const totalOffset = headerHeight + bannerHeight;
        
        // Set scroll padding for anchor links
        root.style.scrollPaddingTop = `${totalOffset}px`;
        root.style.setProperty('--scroll-padding-top', `${totalOffset}px`);
        
        // 🆕 CRITICAL FIX: Set body padding to prevent content overlap with fixed header
        root.style.setProperty('--header-total-height', `${totalOffset}px`);
        document.body.style.paddingTop = `${totalOffset}px`;

        // Dynamically adjust header top position if banner is visible
        if (header) {
            header.style.top = bannerInHeader ? '0px' : `${bannerHeight}px`;
        }
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

    let scrollTimer;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add scrolled class for styling
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Temporarily hide countdown banner while scrolling
        const countdownInHeader = countdownBanner && header && header.contains(countdownBanner);
        if (countdownInHeader) {
            countdownBanner.classList.add('is-scrolling');
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                countdownBanner.classList.remove('is-scrolling');
            }, 250);
        }

        lastScroll = currentScroll;

        // Update root scroll padding based on header + banner
        const hHeight = header ? header.offsetHeight : 0;
        const bHeight = getVisibleHeight(countdownBanner);
        const totalOffset = hHeight + bHeight;
        root.style.setProperty('--scroll-padding-top', `${totalOffset}px`);
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
            const toggle = dropdown.querySelector('a');
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
        const isHandheldViewport = () => window.innerWidth <= 1024;
        const isTabletOrMobile = () => isTablet() || isMobileViewport() || isHandheldViewport();

        navDropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('a');
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
                                const otherToggle = otherDropdown.querySelector('a');
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
                                    const otherToggle = otherDropdown.querySelector('a');
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
        });

        // Handle nested dropdowns (Ministries submenu)
        navNestedDropdowns.forEach(nestedDropdown => {
            const toggle = nestedDropdown.querySelector('a');
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

        });
    }

    // ============================================
    // ACCESSIBILITY: KEYBOARD NAVIGATION
    // ============================================

    function initKeyboardNavigation() {
        navDropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('a');
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

    // TEMPORARILY DISABLED FOR TESTING
    // document.querySelectorAll('.nav-links a:not(.nav-dropdown > a)').forEach(link => {
    //     link.addEventListener('click', (e) => {
    //         if (navLinks.classList.contains('mobile-open')) {
    //             const href = link.getAttribute('href');
    //             // Only close menu for anchor links (#home, #about, etc.)
    //             // For page links (history.html, etc.), let browser navigate naturally
    //             if (href && href.startsWith('#')) {
    //                 toggleMobileMenu();
    //             }
    //             // For page links, do nothing - menu will close when new page loads
    //         }
    //     });
    // });

    // ============================================
    // DARK MODE THEME TOGGLE
    // ============================================

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.body.setAttribute('data-theme', theme);
        document.body.classList.toggle('dark', theme === 'dark');
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('theme', theme);
        }
    }

    function initThemeToggle() {
        const currentTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) || 'light';
        applyTheme(currentTheme);

        const darkModeToggle = document.getElementById('darkModeToggle');

        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                const theme = document.documentElement.getAttribute('data-theme') || 'light';
                const nextTheme = theme === 'dark' ? 'light' : 'dark';
                applyTheme(nextTheme);

                console.log(`✓ Switched to ${nextTheme} mode`);

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
