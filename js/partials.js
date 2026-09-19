(() => {
    const partialsScriptUrl = document.currentScript?.src;

    function getSiteRoot() {
        if (!partialsScriptUrl) {
            throw new Error('[Partials] Unable to determine the partial loader URL.');
        }

        return new URL('../../', partialsScriptUrl).href;
    }

    async function fetchPartial(url) {
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) {
                console.warn(`[Partials] Failed to load: ${url} (${response.status})`);
                return null;
            }
            return response.text();
        } catch (error) {
            console.warn(`[Partials] Fetch error for ${url}:`, error.message);
            return null;
        }
    }

    async function injectPartial(selector, url, fallbackHtml = '') {
        const container = document.querySelector(selector);
        if (!container) {
            console.warn(`[Partials] Container not found: ${selector}`);
            return;
        }
        
        const html = await fetchPartial(url);
        
        if (html) {
            container.innerHTML = html;
            console.log(`[Partials] ✅ Loaded: ${url}`);
        } else if (fallbackHtml) {
            container.innerHTML = fallbackHtml;
            console.log(`[Partials] ⚠️ Using fallback for: ${selector}`);
        } else {
            console.warn(`[Partials] ❌ No content for: ${selector}`);
        }
    }

    function normalizeInjectedPaths(container, siteRoot) {
        if (!container) return;

        const assets = container.querySelectorAll('[href], [src]');

        assets.forEach((node) => {
            ['href', 'src'].forEach((attr) => {
                if (!node.hasAttribute(attr)) return;

                const raw = node.getAttribute(attr);
                const value = (raw || '').trim();
                if (!value) return;

                if (value.startsWith('#') || value.startsWith('//')) return;
                if (/^(?:[a-z][a-z0-9+.-]*:|mailto:|tel:|javascript:|data:|blob:)/i.test(value)) return;

                node.setAttribute(attr, new URL(value.replace(/^\/+/, ''), siteRoot).href);
            });
        });
    }

    function finalizePartials(siteRoot) {
        const headerContainer = document.querySelector('#site-header, [data-partial="site-header"]');
        const footerContainer = document.querySelector('#site-footer, [data-partial="site-footer"]');
        normalizeInjectedPaths(headerContainer, siteRoot);
        normalizeInjectedPaths(footerContainer, siteRoot);

        const footer = footerContainer?.matches('.site-footer')
            ? footerContainer
            : footerContainer?.querySelector('.site-footer');
        if (footer) {
            footer.dataset.siteRoot = siteRoot;
        }

        // Dispatch event to signal partials are loaded
        document.dispatchEvent(new CustomEvent('partials:loaded', { detail: { siteRoot } }));
    }

    async function loadPartials() {
        const siteRoot = getSiteRoot();

        const headerFallback = window.Platform?.getFallbackHeaderHtml?.(siteRoot) ||
            '<header class="fallback-header"><nav><a href="index.html">GPBC</a></nav></header>';
        
        const footerFallback = '<footer class="fallback-footer"><p>&copy; 2026 GPBC</p></footer>';

        const headerMount = document.querySelector('#site-header, [data-partial="site-header"]');
        if (headerMount) {
            await injectPartial('#site-header, [data-partial="site-header"]', new URL('partials/header.html', siteRoot).href, headerFallback);
        }
        
        // Support both old footer selector and new data-partial approach
        const legacyFooter = document.querySelector('#site-footer');
        const newFooter = document.querySelector('[data-partial="site-footer"]');
        
        if (newFooter) {
            await injectPartial('[data-partial="site-footer"]', new URL('partials/site-footer.html', siteRoot).href, footerFallback);
        } else if (legacyFooter) {
            await injectPartial('#site-footer', new URL('partials/footer.html', siteRoot).href, footerFallback);
        }

        finalizePartials(siteRoot);
    }

    if (typeof window !== 'undefined') {
        window.GPBC_loadPartials = loadPartials;
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (typeof window !== 'undefined' &&
            window.PLATFORM_RUNTIME_READY === true &&
            window.Platform &&
            typeof window.Platform.initPartials === 'function') {
            await window.Platform.initPartials();
            finalizePartials(getSiteRoot());
            return;
        }

        await loadPartials();
        if (typeof window !== 'undefined') {
            try {
                await (window.GPBC_loadLogo?.() ?? Promise.resolve());
            } catch (error) {
                console.error('Logo loader failed during partial initialization', error);
            }
            if (typeof window.GPBC_initNav === 'function') {
                window.GPBC_initNav();
            }
        }
    });
})();
