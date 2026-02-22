import { footerConfig } from './footer.config.js';

export function initSiteFooter() {
    const footerElement = document.getElementById('site-footer');

    // Idempotency guard
    if (!footerElement || footerElement.getAttribute('data-footer-initialized') === 'true') {
        return;
    }

    renderCtaBand();
    renderNavGrids();
    renderBottomBar();

    // Mark as initialized
    footerElement.setAttribute('data-footer-initialized', 'true');
}

function renderCtaBand() {
    const container = document.getElementById('footer-cta-actions');
    if (!container) return;

    let html = '';
    footerConfig.ctaActions.forEach(action => {
        const primaryClass = action.primary ? 'primary-btn' : 'secondary-btn';
        html += `<a href="${action.url}" class="footer-btn ${primaryClass}">${action.label}</a>`;
    });
    container.innerHTML = html;
}

function renderNavGrids() {
    // Visit
    const visitContainer = document.getElementById('footer-nav-visit');
    if (visitContainer) {
        visitContainer.innerHTML += buildLinkList(footerConfig.navGroups.visit);
    }
    // Connect
    const connectContainer = document.getElementById('footer-nav-connect');
    if (connectContainer) {
        connectContainer.innerHTML += buildLinkList(footerConfig.navGroups.connect);
    }
    // Devotions
    const devotionsContainer = document.getElementById('footer-nav-devotions');
    if (devotionsContainer) {
        devotionsContainer.innerHTML += buildLinkList(footerConfig.navGroups.devotions);
    }
    // Resources
    const resourcesContainer = document.getElementById('footer-nav-resources');
    if (resourcesContainer) {
        resourcesContainer.innerHTML += buildLinkList(footerConfig.navGroups.resources);
    }
}

function buildLinkList(links) {
    let html = '<ul class="footer-link-list">';
    links.forEach(link => {
        html += `<li><a href="${link.url}" class="footer-link">${link.label}</a></li>`;
    });
    html += '</ul>';
    return html;
}

function renderBottomBar() {
    // Auto Year
    const yearSpan = document.getElementById('footer-auto-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Legal Links
    const legalContainer = document.getElementById('footer-legal-links');
    if (legalContainer) {
        let html = '';
        footerConfig.legalLinks.forEach((link, idx) => {
            html += `<a href="${link.url}" class="footer-legal-link">${link.label}</a>`;
            if (idx < footerConfig.legalLinks.length - 1) {
                html += '<span class="footer-legal-divider">|</span>';
            }
        });
        legalContainer.innerHTML = html;
    }

    // Social Links
    const socialContainer = document.getElementById('footer-social-row');
    if (socialContainer) {
        let html = '';
        footerConfig.socialLinks.forEach(social => {
            html += `
                <a href="${social.url}" 
                   class="footer-social-link" 
                   aria-label="${social.label}" 
                   target="_blank" 
                   rel="noopener noreferrer">
                    ${getSocialIconSvg(social.platform)}
                </a>
            `;
        });
        socialContainer.innerHTML = html;
    }
}

function getSocialIconSvg(platform) {
    switch (platform) {
        case 'youtube':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>`;
        case 'facebook':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
            </svg>`;
        case 'instagram':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>`;
        case 'tiktok':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.12-3.44-3.17-3.64-5.46-.24-2.42.84-4.8 2.74-6.09 1.55-1.05 3.51-1.33 5.34-1.02v4.21c-.48-.15-.99-.21-1.49-.12-1.07.12-2.02.85-2.31 1.88-.2 1.05.04 2.19.8 2.91.73.69 1.83.83 2.76.43.83-.34 1.34-1.19 1.35-2.08.01-4.73 0-9.46.01-14.19z"/>
            </svg>`;
        default:
            return '';
    }
}
