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
 * @version 1.0.0
 * @locked true
 */

(function() {
    'use strict';

    // ============================================
    // NAVIGATION LOCK — DO NOT MODIFY WITHOUT REVIEW
    // ============================================

    // Navigation elements
    const header = document.querySelector('header');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const mobileOverlay = document.querySelector('.mobile-overlay');
    const navDropdowns = document.querySelectorAll('.nav-dropdown');
    const navNestedDropdowns = document.querySelectorAll('.nav-dropdown-nested');

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
    });

    // ============================================
    // MOBILE MENU TOGGLE
    // ============================================
    
    function toggleMobileMenu() {
        navLinks.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
        
        // Close all dropdowns when mobile menu closes
        if (!navLinks.classList.contains('mobile-open')) {
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
        navDropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector(':scope > a');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            if (!toggle || !menu) return;
            
            // Prevent default link behavior on mobile for parent dropdown link
            toggle.addEventListener('click', (e) => {
                // Only prevent default and toggle on mobile (≤768px)
                if (window.innerWidth <= 768) {
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
                    
                    // Toggle current dropdown
                    const isOpen = dropdown.classList.toggle('mobile-dropdown-open');
                    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                }
            });
            
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
            const menu = nestedDropdown.querySelector('.dropdown-menu-nested');
            
            if (!toggle || !menu) return;
            
            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Toggle nested dropdown
                    const isOpen = nestedDropdown.classList.toggle('mobile-dropdown-open');
                    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                }
            });
            
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
    // INITIALIZATION
    // ============================================
    
    // Initialize dropdown functionality
    initMobileDropdowns();
    initKeyboardNavigation();

    // ============================================
    // NAVIGATION LOCK — DO NOT MODIFY WITHOUT REVIEW
    // ============================================

    console.log('✓ Global navigation system initialized');

})();
