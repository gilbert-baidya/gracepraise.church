/**
 * Homepage Dynamic Events Display
 * Automatically renders upcoming special events from events.js data
 */

class HomepageEvents {
    constructor() {
        this.container = document.getElementById('dynamic-events-container');
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

    getSpecialGPBCEvents() {
        // Get current date and time
        const now = new Date();
        
        // Get events from the global events array (from events.js)
        if (typeof events === 'undefined') {
            return [];
        }

        // Get ALL upcoming GPBC events (regular + special)
        const gpbcEvents = events.filter(event => {
            const time24 = this.convertTo24Hour(event.eventTime || '17:00');
            const eventDateTime = new Date(event.date + 'T' + time24);
            const name = event.name || '';
            return event.category === 'gpbc'
                && eventDateTime > now
                && !name.includes('Connection')
                && !name.includes('Worship Service')
                && !name.includes('Fasting Prayer');
        });

        // Sort by date/time (earliest first)
        gpbcEvents.sort((a, b) => {
            const timeA = this.convertTo24Hour(a.eventTime || '17:00');
            const timeB = this.convertTo24Hour(b.eventTime || '17:00');
            const dateA = new Date(a.date + 'T' + timeA);
            const dateB = new Date(b.date + 'T' + timeB);
            return dateA - dateB;
        });

        // Return the next upcoming event (to match countdown banner)
        return gpbcEvents.slice(0, 1);
    }

    buildLocalDateTime(dateString, timeString = '00:00') {
        // Construct a Date in local time (avoids UTC shift from Date parsing)
        const [year, month, day] = dateString.split('-').map(Number);
        const time24 = this.convertTo24Hour(timeString);
        const [hours, minutes] = time24.split(':').map(Number);
        return new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
    }

    formatEventDate(dateString, timeString) {
        const date = this.buildLocalDateTime(dateString, timeString);
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
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
        const details = {
            when: this.formatEventDate(event.date, eventTime),
            time: eventTime,
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
                            <time datetime="${event.date}T${details.time}">${details.when}${details.time !== 'TBA' ? ' at ' + details.time : ''}</time>
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
