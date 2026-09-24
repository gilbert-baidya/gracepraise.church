/**
 * Devotions Data Loader for Daily Devotion and Event Devotion Pages.
 *
 * Exposes:
 * - window.loadDevotionsForYear(year)
 * - window.loadDevotionsForMonth(year, month)
 * - window.loadDevotionsForEvent(eventName)
 * - window.devotionLoader.load(eventName)
 *
 * Dispatches:
 * - devotionsLoading { year, month?, event? }
 * - devotionsLoaded { count, source, year, month?, event? }
 * - devotionsLoadError { error, stage, year, month?, event? }
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

    const MONTH_NAMES = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const bundleLoadPromises = new Map();

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

    function mergeVerseTextFromBundled(year, devotions) {
        if (!Array.isArray(devotions) || devotions.length === 0) {
            return { devotions, mergedCount: 0 };
        }

        const bundledKey = `DEVOTIONS_${Number(year)}_DB`;
        const bundledDevotions = window[bundledKey] || window.DEVOTIONS_2026_DB;
        if (!Array.isArray(bundledDevotions) || bundledDevotions.length === 0) {
            return { devotions, mergedCount: 0 };
        }

        const byDate = new Map();
        bundledDevotions.forEach((entry) => {
            const key = (entry && entry.date) ? String(entry.date).trim() : '';
            if (!key || byDate.has(key)) return;
            byDate.set(key, entry);
        });

        let mergedCount = 0;
        const merged = devotions.map((entry) => {
            if (!entry || typeof entry !== 'object') return entry;

            const key = entry.date ? String(entry.date).trim() : '';
            if (!key) return entry;

            const bundled = byDate.get(key);
            if (!bundled || typeof bundled !== 'object') return entry;

            const next = { ...entry };
            const currentRef = next.verseReference || next.verse || '';
            const currentText = (next.verseText || '').trim();
            const currentTextBn = (next.verseTextBn || '').trim();
            const bundledText = (bundled.verseText || '').trim();
            const bundledTextBn = (bundled.verseTextBn || '').trim();

            const shouldFillVerseText = !currentText || currentText === currentRef;
            if (shouldFillVerseText && bundledText) {
                next.verseText = bundledText;
                mergedCount += 1;
            }

            const shouldFillVerseTextBn = !currentTextBn || currentTextBn === currentRef;
            if (shouldFillVerseTextBn && bundledTextBn) {
                next.verseTextBn = bundledTextBn;
            }

            return next;
        });

        return { devotions: merged, mergedCount };
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

    function normalizeMonth(month) {
        const numericMonth = Number(month);
        if (!Number.isInteger(numericMonth)) return null;
        if (numericMonth >= 1 && numericMonth <= 12) return numericMonth;
        if (numericMonth >= 0 && numericMonth <= 11) return numericMonth + 1;
        return null;
    }

    function monthSourcePath(year, month) {
        const normalizedMonth = normalizeMonth(month);
        if (!normalizedMonth || !MONTH_NAMES[normalizedMonth - 1]) return null;
        return `devotions-data/${String(normalizedMonth).padStart(2, '0')}-${MONTH_NAMES[normalizedMonth - 1]}.json`;
    }

    function getBundledDevotions(year) {
        const bundledKey = `DEVOTIONS_${Number(year)}_DB`;
        return window[bundledKey] || (Number(year) === 2026 ? window.DEVOTIONS_2026_DB : null);
    }

    function loadBundledDevotions(year) {
        const targetYear = Number(year);
        const existing = getBundledDevotions(targetYear);
        if (Array.isArray(existing) && existing.length > 0) {
            return Promise.resolve(existing);
        }

        if (bundleLoadPromises.has(targetYear)) {
            return bundleLoadPromises.get(targetYear);
        }

        const promise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = resolveDataUrl(`devotions-db-${targetYear}.js`);
            script.async = true;
            script.onload = () => resolve(getBundledDevotions(targetYear) || []);
            script.onerror = () => resolve([]);
            document.head.appendChild(script);
        }).finally(() => bundleLoadPromises.delete(targetYear));

        bundleLoadPromises.set(targetYear, promise);
        return promise;
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
            let verseTextMergeCount = 0;

            if (Array.isArray(devotions) && devotions.length > 0) {
                const mergeResult = mergeVerseTextFromBundled(targetYear, devotions);
                devotions = mergeResult.devotions;
                verseTextMergeCount = mergeResult.mergedCount;
            }

            if (!devotions || devotions.length === 0) {
                const bundledKey = `DEVOTIONS_${targetYear}_DB`;
                const bundledDevotions = await loadBundledDevotions(targetYear);
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
            if (verseTextMergeCount > 0) {
                console.log(`[GPBC] ✅ Verse text hydrated from bundled DB for ${verseTextMergeCount} devotion(s)`);
            }
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

    async function loadDevotionsForMonth(year, month) {
        const targetYear = Number.isFinite(Number(year))
            ? Number(year)
            : new Date().getFullYear();
        const targetMonth = normalizeMonth(month);
        const sourcePath = monthSourcePath(targetYear, targetMonth);

        if (!sourcePath) {
            return loadDevotionsForYear(targetYear);
        }

        dispatchEventSafe('devotionsLoading', {
            year: targetYear,
            month: targetMonth
        });

        try {
            let devotions = normalizeDevotionArray(await fetchJsonSafe(sourcePath));
            let sourceUsed = sourcePath;

            if (!devotions || devotions.length === 0) {
                const bundledDevotions = (await loadBundledDevotions(targetYear))
                    .filter((entry) => {
                        const date = String(entry?.date || '');
                        return date.startsWith(`${targetYear}-${String(targetMonth).padStart(2, '0')}-`);
                    });
                if (bundledDevotions.length > 0) {
                    devotions = bundledDevotions;
                    sourceUsed = `DEVOTIONS_${targetYear}_DB`;
                }
            }

            if (!devotions || devotions.length === 0) {
                throw new Error(`No devotion data available for ${targetYear}-${String(targetMonth).padStart(2, '0')}.`);
            }

            const mergeResult = mergeVerseTextFromBundled(targetYear, devotions);
            devotions = mergeResult.devotions;
            window.DEVOTIONS = devotions;
            window.DEVOTIONS_YEAR = targetYear;

            console.log(`[GPBC] ✅ Final: ${devotions.length} devotions loaded for ${targetYear}-${String(targetMonth).padStart(2, '0')} from ${sourceUsed}`);
            dispatchEventSafe('devotionsLoaded', {
                count: devotions.length,
                source: sourceUsed,
                year: targetYear,
                month: targetMonth
            });
            return devotions;
        } catch (error) {
            console.error(`[GPBC] Month devotion fetch failed for '${targetYear}-${targetMonth}':`, error);
            dispatchEventSafe('devotionsLoadError', {
                error: error.message,
                stage: 'month',
                year: targetYear,
                month: targetMonth
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
    window.loadDevotionsForMonth = loadDevotionsForMonth;
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
        const requestedDate = (urlParams.get('date') || '').trim();
        window.__GPBC_DEVOTIONS_BOOTSTRAPPING__ = true;

        const finalize = () => {
            window.__GPBC_DEVOTIONS_BOOTSTRAPPING__ = false;
        };

        if (eventName) {
            console.log(`[GPBC] Auto-bootstrap: event '${eventName}'`);
            loadDevotionsForEvent(eventName).finally(finalize);
            return;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
            const requestedDateObject = new Date(`${requestedDate}T12:00:00`);
            if (!Number.isNaN(requestedDateObject.getTime())) {
                window.GPBC_INITIAL_DEVOTION_DATE = requestedDate;
                console.log(`[GPBC] Auto-bootstrap: month for date '${requestedDate}'`);
                loadDevotionsForMonth(requestedDateObject.getFullYear(), requestedDateObject.getMonth() + 1)
                    .finally(finalize);
                return;
            }
        }

        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        console.log(`[GPBC] Auto-bootstrap: month '${year}-${String(month).padStart(2, '0')}'`);
        loadDevotionsForMonth(year, month).finally(finalize);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoBootstrapDailyDevotions, { once: true });
    } else {
        autoBootstrapDailyDevotions();
    }
})();
