/**
 * Dynamic Countdown Timer System
 * GPBC Next Upcoming Service/Event Banner
 */

class CountdownSystem {
    constructor() {
        this.timeZone = 'America/Los_Angeles';

        // Weekly service display config (schedule comes from events.js when available)
        this.serviceConfig = {
            'friday-connection': {
                displayName: 'Worship Practice & Session',
                icon: '🎵',
                duration: 120,
                detailsLabel: 'Friday at 5:30 PM PT',
                detailsNote: 'Weekly worship practice and prayer session'
            },
            'fasting-prayer': {
                displayName: 'Fasting Prayer',
                icon: '🙏',
                duration: 120,
                detailsLabel: 'Saturday at 12:00 PM PT',
                detailsNote: 'Weekly fasting and prayer gathering'
            },
            'sunday-service': {
                displayName: 'Sunday Service',
                icon: '⛪',
                duration: 150,
                detailsLabel: 'Sunday at 5:00 PM PT',
                detailsNote: 'Our main Sunday worship service — perfect for first-time visitors'
            }
        };

        this.weeklyServiceKeys = ['friday-connection', 'fasting-prayer', 'sunday-service'];

        // Fallback weekly services if events.js is unavailable
        this.services = [
            {
                serviceKey: 'friday-connection',
                name: this.serviceConfig['friday-connection'].displayName,
                day: 5, // Friday (0=Sunday, 5=Friday)
                time: '17:30', // 5:30 PM
                duration: this.serviceConfig['friday-connection'].duration,
                icon: this.serviceConfig['friday-connection'].icon,
                type: 'service',
                detailsLabel: this.serviceConfig['friday-connection'].detailsLabel,
                detailsNote: this.serviceConfig['friday-connection'].detailsNote
            },
            {
                serviceKey: 'fasting-prayer',
                name: this.serviceConfig['fasting-prayer'].displayName,
                day: 6, // Saturday
                time: '12:00', // 12:00 PM
                duration: this.serviceConfig['fasting-prayer'].duration,
                icon: this.serviceConfig['fasting-prayer'].icon,
                type: 'service',
                detailsLabel: this.serviceConfig['fasting-prayer'].detailsLabel,
                detailsNote: this.serviceConfig['fasting-prayer'].detailsNote
            },
            {
                serviceKey: 'sunday-service',
                name: this.serviceConfig['sunday-service'].displayName,
                day: 0, // Sunday
                time: '17:00', // 5:00 PM
                duration: this.serviceConfig['sunday-service'].duration,
                icon: this.serviceConfig['sunday-service'].icon,
                type: 'service',
                detailsLabel: this.serviceConfig['sunday-service'].detailsLabel,
                detailsNote: this.serviceConfig['sunday-service'].detailsNote
            }
        ];

        this.eventsReady = false;
        this.specialEvents = [];
        this.serviceEventsByKey = {};

        // Get events dynamically from events.js
        this.loadEventsFromGlobal();

        // Auto-init on home page OR About page
        if (document.querySelector('.hero') || document.getElementById('nextServiceCountdown')) {
            this.init();
        }
    }

    loadEventsFromGlobal() {
        // Check if global events array exists (from events.js)
        if (typeof events === 'undefined') {
            this.eventsReady = false;
            this.specialEvents = [];
            this.serviceEventsByKey = {};
            return;
        }

        const gpbcEvents = events
            .filter(event => event.category === 'gpbc' && event.date && event.eventTime)
            .map(event => {
                const time24 = this.convertTo24Hour(event.eventTime || '17:00');
                const dateTime = this.buildZonedDate(event.date, time24);
                const isWeeklyService = Boolean(event.serviceKey);
                return {
                    ...event,
                    time24,
                    dateTime,
                    icon: this.getEventIcon(event),
                    badge: isWeeklyService ? 'Regular Service' : 'Special Event'
                };
            })
            .filter(event => event.dateTime instanceof Date && !Number.isNaN(event.dateTime.getTime()))
            .sort((a, b) => a.dateTime - b.dateTime);

        this.specialEvents = gpbcEvents.filter(event => !event.serviceKey);
        this.serviceEventsByKey = {};
        gpbcEvents.forEach(event => {
            if (event.serviceKey) {
                if (!this.serviceEventsByKey[event.serviceKey]) {
                    this.serviceEventsByKey[event.serviceKey] = [];
                }
                this.serviceEventsByKey[event.serviceKey].push(event);
            }
        });

        Object.values(this.serviceEventsByKey).forEach(list => {
            list.sort((a, b) => a.dateTime - b.dateTime);
        });

        this.eventsReady = true;
    }

