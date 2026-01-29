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
            display: '1325 Richardson Street, CA 92408',
            mapsUrl: 'https://maps.google.com/?q=1325+Richardson+Street+CA+92408'
        };
        if (this.container) {
            this.init();
            this.loadAddressFromContent();
        }
    }

    init() {
        this.renderUpcomingEvents();
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
                // Re-render with corrected address if cards already rendered
                this.renderUpcomingEvents();
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
        const upcomingEvents = this.getSpecialGPBCEvents();

        if (upcomingEvents.length === 0) {
            // Hide the container if no events
            this.container.style.display = 'none';
            return;
        }

        // Clear container
        this.container.innerHTML = '';
        this.container.style.display = 'block';

        // Render each event
        upcomingEvents.forEach(event => {
            const eventCard = this.createEventCard(event);
            this.container.appendChild(eventCard);
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new HomepageEvents();
    });
} else {
    new HomepageEvents();
}
