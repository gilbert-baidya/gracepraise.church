/**
 * ======================================================
 * LITURGICAL CALENDAR ENGINE — GPBC
 * ======================================================
 *
 * Pure JavaScript engine that calculates all major church
 * calendar dates for any given year. No dependencies.
 *
 * Dates Calculated:
 *   Easter Sunday, Ash Wednesday, Lent Start,
 *   Palm Sunday, Good Friday, Holy Saturday,
 *   Pentecost Sunday, Advent Start, Christmas
 *
 * Helpers:
 *   getCurrentLiturgicalSeason(date)
 *   getDaysSinceAshWednesday(date)
 *   getLentDevotionDay(date)
 *
 * Performance:
 *   - Deterministic: same input → same output
 *   - Cached per year via Map (computed once, reused)
 *   - Executes in <1ms per year calculation
 *   - Timezone-safe: all dates constructed as local midnight
 *
 * Version: 1.0.0
 * ======================================================
 */
const LiturgicalCalendar = (() => {
    'use strict';

    // ══════════════════════════════════════════════════
    // YEAR CACHE — computed once per year, never again
    // ══════════════════════════════════════════════════
    const _cache = new Map();


    // ══════════════════════════════════════════════════
    // CORE: Easter Date — Meeus/Jones/Butcher Algorithm
    // Valid for Gregorian calendar (1583+)
    // ══════════════════════════════════════════════════
    function _computeEaster(year) {
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


    // ══════════════════════════════════════════════════
    // DATE UTILITIES
    // ══════════════════════════════════════════════════
    function _addDays(date, n) {
        const d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function _stripTime(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function _daysBetween(a, b) {
        const msPerDay = 86400000;
        return Math.round((_stripTime(b) - _stripTime(a)) / msPerDay);
    }

    function _formatISO(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }


    // ══════════════════════════════════════════════════
    // ADVENT START CALCULATION
    // First Sunday between Nov 27 – Dec 3 inclusive
    // (Equivalent to 4th Sunday before Christmas)
    // ══════════════════════════════════════════════════
    function _computeAdventStart(year) {
        const christmas = new Date(year, 11, 25);
        const dow = christmas.getDay(); // 0=Sun, 1=Mon, ...
        const daysBack = dow === 0 ? 28 : dow + 21;
        return _addDays(christmas, -daysBack);
    }


    // ══════════════════════════════════════════════════
    // CORE: getCalendar(year) → All 9 dates
    // ══════════════════════════════════════════════════
    function getCalendar(year) {
        // Return cached if available
        if (_cache.has(year)) return _cache.get(year);

        // Warn if pre-Gregorian
        if (year < 1583) {
            console.warn(`[LiturgicalCalendar] Year ${year} is pre-Gregorian. Results may be inaccurate.`);
        }

        const easter = _computeEaster(year);
        const ashWednesday = _addDays(easter, -46);
        const palmSunday = _addDays(easter, -7);
        const goodFriday = _addDays(easter, -2);
        const holySaturday = _addDays(easter, -1);
        const pentecost = _addDays(easter, 49);
        const adventStart = _computeAdventStart(year);
        const christmas = new Date(year, 11, 25);

        const calendar = Object.freeze({
            year,
            easter,
            ashWednesday,
            lentStart: ashWednesday, // Lent begins on Ash Wednesday
            palmSunday,
            goodFriday,
            holySaturday,
            pentecost,
            adventStart,
            christmas
        });

        // Cache for future lookups
        _cache.set(year, calendar);
        return calendar;
    }


    // ══════════════════════════════════════════════════
    // SEASON DETECTION CONSTANTS
    // ══════════════════════════════════════════════════
    const SEASON_META = Object.freeze({
        lent: { label: 'Lent', labelBn: 'প্রায়শ্চিত্ত কাল', emoji: '✝️', color: 'purple' },
        easter: { label: 'Easter', labelBn: 'ইস্টার', emoji: '🕊️', color: 'gold' },
        pentecost: { label: 'Pentecost', labelBn: 'পঞ্চাশত্তমীর দিন', emoji: '🔥', color: 'red' },
        ordinary: { label: 'Ordinary Time', labelBn: 'সাধারণ কাল', emoji: '🌿', color: 'green' },
        advent: { label: 'Advent', labelBn: 'আগমন কাল', emoji: '⭐', color: 'blue' },
        christmas: { label: 'Christmas', labelBn: 'বড়দিন', emoji: '🎄', color: 'gold' }
    });


    // ══════════════════════════════════════════════════
    // HELPER: getCurrentLiturgicalSeason(date?)
    // Returns { season, meta, calendar }
    // ══════════════════════════════════════════════════
    function getCurrentLiturgicalSeason(date) {
        const d = _stripTime(date || new Date());
        const year = d.getFullYear();
        const cal = getCalendar(year);

        const epiphany = new Date(year, 0, 6);

        // Christmas season wraps across year boundary
        if (d < epiphany) {
            return { season: 'christmas', meta: SEASON_META.christmas, calendar: getCalendar(year - 1) };
        }

        // Ordinary Time (early): Epiphany → Ash Wednesday
        if (d >= epiphany && d < cal.ashWednesday) {
            return { season: 'ordinary', meta: SEASON_META.ordinary, calendar: cal };
        }

        // Lent: Ash Wednesday → Easter Eve
        if (d >= cal.ashWednesday && d < cal.easter) {
            return { season: 'lent', meta: SEASON_META.lent, calendar: cal };
        }

        // Easter: Easter Sunday → Pentecost Eve
        if (d >= cal.easter && d < cal.pentecost) {
            return { season: 'easter', meta: SEASON_META.easter, calendar: cal };
        }

        // Pentecost: Pentecost Sunday + octave (7 days)
        const pentecostEnd = _addDays(cal.pentecost, 7);
        if (d >= cal.pentecost && d < pentecostEnd) {
            return { season: 'pentecost', meta: SEASON_META.pentecost, calendar: cal };
        }

        // Advent: 4th Sunday before Christmas → Christmas Eve
        if (d >= cal.adventStart && d < cal.christmas) {
            return { season: 'advent', meta: SEASON_META.advent, calendar: cal };
        }

        // Christmas: Dec 25 → year end
        if (d >= cal.christmas) {
            return { season: 'christmas', meta: SEASON_META.christmas, calendar: cal };
        }

        // Default: Ordinary Time (summer/fall)
        return { season: 'ordinary', meta: SEASON_META.ordinary, calendar: cal };
    }


    // ══════════════════════════════════════════════════
    // HELPER: getDaysSinceAshWednesday(date?)
    // Returns number of days since Ash Wednesday,
    // or negative if before Ash Wednesday this year.
    // ══════════════════════════════════════════════════
    function getDaysSinceAshWednesday(date) {
        const d = _stripTime(date || new Date());
        const cal = getCalendar(d.getFullYear());
        return _daysBetween(cal.ashWednesday, d);
    }


    // ══════════════════════════════════════════════════
    // HELPER: getLentDevotionDay(date?)
    // Returns 1-based Lent day number (1 = Ash Wednesday,
    // 46 = Holy Saturday), or null if not in Lent.
    // ══════════════════════════════════════════════════
    function getLentDevotionDay(date) {
        const d = _stripTime(date || new Date());
        const cal = getCalendar(d.getFullYear());
        const daysSince = _daysBetween(cal.ashWednesday, d);

        // Lent is 46 days: Ash Wednesday (day 1) through Holy Saturday (day 46)
        if (daysSince >= 0 && daysSince <= 45) {
            return daysSince + 1;
        }
        return null;
    }


    // ══════════════════════════════════════════════════
    // UTILITY: Format a calendar for display
    // ══════════════════════════════════════════════════
    function formatCalendar(year) {
        const cal = getCalendar(year);
        const lines = [
            `╔══ Liturgical Calendar ${year} ══╗`,
            `║ Ash Wednesday  : ${_formatISO(cal.ashWednesday)}`,
            `║ Palm Sunday    : ${_formatISO(cal.palmSunday)}`,
            `║ Good Friday    : ${_formatISO(cal.goodFriday)}`,
            `║ Holy Saturday  : ${_formatISO(cal.holySaturday)}`,
            `║ Easter Sunday  : ${_formatISO(cal.easter)}`,
            `║ Pentecost      : ${_formatISO(cal.pentecost)}`,
            `║ Advent Start   : ${_formatISO(cal.adventStart)}`,
            `║ Christmas      : ${_formatISO(cal.christmas)}`,
            `╚${'═'.repeat(34)}╝`
        ];
        return lines.join('\n');
    }


    // ══════════════════════════════════════════════════
    // UTILITY: Get multiple years at once
    // ══════════════════════════════════════════════════
    function getCalendarRange(startYear, endYear) {
        const results = {};
        for (let y = startYear; y <= endYear; y++) {
            results[y] = getCalendar(y);
        }
        return results;
    }


    // ══════════════════════════════════════════════════
    // UTILITY: Cache management
    // ══════════════════════════════════════════════════
    function getCacheSize() {
        return _cache.size;
    }

    function clearCache() {
        _cache.clear();
    }


    // ══════════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════════
    return Object.freeze({
        // Core
        getCalendar,
        getCalendarRange,

        // Helpers
        getCurrentLiturgicalSeason,
        getDaysSinceAshWednesday,
        getLentDevotionDay,

        // Season metadata
        SEASON_META,

        // Display
        formatCalendar,

        // Cache management
        getCacheSize,
        clearCache,

        // Low-level (for advanced use)
        _computeEaster,
        _computeAdventStart
    });
})();
