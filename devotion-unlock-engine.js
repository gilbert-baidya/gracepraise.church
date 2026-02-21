/**
 * ======================================================
 * DEVOTION AUTO-UNLOCK ENGINE — GPBC
 * ======================================================
 *
 * Automatically unlocks Lent devotion days based on real
 * calendar date, starting from Ash Wednesday each year.
 *
 * Consumes: LiturgicalCalendar (liturgical-calendar-engine.js)
 * Used by:  lent-fasting.html (SacredWaymarks controller)
 *
 * Features:
 *   - Date-gated unlock (days unlock progressively)
 *   - Today's Devotion banner
 *   - Soft glow animation on new unlock
 *   - Lock icon + "Available on [Date]" for future days
 *   - Progress tracker auto-updates
 *   - Screen reader announcements
 *   - Reduced motion support
 *
 * Performance:
 *   - Pure client-side, no API calls
 *   - Deterministic, cacheable per day
 *   - <1ms computation
 *
 * @version 1.0.0
 * ======================================================
 */
const DevotionUnlockEngine = (() => {
    'use strict';

    // ══════════════════════════════════════════════════
    // CONSTANTS
    // ══════════════════════════════════════════════════
    const TOTAL_LENT_DAYS = 40;
    const UNLOCK_CACHE_KEY = 'gpbc-unlock-state';

    // ══════════════════════════════════════════════════
    // CONFIG-DRIVEN UNLOCK OVERRIDE
    // Checks window.GPBC_CONFIG.unlockAllDevotions only
    // ══════════════════════════════════════════════════
    function shouldForceUnlock() {
        // Check centralized config
        if (typeof window !== 'undefined' && 
            window.GPBC_CONFIG && 
            window.GPBC_CONFIG.unlockAllDevotions === true) {
            return true;
        }
        // Check query parameter ?unlock=1 as override
        if (typeof window !== 'undefined' && window.location) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('unlock') === '1') {
                return true;
            }
        }
        return false;
    }


    // ══════════════════════════════════════════════════
    // DATE UTILITIES
    // ══════════════════════════════════════════════════
    function _stripTime(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function _addDays(date, n) {
        const d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function _daysBetween(a, b) {
        return Math.round((_stripTime(b) - _stripTime(a)) / 86400000);
    }

    function _formatDateShort(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}`;
    }

    function _formatDateFull(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    }

    function _formatDateBn(date) {
        const bnMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        const dayStr = String(date.getDate()).split('').map(c => bnDigits[+c]).join('');
        return `${dayStr} ${bnMonths[date.getMonth()]}`;
    }


    // ══════════════════════════════════════════════════
    // CORE: getUnlockState(today?)
    // Computes the current unlock state for all 40 days
    // ══════════════════════════════════════════════════
    function getUnlockState(today) {
        const d = _stripTime(today || new Date());
        const year = d.getFullYear();

        // Check if force unlock is enabled
        if (shouldForceUnlock()) {
            console.log('[DevotionUnlock] Force unlock enabled - all days unlocked');
            return _allUnlocked();
        }

        // Get Ash Wednesday from the Liturgical Calendar Engine
        let ashWednesday;
        if (typeof LiturgicalCalendar !== 'undefined') {
            ashWednesday = LiturgicalCalendar.getCalendar(year).ashWednesday;
        } else if (typeof LentCalendar !== 'undefined') {
            ashWednesday = LentCalendar.getAshWednesday(year);
        } else {
            console.warn('[DevotionUnlock] No calendar engine found. All days unlocked.');
            return _allUnlocked();
        }

        ashWednesday = _stripTime(ashWednesday);
        const daysSinceAsh = _daysBetween(ashWednesday, d);

        // ── Unlock logic ──
        let phase, currentLentDay, maxUnlockedDay;

        if (daysSinceAsh < 0) {
            // Before Lent
            phase = 'before-lent';
            currentLentDay = 0;
            maxUnlockedDay = 0;
        } else if (daysSinceAsh === 0) {
            // Ash Wednesday itself = Day 1
            phase = 'during-lent';
            currentLentDay = 1;
            maxUnlockedDay = 1;
        } else if (daysSinceAsh <= 39) {
            // During Lent (days 2-40)
            phase = 'during-lent';
            currentLentDay = daysSinceAsh + 1;
            maxUnlockedDay = currentLentDay;
        } else {
            // After Lent — all unlocked
            phase = 'after-lent';
            currentLentDay = TOTAL_LENT_DAYS;
            maxUnlockedDay = TOTAL_LENT_DAYS;
        }

        // Build per-day unlock array
        const days = [];
        for (let i = 1; i <= TOTAL_LENT_DAYS; i++) {
            const dayDate = _addDays(ashWednesday, i - 1);
            days.push({
                day: i,
                date: dayDate,
                dateFormatted: _formatDateShort(dayDate),
                dateFormattedFull: _formatDateFull(dayDate),
                dateFormattedBn: _formatDateBn(dayDate),
                unlocked: i <= maxUnlockedDay,
                isToday: i === currentLentDay && phase === 'during-lent',
                isNew: i === maxUnlockedDay && phase === 'during-lent'
            });
        }

        return Object.freeze({
            year,
            phase,
            ashWednesday,
            currentLentDay,
            maxUnlockedDay,
            totalDays: TOTAL_LENT_DAYS,
            progress: Math.min(maxUnlockedDay / TOTAL_LENT_DAYS, 1),
            days
        });
    }

    function _allUnlocked() {
        const days = [];
        for (let i = 1; i <= TOTAL_LENT_DAYS; i++) {
            days.push({
                day: i, unlocked: true, isToday: false, isNew: false,
                dateFormatted: '', dateFormattedFull: '', dateFormattedBn: ''
            });
        }
        return Object.freeze({
            phase: 'after-lent', currentLentDay: TOTAL_LENT_DAYS,
            maxUnlockedDay: TOTAL_LENT_DAYS, totalDays: TOTAL_LENT_DAYS,
            progress: 1, days
        });
    }


    // ══════════════════════════════════════════════════
    // HELPER: getAshWednesday(year)
    // ══════════════════════════════════════════════════
    function getAshWednesday(year) {
        if (typeof LiturgicalCalendar !== 'undefined') {
            return LiturgicalCalendar.getCalendar(year).ashWednesday;
        }
        console.warn('[DevotionUnlock] No calendar engine. Cannot compute Ash Wednesday.');
        return null;
    }


    // ══════════════════════════════════════════════════
    // HELPER: getDaysSinceAshWednesday(today?)
    // ══════════════════════════════════════════════════
    function getDaysSinceAshWednesday(today) {
        const d = _stripTime(today || new Date());
        const ash = getAshWednesday(d.getFullYear());
        if (!ash) return null;
        return _daysBetween(_stripTime(ash), d);
    }


    // ══════════════════════════════════════════════════
    // HELPER: getUnlockedDevotionDays(today?)
    // Returns array of unlocked day numbers [1, 2, ...]
    // ══════════════════════════════════════════════════
    function getUnlockedDevotionDays(today) {
        const state = getUnlockState(today);
        return state.days.filter(d => d.unlocked).map(d => d.day);
    }


    // ══════════════════════════════════════════════════
    // HELPER: isDayUnlocked(dayNumber, today?)
    // ══════════════════════════════════════════════════
    function isDayUnlocked(dayNumber, today) {
        const state = getUnlockState(today);
        const day = state.days.find(d => d.day === dayNumber);
        return day ? day.unlocked : false;
    }


    // ══════════════════════════════════════════════════
    // UI: Inject CSS for lock states + animations
    // ══════════════════════════════════════════════════
    function _injectStyles() {
        if (document.getElementById('devotion-unlock-styles')) return;
        const style = document.createElement('style');
        style.id = 'devotion-unlock-styles';
        style.textContent = `
            /* ── Lock states ── */
            .day-option--locked {
                color: var(--text-muted, #666) !important;
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }
            .day-option--locked::after {
                content: ' 🔒';
            }
            .day-option--today {
                font-weight: 700;
                color: var(--color-primary, #3b82f6) !important;
            }
            .day-option--today::before {
                content: '▸ ';
            }

            /* ── Today banner ── */
            .unlock-today-banner {
                background: linear-gradient(135deg,
                    var(--color-primary, #3b82f6),
                    var(--color-accent, #f59e0b));
                color: #fff;
                text-align: center;
                padding: 0.75rem 1.25rem;
                border-radius: var(--radius-lg, 1rem);
                margin-bottom: 1.25rem;
                font-weight: 600;
                font-size: 0.95rem;
                letter-spacing: 0.01em;
                animation: unlockBannerPulse 2s ease-in-out infinite;
                box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
            }
            .unlock-today-banner .banner-emoji {
                font-size: 1.2em;
                margin-right: 0.3em;
            }
            .unlock-today-banner .banner-bn {
                display: block;
                font-size: 0.85em;
                opacity: 0.9;
                margin-top: 0.2em;
                font-family: var(--font-bangla-body, 'Noto Sans Bengali', sans-serif);
            }
            @keyframes unlockBannerPulse {
                0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25); }
                50% { transform: scale(1.01); box-shadow: 0 6px 28px rgba(59, 130, 246, 0.35); }
            }

            /* ── New day glow ── */
            .unlock-glow {
                animation: unlockGlowReveal 1.5s ease-out forwards;
            }
            @keyframes unlockGlowReveal {
                0% { box-shadow: 0 0 0 rgba(201, 162, 79, 0); opacity: 0.7; }
                40% { box-shadow: var(--glow-sacred, 0 0 8px rgba(201, 162, 79, 0.25)); }
                100% { box-shadow: none; opacity: 1; }
            }

            /* ── Lock overlay for content ── */
            .devotion-locked-overlay {
                position: relative;
                min-height: 200px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 3rem 2rem;
                gap: 1rem;
            }
            .devotion-locked-overlay .lock-icon {
                font-size: 3rem;
                opacity: 0.6;
            }
            .devotion-locked-overlay .lock-message {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text-heading, #0f172a);
            }
            .devotion-locked-overlay .lock-date {
                font-size: 0.95rem;
                color: var(--text-muted, #475569);
            }
            .devotion-locked-overlay .lock-date-bn {
                font-family: var(--font-bangla-body, 'Noto Sans Bengali', sans-serif);
                font-size: 0.9rem;
                color: var(--text-muted, #475569);
                opacity: 0.85;
            }

            /* ── Progress bar ── */
            .unlock-progress-bar {
                width: 100%;
                height: 6px;
                background: var(--color-surface, rgba(255,255,255,0.1));
                border-radius: 3px;
                overflow: hidden;
                margin: 0.5rem 0;
            }
            .unlock-progress-fill {
                height: 100%;
                background: linear-gradient(90deg,
                    var(--color-primary, #3b82f6),
                    var(--color-accent, #f59e0b));
                border-radius: 3px;
                transition: width var(--transition-normal, 300ms ease);
            }
            .unlock-progress-label {
                font-size: 0.8rem;
                color: var(--text-muted, #475569);
                text-align: center;
                margin-top: 0.25rem;
            }

            /* ── Reduced motion ── */
            @media (prefers-reduced-motion: reduce) {
                .unlock-today-banner,
                .unlock-glow,
                .unlock-progress-fill {
                    animation: none !important;
                    transition: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }


    // ══════════════════════════════════════════════════
    // UI: Apply unlock state to day selector <select>
    // ══════════════════════════════════════════════════
    function applyToSelector(selectElement, state) {
        if (!selectElement) return;
        const options = selectElement.querySelectorAll('option');

        options.forEach(option => {
            const dayNum = parseInt(option.value, 10);
            if (isNaN(dayNum)) return;

            const dayInfo = state.days.find(d => d.day === dayNum);
            if (!dayInfo) return;

            // Reset classes
            option.classList.remove('day-option--locked', 'day-option--today');

            if (!dayInfo.unlocked) {
                option.disabled = true;
                option.classList.add('day-option--locked');
                option.textContent = `Day ${dayNum} 🔒 (${dayInfo.dateFormatted})`;
                option.setAttribute('aria-label',
                    `Day ${dayNum}, locked, available on ${dayInfo.dateFormattedFull}`);
            } else if (dayInfo.isToday) {
                option.classList.add('day-option--today');
                option.textContent = `▸ Day ${dayNum} — Today`;
                option.setAttribute('aria-label',
                    `Day ${dayNum}, today's devotion, unlocked`);
            }
            // Unlocked non-today options keep their existing text
        });
    }


    // ══════════════════════════════════════════════════
    // UI: Create "Today's Devotion Is Ready" banner
    // ══════════════════════════════════════════════════
    function createTodayBanner(state) {
        if (state.phase !== 'during-lent') return null;

        const banner = document.createElement('div');
        banner.className = 'unlock-today-banner';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML = `
            <span class="banner-emoji">🕊️</span>
            Today's Devotion Is Ready — Day ${state.currentLentDay} of ${state.totalDays}
            <span class="banner-bn">আজকের ধ্যান প্রস্তুত — দিন ${state.currentLentDay}</span>
        `;
        return banner;
    }


    // ══════════════════════════════════════════════════
    // UI: Create progress bar
    // ══════════════════════════════════════════════════
    function createProgressBar(state) {
        const container = document.createElement('div');
        container.className = 'unlock-progress-wrapper';

        const bar = document.createElement('div');
        bar.className = 'unlock-progress-bar';
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuenow', state.maxUnlockedDay);
        bar.setAttribute('aria-valuemin', 0);
        bar.setAttribute('aria-valuemax', state.totalDays);
        bar.setAttribute('aria-label',
            `Lent progress: Day ${state.maxUnlockedDay} of ${state.totalDays}`);

        const fill = document.createElement('div');
        fill.className = 'unlock-progress-fill';
        fill.style.width = `${Math.round(state.progress * 100)}%`;

        bar.appendChild(fill);
        container.appendChild(bar);

        const label = document.createElement('div');
        label.className = 'unlock-progress-label';
        label.textContent = `${state.maxUnlockedDay} of ${state.totalDays} days unlocked`;
        container.appendChild(label);

        return container;
    }


    // ══════════════════════════════════════════════════
    // UI: Create locked content overlay
    // ══════════════════════════════════════════════════
    function createLockedOverlay(dayNumber, state) {
        const dayInfo = state.days.find(d => d.day === dayNumber);
        if (!dayInfo || dayInfo.unlocked) return null;

        const overlay = document.createElement('div');
        overlay.className = 'devotion-locked-overlay';
        overlay.setAttribute('role', 'alert');
        overlay.setAttribute('aria-label',
            `Day ${dayNumber} is locked. Available on ${dayInfo.dateFormattedFull}`);
        overlay.innerHTML = `
            <div class="lock-icon" aria-hidden="true">🔒</div>
            <div class="lock-message">Day ${dayNumber} — Not Yet Available</div>
            <div class="lock-date">Available on ${dayInfo.dateFormattedFull}</div>
            <div class="lock-date-bn">${dayInfo.dateFormattedBn} তারিখে উপলব্ধ হবে</div>
        `;
        return overlay;
    }


    // ══════════════════════════════════════════════════
    // UI: Apply glow to newly unlocked day
    // ══════════════════════════════════════════════════
    function applyNewDayGlow(element) {
        if (!element) return;
        // Check reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        element.classList.add('unlock-glow');
        element.addEventListener('animationend', () => {
            element.classList.remove('unlock-glow');
        }, { once: true });
    }


    // ══════════════════════════════════════════════════
    // UI: Screen reader announcement
    // ══════════════════════════════════════════════════
    function announceUnlock(state) {
        const announcer = document.getElementById('sr-announce') ||
            (() => {
                const el = document.createElement('div');
                el.id = 'sr-announce';
                el.setAttribute('role', 'status');
                el.setAttribute('aria-live', 'polite');
                el.className = 'sr-only';
                el.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)';
                document.body.appendChild(el);
                return el;
            })();

        if (state.phase === 'during-lent') {
            announcer.textContent =
                `Day ${state.currentLentDay} of ${state.totalDays} is now available. ` +
                `${state.maxUnlockedDay} days unlocked.`;
        } else if (state.phase === 'before-lent') {
            const ash = state.ashWednesday;
            if (ash) {
                announcer.textContent =
                    `Lent has not begun yet. Devotions start on ${_formatDateFull(ash)}.`;
            }
        } else {
            announcer.textContent = `All ${state.totalDays} Lent devotion days are now available.`;
        }
    }


    // ══════════════════════════════════════════════════
    // INTEGRATION: Gate navigation for SacredWaymarks
    // Returns true if day can be accessed, false if locked
    // ══════════════════════════════════════════════════
    function canAccessDay(dayNumber, today) {
        return isDayUnlocked(dayNumber, today);
    }


    // ══════════════════════════════════════════════════
    // INTEGRATION: Full init — inject styles + compute
    // ══════════════════════════════════════════════════
    function init(today) {
        _injectStyles();
        const state = getPublicUnlockState(today);

        console.log(
            `[DevotionUnlock] Phase: ${state.phase} | ` +
            `Day: ${state.currentLentDay}/${state.totalDays} | ` +
            `Unlocked: ${state.maxUnlockedDay}`
        );

        return state;
    }


    // ══════════════════════════════════════════════════
    // DEV MODE: Force unlock all days
    // ══════════════════════════════════════════════════
    let _forceUnlock = false;

    function isForcedUnlockActive() {
        // DEPRECATED: Legacy window.FORCE_DEVOTION_UNLOCK check removed
        // Use window.GPBC_CONFIG.unlockAllDevotions instead
        return _forceUnlock;
    }

    function buildForcedUnlockState(today) {
        const state = getUnlockState(today);
        return {
            ...state,
            phase: 'after-lent',
            currentLentDay: TOTAL_LENT_DAYS,
            maxUnlockedDay: TOTAL_LENT_DAYS,
            progress: 1,
            days: state.days.map(d => ({
                ...d,
                unlocked: true,
                isToday: false,
                isNew: false
            }))
        };
    }

    function getPublicUnlockState(today) {
        if (isForcedUnlockActive()) {
            return buildForcedUnlockState(today);
        }
        return getUnlockState(today);
    }

    function forceUnlockAll() {
        _forceUnlock = true;
        console.log('[DevotionUnlock] 🔓 DEV MODE: All days unlocked');
    }

    // ══════════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════════
    return Object.freeze({
        getUnlockState: getPublicUnlockState,
        forceUnlockAll,
        // Core
        init,
        getAshWednesday,
        getDaysSinceAshWednesday,
        getUnlockedDevotionDays,
        isDayUnlocked: (day, today) => isForcedUnlockActive() ? true : isDayUnlocked(day, today),
        canAccessDay: (day, today) => isForcedUnlockActive() ? true : canAccessDay(day, today),

        // UI components
        applyToSelector,
        createTodayBanner,
        createProgressBar,
        createLockedOverlay,
        applyNewDayGlow,
        announceUnlock,

        // Constants
        TOTAL_LENT_DAYS
    });
})();
