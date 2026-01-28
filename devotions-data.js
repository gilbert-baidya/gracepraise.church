/**
 * Devotions Data Loader for Daily Devotion Page
 *
 * Loads devotions for a specific year and exposes them on window.DEVOTIONS.
 * Dispatches:
 * - devotionsLoading { year }
 * - devotionsLoaded { count, source, year }
 * - devotionsLoadError { error, stage, year }
 */

(function() {
    'use strict';

    const scriptBase = (function() {
        try {
            if (document.currentScript && document.currentScript.src) {
                return new URL('.', document.currentScript.src).toString();
            }
        } catch (err) {}
        return new URL('.', window.location.href).toString();
    })();

    // Fetch helper
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

        try {
            const primaryCandidates = [
                new URL(`devotions-${yearLabel}.json`, scriptBase).toString(),
                new URL(`./devotions-${yearLabel}.json`, window.location.href).toString(),
                `/devotions-${yearLabel}.json`
            ];
            devotions = await fetchFromCandidates(primaryCandidates);
        } catch (primaryError) {
            console.warn('Primary devotion fetch failed, trying monthly files:', primaryError);
            window.dispatchEvent(new CustomEvent('devotionsLoadError', {
                detail: { error: primaryError.message, stage: 'primary', year: yearLabel }
            }));

            try {
                const months = [
                    '01-january', '02-february', '03-march', '04-april', '05-may', '06-june',
                    '07-july', '08-august', '09-september', '10-october', '11-november', '12-december'
                ];
                const monthCandidates = months.map(name => ([
                    new URL(`devotions-data/${yearLabel}/${name}.json`, scriptBase).toString(),
                    new URL(`devotions-data/${name}.json`, scriptBase).toString(),
                    new URL(`./devotions-data/${name}.json`, window.location.href).toString(),
                    `/devotions-data/${name}.json`
                ]));

                const results = await Promise.allSettled(
                    monthCandidates.map(candidates => fetchFromCandidates(candidates))
                );
                const monthData = results
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value);

                devotions = monthData.flat();
                source = `devotions-data/*.json (partial ok for ${yearLabel})`;
            } catch (fallbackError) {
                console.error('Monthly devotions fetch failed:', fallbackError);
                window.dispatchEvent(new CustomEvent('devotionsLoadError', {
                    detail: { error: fallbackError.message, stage: 'fallback', year: yearLabel }
                }));
            }
        }

        if (!Array.isArray(devotions)) {
            devotions = [];
        }

        window.DEVOTIONS = devotions;
        window.DEVOTIONS_YEAR = yearLabel;

        console.log(`✓ Loaded ${devotions.length} devotions (${source})`);

        window.dispatchEvent(new CustomEvent('devotionsLoaded', {
            detail: { count: devotions.length, source, year: yearLabel }
        }));
    }

    window.loadDevotionsForYear = loadDevotionsForYear;
    loadDevotionsForYear(new Date().getFullYear());
})();
