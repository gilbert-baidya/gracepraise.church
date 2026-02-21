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
    let keydownListenerAdded = false;

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
    // Scope strictly to mobile-open dropdown states so desktop light mode is unaffected.
    const mobileContrastStyle = document.createElement('style');
    mobileContrastStyle.innerHTML = `
        @media (max-width: 1024px) {
            /* Keep submenu container transparent in the mobile overlay */
            body .nav-links .nav-dropdown.mobile-dropdown-open > .dropdown-menu,
            body .nav-links .nav-dropdown.mobile-dropdown-open > ul.dropdown-menu,
            body .nav-links .nav-dropdown-nested.mobile-dropdown-open > .dropdown-menu-nested,
            body .nav-links .nav-dropdown-nested.mobile-dropdown-open > ul.dropdown-menu-nested,
            body.menu-open .nav-links.mobile-open .nav-dropdown.mobile-dropdown-open > .dropdown-menu,
            body.menu-open .nav-links.mobile-open .nav-dropdown.mobile-dropdown-open > ul.dropdown-menu,
            body.menu-open .nav-links.mobile-open .nav-dropdown-nested.mobile-dropdown-open > .dropdown-menu-nested,
            body.menu-open .nav-links.mobile-open .nav-dropdown-nested.mobile-dropdown-open > ul.dropdown-menu-nested {
                background: transparent !important;
                background-color: transparent !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }

            /* High-contrast mobile dropdown pills */
            body .nav-links .nav-dropdown.mobile-dropdown-open > .dropdown-menu > li > a,
            body .nav-links .nav-dropdown.mobile-dropdown-open > ul.dropdown-menu > li > a,
            body .nav-links .nav-dropdown-nested.mobile-dropdown-open > .dropdown-menu-nested > li > a,
            body .nav-links .nav-dropdown-nested.mobile-dropdown-open > ul.dropdown-menu-nested > li > a,
            body.menu-open .nav-links.mobile-open .nav-dropdown.mobile-dropdown-open > .dropdown-menu > li > a,
            body.menu-open .nav-links.mobile-open .nav-dropdown.mobile-dropdown-open > ul.dropdown-menu > li > a,
            body.menu-open .nav-links.mobile-open .nav-dropdown-nested.mobile-dropdown-open > .dropdown-menu-nested > li > a,
            body.menu-open .nav-links.mobile-open .nav-dropdown-nested.mobile-dropdown-open > ul.dropdown-menu-nested > li > a {
                color: #f8fafc !important;
                background: linear-gradient(135deg, rgba(51, 65, 85, 0.9), rgba(30, 41, 59, 0.92)) !important;
                border: 1px solid rgba(148, 163, 184, 0.16) !important;
                border-radius: 14px !important;
                text-shadow: none !important;
                -webkit-text-fill-color: #f8fafc !important;
            }

            body .nav-links .nav-dropdown.mobile-dropdown-open > .dropdown-menu > li > a:hover,
            body .nav-links .nav-dropdown.mobile-dropdown-open > ul.dropdown-menu > li > a:hover,
            body .nav-links .nav-dropdown.mobile-dropdown-open > .dropdown-menu > li > a:focus-visible,
            body .nav-links .nav-dropdown.mobile-dropdown-open > ul.dropdown-menu > li > a:focus-visible,
            body .nav-links .nav-dropdown-nested.mobile-dropdown-open > .dropdown-menu-nested > li > a:hover,
            body .nav-links .nav-dropdown-nested.mobile-dropdown-open > ul.dropdown-menu-nested > li > a:hover,
            body .nav-links .nav-dropdown-nested.mobile-dropdown-open > .dropdown-menu-nested > li > a:focus-visible,
            body .nav-links .nav-dropdown-nested.mobile-dropdown-open > ul.dropdown-menu-nested > li > a:focus-visible,
            body.menu-open .nav-links.mobile-open .nav-dropdown.mobile-dropdown-open > .dropdown-menu > li > a:hover,
            body.menu-open .nav-links.mobile-open .nav-dropdown.mobile-dropdown-open > ul.dropdown-menu > li > a:hover,
            body.menu-open .nav-links.mobile-open .nav-dropdown.mobile-dropdown-open > .dropdown-menu > li > a:focus-visible,
            body.menu-open .nav-links.mobile-open .nav-dropdown.mobile-dropdown-open > ul.dropdown-menu > li > a:focus-visible,
            body.menu-open .nav-links.mobile-open .nav-dropdown-nested.mobile-dropdown-open > .dropdown-menu-nested > li > a:hover,
            body.menu-open .nav-links.mobile-open .nav-dropdown-nested.mobile-dropdown-open > ul.dropdown-menu-nested > li > a:hover,
            body.menu-open .nav-links.mobile-open .nav-dropdown-nested.mobile-dropdown-open > .dropdown-menu-nested > li > a:focus-visible,
            body.menu-open .nav-links.mobile-open .nav-dropdown-nested.mobile-dropdown-open > ul.dropdown-menu-nested > li > a:focus-visible {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98)) !important;
                color: #ffffff !important;
                -webkit-text-fill-color: #ffffff !important;
            }
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
        if (keydownListenerAdded) {
            document.removeEventListener('keydown', handleGlobalKeydown);
            keydownListenerAdded = false;
        }
        if (mobileMenuBtn) {
            mobileMenuBtn.removeEventListener('click', toggleMobileMenu);
        }
        if (mobileOverlay) {
            mobileOverlay.removeEventListener('click', toggleMobileMenu);
        }
        navInitialized = false;
        if (typeof window !== 'undefined') {
            window.PLATFORM_NAV_READY = false;
        }
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
            const toggle = dropdown.querySelector('a');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function inferHrefPrefix() {
        const navAnchors = document.querySelectorAll('.nav-links a[href]');
        for (const anchor of navAnchors) {
            const rawHref = (anchor.getAttribute('href') || '').trim();
            if (!rawHref ||
                rawHref.startsWith('#') ||
                rawHref.startsWith('javascript:') ||
                rawHref.startsWith('mailto:') ||
                rawHref.startsWith('tel:')) {
                continue;
            }

            if (rawHref.startsWith('/')) return '/';
            if (/^https?:\/\//i.test(rawHref) || rawHref.startsWith('//')) return '';

            const noQuery = rawHref.split('?')[0].split('#')[0];
            const lastSlash = noQuery.lastIndexOf('/');
            return lastSlash >= 0 ? noQuery.slice(0, lastSlash + 1) : '';
        }
        return '';
    }

    function ensureDevotionDropdownLinks() {
        const prefix = inferHrefPrefix();
        const devotionDropdowns = navDropdowns.filter(dropdown => {
            const toggle = dropdown.querySelector('a');
            return toggle && /devotion/i.test((toggle.textContent || '').trim());
        });

        devotionDropdowns.forEach(dropdown => {
            let menu = dropdown.querySelector('.dropdown-menu');
            if (!menu) {
                menu = document.createElement('ul');
                menu.className = 'dropdown-menu';
                dropdown.appendChild(menu);
            }

            const hasToday = !!menu.querySelector('a[href*="daily-devotion.html"]');
            const hasLent = !!menu.querySelector('a[href*="fasting-40days.html"], a[href*="lent-fasting.html"]');

            if (!hasToday) {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.href = `${prefix}daily-devotion.html`;
                link.textContent = "Today's Devotion";
                item.appendChild(link);
                menu.appendChild(item);
            }

            if (!hasLent) {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.href = `${prefix}fasting-40days.html`;
                link.textContent = 'Lent - 40 Days';
                item.appendChild(link);
                menu.appendChild(item);
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
                    const hitArrow = target.classList.contains('dropdown-arrow') || target.closest('.dropdown-arrow');
                    const href = link.getAttribute('href');
                    const isAnchor = !href || href === '#' || href.startsWith('javascript:');

                    // SPLIT INTERACTION:
                    // 1. Text Click + Valid URL -> Navigate (allow default)
                    // 2. Arrow Click OR Anchor -> Toggle Dropdown

                    if (!hitArrow && !isAnchor) {
                        // Navigation Intent - Let event bubble
                        NAV_TELEMETRY.log('NAV_CLICK', href);
                        return;
                    }

                    // TOGGLE INTENT
                    e.preventDefault();
                    e.stopPropagation();

                    // GATE 1: Menu must be open
                    if (!navLinks.classList.contains('mobile-open')) return;

                    // GATE 2: Animation Lock
                    if (isAnimating) {
                        NAV_TELEMETRY.fastTapBlocks++;
                        return;
                    }

                    // GATE 3: Debounce
                    const now = Date.now();
                    if ((now - lastDropdownToggleTime) < 200) {
                        return;
                    }

                    // TOGGLE LOGIC
                    lastDropdownToggleTime = now;
                    NAV_TELEMETRY.dropdownToggles++;

                    // Accordion: Close others
                    navDropdowns.forEach(d => {
                        if (d !== parentDropdown) {
                            d.classList.remove('mobile-dropdown-open');
                            d.querySelector('a')?.setAttribute('aria-expanded', 'false');
                        }
                    });

                    // Toggle Current
                    parentDropdown.classList.toggle('mobile-dropdown-open');
                    const newState = parentDropdown.classList.contains('mobile-dropdown-open');

                    // Let CSS handle display via mobile-dropdown-open class
                    link.setAttribute('aria-expanded', newState);
                    return;
                }

                // Handle Nested Dropdowns
                if (link.closest('.nav-dropdown-nested')) {
                    const nestedDropdown = link.closest('.nav-dropdown-nested');
                    const hitArrow = target.classList.contains('dropdown-arrow') || target.closest('.dropdown-arrow');

                    if (hitArrow && nestedDropdown) {
                        e.preventDefault();
                        e.stopPropagation();
                        nestedDropdown.classList.toggle('mobile-dropdown-open');
                        const expanded = nestedDropdown.classList.contains('mobile-dropdown-open');
                        link.setAttribute('aria-expanded', expanded);
                        return;
                    }
                }
            }

            // ============================================
            // SHARED / DESKTOP / LINK CLICK
            // ============================================
            // If we are here, it's a standard link click or desktop hover interaction (handled by CSS)
            // Mobile rule: close menu on any real navigation click
            if (mode === 'MOBILE') {
                const href = (link.getAttribute('href') || '').trim();
                const isNavigationLink = !!href && href !== '#' && !href.startsWith('javascript:');

                if (isNavigationLink && navLinks.classList.contains('mobile-open')) {
                    if (href.startsWith('#') || href.includes('#')) {
                        isNavigatingToAnchor = true;
                    }
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
        const mode = getNavMode();
        if (mode === 'DESKTOP') {
            const isDropdownClick = e.target.closest('.nav-dropdown');
            if (!isDropdownClick) closeAllDropdowns();
            return;
        }

        if (!navLinks || !navLinks.classList.contains('mobile-open')) return;

        const clickedInsideMenu = e.target.closest('.nav-links');
        const clickedBurger = e.target.closest('.mobile-menu-btn');
        const clickedOverlay = e.target.closest('.mobile-overlay');
        const clickedLogo = e.target.closest('.logo');

        // Overlay already has its own click handler; skip duplicate toggle.
        if (clickedOverlay) return;

        if (!clickedInsideMenu && !clickedBurger) {
            toggleMobileMenu();
        } else if (clickedLogo) {
            toggleMobileMenu();
        }
    }

    function handleGlobalKeydown(e) {
        if (e.key === 'Escape') {
            closeAllDropdowns();
            if (navLinks && navLinks.classList.contains('mobile-open')) {
                e.preventDefault();
                toggleMobileMenu();
            }
        }
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
            if (darkModeToggle.dataset.themeInit === 'true') return;
            darkModeToggle.dataset.themeInit = 'true';
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
        if (!keydownListenerAdded) {
            document.addEventListener('keydown', handleGlobalKeydown);
            keydownListenerAdded = true;
        }

        ensureDevotionDropdownLinks();
        initDelegatedNavigation();
        initKeyboardNavigation();
        initThemeToggle();

        navInitialized = true;
        if (typeof window !== 'undefined') {
            window.PLATFORM_NAV_READY = true;
        }

        // Telemetry: Record nav ready time
        NAV_TELEMETRY.navReadyTime = Date.now();
        NAV_TELEMETRY.log('NAV_READY', {
            timestamp: NAV_TELEMETRY.navReadyTime,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            isMobile: window.innerWidth <= NAV_BREAKPOINT
        });

        document.dispatchEvent(new CustomEvent('gpbc:navReady'));
    }

    if (typeof window !== 'undefined') {
        window.GPBC_initNav = initializeNavigationSystem;
        window.GPBC_NAV_TELEMETRY = NAV_TELEMETRY; // Expose telemetry for debugging
        if (window.Platform && typeof window.Platform.registerNavigationInitializer === 'function') {
            window.Platform.registerNavigationInitializer(initializeNavigationSystem);
        }
    }

    if (!(typeof window !== 'undefined' &&
        window.PLATFORM_RUNTIME_READY === true &&
        window.Platform &&
        typeof window.Platform.initNavigation === 'function')) {
        initializeNavigationSystem();
    }

})();