    convertTo24Hour(timeStr) {
        // Convert "5:00 PM" to "17:00"
        if (timeStr.includes('PM') || timeStr.includes('AM')) {
            const [time, period] = timeStr.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours);

            if (period === 'PM' && hours !== 12) {
                hours += 12;
            } else if (period === 'AM' && hours === 12) {
                hours = 0;
            }

            return `${String(hours).padStart(2, '0')}:${minutes || '00'}`;
        }
        return timeStr;
    }

    getTimeZoneParts(date, timeZone) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'short',
            hour12: false
        });

        const parts = formatter.formatToParts(date);
        const map = {};
        parts.forEach(part => {
            map[part.type] = part.value;
        });

        const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

        return {
            year: Number(map.year),
            month: Number(map.month),
            day: Number(map.day),
            hour: Number(map.hour),
            minute: Number(map.minute),
            second: Number(map.second),
            weekdayIndex: weekdayMap[map.weekday]
        };
    }

    getTimeZoneOffset(date, timeZone) {
        const parts = this.getTimeZoneParts(date, timeZone);
        const utcTime = Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second
        );
        return utcTime - date.getTime();
    }

    zonedTimeToUtc(year, month, day, hour, minute, second, timeZone) {
        const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        const offset = this.getTimeZoneOffset(utcDate, timeZone);
        return new Date(utcDate.getTime() - offset);
    }

    buildZonedDate(dateString, timeString = '00:00') {
        const [year, month, day] = dateString.split('-').map(Number);
        const [hoursStr = '0', minutesStr = '0'] = timeString.includes(':') ? timeString.split(':') : ['0', '0'];
        const hours = Number(hoursStr);
        const minutes = Number(minutesStr);
        return this.zonedTimeToUtc(year, month, day, hours || 0, minutes || 0, 0, this.timeZone);
    }

    getZonedWeekdayIndex(date) {
        return this.getTimeZoneParts(date, this.timeZone).weekdayIndex;
    }

    getUpcomingSpecialEvents(now, limit = 50) {
        if (!this.specialEvents || this.specialEvents.length === 0) {
            return [];
        }
        return this.specialEvents
            .filter(event => event.dateTime > now)
            .slice(0, limit);
    }

    getNextEventByServiceKey(serviceKey, nowTime) {
        const list = this.serviceEventsByKey[serviceKey];
        if (!list) return null;
        return list.find(event => event.dateTime.getTime() > nowTime) || null;
    }

    getNextWeeklyServices(now) {
        const nowTime = now.getTime();
        const services = [];

        this.weeklyServiceKeys.forEach(serviceKey => {
            const config = this.serviceConfig[serviceKey];
            const nextEvent = this.getNextEventByServiceKey(serviceKey, nowTime);
            if (!nextEvent || !config) return;

            const nextTime = nextEvent.dateTime;
            const isLive = this.isServiceHappeningNow(nextTime, config.duration);
            const time24 = this.convertTo24Hour(nextEvent.eventTime || '17:00');

            services.push({
                name: config.displayName || nextEvent.name,
                day: this.getZonedWeekdayIndex(nextTime),
                time: time24,
                duration: config.duration,
                icon: config.icon,
                type: 'service',
                serviceKey,
                detailsLabel: config.detailsLabel,
                detailsNote: config.detailsNote,
                nextTime,
                timeUntil: nextTime - now,
                isLive,
                sortTime: nextTime,
                badge: 'Regular Service'
            });
        });

        return services;
    }

    getEventIcon(event) {
        const name = event.name.toLowerCase();
        if (name.includes('easter')) return '🐣';
        if (name.includes('christmas')) return '🎄';
        if (name.includes('new year')) return '🎉';
        if (name.includes('good friday')) return '✝️';
        if (name.includes('holy thursday') || name.includes('maundy')) return '✝️';
        if (name.includes('pentecost')) return '🕊️';
        return '⛪';
    }

    init() {
        this.createCountdownBanner();
        this.updateCountdown();
        this.updateInlineCountdown(); // Initialize inline special event countdown
        // Update every second
        setInterval(() => {
            this.updateCountdown();
            this.updateInlineCountdown();
        }, 1000);
    }

    createCountdownBanner() {
        // Element already exists in HTML - skip creation
        // Countdown will be populated via updateCountdown() if container exists
        return;

        /* Disabled auto-creation - keeping code for reference
        const bannerDiv = document.createElement('div');
        bannerDiv.id = 'nextEventBanner';

        // Check if we're on About page first (has dedicated container)
        const container = document.getElementById('nextServiceCountdown');
        if (container) {
            // About page: insert into dedicated container
            bannerDiv.className = 'next-event-banner';
            container.appendChild(bannerDiv);
        } else {
            // Home page: insert BEFORE hero section (after nav, before hero title)
            const heroSection = document.querySelector('.hero');
            if (heroSection) {
                bannerDiv.className = 'countdown-hero-banner';
                heroSection.parentNode.insertBefore(bannerDiv, heroSection);
            }
        }
        */
    }

    getNextOccurrence(dayOfWeek, time) {
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        const nowParts = this.getTimeZoneParts(now, this.timeZone);

        const daysUntil = (dayOfWeek - nowParts.weekdayIndex + 7) % 7;
        const baseDate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day));
        const targetDate = new Date(baseDate.getTime());
        targetDate.setUTCDate(targetDate.getUTCDate() + daysUntil);

        const hasPassed =
            nowParts.hour > hours ||
            (nowParts.hour === hours && nowParts.minute > minutes) ||
            (nowParts.hour === hours && nowParts.minute === minutes && nowParts.second > 0);

        if (daysUntil === 0 && hasPassed) {
            targetDate.setUTCDate(targetDate.getUTCDate() + 7);
        }

        return this.zonedTimeToUtc(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth() + 1,
            targetDate.getUTCDate(),
            hours,
            minutes,
            0,
            this.timeZone
        );
    }

    isServiceHappeningNow(nextTime, duration) {
        const now = new Date();
        const endTime = new Date(nextTime.getTime() + duration * 60000);
        return now >= nextTime && now <= endTime;
    }

    formatCountdown(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        return { days, hours, minutes, seconds };
    }

    createCountdownHTML(countdown, isLive = false, cardId = '') {
        if (isLive) {
            return `
                <div class="live-now-message" data-translate="no">
                    <span class="live-dot"></span>
                    <span data-lang="en">HAPPENING NOW!</span>
                    <span data-lang="bn" style="display:none;">এখন চলছে!</span>
                    <span class="live-dot"></span>
                </div>
            `;
        }

        return `
            <div class="countdown-label">
                <span data-lang="en">Time Remaining</span>
                <span data-lang="bn" style="display:none;">বাকি সময়</span>
            </div>
            <div class="countdown-timer" data-translate="no">
                <div class="time-unit">
                    <span class="time-value" data-countdown-days="${cardId}" data-translate="no">${String(countdown.days).padStart(2, '0')}</span>
                    <span class="time-label"><span data-lang="en">Days</span><span data-lang="bn" style="display:none;">দিন</span></span>
                </div>
                <div class="time-unit">
                    <span class="time-value" data-countdown-hours="${cardId}" data-translate="no">${String(countdown.hours).padStart(2, '0')}</span>
                    <span class="time-label"><span data-lang="en">Hours</span><span data-lang="bn" style="display:none;">ঘণ্টা</span></span>
                </div>
                <div class="time-unit">
                    <span class="time-value" data-countdown-minutes="${cardId}" data-translate="no">${String(countdown.minutes).padStart(2, '0')}</span>
                    <span class="time-label"><span data-lang="en">Mins</span><span data-lang="bn" style="display:none;">মিনিট</span></span>
                </div>
                <div class="time-unit">
                    <span class="time-value" data-countdown-seconds="${cardId}" data-translate="no">${String(countdown.seconds).padStart(2, '0')}</span>
                    <span class="time-label"><span data-lang="en">Secs</span><span data-lang="bn" style="display:none;">সেকেন্ড</span></span>
                </div>
            </div>
        `;
    }

    getNextEvent() {
        const now = new Date();
        const allEvents = [];

        if (this.eventsReady) {
            const weeklyServices = this.getNextWeeklyServices(now);
            weeklyServices.forEach(service => {
                allEvents.push({
                    ...service,
                    sortTime: service.isLive ? now : service.nextTime
                });
            });

            const upcomingSpecialEvents = this.getUpcomingSpecialEvents(now, 50);
            upcomingSpecialEvents.forEach(event => {
                allEvents.push({
                    name: event.name,
                    date: event.date,
                    time: event.time24,
                    icon: event.icon || this.getEventIcon(event),
                    badge: event.badge || 'Special Event',
                    type: 'event',
                    nextTime: event.dateTime,
                    isLive: false,
                    sortTime: event.dateTime
                });
            });
        } else {
            // Fallback to static weekly services if events.js is unavailable
            this.services.forEach(service => {
                const nextTime = this.getNextOccurrence(service.day, service.time);
                const isLive = this.isServiceHappeningNow(nextTime, service.duration);

                allEvents.push({
                    ...service,
                    nextTime,
                    isLive,
                    sortTime: isLive ? now : nextTime
                });
            });

            // Add special events that haven't passed
            this.specialEvents.forEach(event => {
                const eventDate = this.buildZonedDate(event.date, event.time);
                if (eventDate > now) {
                    allEvents.push({
                        ...event,
                        nextTime: eventDate,
                        isLive: false,
                        sortTime: eventDate
                    });
                }
            });
        }

        // Sort by time and return the next one
        allEvents.sort((a, b) => a.sortTime - b.sortTime);
        return allEvents[0] || null;
    }

    updateCountdown() {
        const container = document.getElementById('nextEventBanner');

        if (!container) {
            // Container doesn't exist on this page - silently skip
            return;
        }

        const now = new Date();

        // Check if we're on About page (shows all services) or Home page (shows only next service)
        const isAboutPage = document.getElementById('nextServiceCountdown') !== null;

        // Get all events with their countdowns
        const allEvents = [];

        if (this.eventsReady) {
            // Weekly services derived from events.js (PT-aware)
            const weeklyServices = this.getNextWeeklyServices(now);
            weeklyServices.forEach(service => {
                allEvents.push(service);
            });

            // Special GPBC events (non-weekly)
            const upcomingSpecialEvents = this.getUpcomingSpecialEvents(now, 50);
            upcomingSpecialEvents.forEach(event => {
                const timeUntil = event.dateTime - now;
                allEvents.push({
                    name: event.name,
                    date: event.date,
                    time: event.time24,
                    icon: event.icon || this.getEventIcon(event),
                    badge: event.badge || 'Special Event',
                    type: 'event',
                    nextTime: event.dateTime,
                    timeUntil,
                    isLive: false,
                    sortTime: event.dateTime
                });
            });
        } else {
            // Fallback to static weekly services if events.js is unavailable
            this.services.forEach(service => {
                const nextTime = this.getNextOccurrence(service.day, service.time);
                const isLive = this.isServiceHappeningNow(nextTime, service.duration);
                const timeUntil = nextTime - now;

                allEvents.push({
                    ...service,
                    nextTime,
                    timeUntil,
                    isLive,
                    sortTime: nextTime,
                    badge: 'Regular Service'
                });
            });

            // Add special events if any were loaded
            this.specialEvents.forEach(event => {
                const eventDate = this.buildZonedDate(event.date, event.time);
                if (eventDate > now) {
                    const timeUntil = eventDate - now;
                    allEvents.push({
                        ...event,
                        nextTime: eventDate,
                        timeUntil,
                        isLive: false,
                        sortTime: eventDate,
                        badge: event.badge || 'Special Event'
                    });
                }
            });
        }

        // Sort by time
        allEvents.sort((a, b) => a.sortTime - b.sortTime);

        if (allEvents.length === 0) {
            container.innerHTML = '<p style="color: #6b6b6b; text-align: center; padding: 1rem;">No upcoming services</p>';
            return;
        }

        // Home page: show only the next event. About page: show all events
        const eventsToShow = isAboutPage ? allEvents : [allEvents[0]];

        // Check if this is the top strip or regular countdown section
        const isTopStrip = container.classList.contains('countdown-top-strip');

        if (isTopStrip) {
            // Render compact horizontal strip for top of page
            const event = eventsToShow[0]; // Always show only next event in top strip
            const countdown = this.formatCountdown(event.timeUntil);
            const formattedTime = this.formatTime(event.time);
            const isService = event.type === 'service';
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayIndex = typeof event.day === 'number' ? event.day : this.getZonedWeekdayIndex(event.nextTime);
            const dayName = dayNames[dayIndex];

            let dateTimeStr;
            let detailsLabel;
            let detailsNote;

            if (isService) {
                dateTimeStr = `Every ${dayName} at ${formattedTime} PT`;
                detailsLabel = event.detailsLabel || `${dayName} at ${formattedTime} PT`;
                detailsNote = event.detailsNote || 'Weekly service gathering';
            } else {
                dateTimeStr = `${this.formatDate(event.nextTime)} at ${formattedTime} PT`;
                detailsLabel = `${this.formatDate(event.nextTime)} at ${formattedTime} PT`;
                detailsNote = 'Special event — see calendar for details';
            }

            const cardId = 'top-strip';
            const eventKey = `${event.type || 'event'}|${event.name}|${event.nextTime.toISOString()}`;
            const shouldRender =
                container.dataset.eventKey !== eventKey ||
                container.dataset.eventLive !== String(event.isLive);

            if (!shouldRender) {
                if (!event.isLive) {
                    this.updateCountdownNumbers(container, countdown, cardId);
                }
                return;
            }

            container.dataset.eventKey = eventKey;
            container.dataset.eventLive = String(event.isLive);

            container.innerHTML = `
                <div class="next-event-banner ${event.isLive ? 'happening-now' : ''}" data-card-id="${cardId}"
                    data-event-type="${event.type}"
                    data-event-name="${event.name}"
                    data-event-time-label="${detailsLabel}"
                    data-event-note="${detailsNote}">
                    <div class="event-header">
                        <span class="event-icon" data-translate="no">${event.icon}</span>
                        <div class="event-title-wrapper">
                            <div class="event-title">
                                <span data-lang="en">${event.name}</span>
                            </div>
                            ${event.badge ? `<span class="event-badge">${event.badge}</span>` : ''}
                        </div>
                    </div>
                    <div class="event-info">
                        <p data-translate="no">📅 ${dateTimeStr}</p>
                        <p data-translate="no">📍 1325 Richardson St, San Bernardino, CA</p>
                    </div>
                    ${event.isLive ?
                    `<div class="live-badge">
                            <span data-lang="en">🔴 HAPPENING NOW</span>
                            <span data-lang="bn" style="display:none;">🔴 এখন চলছে</span>
                        </div>` :
                    `<div class="countdown-display">
                            ${this.createCountdownHTML(countdown, false, cardId)}
                        </div>`
                }
                </div>
            `;
        } else {
            // Render traditional card-based countdown for about page or other sections
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            const servicesHTML = eventsToShow.map(event => {
                const countdown = this.formatCountdown(event.timeUntil);
                const formattedTime = this.formatTime(event.time);
                const isService = event.type === 'service';

                let dateTimeStr;
                if (isService) {
                    const dayIndex = typeof event.day === 'number' ? event.day : this.getZonedWeekdayIndex(event.nextTime);
                    dateTimeStr = `Every ${dayNames[dayIndex]} at ${formattedTime} PT`;
                } else {
                    dateTimeStr = `${this.formatDate(event.nextTime)} at ${formattedTime} PT`;
                }

                const cardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                return `
                    <div class="service-card ${event.isLive ? 'happening-now' : ''}" data-card-id="${cardId}">
                        <div class="service-header">
                            <div class="service-icon" data-translate="no">${event.icon}</div>
                            <div class="service-title">
                                <h3>${event.name}</h3>
                                <div class="service-badge">${event.badge || (isService ? 'Regular Service' : 'Special Event')}</div>
                            </div>
                        </div>
                        <div class="service-datetime" data-translate="no">📅 ${dateTimeStr}</div>
                        <div class="service-countdown">
                            ${this.createCountdownHTML(countdown, event.isLive, cardId)}
                        </div>
                    </div>
                `;
            }).join('');

            // Different titles for home vs about page
            const title = isAboutPage ? '⏰ Upcoming Services' : '⏰ Next Service';

            container.innerHTML = `
                <div class="all-services-banner">
                    <h2 class="services-main-title">${title}</h2>
                    <div class="services-grid">
                        ${servicesHTML}
                    </div>
                </div>
            `;
        }
    }

    formatTime(time) {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    }

    formatDate(date) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: this.timeZone
        };
        return new Intl.DateTimeFormat('en-US', options).format(date);
    }

    updateCountdownNumbers(container, countdown, cardId) {
        const daysEl = container.querySelector(`[data-countdown-days="${cardId}"]`);
        const hoursEl = container.querySelector(`[data-countdown-hours="${cardId}"]`);
        const minutesEl = container.querySelector(`[data-countdown-minutes="${cardId}"]`);
        const secondsEl = container.querySelector(`[data-countdown-seconds="${cardId}"]`);

        if (daysEl) daysEl.textContent = String(countdown.days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(countdown.hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(countdown.minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(countdown.seconds).padStart(2, '0');
    }

    updateCountdownValues() {
        // Update countdown numbers without re-rendering entire HTML
        // This preserves DOM structure during translations
        const now = new Date();

        // Update all countdown cards
        document.querySelectorAll('.service-card').forEach(card => {
            const cardId = card.getAttribute('data-card-id');
            if (!cardId) return;

            // Find countdown value elements for this card
            const daysEl = card.querySelector(`[data-countdown-days="${cardId}"]`);
            const hoursEl = card.querySelector(`[data-countdown-hours="${cardId}"]`);
            const minutesEl = card.querySelector(`[data-countdown-minutes="${cardId}"]`);
            const secondsEl = card.querySelector(`[data-countdown-seconds="${cardId}"]`);

            if (daysEl && hoursEl && minutesEl && secondsEl) {
                // Calculate time remaining (simplified - would need event data)
                // This is a fallback update mechanism
                const currentDays = parseInt(daysEl.textContent);
                const currentHours = parseInt(hoursEl.textContent);
                const currentMinutes = parseInt(minutesEl.textContent);
                let currentSeconds = parseInt(secondsEl.textContent);

                // Decrement seconds
                currentSeconds--;
                if (currentSeconds < 0) {
                    // Full recalculation needed
                    return;
                }

                secondsEl.textContent = String(currentSeconds).padStart(2, '0');
            }
        });
    }

    updateInlineCountdown() {
        const banner = document.getElementById('specialEventBanner');
        if (!banner) return;

        const now = new Date();
        const nextEvent = this.getNextEvent();

        if (!nextEvent || !nextEvent.nextTime) {
            banner.style.display = 'none';
            return;
        }

        const eventDate = nextEvent.nextTime;

        // Show banner and calculate countdown
        banner.style.display = 'block';
        const timeUntil = eventDate - now;
        const countdown = this.formatCountdown(timeUntil);

        // Update event name and icon in banner
        const eventLabelEl = banner.querySelector('.event-label strong');
        const eventIconEl = banner.querySelector('.event-icon');
        const bannerLink = banner.querySelector('.banner-link');
        const timeEl = banner.querySelector('.inline-countdown');

        if (eventLabelEl) {
            eventLabelEl.textContent = nextEvent.name || 'Next Service';
        }
        if (eventIconEl) {
            eventIconEl.textContent = nextEvent.icon || this.getEventIcon(nextEvent);
        }
        if (bannerLink) {
            if (nextEvent.type === 'service') {
                bannerLink.href = '#next-service';
                bannerLink.setAttribute('aria-label', `View ${nextEvent.name} details`);
            } else if (nextEvent.date) {
                // Link to the specific event card using event date as ID
                bannerLink.href = `#event-${nextEvent.date}`;
                bannerLink.setAttribute('aria-label', `View ${nextEvent.name} details`);
            } else {
                bannerLink.href = 'calendar.html';
                bannerLink.setAttribute('aria-label', `View event details`);
            }
        }
        if (timeEl) {
            timeEl.setAttribute('datetime', eventDate.toISOString());
        }

        // Update countdown values
        const daysEl = banner.querySelector('[data-unit="days"]');
        const hoursEl = banner.querySelector('[data-unit="hours"]');
        const minutesEl = banner.querySelector('[data-unit="minutes"]');
        const secondsEl = banner.querySelector('[data-unit="seconds"]');

        if (daysEl && hoursEl && minutesEl && secondsEl) {
            daysEl.textContent = String(countdown.days).padStart(2, '0');
            hoursEl.textContent = String(countdown.hours).padStart(2, '0');
            minutesEl.textContent = String(countdown.minutes).padStart(2, '0');
            secondsEl.textContent = String(countdown.seconds).padStart(2, '0');
        }
    }
}

// Initialize countdown system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure events.js is fully parsed if it was loaded async/defer
    setTimeout(() => {
        try {
            window.gpbcCountdown = new CountdownSystem();
            // Force an immediate update
            window.gpbcCountdown.init();
            // console.log('Countdown System initialized successfully'); // Removed for production
        } catch (e) {
            console.error('Countdown initialization failed:', e);
        }
    }, 100);
});
