(() => {
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

    function normalizeInjectedPaths(container, basePath = '') {
        if (!container) return;

        const normalizedBasePath = basePath || '';
        const assets = container.querySelectorAll('[href], [src]');

        assets.forEach((node) => {
            ['href', 'src'].forEach((attr) => {
                if (!node.hasAttribute(attr)) return;

                const raw = node.getAttribute(attr);
                const value = (raw || '').trim();
                if (!value) return;

                if (value.startsWith('#') || value.startsWith('//')) return;
                if (/^(?:[a-z][a-z0-9+.-]*:|mailto:|tel:|javascript:|data:|blob:)/i.test(value)) return;

                if (value.startsWith('/')) {
                    node.setAttribute(attr, `${normalizedBasePath}${value.slice(1)}`);
                }
            });
        });
    }

    function getBasePath() {
        // Infer base path from existing CSS links to ensure correct relative path
        // even in subdirectories or when opened via file:// protocol
        const refLink = document.querySelector('link[href*="redesign-styles.css"]') ||
            document.querySelector('link[href*="logo-styles.css"]');

        if (!refLink) return '';

        const href = refLink.getAttribute('href');
        const lastSlash = href.lastIndexOf('/');

        if (lastSlash === -1) return ''; // File is in same directory
        return href.substring(0, lastSlash + 1); // e.g., "../" or "styles/"
    }

    async function loadPartials() {
        const basePath = getBasePath();

        const headerFallback = window.Platform?.getFallbackHeaderHtml?.(basePath) || 
            '<header class="fallback-header"><nav><a href="index.html">GPBC</a></nav></header>';
        
        const footerFallback = '<footer class="fallback-footer"><p>&copy; 2026 GPBC</p></footer>';

        await injectPartial('#site-header', basePath + 'partials/header.html', headerFallback);
        await injectPartial('#site-footer', basePath + 'partials/footer.html', footerFallback);

        const headerContainer = document.querySelector('#site-header');
        const footerContainer = document.querySelector('#site-footer');
        normalizeInjectedPaths(headerContainer, basePath);
        normalizeInjectedPaths(footerContainer, basePath);
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
