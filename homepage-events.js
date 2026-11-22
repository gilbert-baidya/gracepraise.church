/**
 * Homepage Dynamic Events Display
 * Automatically renders upcoming special events from events.js data
 */

class HomepageEvents {
    constructor() {
        this.container = document.getElementById('dynamic-events-container');
        this.timeZone = 'America/Los_Angeles';
        // Default address fallback; updated from content.json when available
        this.churchAddress = {
            display: '1325 Richardson Street, San Bernardino, CA 92408',
            mapsUrl: 'https://maps.google.com/?q=1325+Richardson+Street+CA+92408'
        };
        this.mount();
    }

    mount() {
        this.container = document.getElementById('dynamic-events-container');
        this.activityContainer = document.getElementById('home-activities') || this.container;
        if (this.container && !this.mounted) {
            this.mounted = true;
            this.init();
            this.loadAddressFromContent();
        }
    }

    init() {
        this.renderUpcomingEvents();
        window.addEventListener('gpbc:languagechange', () => this.updateFlyerLanguage());
        window.addEventListener('pageshow', event => {
            if (event.persisted) this.renderUpcomingEvents();
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.renderUpcomingEvents();
        });
    }

    getHolidayFlyers() {
        return (window.GPBC_HOME_ACTIVITIES || []).filter(slide => slide.type === 'flyer');
    }

    activityExpiry(slide) {
        const date = slide.type === 'theme' ? slide.showUntil : slide.date;
        return date ? this.flyerExpiry({ date }) : Infinity;
    }

    flyerExpiry(flyer) {
        return this.buildZonedDateTime(flyer.date, '23:59').getTime() + 60_000;
    }

