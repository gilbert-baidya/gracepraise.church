/**
 * Devotions Data Loader for Daily Devotion Page
 *
 * Loads devotions for a specific year and exposes them on window.DEVOTIONS.
 * Dispatches:
 * - devotionsLoading { year }
 * - devotionsLoaded { count, source, year }
 * - devotionsLoadError { error, stage, year }
 */

(function () {
    'use strict';

    // STEP 2 — SAFE FETCH BASE PATH (relative to current origin)
    const GPBC_DATA_BASE = window.location.origin + "/";

    const scriptBase = (function () {
        try {
            if (document.currentScript && document.currentScript.src) {
                return new URL('.', document.currentScript.src).toString();
            }
        } catch (err) { }
        return new URL('.', window.location.href).toString();
    })();

    // STEP 3 — SAFE FETCH FUNCTION
    async function fetchJsonSafe(path) {
        try {
            // Remove leading slashes and construct relative URL
            const cleanPath = path.replace(/^\/+/, "");
            const url = GPBC_DATA_BASE + cleanPath;
            console.log("[GPBC] Fetching:", url);
            
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`Fetch failed: ${path} (${response.status})`);
            }
            return await response.json();
        } catch (e) {
            console.warn("[GPBC] JSON Load Failed:", path, e.message);
            return null;
        }
    }

    // Legacy fetch helper (kept for backward compatibility)
    async function fetchJson(url) {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${url}`);
        }
        return response.json();
    }

    async function fetchFromCandidates(candidates) {
        let lastError = null;
        for (const url of candidates) {
            try {
                return await fetchJson(url);
            } catch (err) {
                lastError = err;
            }
        }
        if (lastError) throw lastError;
        throw new Error('No fetch candidates provided');
    }

    // Attempt to load the consolidated file first; if it fails, fall back to month files.
    async function loadDevotionsForYear(year) {
        const normalizedYear = Number(year);
        const yearLabel = Number.isFinite(normalizedYear) ? normalizedYear : new Date().getFullYear();
        window.dispatchEvent(new CustomEvent('devotionsLoading', { detail: { year: yearLabel } }));

        let devotions = [];
        let source = `devotions-${yearLabel}.json`;

        // CHECK OFFLINE DB FIRST
        if (window.DEVOTIONS_2026_DB && Array.isArray(window.DEVOTIONS_2026_DB) && yearLabel === 2026) {
            devotions = window.DEVOTIONS_2026_DB;
            source = 'devotions-db-2026.js (bundled)';

            // Skip all fetch logic
            window.DEVOTIONS = devotions;
            window.DEVOTIONS_YEAR = yearLabel;

            window.dispatchEvent(new CustomEvent('devotionsLoaded', {
                detail: { count: devotions.length, source, year: yearLabel }
            }));
            return;
        }

        // STEP 4 — Try safe fetch with relative paths
        console.log("[GPBC] Loading devotions for year:", yearLabel);
        
        try {
            // Try primary devotions file with safe relative paths
            let data = await fetchJsonSafe(`devotions-${yearLabel}.json`);
            
            if (data && Array.isArray(data)) {
                devotions = data;
                source = `devotions-${yearLabel}.json`;
                console.log("[GPBC] ✅ Loaded primary devotions:", devotions.length);
            } else {
                throw new Error("Primary devotions file not found or invalid");
            }
        } catch (primaryError) {
            console.warn('[GPBC] Primary devotion fetch failed, trying monthly files:', primaryError);
            window.dispatchEvent(new CustomEvent('devotionsLoadError', {
                detail: { error: primaryError.message, stage: 'primary', year: yearLabel }
            }));

            try {
                const months = [
                    '01-january', '02-february', '03-march', '04-april', '05-may', '06-june',
                    '07-july', '08-august', '09-september', '10-october', '11-november', '12-december'
                ];
                
                // Try fetching monthly files
                const monthPromises = months.map(name => 
                    fetchJsonSafe(`devotions-data/${yearLabel}/${name}.json`)
                );

                const results = await Promise.allSettled(monthPromises);
                const monthData = results
                    .filter(result => result.status === 'fulfilled' && result.value)
                    .map(result => result.value);

                devotions = monthData.flat();
                source = `devotions-data/*.json (${monthData.length} months loaded)`;
                console.log("[GPBC] ✅ Loaded monthly devotions:", devotions.length);
            } catch (fallbackError) {
                console.error('[GPBC] Monthly devotions fetch failed:', fallbackError);
                window.dispatchEvent(new CustomEvent('devotionsLoadError', {
                    detail: { error: fallbackError.message, stage: 'fallback', year: yearLabel }
                }));
            }
        }

        if (!Array.isArray(devotions)) {
            devotions = [];
        }

        // STEP 5 — CALENDAR FAIL SAFE: Ensure at least today's date is available
        if (devotions.length === 0) {
            console.warn("[GPBC] ⚠️ No devotions loaded - calendar will use fallback");
        }

        window.DEVOTIONS = devotions;
        window.DEVOTIONS_YEAR = yearLabel;

        console.log(`[GPBC] ✅ Final: ${devotions.length} devotions loaded (${source})`);

        window.dispatchEvent(new CustomEvent('devotionsLoaded', {
            detail: { count: devotions.length, source, year: yearLabel }
        }));
    }

    window.loadDevotionsForYear = loadDevotionsForYear;
    loadDevotionsForYear(new Date().getFullYear());
})();
