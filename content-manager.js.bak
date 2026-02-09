/**
 * Content Manager for GPBC Website
 * Loads content from content.json and updates the DOM
 * Falls back to HTML content if JSON fails to load
 * 
 * Usage: Include this script with defer attribute
 * <script src="content-manager.js" defer></script>
 */

(function() {
    'use strict';
    
    // Configuration
    const CONTENT_URL = 'content.json';
    const CACHE_KEY = 'gpbc-content-cache';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    /**
     * Load content from JSON file with caching
     */
    async function loadContent() {
        try {
            // Check cache first
            const cached = getCachedContent();
            if (cached) {
                return cached;
            }
            
            // Fetch fresh content
            const response = await fetch(CONTENT_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const content = await response.json();
            
            // Cache the content
            cacheContent(content);
            
            return content;
        } catch (error) {
            console.warn('Failed to load content.json, using fallback HTML content:', error);
            return null;
        }
    }
    
    /**
     * Get cached content if still valid
     */
    function getCachedContent() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            
            const { content, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache is still valid
            if (now - timestamp < CACHE_DURATION) {
                return content;
            }
            
            // Cache expired
            localStorage.removeItem(CACHE_KEY);
            return null;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Cache content with timestamp
     */
    function cacheContent(content) {
        try {
            const cacheData = {
                content: content,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            // localStorage might be full or disabled
            console.warn('Failed to cache content:', error);
        }
    }
    
    /**
     * Safely update text content of an element
     */
    function updateText(selector, text, fallbackText = null) {
        const element = document.querySelector(selector);
        if (element && text) {
            // Store original text as fallback if not already set
            if (!element.dataset.fallback) {
                element.dataset.fallback = element.textContent.trim();
            }
            element.textContent = text;
            return true;
        }
        return false;
    }
    
    /**
     * Safely update attribute of an element
     */
    function updateAttribute(selector, attribute, value) {
        const element = document.querySelector(selector);
        if (element && value) {
            element.setAttribute(attribute, value);
            return true;
        }
        return false;
    }
    
    /**
     * Update homepage content
     */
    function updateHomepage(content) {
        if (!content) return;
        
        // Update next service
        if (content.services?.sunday) {
            const service = content.services.sunday;
            updateText('.service-title', service.name);
            updateText('.service-time', `📅 ${service.displayText}`);
            updateText('.service-badge', service.type);
        }
        
        // Update welcome section
        if (content.homepage) {
            updateText('#welcome .section-title', content.homepage.welcomeTitle);
            updateText('#welcome .section-subtitle', content.homepage.welcomeSubtitle);
        }
        
        // Update hero
        if (content.church) {
            updateText('.hero h1', content.church.name);
            updateText('.hero .tagline', content.church.tagline);
            updateText('.hero .address', `📍 ${content.church.address.fullAddress}`);
        }
        
        // Update stats (if numbers changed)
        if (content.stats) {
            const statNumbers = document.querySelectorAll('.stat-number');
            const stats = [
                content.stats.members,
                content.stats.eventsPerYear,
                content.stats.yearsServing,
                content.stats.lovePercentage
            ];
            
            statNumbers.forEach((el, index) => {
                if (stats[index] !== undefined) {
                    el.setAttribute('data-count', stats[index]);
                }
            });
        }
    }
    
    /**
     * Update plan visit page content
     */
    function updatePlanVisit(content) {
        if (!content) return;
        
        // Update hero subtitle (English only, bilingual handled separately)
        const heroSubtitle = document.querySelector('.hero-subtitle [data-lang="en"]');
        if (heroSubtitle && content.planVisit?.heroSubtitle) {
            heroSubtitle.textContent = content.planVisit.heroSubtitle;
        }
        
        // Update service time
        if (content.services?.sunday) {
            const service = content.services.sunday;
            const serviceTimeEn = document.querySelector('.info-item:nth-child(1) p:nth-child(2) [data-lang="en"]');
            if (serviceTimeEn) {
                serviceTimeEn.textContent = service.displayText;
            }
            
            const serviceDuration = document.querySelector('.info-item:nth-child(1) p:nth-child(3) [data-lang="en"]');
            if (serviceDuration) {
                serviceDuration.textContent = `Services last about ${service.duration}`;
            }
        }
        
        // Update address
        if (content.church?.address) {
            const addressElements = document.querySelectorAll('.hero-address, .service-location');
            addressElements.forEach(el => {
                if (el) {
                    el.textContent = `📍 ${content.church.address.fullAddress}`;
                }
            });
        }
        
        // Update video caption
        if (content.planVisit?.videoCaption) {
            const captionEn = document.querySelector('.video-caption [data-lang="en"]');
            if (captionEn) {
                captionEn.textContent = content.planVisit.videoCaption;
            }
        }
        
        // Update post-video invitation
        if (content.planVisit?.postVideoInvitation) {
            const invitationEn = document.querySelector('.next-step-text [data-lang="en"]');
            if (invitationEn) {
                invitationEn.textContent = content.planVisit.postVideoInvitation;
            }
        }
    }
    
    /**
     * Update footer content on all pages
     */
    function updateFooter(content) {
        if (!content) return;
        
        // Update copyright
        if (content.footer?.copyright) {
            const copyrightElements = document.querySelectorAll('.footer-bottom p:first-child');
            copyrightElements.forEach(el => {
                if (el) el.textContent = content.footer.copyright;
            });
        }
        
        // Update email links
        if (content.footer?.email) {
            const emailLinks = document.querySelectorAll('a[href^="mailto:info@"]');
            emailLinks.forEach(link => {
                link.href = `mailto:${content.footer.email}`;
                if (link.textContent.includes('@')) {
                    link.textContent = content.footer.email;
                }
            });
        }
    }
    
    /**
     * Initialize content management
     */
    async function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Load content
        const content = await loadContent();
        
        if (!content) {
            console.info('Using fallback HTML content');
            return;
        }
        
        console.info('Loaded content from content.json');
        
        // Update based on current page
        const path = window.location.pathname;
        
        if (path.includes('index.html') || path.endsWith('/')) {
            updateHomepage(content);
        } else if (path.includes('plan-visit.html')) {
            updatePlanVisit(content);
        }
        
        // Always update footer (common to all pages)
        updateFooter(content);
    }
    
    // Start initialization
    init();
    
    // Expose refresh function for manual updates
    window.GPBC = window.GPBC || {};
    window.GPBC.refreshContent = function() {
        localStorage.removeItem(CACHE_KEY);
        return init();
    };
    
})();