    createActivityTools(flyer) {
        const tools = document.createElement('div');
        tools.className = 'activity-event-tools';
        tools.dataset.activityTools = flyer.slug;
        tools.setAttribute('aria-live', 'off');
        const chip = document.createElement('span');
        chip.className = 'activity-countdown';
        this.activityCarouselLanguage(chip, { en: '', bn: '' });
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'activity-calendar';
        button.dataset.activityFocus = 'calendar:' + flyer.slug;
        this.activityCarouselLanguage(button, { en: 'Add to calendar', bn: 'ক্যালেন্ডারে রাখুন' });
        button.addEventListener('click', () => {
            const language = window.GPBCLanguage?.language === 'bn' ? 'bn' : 'en';
            const visit = new URL('plan-visit.html?lang=' + language, location.href).href;
            const url = URL.createObjectURL(new Blob([
                homeActivityCalendar(flyer, this.churchAddress.display, visit)
            ], { type: 'text/calendar;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = flyer.slug + '.ics';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        });
        tools.append(chip, button);
        return tools;
    }

    activityCarouselLanguage(parent, values) {
        for (const language of ['en', 'bn']) {
            const span = document.createElement('span');
            span.lang = language;
            span.dataset.lang = language;
            span.textContent = values[language];
            parent.appendChild(span);
        }
    }

    updateActivityDetails(now = Date.now()) {
        if (!this.activityCarousel) return;
        const { year, month, day } = this.getTimeZoneParts(new Date(now), this.timeZone);
        const today = Date.UTC(year, month - 1, day);
        this.activityCarousel.configs.forEach((flyer, index) => {
            if (flyer.type !== 'flyer') return;
            const days = Math.round((Date.parse(flyer.date + 'T00:00:00Z') - today) / 86_400_000);
            const start = this.buildZonedDateTime(flyer.date, flyer.start).getTime();
            const end = this.buildZonedDateTime(flyer.date, flyer.end).getTime();
            const [hour, minute] = flyer.start.split(':').map(Number);
            const number = value => new Intl.NumberFormat('bn', { useGrouping: false }).format(value);
            const enTime = (hour % 12 || 12) + (minute ? ':' + String(minute).padStart(2, '0') : '') + (hour >= 12 ? ' PM' : ' AM');
            const bnTime = (hour < 12 ? 'সকাল ' : hour < 16 ? 'দুপুর ' : hour < 18 ? 'বিকেল ' : 'সন্ধ্যা ') +
                number(hour % 12 || 12) + (minute ? ':' + number(minute).padStart(2, '০') : '') + 'টা';
            const text = now >= end ? { en: 'Ended', bn: 'সমাপ্ত' }
                : now >= start ? { en: 'Happening now', bn: 'এখন চলছে' }
                : days === 0 ? { en: (hour >= 17 ? 'Tonight' : 'Today') + ' · ' + enTime, bn: (hour >= 17 ? 'আজ রাতে' : 'আজ') + ' · ' + bnTime }
                : days === 1 ? { en: 'Tomorrow', bn: 'আগামীকাল' }
                : { en: 'In ' + days + ' days', bn: 'আর ' + number(days) + ' দিন' };
            this.activityCarousel.tools[index]?.querySelectorAll('.activity-countdown [data-lang]').forEach(span => {
                if (span.textContent !== text[span.dataset.lang]) span.textContent = text[span.dataset.lang];
            });
            const item = this.activityCarousel.dots[index];
            if (item) {
                item.classList.toggle('is-today', days === 0);
                item.dataset.today = String(days === 0);
            }
        });
    }

    createFlyerCard(flyer) {
        const card = document.createElement('div');
        card.className = 'special-event-details event-flyer';
        card.dataset.flyer = flyer.slug;
        const content = document.createElement('div');
        content.className = 'event-details-content';
        const link = document.createElement('a');
        link.className = 'event-flyer-link';
        link.dataset.gpbcFeatureLink = 'pages.planVisit';
        link.dataset.gpbcSurface = 'homepage-cta';
        link.dataset.activityFocus = 'artwork:' + flyer.slug;
        const picture = document.createElement('picture');
        const base = flyer.imageBase || 'images/events/holiday-2026/' + flyer.slug;
        for (const [device, type] of [['phone', 'webp'], ['phone', 'png'], ['desktop', 'webp']]) {
            const source = document.createElement('source');
            source.type = 'image/' + type;
            if (device === 'phone') source.media = '(max-width: 767px)';
            source.srcset = base + '-' + device + '.' + type;
            source.width = device === 'phone' ? 1080 : 1600;
            source.height = device === 'phone' ? 1350 : 600;
            picture.appendChild(source);
        }
        const image = document.createElement('img');
        image.width = 1600;
        image.height = 600;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.dataset.altEn = flyer.en;
        image.dataset.altBn = flyer.bn;
        picture.appendChild(image);
        image.src = base + '-desktop.png';
        link.appendChild(picture);
        content.appendChild(link);
        card.appendChild(content);
        return card;
    }

    updateFlyerLanguage() {
        const language = window.GPBCLanguage?.language === 'bn' ? 'bn' : 'en';
        this.activityContainer.querySelectorAll('.event-flyer').forEach(card => {
            const image = card.querySelector('img');
            image.alt = language === 'bn' ? image.dataset.altBn : image.dataset.altEn;
            image.lang = language;
            card.lang = language;
            card.querySelectorAll('a').forEach(link => {
                link.href = 'plan-visit.html?lang=' + language;
            });
            card.querySelectorAll('[data-lang]').forEach(text => {
                text.hidden = text.dataset.lang !== language;
            });
        });
        this.activityContainer.querySelectorAll('.activity-carousel [data-lang]').forEach(text => {
            text.hidden = text.dataset.lang !== language;
        });
        const cta = this.activityContainer.querySelector('.activity-cta');
        if (cta) cta.href = 'plan-visit.html?lang=' + language;
        this.activityCarousel?.dots.forEach((button, index) => {
            const config = this.activityCarousel.configs[index];
            const date = button.querySelector('[data-lang="' + language + '"]').textContent;
            const label = language === 'bn'
                ? config.type === 'theme' ? config.title.bn || config.title.en : config.bn.split('—')[0].trim()
                : config.label || config.title.en;
            const number = value => new Intl.NumberFormat(language, { useGrouping: false }).format(value);
            button.setAttribute('aria-label', language === 'bn'
                ? 'স্লাইড ' + number(index + 1) + ' / ' + number(this.activityCarousel.configs.length) + ': ' + date + ' · ' + label
                : 'Slide ' + (index + 1) + ' of ' + this.activityCarousel.configs.length + ': ' + date + ' · ' + label);
        });
    }

    async loadAddressFromContent() {
        try {
            const response = await fetch('content.json');
            if (!response.ok) return;
            const content = await response.json();
            const addr = content?.church?.address;
            if (addr?.fullAddress) {
                this.churchAddress = {
                    display: addr.fullAddress,
                    mapsUrl: addr.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(addr.fullAddress)}`
                };
                this.container.querySelectorAll('.event-info-item address').forEach(address => {
                    address.textContent = this.churchAddress.display;
                });
                this.container.querySelectorAll('.event-info-item .map-link').forEach(link => {
                    link.href = this.churchAddress.mapsUrl;
                });
            }
        } catch (err) {
            console.warn('Could not load address from content.json, using fallback:', err);
        }
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
            hour12: false
        });

        const parts = formatter.formatToParts(date);
        const map = {};
        parts.forEach(part => {
            map[part.type] = part.value;
        });

        return {
            year: Number(map.year),
            month: Number(map.month),
            day: Number(map.day),
            hour: Number(map.hour),
            minute: Number(map.minute),
            second: Number(map.second)
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

    buildZonedDateTime(dateString, timeString = '00:00') {
        const [year, month, day] = dateString.split('-').map(Number);
        const time24 = this.convertTo24Hour(timeString);
        const [hoursStr = '0', minutesStr = '0'] = time24.includes(':') ? time24.split(':') : ['0', '0'];
        const hours = Number(hoursStr);
        const minutes = Number(minutesStr);
        return this.zonedTimeToUtc(year, month, day, hours || 0, minutes || 0, 0, this.timeZone);
    }

    getSpecialGPBCEvents() {
        // Get current date and time
        const now = new Date();
        
        // Get events from the global events array (from events.js)
        if (typeof events === 'undefined') {
            return [];
        }

        // Get ALL upcoming GPBC events (exclude weekly services by serviceKey)
        const gpbcEvents = events.filter(event => {
            const eventDateTime = this.buildZonedDateTime(event.date, event.eventTime || '17:00');
            return event.category === 'gpbc'
                && eventDateTime > now
                && !event.serviceKey;
        });

        // Sort by date/time (earliest first)
        gpbcEvents.sort((a, b) => {
            const dateA = this.buildZonedDateTime(a.date, a.eventTime || '17:00');
            const dateB = this.buildZonedDateTime(b.date, b.eventTime || '17:00');
            return dateA - dateB;
        });

        // Return the next upcoming event (to match countdown banner)
        return gpbcEvents.slice(0, 1);
    }

    formatEventDate(dateString, timeString) {
        const date = this.buildZonedDateTime(dateString, timeString);
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: this.timeZone
        };
        return date.toLocaleDateString('en-US', options);
    }

    getEventIcon(event) {
        // Return emoji icons based on event name/type
        if (event.name.includes('Christmas') || event.name.includes('Advent')) return '🎄';
        if (event.name.includes('Easter')) return '🐣';
        if (event.name.includes('New Year')) return '🎉';
        if (event.name.includes('Prayer') || event.name.includes('Fasting')) return '🙏';
        if (event.name.includes('Good Friday') || event.name.includes('Maundy') || event.name.includes('Holy Thursday')) return '✝️';
        if (event.name.includes('Pentecost')) return '🕊️';
        if (event.name.includes('Thanksgiving')) return '🦃';
        if (event.eventType === 'worship') return '🎵';
        if (event.eventType === 'fellowship') return '🤝';
        return '⛪'; // Default church icon
    }

    getEventDetails(event) {
        // Extract or generate event details
        const eventTime = event.eventTime || 'TBA';
        const displayTime = eventTime === 'TBA' ? 'TBA' : `${eventTime} PT`;
        const time24 = eventTime === 'TBA' ? '' : this.convertTo24Hour(eventTime);
        const datetime = time24 ? `${event.date}T${time24}` : event.date;
        const details = {
            when: this.formatEventDate(event.date, eventTime),
            timeLabel: displayTime,
            datetime,
            where: this.churchAddress.display,
            mapsUrl: this.churchAddress.mapsUrl,
            whatToExpect: this.getWhatToExpect(event),
            whosInvited: 'Everyone! Bring family and friends. All ages welcome.'
        };

        return details;
    }

    getWhatToExpect(event) {
        // Generate "What to Expect" based on event type or name
        if (event.description && event.description.length > 50) {
            return event.description;
        }

        // Regular weekly services
        if (event.name.includes('Praise') || event.name.includes('Worship')) {
            return 'Join us for an evening of heartfelt praise and worship. Experience contemporary worship music, prayer, and fellowship with believers.';
        }
        if (event.name.includes('Fasting')) {
            return 'A dedicated time of fasting, prayer, and seeking God together. Bring your prayer requests and join us in intercession.';
        }
        if (event.name.includes('Regular Service')) {
            return 'Our weekly Sunday worship service featuring praise and worship, biblical teaching, prayer, and fellowship. Come as you are!';
        }

        // Special events
        if (event.name.includes('Christmas')) {
            return 'Celebrate the birth of Jesus with Christmas carols, a special message, candlelight service, and fellowship';
        }
        if (event.name.includes('Easter')) {
            return 'Celebrate the resurrection of Jesus Christ with uplifting worship, powerful message, and communion';
        }
        if (event.name.includes('New Year')) {
            return 'Worship music, testimonies of gratitude, prayer for the new year, and fellowship';
        }
        if (event.name.includes('Good Friday')) {
            return 'A solemn service remembering Jesus\'s sacrifice, featuring scripture readings, worship, and communion';
        }
        if (event.name.includes('Holy Thursday') || event.name.includes('Maundy')) {
            return 'A beautiful service commemorating the Last Supper, including foot washing ceremony and communion';
        }

        return 'Join us for worship, prayer, biblical teaching, and fellowship';
    }

    createEventCard(event) {
        const icon = this.getEventIcon(event);
        const details = this.getEventDetails(event);
        
        const card = document.createElement('section');
        card.className = 'special-event-details';
        card.id = `event-${event.date}`;
        card.setAttribute('aria-labelledby', `event-heading-${event.date}`);

        card.innerHTML = `
            <div class="event-details-content">
                <div class="event-header-section">
                    <span class="event-icon-large" aria-hidden="true">${icon}</span>
                    <div>
                        <h2 id="event-heading-${event.date}">${event.name}</h2>
                        <p class="event-tagline">${event.description || 'Join us for this special gathering'}</p>
                    </div>
                </div>
                
                <div class="event-info-grid">
                    <div class="event-info-item">
                        <span class="info-icon">📅</span>
                        <div>
                            <h3>When</h3>
                            <time datetime="${details.datetime}">${details.when}${details.timeLabel !== 'TBA' ? ' at ' + details.timeLabel : ''}</time>
                            ${event.name.includes('New Year') ? '<p class="info-subtext">Ring in the New Year with us!</p>' : ''}
                        </div>
                    </div>
                    
                    <div class="event-info-item">
                        <span class="info-icon">📍</span>
                        <div>
                            <h3>Where</h3>
                            <address>${details.where}</address>
                            <a href="${details.mapsUrl}" target="_blank" rel="noopener noreferrer" class="map-link">Get Directions →</a>
                        </div>
                    </div>
                    
                    <div class="event-info-item">
                        <span class="info-icon">🎵</span>
                        <div>
                            <h3>What to Expect</h3>
                            <p>${details.whatToExpect}</p>
                        </div>
                    </div>
                    
                    <div class="event-info-item">
                        <span class="info-icon">👥</span>
                        <div>
                            <h3>Who's Invited</h3>
                            <p>${details.whosInvited}</p>
                        </div>
                    </div>
                </div>
                
                <div class="event-cta">
                    <a href="give.html" class="btn btn-primary">RSVP / Support Event</a>
                    <a href="calendar.html" class="btn btn-secondary">View Full Calendar</a>
                </div>
            </div>
        `;

        return card;
    }

    renderUpcomingEvents() {
        if (!this.container) return;
        const upcomingEvents = this.getSpecialGPBCEvents();
        const now = Date.now();
        const activities = (window.GPBC_HOME_ACTIVITIES || []).filter(slide => now < this.activityExpiry(slide));
        clearTimeout(this.flyerTimer);
        if (activities.length) {
            const deadlines = activities.map(slide => this.activityExpiry(slide));
            if (activities.some(slide => slide.type === 'flyer')) {
                const { year, month, day } = this.getTimeZoneParts(new Date(now), this.timeZone);
                const tomorrow = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
                deadlines.push(this.buildZonedDateTime(tomorrow).getTime());
                activities.filter(slide => slide.type === 'flyer').forEach(slide => {
                    deadlines.push(this.buildZonedDateTime(slide.date, slide.start).getTime(),
                        this.buildZonedDateTime(slide.date, slide.end).getTime());
                });
            }
            const nextExpiry = Math.min(...deadlines.filter(deadline => deadline > now));
            if (Number.isFinite(nextExpiry)) {
                this.flyerTimer = setTimeout(() => this.renderUpcomingEvents(), Math.min(nextExpiry - now, 2_147_483_647));
            }
        }
        const signature = JSON.stringify({ activities, upcomingEvents });
        this.updateActivityDetails(now);
        if (signature === this.renderSignature) return;
        this.renderSignature = signature;
        const focused = [this.container, this.activityContainer].some(host => host.contains(document.activeElement)) ? document.activeElement : null;
        const focusKey = focused?.dataset.activityFocus;
        const staticRoot = !this.activityCarousel && this.activityContainer.querySelector('[data-enhanced="false"]');
        const previousSlug = this.activityCarousel?.activeSlug;
        const userPaused = this.activityCarousel?.userPaused;
        this.activityCarousel?.destroy();
        this.activityCarousel = null;
        this.container.replaceChildren();
        this.container.style.display = upcomingEvents.length ? 'block' : 'none';
        this.activityContainer.style.display = activities.length ? 'flow-root' : 'none';

        if (activities.length) {
            this.activityCarousel = new ActivityCarousel(activities, flyer => this.createFlyerCard(flyer), previousSlug, userPaused, staticRoot, flyer => this.createActivityTools(flyer));
            this.activityContainer.replaceChildren(this.activityCarousel.root);
            this.activityCarousel.scrollActiveItem();
            this.activityCarousel.hovered = this.activityCarousel.root.matches(':hover');
            this.activityCarousel.updatePlayback();
        } else if (this.activityContainer !== this.container) {
            this.activityContainer.replaceChildren();
        }
        if (this.activityContainer === this.container) this.container.style.display = activities.length || upcomingEvents.length ? 'block' : 'none';
        const cards = [
            ...upcomingEvents.map(event => {
                const card = this.createEventCard(event);
                card.querySelectorAll('a, button').forEach((control, index) => {
                    control.dataset.activityFocus = 'event:' + event.date + ':' + event.name + ':' + index;
                });
                return { date: event.date, card };
            })
        ];
        cards.sort((a, b) => a.date.localeCompare(b.date)).forEach(({ card }) => {
            this.container.appendChild(card);
        });
        this.updateFlyerLanguage();
        this.updateActivityDetails(now);
        if (focused) {
            const selector = focusKey && '[data-activity-focus="' + CSS.escape(focusKey) + '"]';
            const equivalent = selector && (this.activityContainer.querySelector(selector) || this.container.querySelector(selector));
            const target = equivalent && !equivalent.closest('[inert]') ? equivalent
                : this.activityCarousel?.root || document.getElementById('home') || this.container.nextElementSibling;
            if (!target) return;
            if (!equivalent && target !== this.activityCarousel?.root) target.tabIndex = -1;
            target.focus({ preventScroll: true });
        }
    }
}

const homepageEvents = new HomepageEvents();
