/**
 * ══════════════════════════════════════════════════════
 * SACRED DEVOTION REMINDER ENGINE — GPBC
 * ══════════════════════════════════════════════════════
 *
 * Gently reminds church members about daily devotions
 * and major liturgical milestones. Spiritual, not commercial.
 *
 * Consumes:
 *   - LiturgicalCalendar (liturgical-calendar-engine.js)
 *   - DevotionUnlockEngine (devotion-unlock-engine.js)
 *
 * Features:
 *   - Opt-in management with localStorage persistence
 *   - Max 1 notification per day (throttled)
 *   - Quiet hours support (default 9PM–7AM)
 *   - Bilingual templates (English + Bangla)
 *   - 5 reminder types: Daily, Season Start, Holy Week, Easter, Pentecost
 *   - Browser Push + PWA notification support
 *   - Future SMS integration ready (webhook interface)
 *   - Screen reader accessible announcements
 *   - Reduced notification frequency preference
 *
 * Tone: Gentle · Encouraging · Pastoral · Uplifting
 *
 * @version 1.0.0
 * ══════════════════════════════════════════════════════
 */
const SacredReminderEngine = (() => {
    'use strict';

    // ══════════════════════════════════════════════════
    // STORAGE KEYS
    // ══════════════════════════════════════════════════
    const PREF_KEY = 'gpbc-reminder-prefs';
    const LAST_SENT_KEY = 'gpbc-reminder-last-sent';
    const OPTIN_KEY = 'gpbc-reminder-optin';

    // ══════════════════════════════════════════════════
    // DEFAULT PREFERENCES
    // ══════════════════════════════════════════════════
    const DEFAULT_PREFS = Object.freeze({
        enabled: false,
        language: 'both',           // 'en', 'bn', 'both'
        frequency: 'daily',         // 'daily', 'weekly', 'milestones-only'
        quietHoursStart: 21,        // 9 PM
        quietHoursEnd: 7,           // 7 AM
        preferredHour: 7,           // Reminder at 7 AM
        categories: {
            dailyDevotion: true,
            seasonStart: true,
            holyWeek: true,
            easter: true,
            pentecost: true,
            advent: true
        }
    });

    // ══════════════════════════════════════════════════
    // NOTIFICATION TEMPLATES
    // Tone: gentle, pastoral, encouraging
    // ══════════════════════════════════════════════════
    const TEMPLATES = Object.freeze({

        // ── Type 1: Daily Lent Devotion ──
        dailyDevotion: {
            icon: '🕊️',
            tag: 'gpbc-daily-devotion',
            variants: [
                {
                    en: (day) => `Day ${day} of 40 — Your devotion is waiting`,
                    bn: (day) => `দিন ${day} / ৪০ — আজকের ধ্যান প্রস্তুত`,
                    body: {
                        en: (day) => `Take a quiet moment with God today. Day ${day} of Lent is ready for you.`,
                        bn: (day) => `আজ ঈশ্বরের সঙ্গে এক শান্ত মুহূর্ত কাটান। উপবাসের ${day} তম দিন আপনার জন্য প্রস্তুত।`
                    }
                },
                {
                    en: (day) => `Today's Lent Devotion Is Ready — Day ${day}`,
                    bn: (day) => `আজকের উপবাসের ধ্যান প্রস্তুত — দিন ${day}`,
                    body: {
                        en: () => 'Draw closer to God through prayer and reflection today.',
                        bn: () => 'আজ প্রার্থনা ও ধ্যানের মাধ্যমে ঈশ্বরের কাছে আসুন।'
                    }
                },
                {
                    en: (day) => `Good morning — Day ${day} of your Lenten journey`,
                    bn: (day) => `শুভ সকাল — উপবাসের দিন ${day}`,
                    body: {
                        en: () => '"Be still and know that I am God." — Psalm 46:10',
                        bn: () => '"তোমরা স্থির হও, জান যে, আমিই ঈশ্বর।" — গীতসংহিতা ৪৬:১০'
                    }
                }
            ],
            weeklyEncouragement: [
                { en: 'Week 1 of Lent — A beautiful beginning', bn: 'উপবাসের ১ম সপ্তাহ — এক সুন্দর সূচনা' },
                { en: 'Week 2 of Lent — Growing in faith', bn: 'উপবাসের ২য় সপ্তাহ — বিশ্বাসে বৃদ্ধি পাচ্ছেন' },
                { en: 'Week 3 of Lent — Stay strong in prayer', bn: 'উপবাসের ৩য় সপ্তাহ — প্রার্থনায় দৃঢ় থাকুন' },
                { en: 'Week 4 of Lent — The journey deepens', bn: 'উপবাসের ৪র্থ সপ্তাহ — যাত্রা আরও গভীর হচ্ছে' },
                { en: 'Week 5 of Lent — Almost there, keep going', bn: 'উপবাসের ৫ম সপ্তাহ — প্রায় শেষ, চলতে থাকুন' },
                { en: 'Week 6 — Holy Week approaches', bn: '৬ষ্ঠ সপ্তাহ — পবিত্র সপ্তাহ আসছে' }
            ]
        },

        // ── Type 2: Season Start ──
        seasonStart: {
            ashWednesday: {
                icon: '✝️',
                tag: 'gpbc-ash-wednesday',
                en: 'Ash Wednesday — The 40-day journey begins today',
                bn: 'ভস্ম বুধবার — ৪০ দিনের যাত্রা আজ শুরু',
                body: {
                    en: '"Return to me with all your heart, with fasting and weeping." — Joel 2:12',
                    bn: '"সমস্ত অন্তঃকরণের সহিত, উপবাস ও রোদন সহকারে আমার কাছে ফিরিয়া আইস।" — যোয়েল ২:১২'
                }
            },
            adventStart: {
                icon: '🕯️',
                tag: 'gpbc-advent-start',
                en: 'Advent Season begins — Prepare your heart for Christmas',
                bn: 'আগমনী কাল শুরু — বড়দিনের জন্য হৃদয় প্রস্তুত করুন',
                body: {
                    en: 'Light the first candle of hope. The King is coming.',
                    bn: 'আশার প্রথম মোমবাতি জ্বালান। রাজা আসছেন।'
                }
            }
        },

        // ── Type 3: Holy Week ──
        holyWeek: {
            palmSunday: {
                icon: '🌿',
                tag: 'gpbc-palm-sunday',
                en: 'Palm Sunday — Hosanna! The King enters Jerusalem',
                bn: 'পাম রবিবার — হোশান্না! রাজা জেরুশালেমে প্রবেশ করেন',
                body: {
                    en: '"Blessed is he who comes in the name of the Lord!" — Matthew 21:9',
                    bn: '"ধন্য তিনি যিনি প্রভুর নামে আসেন!" — মথি ২১:৯'
                }
            },
            goodFriday: {
                icon: '✝️',
                tag: 'gpbc-good-friday',
                en: 'Good Friday — He gave everything for you',
                bn: 'শুভ শুক্রবার — তিনি আপনার জন্য সবকিছু দিয়েছেন',
                body: {
                    en: '"For God so loved the world that he gave his one and only Son." — John 3:16',
                    bn: '"কেননা ঈশ্বর জগৎকে এমন প্রেম করিলেন যে, আপনার একজাত পুত্রকে দান করিলেন।" — যোহন ৩:১৬'
                }
            },
            holySaturday: {
                icon: '🕊️',
                tag: 'gpbc-holy-saturday',
                en: 'Holy Saturday — A day of quiet waiting and hope',
                bn: 'পবিত্র শনিবার — নীরব অপেক্ষা ও আশার দিন',
                body: {
                    en: 'In the silence, God is at work. Tomorrow brings resurrection.',
                    bn: 'নীরবতায় ঈশ্বর কাজ করছেন। আগামীকাল পুনরুত্থান আনবে।'
                }
            }
        },

        // ── Type 4: Easter ──
        easter: {
            icon: '🌅',
            tag: 'gpbc-easter',
            en: 'He Is Risen! — Happy Easter!',
            bn: 'তিনি পুনরুত্থিত হয়েছেন! — শুভ ইস্টার!',
            body: {
                en: '"He is not here; he has risen, just as he said." — Matthew 28:6. Hallelujah!',
                bn: '"তিনি এখানে নেই; তিনি পুনরুত্থিত হয়েছেন, যেমন তিনি বলেছিলেন।" — মথি ২৮:৬। হালেলুয়া!'
            }
        },

        // ── Type 5: Pentecost ──
        pentecost: {
            icon: '🔥',
            tag: 'gpbc-pentecost',
            en: 'Pentecost Sunday — The Holy Spirit has come!',
            bn: 'পঞ্চাশত্তমীর রবিবার — পবিত্র আত্মা এসে গেছেন!',
            body: {
                en: '"All of them were filled with the Holy Spirit." — Acts 2:4',
                bn: '"তাঁরা সকলে পবিত্র আত্মায় পূর্ণ হইলেন।" — প্রেরিত ২:৪'
            }
        }
    });


    // ══════════════════════════════════════════════════
    // PREFERENCE MANAGEMENT
    // ══════════════════════════════════════════════════
    function _loadPrefs() {
        try {
            const raw = localStorage.getItem(PREF_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                return {
                    ...DEFAULT_PREFS, ...saved,
                    categories: { ...DEFAULT_PREFS.categories, ...(saved.categories || {}) }
                };
            }
        } catch (e) {
            console.warn('[SacredReminder] Failed to load preferences:', e);
        }
        return { ...DEFAULT_PREFS };
    }

    function _savePrefs(prefs) {
        try {
            localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
        } catch (e) {
            console.warn('[SacredReminder] Failed to save preferences:', e);
        }
    }


    // ══════════════════════════════════════════════════
    // OPT-IN MANAGEMENT
    // ══════════════════════════════════════════════════
    async function requestOptIn() {
        if (!('Notification' in window)) {
            console.log('[SacredReminder] Browser does not support notifications.');
            return { granted: false, reason: 'unsupported' };
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const prefs = _loadPrefs();
            prefs.enabled = true;
            _savePrefs(prefs);
            localStorage.setItem(OPTIN_KEY, new Date().toISOString());
            console.log('[SacredReminder] ✅ User opted in to notifications.');
            return { granted: true };
        }

        console.log('[SacredReminder] ❌ Notification permission denied.');
        return { granted: false, reason: 'denied' };
    }

    function isOptedIn() {
        const prefs = _loadPrefs();
        return prefs.enabled && ('Notification' in window) && Notification.permission === 'granted';
    }

    function optOut() {
        const prefs = _loadPrefs();
        prefs.enabled = false;
        _savePrefs(prefs);
        console.log('[SacredReminder] User opted out of notifications.');
    }


    // ══════════════════════════════════════════════════
    // THROTTLE: Max 1 notification per day
    // ══════════════════════════════════════════════════
    function _getLastSentDate() {
        const raw = localStorage.getItem(LAST_SENT_KEY);
        return raw || null;
    }

    function _markSent() {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(LAST_SENT_KEY, today);
    }

    function _hasSentToday() {
        const today = new Date().toISOString().split('T')[0];
        return _getLastSentDate() === today;
    }


    // ══════════════════════════════════════════════════
    // QUIET HOURS CHECK
    // ══════════════════════════════════════════════════
    function _isQuietHours(prefs) {
        const now = new Date();
        const hour = now.getHours();
        const start = prefs.quietHoursStart;
        const end = prefs.quietHoursEnd;

        // Handle wrap-around (e.g., 21:00 → 07:00)
        if (start > end) {
            return hour >= start || hour < end;
        }
        return hour >= start && hour < end;
    }


    // ══════════════════════════════════════════════════
    // TEMPLATE SELECTION: Build message for today
    // ══════════════════════════════════════════════════
    function _buildMessage(prefs) {
        if (typeof LiturgicalCalendar === 'undefined') {
            console.warn('[SacredReminder] No LiturgicalCalendar available.');
            return null;
        }

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const cal = LiturgicalCalendar.getCalendar(today.getFullYear());

        const _toStr = (d) => {
            const dt = d instanceof Date ? d : new Date(d);
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        };

        // Check milestone dates (highest priority)
        // Easter
        if (prefs.categories.easter && _toStr(cal.easter) === todayStr) {
            return _formatTemplate(TEMPLATES.easter, prefs);
        }

        // Good Friday
        if (prefs.categories.holyWeek && _toStr(cal.goodFriday) === todayStr) {
            return _formatTemplate(TEMPLATES.holyWeek.goodFriday, prefs);
        }

        // Holy Saturday
        if (prefs.categories.holyWeek && _toStr(cal.holySaturday) === todayStr) {
            return _formatTemplate(TEMPLATES.holyWeek.holySaturday, prefs);
        }

        // Palm Sunday
        if (prefs.categories.holyWeek && _toStr(cal.palmSunday) === todayStr) {
            return _formatTemplate(TEMPLATES.holyWeek.palmSunday, prefs);
        }

        // Pentecost
        if (prefs.categories.pentecost && _toStr(cal.pentecost) === todayStr) {
            return _formatTemplate(TEMPLATES.pentecost, prefs);
        }

        // Ash Wednesday
        if (prefs.categories.seasonStart && _toStr(cal.ashWednesday) === todayStr) {
            return _formatTemplate(TEMPLATES.seasonStart.ashWednesday, prefs);
        }

        // Advent Start
        if (prefs.categories.advent && _toStr(cal.adventStart) === todayStr) {
            return _formatTemplate(TEMPLATES.seasonStart.adventStart, prefs);
        }

        // Daily Lent devotion (only if frequency allows)
        if (prefs.categories.dailyDevotion && prefs.frequency !== 'milestones-only') {
            const unlock = typeof DevotionUnlockEngine !== 'undefined'
                ? DevotionUnlockEngine.getUnlockState()
                : null;

            if (unlock && unlock.phase === 'during-lent') {
                const day = unlock.currentLentDay;

                // Weekly encouragement (every 7th day)
                if (day > 0 && day % 7 === 0) {
                    const weekIdx = Math.min(Math.floor(day / 7) - 1, 5);
                    const weekMsg = TEMPLATES.dailyDevotion.weeklyEncouragement[weekIdx];
                    if (weekMsg) {
                        const variant = TEMPLATES.dailyDevotion.variants[0]; // Use first variant for body
                        return {
                            icon: '🙏',
                            tag: 'gpbc-lent-weekly',
                            title: _langText(weekMsg, prefs),
                            body: _langText(variant.body, prefs, day)
                        };
                    }
                }

                // Skip daily reminders if on weekly frequency
                if (prefs.frequency === 'weekly' && today.getDay() !== 0) {
                    return null;  // Only send on Sundays for weekly
                }

                // Rotate through variants for variety
                const variantIdx = day % TEMPLATES.dailyDevotion.variants.length;
                const variant = TEMPLATES.dailyDevotion.variants[variantIdx];
                return {
                    icon: TEMPLATES.dailyDevotion.icon,
                    tag: TEMPLATES.dailyDevotion.tag,
                    title: _langText(variant, prefs, day),
                    body: _langText(variant.body, prefs, day)
                };
            }
        }

        return null;  // No reminder needed today
    }

    function _formatTemplate(template, prefs) {
        return {
            icon: template.icon,
            tag: template.tag,
            title: _langText(template, prefs),
            body: _langText(template.body, prefs)
        };
    }

    function _langText(source, prefs, day) {
        const lang = prefs.language || 'both';

        const getText = (obj, key) => {
            if (typeof obj === 'function') return obj(day);
            if (typeof obj === 'string') return obj;
            if (obj && typeof obj[key] === 'function') return obj[key](day);
            if (obj && typeof obj[key] === 'string') return obj[key];
            return '';
        };

        if (lang === 'en') return getText(source, 'en');
        if (lang === 'bn') return getText(source, 'bn');

        // 'both'
        const en = getText(source, 'en');
        const bn = getText(source, 'bn');
        if (en && bn) return `${en}\n${bn}`;
        return en || bn || '';
    }


    // ══════════════════════════════════════════════════
    // SEND NOTIFICATION
    // ══════════════════════════════════════════════════
    function _sendNotification(msg) {
        if (!msg || !msg.title) return false;

        try {
            const notification = new Notification(msg.title, {
                body: msg.body || '',
                icon: msg.icon || '🕊️',
                tag: msg.tag || 'gpbc-sacred-reminder',
                badge: '✝️',
                silent: false,
                requireInteraction: false,
                data: {
                    url: '/lent-fasting.html',
                    type: msg.tag
                }
            });

            // Click handler → navigate to devotion page
            notification.onclick = function () {
                window.focus();
                const url = _getTargetUrl(msg.tag);
                if (url) window.location.href = url;
                notification.close();
            };

            _markSent();
            console.log(`[SacredReminder] ${msg.icon} Sent: "${msg.title}"`);
            return true;
        } catch (e) {
            console.warn('[SacredReminder] Failed to send notification:', e);
            return false;
        }
    }

    function _getTargetUrl(tag) {
        const routes = {
            'gpbc-daily-devotion': 'lent-fasting.html',
            'gpbc-lent-weekly': 'lent-fasting.html',
            'gpbc-ash-wednesday': 'lent-fasting.html',
            'gpbc-palm-sunday': 'lent-fasting.html',
            'gpbc-good-friday': 'daily-devotion.html',
            'gpbc-holy-saturday': 'daily-devotion.html',
            'gpbc-easter': 'index.html',
            'gpbc-pentecost': 'index.html',
            'gpbc-advent-start': 'index.html'
        };
        return routes[tag] || 'index.html';
    }


    // ══════════════════════════════════════════════════
    // CHECK & SEND: Main daily check routine
    // ══════════════════════════════════════════════════
    function checkAndSend() {
        const prefs = _loadPrefs();

        // Gate checks
        if (!prefs.enabled) {
            return { sent: false, reason: 'not-opted-in' };
        }
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return { sent: false, reason: 'no-permission' };
        }
        if (_hasSentToday()) {
            return { sent: false, reason: 'already-sent-today' };
        }
        if (_isQuietHours(prefs)) {
            return { sent: false, reason: 'quiet-hours' };
        }

        // Build the right message
        const msg = _buildMessage(prefs);
        if (!msg) {
            return { sent: false, reason: 'no-reminder-needed' };
        }

        const success = _sendNotification(msg);
        return { sent: success, message: msg };
    }


    // ══════════════════════════════════════════════════
    // PREVIEW: Generate today's message without sending
    // ══════════════════════════════════════════════════
    function previewTodayMessage(langOverride) {
        const prefs = _loadPrefs();
        if (langOverride) prefs.language = langOverride;
        // Temporarily enable all categories for preview
        prefs.categories = {
            dailyDevotion: true, seasonStart: true, holyWeek: true,
            easter: true, pentecost: true, advent: true
        };
        return _buildMessage(prefs);
    }


    // ══════════════════════════════════════════════════
    // PREVIEW: Generate message for a specific date
    // ══════════════════════════════════════════════════
    function previewForDate(date, langOverride) {
        if (typeof LiturgicalCalendar === 'undefined') return null;

        const d = date instanceof Date ? date : new Date(date);
        const prefs = _loadPrefs();
        if (langOverride) prefs.language = langOverride;
        prefs.categories = {
            dailyDevotion: true, seasonStart: true, holyWeek: true,
            easter: true, pentecost: true, advent: true
        };

        // Override internal date functions temporarily
        const originalBuild = _buildMessageForDate(d, prefs);
        return originalBuild;
    }

    function _buildMessageForDate(date, prefs) {
        const cal = LiturgicalCalendar.getCalendar(date.getFullYear());
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const _toStr = (d) => {
            const dt = d instanceof Date ? d : new Date(d);
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        };

        if (_toStr(cal.easter) === dateStr) return _formatTemplate(TEMPLATES.easter, prefs);
        if (_toStr(cal.goodFriday) === dateStr) return _formatTemplate(TEMPLATES.holyWeek.goodFriday, prefs);
        if (_toStr(cal.holySaturday) === dateStr) return _formatTemplate(TEMPLATES.holyWeek.holySaturday, prefs);
        if (_toStr(cal.palmSunday) === dateStr) return _formatTemplate(TEMPLATES.holyWeek.palmSunday, prefs);
        if (_toStr(cal.pentecost) === dateStr) return _formatTemplate(TEMPLATES.pentecost, prefs);
        if (_toStr(cal.ashWednesday) === dateStr) return _formatTemplate(TEMPLATES.seasonStart.ashWednesday, prefs);
        if (_toStr(cal.adventStart) === dateStr) return _formatTemplate(TEMPLATES.seasonStart.adventStart, prefs);

        // Check for daily Lent
        const ash = cal.ashWednesday instanceof Date ? cal.ashWednesday : new Date(cal.ashWednesday);
        const diff = Math.round((date - new Date(ash.getFullYear(), ash.getMonth(), ash.getDate())) / 86400000);
        if (diff >= 0 && diff < 40) {
            const day = diff + 1;
            const variantIdx = day % TEMPLATES.dailyDevotion.variants.length;
            const variant = TEMPLATES.dailyDevotion.variants[variantIdx];
            return {
                icon: TEMPLATES.dailyDevotion.icon,
                tag: TEMPLATES.dailyDevotion.tag,
                title: _langText(variant, prefs, day),
                body: _langText(variant.body, prefs, day)
            };
        }

        return null;
    }


    // ══════════════════════════════════════════════════
    // GET/SET PREFERENCES
    // ══════════════════════════════════════════════════
    function getPreferences() {
        return _loadPrefs();
    }

    function updatePreferences(updates) {
        const prefs = _loadPrefs();
        Object.assign(prefs, updates);
        if (updates.categories) {
            prefs.categories = { ...prefs.categories, ...updates.categories };
        }
        _savePrefs(prefs);
        console.log('[SacredReminder] Preferences updated:', prefs);
        return prefs;
    }


    // ══════════════════════════════════════════════════
    // SCHEDULE: Set up periodic checks
    // ══════════════════════════════════════════════════
    let _checkInterval = null;

    function startScheduler(intervalMs) {
        if (_checkInterval) clearInterval(_checkInterval);
        // Default: check every 30 minutes
        const ms = intervalMs || 30 * 60 * 1000;
        _checkInterval = setInterval(() => {
            checkAndSend();
        }, ms);
        // Also check immediately
        checkAndSend();
        console.log(`[SacredReminder] Scheduler started (every ${ms / 60000} min)`);
    }

    function stopScheduler() {
        if (_checkInterval) {
            clearInterval(_checkInterval);
            _checkInterval = null;
        }
        console.log('[SacredReminder] Scheduler stopped.');
    }


    // ══════════════════════════════════════════════════
    // UI: Create opt-in prompt UI element
    // ══════════════════════════════════════════════════
    function createOptInPrompt() {
        if (isOptedIn()) return null;
        if (localStorage.getItem('gpbc-reminder-dismissed')) return null;

        const prompt = document.createElement('div');
        prompt.id = 'sacredReminderOptIn';
        prompt.setAttribute('role', 'dialog');
        prompt.setAttribute('aria-label', 'Enable devotion reminders');
        prompt.innerHTML = `
            <style>
                #sacredReminderOptIn {
                    position: fixed;
                    bottom: 1.5rem;
                    left: 50%;
                    transform: translateX(-50%);
                    max-width: 420px;
                    width: calc(100% - 2rem);
                    background: var(--bg-card, #ffffff);
                    border-radius: var(--radius-xl, 1.5rem);
                    padding: 1.5rem;
                    box-shadow: var(--shadow-xl, 0 24px 40px -12px rgba(17,24,39,0.18));
                    z-index: 9999;
                    font-family: var(--font-sans, system-ui, sans-serif);
                    animation: sacredOptInSlide 0.5s ease-out;
                    border: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
                }
                @keyframes sacredOptInSlide {
                    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                .optin-icon { font-size: 1.8rem; margin-bottom: 0.5rem; }
                .optin-title {
                    font-weight: 700; font-size: 1.05rem;
                    color: var(--text-heading, #0f172a);
                    margin-bottom: 0.25rem;
                }
                .optin-desc {
                    font-size: 0.88rem; color: var(--text-muted, #475569);
                    line-height: 1.5; margin-bottom: 1rem;
                }
                .optin-desc-bn {
                    font-family: var(--font-bangla-body, 'Noto Sans Bengali', sans-serif);
                    font-size: 0.85rem; opacity: 0.85;
                }
                .optin-actions { display: flex; gap: 0.75rem; }
                .optin-btn-yes {
                    flex: 1; padding: 0.65rem 1rem;
                    background: var(--color-primary, #3b82f6); color: #fff;
                    border: none; border-radius: var(--radius-md, 0.5rem);
                    font-weight: 600; cursor: pointer; font-size: 0.9rem;
                    transition: background 200ms ease;
                }
                .optin-btn-yes:hover { filter: brightness(1.1); }
                .optin-btn-no {
                    padding: 0.65rem 1rem;
                    background: transparent;
                    color: var(--text-muted, #475569);
                    border: 1px solid var(--border-subtle, rgba(15,23,42,0.12));
                    border-radius: var(--radius-md, 0.5rem);
                    cursor: pointer; font-size: 0.9rem;
                }
                @media (prefers-reduced-motion: reduce) {
                    #sacredReminderOptIn { animation: none; }
                }
                @media (prefers-color-scheme: dark) {
                    #sacredReminderOptIn {
                        background: var(--bg-card, #1e293b);
                        border-color: rgba(255,255,255,0.1);
                    }
                }
            </style>
            <div class="optin-icon" aria-hidden="true">🕊️</div>
            <div class="optin-title">Stay Connected in Prayer</div>
            <div class="optin-desc">
                Receive gentle daily devotion reminders and liturgical season announcements.
                <br><span class="optin-desc-bn">দৈনিক ধ্যানের মৃদু অনুস্মারক এবং ধর্মপঞ্জিকার মৌসুম ঘোষণা পান।</span>
            </div>
            <div class="optin-actions">
                <button class="optin-btn-yes" id="reminderOptInYes">🔔 Enable Reminders</button>
                <button class="optin-btn-no" id="reminderOptInNo">Not now</button>
            </div>
        `;

        // Wire handlers
        setTimeout(() => {
            document.getElementById('reminderOptInYes')?.addEventListener('click', async () => {
                const result = await requestOptIn();
                if (result.granted) {
                    startScheduler();
                }
                prompt.remove();
            });
            document.getElementById('reminderOptInNo')?.addEventListener('click', () => {
                localStorage.setItem('gpbc-reminder-dismissed', Date.now().toString());
                prompt.remove();
            });
        }, 0);

        return prompt;
    }


    // ══════════════════════════════════════════════════
    // FUTURE: SMS Integration Interface
    // ══════════════════════════════════════════════════
    function getSmsPayload(date) {
        const msg = previewForDate(date || new Date(), 'en');
        if (!msg) return null;
        return {
            text: `${msg.icon} ${msg.title}\n${msg.body}`,
            shortText: `${msg.icon} ${msg.title}`,
            metadata: { tag: msg.tag, date: (date || new Date()).toISOString() }
        };
    }


    // ══════════════════════════════════════════════════
    // GET FULL REMINDER CALENDAR (for year preview)
    // ══════════════════════════════════════════════════
    function getReminderCalendar(year) {
        if (typeof LiturgicalCalendar === 'undefined') return [];

        const cal = LiturgicalCalendar.getCalendar(year);
        const milestones = [
            { date: cal.ashWednesday, type: 'Ash Wednesday', icon: '✝️' },
            { date: cal.palmSunday, type: 'Palm Sunday', icon: '🌿' },
            { date: cal.goodFriday, type: 'Good Friday', icon: '✝️' },
            { date: cal.holySaturday, type: 'Holy Saturday', icon: '🕊️' },
            { date: cal.easter, type: 'Easter Sunday', icon: '🌅' },
            { date: cal.pentecost, type: 'Pentecost Sunday', icon: '🔥' },
            { date: cal.adventStart, type: 'Advent Start', icon: '🕯️' },
            { date: cal.christmas, type: 'Christmas', icon: '⭐' }
        ];

        return milestones.map(m => ({
            ...m,
            dateFormatted: m.date instanceof Date
                ? m.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : String(m.date)
        }));
    }


    // ══════════════════════════════════════════════════
    // INIT: Auto-start if opted in
    // ══════════════════════════════════════════════════
    function init() {
        console.log('[SacredReminder] Initializing...');
        if (isOptedIn()) {
            startScheduler();
            console.log('[SacredReminder] ✅ User is opted in — scheduler started.');
        } else {
            console.log('[SacredReminder] User not opted in. Showing opt-in prompt on next page load.');
        }
    }


    // ══════════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════════
    return Object.freeze({
        // Lifecycle
        init,
        checkAndSend,
        startScheduler,
        stopScheduler,

        // Opt-in
        requestOptIn,
        isOptedIn,
        optOut,
        createOptInPrompt,

        // Preferences
        getPreferences,
        updatePreferences,

        // Preview / Debug
        previewTodayMessage,
        previewForDate,
        getReminderCalendar,

        // Future SMS
        getSmsPayload,

        // Templates (read-only)
        TEMPLATES
    });
})();
