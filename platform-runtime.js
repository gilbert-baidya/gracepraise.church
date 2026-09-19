(() => {
    'use strict';

    if (typeof window === 'undefined') return;

    const w = window;
    const d = document;
    const THEME_STORAGE_KEY = 'theme';
    const VALID_THEMES = new Set(['light', 'dark']);

    function readSavedTheme() {
        try {
            const savedTheme = w.localStorage?.getItem(THEME_STORAGE_KEY);
            return VALID_THEMES.has(savedTheme) ? savedTheme : null;
        } catch (error) {
            console.warn('[PlatformRuntime] Theme preference could not be read', error);
            return null;
        }
    }

    function getSystemTheme() {
        return w.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function getPreferredTheme() {
        return readSavedTheme() || getSystemTheme() || 'light';
    }

    function applyTheme(theme, options = {}) {
        const nextTheme = VALID_THEMES.has(theme) ? theme : getPreferredTheme();
        const isDark = nextTheme === 'dark';

        d.documentElement.setAttribute('data-theme', nextTheme);
        d.documentElement.classList.toggle('dark', isDark);

        if (d.body) {
            d.body.setAttribute('data-theme', nextTheme);
            d.body.classList.toggle('dark', isDark);
        }

        if (options.persist) {
            try {
                w.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme);
                w.localStorage?.setItem('site-theme', nextTheme);
            } catch (error) {
                console.warn('[PlatformRuntime] Theme preference could not be saved', error);
            }
        }

        w.dispatchEvent(new CustomEvent('themechange', { detail: { theme: nextTheme } }));
        return nextTheme;
    }

    function syncBodyTheme() {
        applyTheme(d.documentElement.getAttribute('data-theme') || getPreferredTheme());
    }

    applyTheme(getPreferredTheme());

    if (d.readyState === 'loading') {
        d.addEventListener('DOMContentLoaded', syncBodyTheme, { once: true });
    } else {
        syncBodyTheme();
    }

    // ══════════════════════════════════════════════════════════════════
    // CENTRALIZED ENVIRONMENT CONFIGURATION
    // Single source of truth for all platform runtime settings
    // ══════════════════════════════════════════════════════════════════
    w.GPBC_CONFIG = {
        environment: 'production',
        unlockAllDevotions: true,
        debug: false
    };

    if (w.Platform && w.Platform.__bootstrapped) {
        w.PLATFORM_RUNTIME_READY = true;
        return;
    }

    w.PLATFORM_RUNTIME_READY = true;
    w.PLATFORM_NAV_READY = false;
    w.PLATFORM_PARTIALS_READY = false;

    const state = {
        navInitialized: false,
        navInitializing: false,
        navInitializer: null,
        partialsInitialized: false,
        partialsInitializing: false,
        errorHooksInstalled: false,
        blankGuardInstalled: false,
        tapStyleInstalled: false
    };

    function getFallbackHeaderHtml(basePath = '') {
        const resolvedBasePath = basePath || '/';
        return `
<header>
    <nav>
        <div class="nav-container">
            <a href="${resolvedBasePath}index.html#home" class="logo" aria-label="Grace and Praise Bangladeshi Church Home">
                <img src="${resolvedBasePath}images/new-gpbc-logo-final.svg" alt="Grace and Praise Bangladeshi Church" class="logo-image" loading="eager" decoding="async">
            </a>
            <button id="darkModeToggle" class="dark-mode-toggle" aria-label="Switch to Night mode" aria-pressed="false" title="Switch theme" type="button">
                <span class="sun-icon">☀️</span>
                <span class="moon-icon">🌙</span>
            </button>
            <button class="mobile-menu-btn" aria-label="Toggle mobile menu" aria-expanded="false" type="button">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <ul class="nav-links" id="nav-links">
                <li><a href="${resolvedBasePath}index.html#home">Home</a></li>
                <li><a href="${resolvedBasePath}calendar.html">Calendar</a></li>
                <li class="nav-dropdown">
                    <a href="${resolvedBasePath}daily-devotion.html" aria-haspopup="true" aria-expanded="false">Devotion <span class="dropdown-arrow">▼</span></a>
                    <ul class="dropdown-menu">
                        <li><a href="${resolvedBasePath}daily-devotion.html">Today's Devotion</a></li>
                        <li><a href="${resolvedBasePath}fasting-40days.html">Lent - 40 Days</a></li>
                    </ul>
                </li>
                <li><a href="${resolvedBasePath}give.html">Give</a></li>
            </ul>
        </div>
    </nav>
    <div class="mobile-overlay"></div>
</header>`;
    }

    function getFallbackFooterHtml(basePath = '') {
        return `
<footer class="sacred-footer" role="contentinfo">
    <div class="footer-content">
        <div class="footer-col footer-identity">
            <h3 class="footer-church-name">Grace and Praise Bangladeshi Church</h3>
            <p class="footer-church-name-bn">গ্রেস অ্যান্ড প্রেইজ বাংলাদেশী চার্চ</p>
            <address>
                <p>1325 Richardson Street</p>
                <p>San Bernardino, CA 92408</p>
                <p><a href="mailto:info@gracepraise.church">info@gracepraise.church</a></p>
            </address>
        </div>
        <div class="footer-col footer-links">
            <ul>
                <li><a href="${basePath}privacy-policy.html">Privacy Policy</a></li>
                <li><a href="${basePath}terms-conditions.html">Terms & Conditions</a></li>
            </ul>
        </div>
    </div>
    <div class="footer-bottom">
        <p>&copy; 2026 Grace and Praise Bangladeshi Church. All rights reserved.</p>
    </div>
</footer>`;
    }

    function getBasePath() {
        const refLink = d.querySelector('link[href*="redesign-styles.css"]') ||
            d.querySelector('link[href*="logo-styles.css"]');

        if (!refLink) return '';

        const href = refLink.getAttribute('href') || '';
        const lastSlash = href.lastIndexOf('/');
        if (lastSlash === -1) return '';
        return href.substring(0, lastSlash + 1);
    }

    async function fetchText(url) {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url} (${response.status})`);
        }
        return response.text();
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

                // Leave absolute/protocol/special URLs unchanged.
                if (value.startsWith('#') || value.startsWith('//')) return;
                if (/^(?:[a-z][a-z0-9+.-]*:|mailto:|tel:|javascript:|data:|blob:)/i.test(value)) return;

                if (value.startsWith('/')) {
                    node.setAttribute(attr, `${normalizedBasePath}${value.slice(1)}`);
                    return;
                }

                if (normalizedBasePath) {
                    node.setAttribute(attr, `${normalizedBasePath}${value}`);
                }
            });
        });
    }

    function injectHeaderFallback(container, basePath = '') {
        if (!container) return;
        if (container.querySelector('header')) return;
        container.innerHTML = getFallbackHeaderHtml(basePath);
    }

    function injectFooterFallback(container, basePath = '') {
        if (!container) return;
        if (container.querySelector('footer')) return;
        container.innerHTML = getFallbackFooterHtml(basePath);
    }

    function ensureFavicon(basePath = '') {
        const hasFavicon = !!d.querySelector('link[rel=\"icon\"], link[rel=\"shortcut icon\"], link[rel=\"alternate icon\"]');
        if (hasFavicon) return;

        const icon = d.createElement('link');
        icon.setAttribute('rel', 'icon');
        icon.setAttribute('type', 'image/x-icon');
        icon.setAttribute('href', `${basePath}images/logo/GPBC_Favicon.ico`);
        d.head.appendChild(icon);
    }

    function enforceTapTargets() {
        if (state.tapStyleInstalled || d.getElementById('platform-runtime-style')) return;

        const style = d.createElement('style');
        style.id = 'platform-runtime-style';
        style.textContent = `
            @media (max-width: 1024px) {
                .mobile-menu-btn,
                .nav-links a,
                .nav-dropdown > a,
                .nav-dropdown-nested > a,
                button,
                [role="button"],
                .btn,
                a.btn {
                    min-height: 44px !important;
                    min-width: 44px !important;
                }
            }

            @media (hover: none), (pointer: coarse) {
                .nav-dropdown > a,
                .nav-dropdown-nested > a {
                    cursor: pointer;
                }
            }

            body.menu-open {
                overflow: hidden;
                touch-action: pan-y;
                overscroll-behavior: contain;
            }
        `;

        d.head.appendChild(style);
        state.tapStyleInstalled = true;
    }

    function resolveNavInitializer() {
        if (typeof state.navInitializer === 'function') return state.navInitializer;
        if (typeof w.GPBC_initNav === 'function') return w.GPBC_initNav;
        return null;
    }

    function initNavigation(attempt = 0) {
        if (state.navInitialized || state.navInitializing) return;

        const initFn = resolveNavInitializer();
        if (typeof initFn !== 'function') {
            if (attempt < 40) {
                setTimeout(() => initNavigation(attempt + 1), 50);
            }
            return;
        }

        state.navInitializing = true;
        try {
            initFn();
            state.navInitialized = true;
            w.PLATFORM_NAV_READY = true;
        } catch (error) {
            console.error('[PlatformRuntime] Navigation init failed', error);
        } finally {
            state.navInitializing = false;
        }
    }

    async function initPartials() {
        if (state.partialsInitialized || state.partialsInitializing) {
            return;
        }

        const headerContainer = d.querySelector('#site-header, [data-partial="site-header"]');
        const footerContainer = d.querySelector('#site-footer');
        const newFooterMount = d.querySelector('[data-partial="site-footer"]');

        if (!headerContainer && !footerContainer && !newFooterMount) {
            state.partialsInitialized = true;
            w.PLATFORM_PARTIALS_READY = true;
            initNavigation();
            return;
        }

        state.partialsInitializing = true;

        const basePath = getBasePath();

        if (headerContainer) {
            try {
                const html = await fetchText(basePath + 'partials/header.html');
                headerContainer.innerHTML = html;
            } catch (error) {
                console.error('[PlatformRuntime] Header partial failed, injecting fallback', error);
                injectHeaderFallback(headerContainer, basePath);
            }
            normalizeInjectedPaths(headerContainer, basePath);
        }

        // Support both old and new footer approaches
        if (newFooterMount) {
            try {
                const html = await fetchText(basePath + 'partials/site-footer.html');
                newFooterMount.innerHTML = html;
                normalizeInjectedPaths(newFooterMount, basePath);
            } catch (error) {
                console.error('[PlatformRuntime] New footer partial failed, injecting fallback', error);
                injectFooterFallback(newFooterMount, basePath);
            }
        } else if (footerContainer) {
            try {
                const html = await fetchText(basePath + 'partials/footer.html');
                footerContainer.innerHTML = html;
            } catch (error) {
                console.error('[PlatformRuntime] Footer partial failed, injecting fallback', error);
                injectFooterFallback(footerContainer, basePath);
            }
            normalizeInjectedPaths(footerContainer, basePath);
        }

        if (typeof w.GPBC_loadLogo === 'function') {
            try {
                await w.GPBC_loadLogo();
            } catch (error) {
                console.error('[PlatformRuntime] Logo load failed during partial init', error);
            }
        }

        state.partialsInitialized = true;
        state.partialsInitializing = false;
        w.PLATFORM_PARTIALS_READY = true;

        // Dispatch event to signal partials are loaded (for footer-init.js)
        d.dispatchEvent(new CustomEvent('partials:loaded', { detail: { basePath } }));

        initNavigation();
    }

    function markArchiveModules() {
        const path = (w.location.pathname || '').split('/').pop() || '';
        if (path === 'fasting-21days.html' || path === 'fasting-30days.html') {
            w.PLATFORM_DEVOTION_MODULE_TYPE = 'archive-guide';
            if (d.body) {
                d.body.setAttribute('data-devotion-module-type', 'archive-guide');
            }
            console.info('[PlatformRuntime] Archive devotion guide mode:', path);
        }
    }

    function installGlobalErrorSafety() {
        if (state.errorHooksInstalled) return;

        w.addEventListener('error', (event) => {
            console.error('[PlatformRuntime] Uncaught error:', event.error || event.message);
        });

        w.addEventListener('unhandledrejection', (event) => {
            console.error('[PlatformRuntime] Unhandled promise rejection:', event.reason);
        });

        state.errorHooksInstalled = true;
    }

    function installBlankDevotionGuard() {
        if (state.blankGuardInstalled) return;

        const applyGuard = () => {
            const candidates = [
                d.querySelector('#devotionContent'),
                d.querySelector('#devotion-root'),
                d.querySelector('article[aria-label="Daily devotion"]')
            ].filter(Boolean);

            if (candidates.length === 0) return;

            const hasVisibleContent = candidates.some((node) => {
                const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
                return text.length > 0;
            });

            if (hasVisibleContent) return;

            const target = candidates[0];
            if (!target.querySelector('.platform-runtime-fallback')) {
                const fallback = d.createElement('div');
                fallback.className = 'platform-runtime-fallback';
                fallback.textContent = 'Devotion content is loading. If this remains blank, please refresh or open Day 1.';
                fallback.style.padding = '1rem';
                fallback.style.borderRadius = '12px';
                fallback.style.background = 'rgba(255,255,255,0.92)';
                fallback.style.border = '1px solid rgba(0,0,0,0.08)';
                fallback.style.margin = '1rem 0';
                target.appendChild(fallback);
            }
        };

        setTimeout(applyGuard, 7000);
        state.blankGuardInstalled = true;
    }

    function boot() {
        enforceTapTargets();
        ensureFavicon(getBasePath());
        markArchiveModules();
        installGlobalErrorSafety();
        installBlankDevotionGuard();

        const hasPartialTargets = !!(d.querySelector('#site-header, [data-partial="site-header"]') || d.querySelector('#site-footer, [data-partial="site-footer"]'));
        if (hasPartialTargets) {
            initPartials();
        } else {
            w.PLATFORM_PARTIALS_READY = true;
            initNavigation();
        }
    }

    w.Platform = {
        __bootstrapped: true,
        getPreferredTheme,
        applyTheme,
        initNavigation,
        initPartials,
        registerNavigationInitializer(fn) {
            if (typeof fn === 'function') {
                state.navInitializer = fn;
                if (d.readyState !== 'loading') {
                    initNavigation();
                }
            }
        }
    };

    if (d.readyState === 'loading') {
        d.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
