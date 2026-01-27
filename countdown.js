/**
 * Dynamic Countdown Timer System
 * GPBC Next Upcoming Service/Event Banner
 */

class CountdownSystem {
    constructor() {
        // Regular weekly services
        this.services = [
            {
                name: 'Worship Practice & Session',
                day: 5, // Friday (0=Sunday, 5=Friday)
                time: '17:30', // 5:30 PM
                duration: 120, // 2 hours
                icon: '🎵',
                type: 'service'
            },
            {
                name: 'Fasting Prayer',
                day: 6, // Saturday
                time: '12:00', // 12:00 PM
                duration: 120,
                icon: '🙏',
                type: 'service'
            },
            {
                name: 'Sunday Service',
                day: 0, // Sunday
                time: '17:00', // 5:00 PM
                duration: 150,
                icon: '⛪',
                type: 'service'
            }
        ];

        // Get special events dynamically from events.js
        this.loadSpecialEventsFromGlobal();

        // Auto-init on home page OR About page
        if (document.querySelector('.hero') || document.getElementById('nextServiceCountdown')) {
            this.init();
        }
    }

    loadSpecialEventsFromGlobal() {
        // Check if global events array exists (from events.js)
        if (typeof events !== 'undefined') {
            const now = new Date();
            
            // Get ALL upcoming GPBC events from events.js (regular + special services)
            const gpbcEvents = events.filter(event => {
                // Create full date+time for accurate comparison
                const timeIn24 = this.convertTo24Hour(event.eventTime || '17:00');
                const eventDateTime = new Date(event.date + 'T' + timeIn24);
                const name = event.name || '';
                return event.category === 'gpbc'
                    && eventDateTime > now
                    && !name.includes('Connection')
                    && !name.includes('Worship Service')
                    && !name.includes('Fasting Prayer');
            }).sort((a, b) => {
                const timeA = this.convertTo24Hour(a.eventTime || '17:00');
                const timeB = this.convertTo24Hour(b.eventTime || '17:00');
                return new Date(a.date + 'T' + timeA) - new Date(b.date + 'T' + timeB);
            }).slice(0, 50); // Get next 50 events to ensure we have upcoming ones
            
            // Convert to countdown format
            this.specialEvents = gpbcEvents.map(event => {
                // Determine badge based on description
                let badge = 'Regular Service';
                if (event.description && event.description.toLowerCase().includes('special')) {
                    badge = 'Special Event';
                }
                
                return {
                    name: event.name,
                    date: event.date,
                    time: this.convertTo24Hour(event.eventTime || '17:00'),
                    icon: this.getEventIcon(event),
                    badge: badge,
                    type: 'event'
                };
            });
        } else {
            this.specialEvents = [];
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
        
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        
        // Calculate days until next occurrence
        const daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
        
        if (daysUntil === 0) {
            // Same day - check if time has passed
            if (now > next) {
                next.setDate(next.getDate() + 7);
            }
        } else {
            next.setDate(next.getDate() + daysUntil);
        }
        
        return next;
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

        // Add all services with their next occurrences
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
            const [year, month, day] = event.date.split('-').map(Number);
            const [hours, minutes] = event.time.split(':').map(Number);
            const eventDate = new Date(year, month - 1, day, hours, minutes);
            
            if (eventDate > now) {
                allEvents.push({
                    ...event,
                    nextTime: eventDate,
                    isLive: false,
                    sortTime: eventDate
                });
            }
        });

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
        
        // Add regular services
        this.services.forEach(service => {
            const nextTime = this.getNextOccurrence(service.day, service.time);
            const isLive = this.isServiceHappeningNow(nextTime, service.duration);
            const timeUntil = nextTime - now;
            
            allEvents.push({
                ...service,
                nextTime: nextTime,
                timeUntil: timeUntil,
                isLive: isLive,
                sortTime: nextTime,
                badge: 'Regular Service'
            });
        });
        
        // Add special events
        this.specialEvents.forEach(event => {
            const eventDate = new Date(event.date + 'T' + event.time);
            if (eventDate > now) {
                const timeUntil = eventDate - now;
                allEvents.push({
                    ...event,
                    nextTime: eventDate,
                    timeUntil: timeUntil,
                    isLive: false,
                    sortTime: eventDate,
                    badge: 'Special Event'
                });
            }
        });
        
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
            
            let dateTimeStr;
            if (isService) {
                dateTimeStr = `Every ${dayNames[event.day]} at ${formattedTime}`;
            } else {
                dateTimeStr = `${this.formatDate(event.nextTime)} at ${formattedTime}`;
            }
            
            const cardId = `top-strip-${Date.now()}`;
            
            container.innerHTML = `
                <div class="next-event-banner ${event.isLive ? 'happening-now' : ''}" data-card-id="${cardId}">
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
                    dateTimeStr = `${dayNames[event.day]}s at ${formattedTime}`;
                } else {
                    dateTimeStr = `${this.formatDate(event.nextTime)} at ${formattedTime}`;
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
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
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
        
        // Find the next upcoming special event
        const upcomingEvents = this.specialEvents.filter(event => {
            const eventDate = new Date(event.date + 'T' + event.time);
            return eventDate > now;
        }).sort((a, b) => {
            const dateA = new Date(a.date + 'T' + a.time);
            const dateB = new Date(b.date + 'T' + b.time);
            return dateA - dateB;
        });

        // If no upcoming events, hide banner
        if (upcomingEvents.length === 0) {
            banner.style.display = 'none';
            return;
        }

        const specialEvent = upcomingEvents[0];
        const eventDate = new Date(specialEvent.date + 'T' + specialEvent.time);

        // Show banner and calculate countdown
        banner.style.display = 'block';
        const timeUntil = eventDate - now;
        const countdown = this.formatCountdown(timeUntil);

        // Update event name and icon in banner
        const eventLabelEl = banner.querySelector('.event-label strong');
        const eventIconEl = banner.querySelector('.event-icon');
        const bannerLink = banner.querySelector('.banner-link');
        
        if (eventLabelEl) {
            eventLabelEl.textContent = specialEvent.name;
        }
        if (eventIconEl) {
            eventIconEl.textContent = specialEvent.icon;
        }
        if (bannerLink) {
            // Link to the specific event card using event date as ID
            bannerLink.href = `#event-${specialEvent.date}`;
            bannerLink.setAttribute('aria-label', `View ${specialEvent.name} details`);
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
    new CountdownSystem();
});
