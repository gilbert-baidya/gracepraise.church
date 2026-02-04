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

(() => {
    'use strict';

    // ============================================
    // NAVIGATION LOCK — DO NOT MODIFY WITHOUT REVIEW
    // ============================================

    // Enable JS-dependent features (disables no-JS fallbacks)
    document.documentElement.classList.add('js-enabled');

    // Navigation elements (will be refreshed after partials load)
    let header = document.querySelector('header');
    let mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    let navLinks = document.querySelector('.nav-links');
    let mobileOverlay = document.querySelector('.mobile-overlay');
    let navDropdowns = [];
    let navNestedDropdowns = [];
    let countdownBanner = document.getElementById('specialEventBanner') || document.querySelector('.inline-countdown-banner');
    let navInitialized = false;
    let bannerObserver;
    let resizeListenerAdded = false;
    let orientationListenerAdded = false;
    let headerHeightListenerAdded = false;
    let scrollListenerAdded = false;
    let outsideClickListenerAdded = false;
    let retryTimeout = null;
    let initAttempts = 0;
    const MAX_INIT_ATTEMPTS = 3;
    const root = document.documentElement;
    let isNavigatingToAnchor = false; // Flag to skip scroll restoration for anchor links

    function refreshNavElements() {
        header = document.querySelector('header');
        mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        navLinks = document.querySelector('.nav-links');
        mobileOverlay = document.querySelector('.mobile-overlay');
        navDropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));
        navNestedDropdowns = Array.from(document.querySelectorAll('.nav-dropdown-nested'));
        countdownBanner = document.getElementById('specialEventBanner') || document.querySelector('.inline-countdown-banner');
    }

    function cleanupGlobalListeners() {
        if (scrollListenerAdded) {
            window.removeEventListener('scroll', handleScroll);
            scrollListenerAdded = false;
        }
        if (resizeListenerAdded) {
            window.removeEventListener('resize', debouncedUpdateScrollPadding);
            resizeListenerAdded = false;
        }
        if (orientationListenerAdded) {
            window.removeEventListener('orientationchange', updateScrollPadding);
            orientationListenerAdded = false;
        }
        if (outsideClickListenerAdded) {
            document.removeEventListener('click', handleDocumentClick);
            outsideClickListenerAdded = false;
        }
        if (mobileMenuBtn) {
            mobileMenuBtn.removeEventListener('click', toggleMobileMenu);
        }
        if (mobileOverlay) {
            mobileOverlay.removeEventListener('click', toggleMobileMenu);
        }
        navInitialized = false;
    }

    function attachHeaderHeightListener() {
        if (headerHeightListenerAdded) return;
        document.addEventListener('gpbc:headerHeightChanged', updateScrollPadding);
        headerHeightListenerAdded = true;
    }

    function scheduleInitRetry() {
        if (retryTimeout) {
            return;
        }
        if (initAttempts >= MAX_INIT_ATTEMPTS) {
            console.warn('Navigation init retry limit reached');
            return;
        }
        initAttempts += 1;
        retryTimeout = setTimeout(() => {
            retryTimeout = null;
            initializeNavigationSystem();
        }, 80);
    }

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

    let headerStabilityTimer;
    function GPBC_updateHeaderTotalHeight() {
        const headerEl = document.querySelector('header');
        if (!headerEl) return;
        
        clearTimeout(headerStabilityTimer);
        headerStabilityTimer = setTimeout(() => {
            const height = headerEl.getBoundingClientRect().height;
            const currentHeight = parseFloat(
                getComputedStyle(document.documentElement)
                    .getPropertyValue('--gpbc-header-total-height') || '0'
            );
            
            // Only update if height actually changed by more than 2px
            if (Math.abs(height - currentHeight) > 2) {
                document.documentElement.style.setProperty('--gpbc-header-total-height', `${height}px`);
            }
        }, 50); // Wait for logo/font/banner to settle
    }

    if (typeof window !== 'undefined') {
        window.GPBC_updateHeaderTotalHeight = GPBC_updateHeaderTotalHeight;
    }

    // Debounce utility for resize listener
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function updateScrollPadding() {
        GPBC_updateHeaderTotalHeight();
        const headerHeight = header ? header.offsetHeight : 0;
        const bannerHeight = getVisibleHeight(countdownBanner);
        const bannerInHeader = header && countdownBanner ? header.contains(countdownBanner) : false;

        // Fix: If banner is inside header, header.offsetHeight already includes it.
        // Only add bannerHeight if it's OUTSIDE the header.
        const totalOffset = bannerInHeader ? headerHeight : (headerHeight + bannerHeight);

        // Set scroll padding for anchor links
        root.style.scrollPaddingTop = `${totalOffset}px`;
        root.style.setProperty('--scroll-padding-top', `${totalOffset}px`);

        // 🆕 CRITICAL FIX: Set body padding only for fixed headers (sticky headers stay in flow)
        root.style.setProperty('--header-total-height', `${totalOffset}px`);
        if (header) {
            const headerPosition = getComputedStyle(header).position;
            const isFixedHeader = headerPosition === 'fixed';
            if (isFixedHeader) {
                document.body.style.paddingTop = `${totalOffset}px`;
            } else {
                document.body.style.paddingTop = '0px';
            }
        }

        // Dynamically adjust header top position if banner is visible
        if (header) {
            header.style.top = bannerInHeader ? '0px' : `${bannerHeight}px`;
        }
    }

    const debouncedUpdateScrollPadding = debounce(updateScrollPadding, 150);

    document.addEventListener('gpbc:headerHeightChanged', () => {
        GPBC_updateHeaderTotalHeight();
        updateScrollPadding();
    });

    document.addEventListener('gpbc:logoLoaded', () => {
        GPBC_updateHeaderTotalHeight();
        updateScrollPadding();
    });

    document.addEventListener('gpbc:navReady', () => {
        GPBC_updateHeaderTotalHeight();
        updateScrollPadding();
    });

    // Expose the updater so other scripts can request a recalculation after DOM changes (e.g., logo height updates)
    if (typeof window !== 'undefined') {
        window.GPBC_updateHeaderPadding = updateScrollPadding;
    }

    // ============================================
    // STICKY HEADER BEHAVIOR (DESKTOP)
    // ============================================

    let lastScroll = 0;
    let scrollTimer;
    let scrollPosition = 0;

    function toggleMobileMenu() {
        const isOpening = !navLinks.classList.contains('mobile-open');

        if (isOpening) {
            // Save current scroll position before locking
            scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            document.body.style.top = `-${scrollPosition}px`;

            // Phase 4: Update ARIA expanded BEFORE visual transition
            mobileMenuBtn.setAttribute('aria-expanded', 'true');
            // Phase 5: Ensure menu is visible to accessibility tree
            navLinks.removeAttribute('aria-hidden');
            navLinks.removeAttribute('inert');
        } else {
            // Phase 4: Update ARIA expanded BEFORE visual transition
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            // Phase 5: Hide menu from accessibility tree when closed
            navLinks.setAttribute('aria-hidden', 'true');
            navLinks.setAttribute('inert', '');
            
            // Restore scroll position after unlocking
            document.body.style.top = '';
            
            // Only restore scroll if NOT navigating to anchor
            if (!isNavigatingToAnchor) {
                window.scrollTo(0, scrollPosition);
            }
            
            // Reset flag after restoration
            isNavigatingToAnchor = false;
            
            closeAllDropdowns();
        }

        // THEN toggle visual state
        navLinks.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');

        if (isOpening) {
            // Phase 5: Focus first link for keyboard users
            setTimeout(() => {
                const firstLink = navLinks.querySelector('a');
                if (firstLink) firstLink.focus();
            }, 100);
        }
    }

    // Phase 2: Performance-optimized scroll handler (No layout reads)
    let isTicking = false;
    function handleScroll() {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                const currentScroll = window.pageYOffset;
                if (!header) {
                    isTicking = false;
                    return;
                }

                // Only write to DOM if state changed
                const isScrolled = currentScroll > 50;
                if (isScrolled !== header.classList.contains('scrolled')) {
                    header.classList.toggle('scrolled', isScrolled);
                    // Note: Body padding doesn't need to update on scroll
                    // Header is fixed, and padding is already correct
                }

                const countdownInHeader = countdownBanner && header && header.contains(countdownBanner);
                if (countdownInHeader) {
                    const isBannerScrolling = !countdownBanner.classList.contains('is-scrolling');
                    if (isBannerScrolling) {
                        countdownBanner.classList.add('is-scrolling');
                    }
                    clearTimeout(scrollTimer);
                    scrollTimer = setTimeout(() => {
                        countdownBanner.classList.remove('is-scrolling');
                    }, 250);
                }

                lastScroll = currentScroll;
                isTicking = false;
            });
            isTicking = true;
        }
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
            if (dropdown.dataset.mobileDropdownInit === 'true') return;
            dropdown.dataset.mobileDropdownInit = 'true';

            // Tablet/mobile: tap-to-toggle regardless of touch detection
            if (isTabletOrMobile()) {
                toggle.addEventListener('click', (e) => {
                    const clickedArrow = e.target && e.target.closest && e.target.closest('.dropdown-arrow');

                    // iPad/tablet: allow link navigation, use arrow to toggle
                    if (isTablet()) {
                        if (!clickedArrow) {
                            return; // Allow navigation to About/Ministries
                        }
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
            if (nestedDropdown.dataset.nestedDropdownInit === 'true') return;
            nestedDropdown.dataset.nestedDropdownInit = 'true';

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
            if (dropdown.dataset.keyboardInit === 'true') return;
            dropdown.dataset.keyboardInit = 'true';

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

    function handleDocumentClick(e) {
        if (window.innerWidth > 1024) {
            const isDropdownClick = e.target.closest('.nav-dropdown');
            if (!isDropdownClick) {
                closeAllDropdowns();
            }
        }
    }

    // ============================================
    // CLOSE MOBILE MENU ON REGULAR LINK CLICK
    // ============================================

    // RE-ENABLED for Mobile UX: Close menu when clicking anchor links
    document.querySelectorAll('.nav-links a:not(.nav-dropdown > a)').forEach(link => {
        link.addEventListener('click', (e) => {
            if (navLinks.classList.contains('mobile-open')) {
                const href = link.getAttribute('href');
                // Only close menu for anchor links (#home, #about, etc.)
                // For page links, let browser navigate naturally
                if (href && (href.startsWith('#') || href.includes('#'))) {
                    // Set flag to skip scroll restoration
                    isNavigatingToAnchor = true;
                    // Close menu immediately (no delay)
                    toggleMobileMenu();
                    // Browser will handle anchor navigation naturally
                }
            }
        });
    });

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

    function initializeNavigationSystem() {
        if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
        }

        cleanupGlobalListeners();
        refreshNavElements();

        if (!header || !navLinks) {
            scheduleInitRetry();
            return;
        }

        initAttempts = 0;
        attachHeaderHeightListener();

        updateScrollPadding();
        if (!resizeListenerAdded) {
            window.addEventListener('resize', debouncedUpdateScrollPadding);
            resizeListenerAdded = true;
        }
        if (!orientationListenerAdded) {
            window.addEventListener('orientationchange', updateScrollPadding);
            orientationListenerAdded = true;
        }
        if (!scrollListenerAdded) {
            window.addEventListener('scroll', handleScroll);
            scrollListenerAdded = true;
        }

        if (countdownBanner && 'MutationObserver' in window && !bannerObserver) {
            let bannerMutationTimer;
            bannerObserver = new MutationObserver(() => {
                clearTimeout(bannerMutationTimer);
                bannerMutationTimer = setTimeout(() => {
                    updateScrollPadding();
                    GPBC_updateHeaderTotalHeight();
                }, 150);
            });
            bannerObserver.observe(countdownBanner, { 
                attributes: true, 
                attributeFilter: ['style', 'class'],
                childList: true 
            });
        }

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
            // Phase 4: Initial ARIA state
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            mobileMenuBtn.setAttribute('aria-controls', 'nav-links');
        }
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', toggleMobileMenu);
        }

        if (navLinks) {
            // Phase 5: Initial accessibility tree state
            navLinks.setAttribute('id', 'nav-links');
            if (window.innerWidth <= 1024) {
                navLinks.setAttribute('aria-hidden', 'true');
                navLinks.setAttribute('inert', '');
            }
        }

        if (!outsideClickListenerAdded) {
            document.addEventListener('click', handleDocumentClick);
            outsideClickListenerAdded = true;
        }

        initMobileDropdowns();
        initKeyboardNavigation();
        initThemeToggle();

        navInitialized = true;
        console.log('✓ Global navigation system initialized');
        console.log('✓ Theme toggle initialized');
        document.dispatchEvent(new CustomEvent('gpbc:navReady'));
    }

    if (typeof window !== 'undefined') {
        window.GPBC_initNav = initializeNavigationSystem;
    }

    initializeNavigationSystem();

})();
