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

    // Canonical breakpoint constant (unified across all files)
    const NAV_BREAKPOINT = 1024;

    // Telemetry markers (console only, no external calls)
    const NAV_TELEMETRY = {
        navReadyTime: null,
        firstNavClick: null,
        dropdownToggles: 0,
        fastTapBlocks: 0,
        log(event, data) {
            console.log(`[NAV] ${event}`, data || '');
        }
    };

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

    // Animation lock variables for deterministic tap handling
    let isAnimating = false;
    let lastDropdownToggleTime = 0;
    const DEBOUNCE_MS = 300;
    let isNavigatingToAnchor = false;
    let outsideClickListenerAdded = false;
    let retryTimeout = null;
    let initAttempts = 0;
    const MAX_INIT_ATTEMPTS = 3;
    const root = document.documentElement;

    // FORCE CSS OVERRIDE FOR MOBILE DROPDOWN CONTRAST
    // This ensures white text regardless of theme or other CSS files
    const mobileContrastStyle = document.createElement('style');
    mobileContrastStyle.innerHTML = `
        /* Nuclear Option for Mobile Dropdown Text Visibility */
        body .nav-links.mobile-open .nav-dropdown .dropdown-menu a,
        body .nav-links.mobile-open .nav-dropdown .dropdown-menu a:visited,
        body .nav-links.mobile-open .nav-dropdown .dropdown-menu a:hover {
            color: #ffffff !important;
            text-shadow: 0 1px 3px rgba(0,0,0,0.8) !important;
            font-weight: 500 !important;
            background: rgba(255, 255, 255, 0.1) !important;
            -webkit-text-fill-color: #ffffff !important;
        }
    `;
    document.head.appendChild(mobileContrastStyle);

    // Phase 4: Deterministic State Machine
    let currentNavMode = 'UNKNOWN'; // 'MOBILE' | 'DESKTOP'
    let lastModeChangeTime = 0;

    function getNavMode() {
        return window.innerWidth <= NAV_BREAKPOINT ? 'MOBILE' : 'DESKTOP';
    }

    function applyNavModeIfChanged() {
        const newMode = getNavMode();
        if (newMode === currentNavMode) return;

        // console.log(`[NAV] Mode transition: ${currentNavMode} -> ${newMode}`);
        currentNavMode = newMode;
        lastModeChangeTime = Date.now();

        // RECONCILE UI STATE
        if (newMode === 'DESKTOP') {
            // Switching to Desktop: Clean up mobile mess
            if (navLinks.classList.contains('mobile-open')) {
                toggleMobileMenu(); // Close menu
            }
            closeAllDropdowns(); // Reset dropdowns
            navLinks.style.transition = 'none'; // Prevent layout thrashing animation
            setTimeout(() => { navLinks.style.transition = ''; }, 50);
        } else {
            // Switching to Mobile: Reset state
            closeAllDropdowns();
            // Ensure proper ARIA state
            if (navLinks) {
                navLinks.setAttribute('aria-hidden', 'true');
                navLinks.setAttribute('inert', '');
            }
        }

        // Expose diagnostics
        if (typeof window !== 'undefined') {
            window.__NAV_DIAG__ = {
                mode: currentNavMode,
                lastChange: lastModeChangeTime,
                width: window.innerWidth
            };
        }
    }

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

            // Phase 4: Update ARIA expanded BEFORE visual transition
            mobileMenuBtn.setAttribute('aria-expanded', 'true');
            // Phase 5: Ensure menu is visible to accessibility tree
            navLinks.removeAttribute('aria-hidden');
            navLinks.removeAttribute('inert');

            // Set animation lock - reduce for tablet (150ms vs 300ms)
            const isTabletWidth = window.innerWidth >= 769 && window.innerWidth <= 1024;
            const lockDuration = isTabletWidth ? 150 : 300;
            isAnimating = true;

            // Release animation lock after transition completes
            const releaseAnimationLock = () => {
                isAnimating = false;
                navLinks.removeEventListener('transitionend', releaseAnimationLock);
            };
            navLinks.addEventListener('transitionend', releaseAnimationLock);

            // Fallback timeout in case transitionend doesn't fire
            setTimeout(() => {
                if (isAnimating) {
                    isAnimating = false;
                    navLinks.removeEventListener('transitionend', releaseAnimationLock);
                }
            }, lockDuration + 100);
        } else {
            // Phase 4: Update ARIA expanded BEFORE visual transition
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            // Phase 5: Hide menu from accessibility tree when closed
            navLinks.setAttribute('aria-hidden', 'true');
            navLinks.setAttribute('inert', '');

            // Only restore scroll if NOT navigating to anchor
            if (!isNavigatingToAnchor) {
                window.scrollTo({ top: scrollPosition, left: 0, behavior: 'auto' });
            }

            // Reset flag after restoration
            isNavigatingToAnchor = false;

            closeAllDropdowns();

            // Set animation lock
            isAnimating = true;
        }

        // THEN toggle visual state
        navLinks.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');

        // Release animation lock after transition completes
        const releaseAnimationLock = () => {
            isAnimating = false;
            navLinks.removeEventListener('transitionend', releaseAnimationLock);
        };
        navLinks.addEventListener('transitionend', releaseAnimationLock);

        // TABLET DETERMINISTIC: Reduced lock duration for faster interaction
        const isTabletWidth = window.innerWidth >= 769 && window.innerWidth <= 1024;
        const lockDuration = isTabletWidth ? 150 : 400;

        // Fallback: force release after duration if transitionend doesn't fire
        setTimeout(() => {
            if (isAnimating) {
                isAnimating = false;
                NAV_TELEMETRY.log('ANIMATION_LOCK_FALLBACK', `${lockDuration}ms timeout`);
            }
        }, lockDuration);

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
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) menu.style.display = '';

            const toggle = dropdown.querySelector('a');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function initDelegatedNavigation() {
        if (navLinks.dataset.delegatedInit === 'true') return;
        navLinks.dataset.delegatedInit = 'true';

        // SINGLE DELEGATED HANDLER FOR ALL NAV INTERACTIONS
        navLinks.addEventListener('click', (e) => {
            const target = e.target;
            const link = target.closest('a');

            // 1. If not a link/toggle, ignore
            if (!link) return;

            // DEBUG
            // updateDebugLog(`Click: ${link.textContent.trim().substring(0, 15)}... Class: ${link.className}`);

            // 2. Check Mode - dynamic runtime check
            const mode = getNavMode();

            // 3. Identification
            const parentDropdown = link.closest('.nav-dropdown');
            const isToggle = parentDropdown && link.parentNode === parentDropdown;
            const isNestedToggle = link.closest('.nav-dropdown-nested') && link.classList.contains('dropdown-arrow'); // Nested arrows often handle click

            // ============================================
            // MOBILE / TABLET INTERACTION MODEL
            // ============================================
            if (mode === 'MOBILE') {
                // Handle Top-Level Dropdown Toggles
                if (isToggle) {
                    e.preventDefault();
                    e.stopPropagation();

                    // GATE 1: Menu must be open
                    if (!navLinks.classList.contains('mobile-open')) return;

                    // GATE 2: Animation Lock
                    const parentHref = link.getAttribute('href');
                    const isOpen = parentDropdown.classList.contains('mobile-dropdown-open');
                    const isNavigationIntent = isOpen && parentHref && parentHref !== '#' && !parentHref.startsWith('javascript:');

                    if (isAnimating && !isNavigationIntent) {
                        NAV_TELEMETRY.fastTapBlocks++;
                        return;
                    }

                    // GATE 3: Debounce
                    const now = Date.now();
                    // updateDebugLog(`DEBOUNCE: ${now - lastDropdownToggleTime}ms`); 

                    if ((now - lastDropdownToggleTime) < DEBOUNCE_MS && !isNavigationIntent) {
                        // updateDebugLog(`BLOCKED: Debounce`);
                        return;
                    }

                    // ROUTING: Double Tap
                    if (isNavigationIntent) {
                        NAV_TELEMETRY.log('DOUBLE_TAP_NAVIGATE', parentHref);
                        window.location.href = parentHref;
                        return;
                    }

                    // TOGGLE LOGIC
                    lastDropdownToggleTime = now;
                    NAV_TELEMETRY.dropdownToggles++;

                    // Accordion: Close others
                    navDropdowns.forEach(d => {
                        if (d !== parentDropdown) {
                            d.classList.remove('mobile-dropdown-open');
                            // Hammer Fix cleanup
                            const m = d.querySelector('.dropdown-menu');
                            if (m) m.style.display = '';
                            d.querySelector('a')?.setAttribute('aria-expanded', 'false');
                        }
                    });

                    // Toggle Current
                    parentDropdown.classList.toggle('mobile-dropdown-open');
                    const newState = parentDropdown.classList.contains('mobile-dropdown-open');

                    // Hammer Fix: Force Display
                    const thisMenu = parentDropdown.querySelector('.dropdown-menu');
                    if (thisMenu) {
                        thisMenu.style.display = newState ? 'grid' : '';
                    }

                    link.setAttribute('aria-expanded', newState);
                    return;
                }

                // Handle Nested Dropdowns (Ministries, etc)
                // Note: The original code attached listener to the arrow. 
                // We need to detect if the click is on the arrow or the link acting as toggle.
                // Assuming nested structure: .nav-dropdown-nested > a > .dropdown-arrow
                if (target.classList.contains('dropdown-arrow') || link.closest('.nav-dropdown-nested a')) {
                    const nestedDropdown = link.closest('.nav-dropdown-nested');
                    if (nestedDropdown) {
                        // Only trap if it's strictly a toggle action (often defined by arrow click on nested)
                        // Or if the design dictates the link itself is the toggle.
                        // Looking at previous code: "arrow.addEventListener('click'...)"
                        if (target.classList.contains('dropdown-arrow')) {
                            e.preventDefault();
                            e.stopPropagation();
                            nestedDropdown.classList.toggle('mobile-dropdown-open');
                            const expanded = nestedDropdown.classList.contains('mobile-dropdown-open');
                            link.setAttribute('aria-expanded', expanded);
                            return;
                        }
                    }
                }
            }

            // ============================================
            // SHARED / DESKTOP / LINK CLICK
            // ============================================
            // If we are here, it's a standard link click or desktop hover interaction (handled by CSS)
            // Just need to handle Mobile Menu Auto-Close for anchors
            if (mode === 'MOBILE') {
                const href = link.getAttribute('href');
                if (href && (href.startsWith('#') || href.includes('#'))) {
                    isNavigatingToAnchor = true;
                    toggleMobileMenu();
                }
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

    // 🆕 CRITICAL FIX: Close Mobile Menu when clicking Logo
    // The logo is outside .nav-links so it needs its own listener
    const projectLogo = document.querySelector('.logo');
    if (projectLogo) {
        projectLogo.addEventListener('click', (e) => {
            if (navLinks && navLinks.classList.contains('mobile-open')) {
                // If menu is open, this click acts as "Home" navigation AND "Close Menu"
                // If href is just #home, we toggle closed.
                isNavigatingToAnchor = true;
                toggleMobileMenu();
            }
        });
    }

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

                // console.log(`✓ Switched to ${nextTheme} mode`); // Removed for production

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
            window.addEventListener('resize', () => {
                debouncedUpdateScrollPadding();
                // Phase 4: Debounced Mode Check
                debounce(applyNavModeIfChanged, 150)();
            });
            resizeListenerAdded = true;
        }
        if (!orientationListenerAdded) {
            window.addEventListener('orientationchange', () => {
                // FORCE LAYOUT REFLOW
                document.body.style.display = 'none';
                document.body.offsetHeight; // force reflow
                document.body.style.display = '';

                updateScrollPadding();
                applyNavModeIfChanged(); // Immediate check on orientation
                setTimeout(applyNavModeIfChanged, 300); // Safety check after rotation animation
            });
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
            if (window.innerWidth <= NAV_BREAKPOINT) {
                navLinks.setAttribute('aria-hidden', 'true');
                navLinks.setAttribute('inert', '');
            }
        }

        if (!outsideClickListenerAdded) {
            document.addEventListener('click', handleDocumentClick);
            outsideClickListenerAdded = true;
        }

        initDelegatedNavigation();
        initKeyboardNavigation();
        initThemeToggle();

        navInitialized = true;

        // Telemetry: Record nav ready time
        NAV_TELEMETRY.navReadyTime = Date.now();
        NAV_TELEMETRY.log('NAV_READY', {
            timestamp: NAV_TELEMETRY.navReadyTime,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            isMobile: window.innerWidth <= NAV_BREAKPOINT
        });

        // Track first navigation click
        if (!NAV_TELEMETRY.firstNavClick) {
            document.querySelector('.nav-links')?.addEventListener('click', (e) => {
                if (!NAV_TELEMETRY.firstNavClick && e.target.tagName === 'A') {
                    NAV_TELEMETRY.firstNavClick = {
                        timestamp: Date.now(),
                        target: e.target.textContent.trim(),
                        href: e.target.getAttribute('href'),
                        timeSinceReady: Date.now() - NAV_TELEMETRY.navReadyTime
                    };
                    NAV_TELEMETRY.log('FIRST_NAV_CLICK', NAV_TELEMETRY.firstNavClick);
                }
            });
        }

        document.dispatchEvent(new CustomEvent('gpbc:navReady'));
    }

    if (typeof window !== 'undefined') {
        window.GPBC_initNav = initializeNavigationSystem;
        window.GPBC_NAV_TELEMETRY = NAV_TELEMETRY; // Expose telemetry for debugging
    }

    initializeNavigationSystem();

})();
