// =============================================================================
// SITE FOOTER RENDERER
// Grace and Praise Bangladeshi Church
// Fiddler-inspired footer with CTA band, dynamic columns, social icons
// =============================================================================

import { FOOTER_CONFIG } from './footer.config.js';

// ── Social Media SVG Icons ──
const SOCIAL_ICONS = {
    youtube: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>`,
    
    facebook: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>`,
    
    instagram: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>`
};

// ── Helper: Check if URL is external ──
function isExternalUrl(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

// ── Helper: Create link element with proper attributes ──
function createLink(url, label, extraAttrs = {}) {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = label;
    
    if (isExternalUrl(url)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    }
    
    Object.entries(extraAttrs).forEach(([key, value]) => {
        a.setAttribute(key, value);
    });
    
    return a;
}

// ── Render CTA Actions ──
function renderCtaActions(container) {
    if (!container) return;
    
    const fragment = document.createDocumentFragment();
    
    FOOTER_CONFIG.cta.forEach(cta => {
        const link = createLink(cta.url, cta.label, {
            class: 'footer-btn',
            'aria-label': `${cta.label}: ${cta.description}`
        });
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'footer-btn-icon';
        iconSpan.textContent = cta.icon;
        iconSpan.setAttribute('aria-hidden', 'true');
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'footer-btn-label';
        labelSpan.textContent = cta.label;
        
        link.innerHTML = '';
        link.appendChild(iconSpan);
        link.appendChild(labelSpan);
        
        fragment.appendChild(link);
    });
    
    container.appendChild(fragment);
}

// ── Render Brand Block ──
function renderBrand(container) {
    if (!container) return;
    
    const { brand } = FOOTER_CONFIG;
    
    container.innerHTML = `
        <div class="footer-brand-content">
            <h3 class="footer-brand-name">${brand.name}</h3>
            <p class="footer-brand-name-bn">${brand.nameBengali}</p>
            <p class="footer-brand-tagline">${brand.tagline}</p>
            
            <address class="footer-address">
                <p>${brand.address.street}</p>
                <p>${brand.address.city}</p>
                <p><a href="mailto:${brand.email}">${brand.email}</a></p>
                ${brand.phone ? `<p><a href="tel:${brand.phone.replace(/[^0-9+]/g, '')}">${brand.phone}</a></p>` : ''}
            </address>
            
            <p class="footer-service-time">
                <span class="footer-time-icon" aria-hidden="true">🕐</span>
                <span>${brand.serviceTime}</span>
            </p>
            
            ${brand.directionsUrl ? `
                <a href="${brand.directionsUrl}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="footer-directions-link">
                    Get Directions →
                </a>
            ` : ''}
        </div>
    `;
}

// ── Render Footer Columns ──
function renderColumns(container) {
    if (!container) return;
    
    const fragment = document.createDocumentFragment();
    
    FOOTER_CONFIG.columns.slice(0, 4).forEach(column => {
        const col = document.createElement('div');
        col.className = 'footer-column';
        
        const heading = document.createElement('h3');
        heading.className = 'footer-column-heading';
        heading.textContent = column.heading;
        
        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', `${column.heading} navigation`);
        
        const ul = document.createElement('ul');
        ul.className = 'footer-column-links';
        
        column.links.slice(0, 6).forEach(link => {
            const li = document.createElement('li');
            li.appendChild(createLink(link.url, link.label));
            ul.appendChild(li);
        });
        
        nav.appendChild(ul);
        col.appendChild(heading);
        col.appendChild(nav);
        fragment.appendChild(col);
    });
    
    container.appendChild(fragment);
}

// ── Render Legal Links ──
function renderLegal(container) {
    if (!container) return;
    
    const currentYear = new Date().getFullYear();
    const { legal, legalLinks } = FOOTER_CONFIG;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'footer-legal-content';
    
    // Copyright
    const copyright = document.createElement('p');
    copyright.className = 'footer-copyright';
    copyright.innerHTML = `&copy; ${currentYear} ${legal.copyrightEntity}. All rights reserved.`;
    wrapper.appendChild(copyright);
    
    // Nonprofit notice
    if (legal.nonprofitNotice) {
        const nonprofit = document.createElement('p');
        nonprofit.className = 'footer-nonprofit';
        nonprofit.textContent = legal.nonprofitNotice;
        wrapper.appendChild(nonprofit);
    }
    
    // Legal links
    if (legalLinks && legalLinks.length > 0) {
        const nav = document.createElement('nav');
        nav.className = 'footer-legal-links';
        nav.setAttribute('aria-label', 'Legal navigation');
        
        legalLinks.forEach((link, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'footer-legal-separator';
                separator.textContent = '•';
                separator.setAttribute('aria-hidden', 'true');
                nav.appendChild(separator);
            }
            nav.appendChild(createLink(link.url, link.label));
        });
        
        wrapper.appendChild(nav);
    }
    
    container.appendChild(wrapper);
}

// ── Render Social Links ──
function renderSocial(container) {
    if (!container) return;
    
    const nav = document.createElement('nav');
    nav.className = 'footer-social-links';
    nav.setAttribute('aria-label', 'Social media navigation');
    
    const ul = document.createElement('ul');
    
    FOOTER_CONFIG.social.forEach(social => {
        const li = document.createElement('li');
        
        const a = document.createElement('a');
        a.href = social.url;
        a.className = 'footer-social-link';
        a.setAttribute('aria-label', social.label);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        
        // Icon
        const iconWrapper = document.createElement('span');
        iconWrapper.className = 'footer-social-icon';
        iconWrapper.innerHTML = SOCIAL_ICONS[social.icon] || '';
        
        // Label (visible on desktop, hidden on mobile)
        const labelSpan = document.createElement('span');
        labelSpan.className = 'footer-social-label';
        labelSpan.textContent = social.platform;
        
        a.appendChild(iconWrapper);
        a.appendChild(labelSpan);
        li.appendChild(a);
        ul.appendChild(li);
    });
    
    nav.appendChild(ul);
    container.appendChild(nav);
}

// ── Main Init Function ──
export function initSiteFooter(root = document) {
    console.log('[Footer] Initializing site footer...');
    
    const ctaContainer = root.querySelector('#footerCtaActions');
    const brandContainer = root.querySelector('#footerBrand');
    const columnsContainer = root.querySelector('#footerColumns');
    const legalContainer = root.querySelector('#footerLegal');
    const socialContainer = root.querySelector('#footerSocial');
    
    // ── Idempotency Guard ──
    const footerElement = root.querySelector('[data-partial="site-footer"]');
    if (footerElement?.hasAttribute('data-footer-initialized')) {
        console.log('[Footer] ⚠️ Footer already initialized, skipping');
        return;
    }
    
    try {
        renderCtaActions(ctaContainer);
        renderBrand(brandContainer);
        renderColumns(columnsContainer);
        renderLegal(legalContainer);
        renderSocial(socialContainer);
        
        // Mark as initialized
        if (footerElement) {
            footerElement.setAttribute('data-footer-initialized', 'true');
        }
        
        console.log('[Footer] ✅ Footer initialized successfully');
    } catch (error) {
        console.error('[Footer] ❌ Failed to initialize footer:', error);
    }
}
