/**
 * ============================================================================
 * LENT CALENDAR CALCULATOR
 * Automatic Ash Wednesday & Easter Calculation System
 * ============================================================================
 * 
 * Provides accurate Easter and Ash Wednesday date calculation for any year
 * using the Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 * 
 * FEATURES:
 * - Accurate Easter date calculation for years 1583-4099
 * - Automatic Ash Wednesday calculation (Easter - 46 days)
 * - Lent devotion day calculation from current date
 * - 40-day Lent window generation (Day 1 = Ash Wednesday)
 * 
 * @version 1.0.0
 * @author GPBC Engineering
 * @date February 16, 2026
 */

(function () {
    'use strict';

    /**
     * Calculate Easter Sunday date for a given year using the
     * Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
     * 
     * This algorithm is accurate for all Gregorian years (1583-4099).
     * 
     * @param {number} year - The year to calculate Easter for
     * @returns {Date} Easter Sunday date
     * 
     * @example
     * getEasterDate(2026) // Returns: Sun Apr 05 2026
     * getEasterDate(2027) // Returns: Sun Mar 28 2027
     */
    function getEasterDate(year) {
        if (!Number.isInteger(year) || year < 1583 || year > 4099) {
            throw new Error(`Invalid year: ${year}. Must be an integer between 1583 and 4099.`);
        }

        // Anonymous Gregorian algorithm
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
        const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
        const day = ((h + l - 7 * m + 114) % 31) + 1;

        return new Date(year, month - 1, day);
    }

    /**
     * Calculate Ash Wednesday date for a given year.
     * Ash Wednesday is 46 days before Easter Sunday.
     * 
     * @param {number} year - The year to calculate Ash Wednesday for
     * @returns {Date} Ash Wednesday date
     * 
     * @example
     * getAshWednesday(2026) // Returns: Wed Feb 18 2026
     * getAshWednesday(2027) // Returns: Wed Feb 10 2027
     */
    function getAshWednesday(year) {
        const easter = getEasterDate(year);
        const ashWednesday = new Date(easter);
        ashWednesday.setDate(easter.getDate() - 46);
        return ashWednesday;
    }

    /**
     * Calculate which day of Lent (1-40) a given date falls on.
     * Returns 0 if the date is not within the Lent period.
     * 
     * @param {Date} date - The date to check
     * @returns {number} Day number (1-40), or 0 if not in Lent period
     * 
     * @example
     * // If today is Feb 18, 2026 (Ash Wednesday)
     * getLentDevotionDay(new Date(2026, 1, 18)) // Returns: 1
     * 
     * // If today is Feb 25, 2026 (7 days after Ash Wednesday)
     * getLentDevotionDay(new Date(2026, 1, 25)) // Returns: 8
     * 
     * // If today is Jan 1, 2026 (not during Lent)
     * getLentDevotionDay(new Date(2026, 0, 1)) // Returns: 0
     */
    function getLentDevotionDay(date) {
        const targetDate = new Date(date);
        const year = targetDate.getFullYear();
        const ashWednesday = getAshWednesday(year);
        
        // Calculate 40th day of Lent (Ash Wednesday + 39 days)
        const day40 = new Date(ashWednesday);
        day40.setDate(ashWednesday.getDate() + 39);

        // Normalize dates to midnight for accurate comparison
        const normalizeDate = (d) => {
            const normalized = new Date(d);
            normalized.setHours(0, 0, 0, 0);
            return normalized;
        };

        const normalizedTarget = normalizeDate(targetDate);
        const normalizedAshWed = normalizeDate(ashWednesday);
        const normalizedDay40 = normalizeDate(day40);

        // Check if date is within Lent period
        if (normalizedTarget < normalizedAshWed || normalizedTarget > normalizedDay40) {
            return 0; // Not in Lent period
        }

        // Calculate day offset (Day 1 = Ash Wednesday)
        const diffMs = normalizedTarget - normalizedAshWed;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays + 1; // Day 1 = Ash Wednesday
    }

    /**
     * Generate the complete 40-day Lent devotion window for a given year.
     * Returns an array of objects with day number and date.
     * 
     * @param {number} year - The year to generate Lent window for
     * @returns {Array<{day: number, date: Date, dateString: string}>}
     * 
     * @example
     * getLentDevotionWindow(2026)
     * // Returns:
     * // [
     * //   { day: 1, date: Date(2026-02-18), dateString: "2026-02-18" },
     * //   { day: 2, date: Date(2026-02-19), dateString: "2026-02-19" },
     * //   ...
     * //   { day: 40, date: Date(2026-03-29), dateString: "2026-03-29" }
     * // ]
     */
    function getLentDevotionWindow(year) {
        const ashWednesday = getAshWednesday(year);
        const window = [];

        for (let day = 1; day <= 40; day++) {
            const currentDate = new Date(ashWednesday);
            currentDate.setDate(ashWednesday.getDate() + (day - 1));
            
            window.push({
                day: day,
                date: new Date(currentDate),
                dateString: currentDate.toISOString().split('T')[0] // YYYY-MM-DD
            });
        }

        return window;
    }

    /**
     * Get Lent information for the current year including:
     * - Ash Wednesday date
     * - Easter date
     * - Current Lent day (if within Lent period)
     * - Complete 40-day window
     * 
     * @param {number} [year] - Year to get info for (defaults to current year)
     * @returns {Object} Lent information object
     * 
     * @example
     * getLentInfo(2026)
     * // Returns:
     * // {
     * //   year: 2026,
     * //   ashWednesday: Date(2026-02-18),
     * //   easter: Date(2026-04-05),
     * //   currentDay: 1,  // or 0 if not in Lent
     * //   isLentPeriod: true,
     * //   window: [...]  // 40-day array
     * // }
     */
    function getLentInfo(year) {
        const targetYear = year || new Date().getFullYear();
        const today = new Date();
        const ashWednesday = getAshWednesday(targetYear);
        const easter = getEasterDate(targetYear);
        const currentDay = getLentDevotionDay(today);

        return {
            year: targetYear,
            ashWednesday: ashWednesday,
            easter: easter,
            currentDay: currentDay,
            isLentPeriod: currentDay > 0,
            window: getLentDevotionWindow(targetYear)
        };
    }

    /**
     * Utility function to format date as human-readable string
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     * 
     * @example
     * formatDate(new Date(2026, 1, 18)) // "Wednesday, February 18, 2026"
     */
    function formatDate(date) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    // ========================================================================
    // PUBLIC API - Expose functions to window object
    // ========================================================================

    window.LentCalendar = {
        getEasterDate,
        getAshWednesday,
        getLentDevotionDay,
        getLentDevotionWindow,
        getLentInfo,
        formatDate,
        version: '1.0.0'
    };

    // ========================================================================
    // AUTO-INITIALIZATION & DIAGNOSTIC OUTPUT
    // ========================================================================

    if (typeof console !== 'undefined') {
        const currentYear = new Date().getFullYear();
        const info = getLentInfo(currentYear);
        
        console.log('[Lent Calendar] ✅ Initialized');
        console.log(`[Lent Calendar] ${currentYear} Ash Wednesday: ${formatDate(info.ashWednesday)}`);
        console.log(`[Lent Calendar] ${currentYear} Easter Sunday: ${formatDate(info.easter)}`);
        
        if (info.isLentPeriod) {
            console.log(`[Lent Calendar] 🕊️ Currently Day ${info.currentDay} of Lent`);
        } else {
            console.log(`[Lent Calendar] Not currently in Lent period`);
        }
    }

})();
