/**
 * ============================================
 * LITURGICAL THEME ENGINE — GPBC
 * ============================================
 *
 * Auto-detects the current church liturgical season
 * and applies the matching CSS theme via data-season
 * attribute on <html>.
 *
 * Runs synchronously before first paint (<1ms).
 * Zero dependencies. ~2KB.
 *
 * Seasons: lent, easter, pentecost, ordinary, advent, christmas
 *
 * Version: 1.0.0
 * ============================================
 */
const LiturgicalThemeEngine = (() => {
    'use strict';

    // ── Season detection ──
    // Uses LiturgicalCalendar if available, otherwise falls back to internal logic
    function getSeason(date) {
        // Prefer the full calendar engine if loaded
        if (typeof LiturgicalCalendar !== 'undefined' && LiturgicalCalendar.getCurrentLiturgicalSeason) {
            return LiturgicalCalendar.getCurrentLiturgicalSeason(date).season;
        }
        // Fallback: inline calculation (for pages that only load theme engine)
        return _internalGetSeason(date);
    }

    // ── Internal Easter (fallback only) ──
    function _getEasterDate(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    }

    function _addDays(date, n) {
        const d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function _stripTime(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function _getAdventStart(year) {
        const christmas = new Date(year, 11, 25);
        const dow = christmas.getDay();
        const daysBack = dow === 0 ? 28 : dow + 21;
        return _addDays(christmas, -daysBack);
    }

    function _internalGetSeason(date) {
        if (!date) date = new Date();
        const d = _stripTime(date);
        const year = d.getFullYear();

        const easter = _getEasterDate(year);
        const ashWednesday = _addDays(easter, -46);
        const pentecost = _addDays(easter, 49);
        const pentecostEnd = _addDays(pentecost, 7);
        const adventStart = _getAdventStart(year);
        const christmas = new Date(year, 11, 25);
        const epiphany = new Date(year, 0, 6);

        if (d < epiphany) return 'christmas';
        if (d >= epiphany && d < ashWednesday) return 'ordinary';
        if (d >= ashWednesday && d < easter) return 'lent';
        if (d >= easter && d < pentecost) return 'easter';
        if (d >= pentecost && d < pentecostEnd) return 'pentecost';
        if (d >= adventStart && d < christmas) return 'advent';
        if (d >= christmas) return 'christmas';
        return 'ordinary';
    }

    // ── Season metadata ──
    const SEASONS = {
        lent: { label: 'Lent', labelBn: 'প্রায়শ্চিত্ত কাল', emoji: '✝️' },
        easter: { label: 'Easter', labelBn: 'ইস্টার', emoji: '🕊️' },
        pentecost: { label: 'Pentecost', labelBn: 'পঞ্চাশত্তমীর দিন', emoji: '🔥' },
        ordinary: { label: 'Ordinary Time', labelBn: 'সাধারণ কাল', emoji: '🌿' },
        advent: { label: 'Advent', labelBn: 'আগমন কাল', emoji: '⭐' },
        christmas: { label: 'Christmas', labelBn: 'বড়দিন', emoji: '🎄' }
    };

    // ── Apply theme ──
    function apply(seasonOverride) {
        const override = typeof localStorage !== 'undefined'
            ? localStorage.getItem('gpbc-season-override')
            : null;

        const season = seasonOverride || override || getSeason();
        document.documentElement.dataset.season = season;

        try {
            document.dispatchEvent(new CustomEvent('gpbc:seasonChange', {
                detail: { season, meta: SEASONS[season] }
            }));
        } catch (e) { /* silent fallback */ }

        return season;
    }

    // ── Public API ──
    return {
        getSeason,
        getEasterDate: (year) => {
            // Prefer calendar engine if available
            if (typeof LiturgicalCalendar !== 'undefined') {
                return LiturgicalCalendar.getCalendar(year).easter;
            }
            return _getEasterDate(year);
        },
        getSeasonMeta: (s) => SEASONS[s || getSeason()],
        getAllSeasons: () => SEASONS,
        apply,
        init: () => {
            const s = apply();
            const meta = SEASONS[s];
            if (meta) {
                console.log(`[Liturgical] ${meta.emoji} ${meta.label} (${meta.labelBn})`);
            }
            return s;
        }
    };
})();

// Auto-initialize on load
LiturgicalThemeEngine.init();
