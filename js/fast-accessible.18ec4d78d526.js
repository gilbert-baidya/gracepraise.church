(() => {
    'use strict';
    const assetRoot = new URL('../', document.currentScript.src);
    async function initializeBranding() {
        try {
            const response = await fetch(new URL('content/settings/logo.json', assetRoot));
            if (!response.ok) return;
            const settings = await response.json();
            if (!settings || typeof settings !== 'object') return;
            const logo = document.querySelector('header .logo-image');
            if (!logo) return;
            const update = () => {
                const dark = document.documentElement.dataset.theme === 'dark';
                const source = dark && settings.logoDark ? settings.logoDark : settings.logo;
                const fallback = dark ? settings.logoDarkFallback || settings.logoFallback : settings.logoFallback;
                if (typeof source !== 'string') return;
                logo.style.visibility = source ? '' : 'hidden';
                if (!source) return;
                logo.onerror = () => {
                    logo.onerror = () => { logo.style.visibility = 'hidden'; };
                    if (typeof fallback === 'string' && fallback) logo.src = new URL(fallback, assetRoot).href;
                    else logo.style.visibility = 'hidden';
                };
                logo.src = new URL(source, assetRoot).href;
            };
            if (typeof settings.churchName === 'string' && settings.churchName.trim() && settings.churchName !== 'Grace and Praise Bangladeshi Church') {
                const brand = document.querySelector('.fast-brand');
                if (brand) { brand.textContent = settings.churchName; brand.lang = /[\u0980-\u09ff]/.test(settings.churchName) ? 'bn' : 'en'; }
                document.title = document.title.replace('Grace and Praise Bangladeshi Church', settings.churchName);
            }
            update();
            new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        } catch {}
    }
    const ready = () => {
        initializeBranding();
        const backToTop = document.getElementById('scrollToTop');
        if (backToTop) {
            const updateBackToTop = () => { backToTop.hidden = window.scrollY <= 300; };
            updateBackToTop();
            window.addEventListener('scroll', updateBackToTop, { passive: true });
            backToTop.addEventListener('click', () => {
                document.getElementById('main-content')?.focus({ preventScroll: true });
                window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
            });
        }
        const pending = new Set(document.querySelectorAll('[data-lazy-href], [data-lazy-src]'));
        const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
            entries.filter(entry => entry.isIntersecting).forEach(entry => {
                observer.unobserve(entry.target);
                pending.forEach(node => {
                    const target = node.dataset.visible ? document.querySelector(node.dataset.visible) : node;
                    if (target === entry.target) { pending.delete(node); activate(node); }
                });
            });
        }) : null;
        function activate(node) {
            if (node.dataset.lazyHref) {
                node.href = node.dataset.lazyHref;
                delete node.dataset.lazyHref;
            } else if (node.tagName === 'SCRIPT') {
                const script = document.createElement('script');
                script.src = node.dataset.lazySrc;
                script.async = false;
                node.replaceWith(script);
            } else {
                node.closest('picture')?.querySelectorAll('source[data-lazy-srcset]').forEach(source => {
                    source.srcset = source.dataset.lazySrcset;
                });
                if (node.dataset.lazySrcset) node.srcset = node.dataset.lazySrcset;
                node.src = node.dataset.lazySrc;
                delete node.dataset.lazySrc;
            }
        }
        pending.forEach(node => {
            if (!node.hasAttribute('data-resume-playback')) return;
            try {
                const saved = JSON.parse(localStorage.getItem('gpbc_sermon_player_state'));
                if (typeof saved?.audioUrl !== 'string' || !saved.audioUrl.trim()) return;
            } catch { return; }
            pending.delete(node);
            activate(node);
        });
        function observeTargets() {
            pending.forEach(node => {
                const target = node.dataset.visible ? document.querySelector(node.dataset.visible) : node;
                if (target && observer) observer.observe(target);
                else if (!observer) { pending.delete(node); activate(node); }
            });
        }
        observeTargets();
        const mutations = new MutationObserver(() => { observeTargets(); annotate(); });
        mutations.observe(document.body, { childList: true, subtree: true });
        function setAttribute(node, name, value) {
            if (node.getAttribute(name) !== value) node.setAttribute(name, value);
        }
        function annotate() {
            const utilities = document.querySelector('.site-language-row');
            const appearance = document.getElementById('darkModeToggle');
            if (utilities && appearance && !utilities.contains(appearance)) utilities.prepend(appearance);
            const countdown = document.getElementById('specialEventBanner');
            if (countdown) {
                setAttribute(countdown, 'aria-live', 'off');
                setAttribute(countdown, 'aria-label', 'Next gathering');
            }
            document.querySelectorAll('.dropdown-arrow, .sun-icon, .moon-icon, .card-arrow').forEach(node => setAttribute(node, 'aria-hidden', 'true'));
            document.querySelectorAll('.site-footer .sacred-footer__logo').forEach(node => setAttribute(node, 'alt', ''));
            const language = document.getElementById('langToggleBtn');
            if (language) {
                language.removeAttribute('aria-label');
                setAttribute(language, 'aria-pressed', String(document.documentElement.lang === 'bn'));
            }
            const qr = document.getElementById('paypalQR');
            if (qr) {
                setAttribute(qr, 'aria-label', 'Scan to open Grace & Praise online giving.');
                qr.querySelectorAll('img').forEach(img => setAttribute(img, 'alt', ''));
            }
        }
        annotate();
        new MutationObserver(annotate).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
        document.querySelectorAll('.modal[role="dialog"]').forEach(modal => {
            let invoker;
            let open = false;
            const controls = () => [...modal.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]')].filter(node => !node.disabled && node.getClientRects().length);
            new MutationObserver(() => {
                const visible = getComputedStyle(modal).display !== 'none';
                if (visible === open) return;
                open = visible;
                if (open) { invoker = document.activeElement; controls()[0]?.focus(); }
                else if (modal.contains(document.activeElement) && invoker?.isConnected) invoker.focus();
            }).observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
            modal.addEventListener('keydown', event => {
                if (event.key === 'Escape') { event.stopPropagation(); modal.style.display = 'none'; }
                if (event.key !== 'Tab') return;
                const nodes = controls(), first = nodes[0], last = nodes.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            });
        });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
    else ready();
})();
