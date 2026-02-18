(() => {
    async function fetchPartial(url) {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load partial: ${url}`);
        }
        return response.text();
    }

    async function injectPartial(selector, url) {
        const container = document.querySelector(selector);
        if (!container) return;
        const html = await fetchPartial(url);
        container.innerHTML = html;
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

        try {
            await injectPartial('#site-header', basePath + 'partials/header.html');
        } catch (error) {
            console.error(error);
        }

        try {
            await injectPartial('#site-footer', basePath + 'partials/footer.html');
        } catch (error) {
            console.error(error);
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
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
