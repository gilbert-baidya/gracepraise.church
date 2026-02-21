/**
 * Devotions Data Loader for Daily Devotion and Event Devotion Pages.
 *
 * Exposes:
 * - window.loadDevotionsForYear(year)
 * - window.loadDevotionsForEvent(eventName)
 * - window.devotionLoader.load(eventName)
 *
 * Dispatches:
 * - devotionsLoading { year, event? }
 * - devotionsLoaded { count, source, year, event? }
 * - devotionsLoadError { error, stage, year, event? }
 */

(function () {
    'use strict';

    // Resolve data URLs relative to this script path, not window.location.origin.
    // This keeps loading working on GitHub Pages subpaths.
    const scriptSrc = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src
        : window.location.href;
    const GPBC_DATA_BASE = new URL('.', scriptSrc).toString();

    // Backward compatibility aliases for legacy event IDs.
    const EVENT_SOURCE_ALIASES = {
        'lent-40days': 'lent-fasting'
    };

    function normalizeDevotionArray(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.devotions)) return data.devotions;
        return null;
    }

    function normalizeDevotionEntry(entry) {
        const source = (entry && typeof entry === 'object') ? entry : {};
        return {
            ...source,
            title: source.title || source.topic || source.verseReference || '',
            verseReference: source.verseReference || '',
            verseText: source.verseText || source.verseReference || '',
            reflection: source.reflection || '',
            prayer: source.prayer || '',
            date: source.date || ''
        };
    }

    function resolveDataUrl(path) {
        const cleanPath = String(path || '').replace(/^\/+/, '');
        return new URL(cleanPath, GPBC_DATA_BASE).toString();
    }

    function dispatchEventSafe(name, detail) {
        window.dispatchEvent(new CustomEvent(name, { detail }));
    }

    async function fetchJsonSafe(path) {
        const url = resolveDataUrl(path);
        try {
            console.log('[GPBC] Fetching:', url);
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Fetch failed: ${path} (${response.status})`);
            }
            return await response.json();
        } catch (error) {
            console.warn('[GPBC] JSON load failed:', path, error.message);
            return null;
        }
    }

    const devotionLoader = {
        devotions: null, // PRODUCTION FIX: Store loaded devotions
        async load(event) {
            try {
                const res = await fetch(`${event}-devotions.json`);
                const json = await res.json();
                /* CRITICAL FIX — STORE DATA */
                this.devotions = json.devotions || json;
                /* expose globally for renderer */
                window.DEVOTION_DATA = this.devotions;
                console.log("[DEVOTION LOADER FIX] Loaded:", this.devotions.length);
                return this.devotions;
            } catch (e) {
                console.error("[DEVOTION LOADER FIX] Failed:", e);
                this.devotions = [];
                return [];
            }
        }
    };

    window.devotionLoader = devotionLoader;

    async function loadDevotionsForYear(year) {
        const targetYear = Number.isFinite(Number(year))
            ? Number(year)
            : new Date().getFullYear();

        dispatchEventSafe('devotionsLoading', { year: targetYear });

        try {
            const primarySource = `devotions-${targetYear}.json`;
            let devotions = normalizeDevotionArray(await fetchJsonSafe(primarySource));
            let sourceUsed = primarySource;

            if (!devotions || devotions.length === 0) {
                const bundledKey = `DEVOTIONS_${targetYear}_DB`;
                const bundledDevotions = window[bundledKey] || window.DEVOTIONS_2026_DB;
                if (Array.isArray(bundledDevotions) && bundledDevotions.length > 0) {
                    devotions = bundledDevotions;
                    sourceUsed = bundledKey;
                }
            }

            if (!devotions || devotions.length === 0) {
                throw new Error(`No devotion data available for year ${targetYear}.`);
            }

            window.DEVOTIONS = devotions;
            window.DEVOTIONS_YEAR = targetYear;

            console.log(`[GPBC] ✅ Final: ${devotions.length} devotions loaded for year ${targetYear} from ${sourceUsed}`);
            dispatchEventSafe('devotionsLoaded', {
                count: devotions.length,
                source: sourceUsed,
                year: targetYear
            });
            return devotions;
        } catch (error) {
            console.error(`[GPBC] Year devotion fetch failed for '${targetYear}':`, error);
            dispatchEventSafe('devotionsLoadError', {
                error: error.message,
                stage: 'year',
                year: targetYear
            });
            return [];
        }
    }

    async function loadDevotionsForEvent(eventName) {
        const event = String(eventName || '').trim();
        const year = new Date().getFullYear();

        dispatchEventSafe('devotionsLoading', { year: year, event: event });

        try {
            const devotions = await devotionLoader.load(event);
            const normalizedEvent = EVENT_SOURCE_ALIASES[event] || event;

            window.DEVOTIONS = devotions;
            window.DEVOTIONS_YEAR = year;

            console.log(`[GPBC] ✅ Final: ${devotions.length} devotions loaded for event '${event}'`);
            dispatchEventSafe('devotionsLoaded', {
                count: devotions.length,
                source: `${normalizedEvent}-devotions.json`,
                year: year,
                event: event
            });
            return devotions;
        } catch (error) {
            console.error(`[GPBC] Event devotion fetch failed for '${event}':`, error);
            dispatchEventSafe('devotionsLoadError', {
                error: error.message,
                stage: 'event',
                year: year,
                event: event
            });
            return [];
        }
    }

    window.loadDevotionsForYear = loadDevotionsForYear;
    window.loadDevotionsForEvent = loadDevotionsForEvent;

    function isDailyDevotionPage() {
        return document.body?.classList.contains('page-daily-devotion')
            || /\/daily-devotion\.html$/i.test(window.location.pathname)
            || /\/daily-devotion$/i.test(window.location.pathname);
    }

    function autoBootstrapDailyDevotions() {
        if (!isDailyDevotionPage()) return;
        if (window.__GPBC_DEVOTIONS_BOOTSTRAPPING__) return;
        if (Array.isArray(window.DEVOTIONS) && window.DEVOTIONS.length > 0) return;

        const urlParams = new URLSearchParams(window.location.search);
        const eventName = (urlParams.get('event') || '').trim();
        window.__GPBC_DEVOTIONS_BOOTSTRAPPING__ = true;

        const finalize = () => {
            window.__GPBC_DEVOTIONS_BOOTSTRAPPING__ = false;
        };

        if (eventName) {
            console.log(`[GPBC] Auto-bootstrap: event '${eventName}'`);
            loadDevotionsForEvent(eventName).finally(finalize);
            return;
        }

        const year = new Date().getFullYear();
        console.log(`[GPBC] Auto-bootstrap: year '${year}'`);
        loadDevotionsForYear(year).finally(finalize);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoBootstrapDailyDevotions, { once: true });
    } else {
        autoBootstrapDailyDevotions();
    }
})();
