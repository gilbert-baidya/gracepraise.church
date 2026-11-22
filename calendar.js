// Calendar Logic
const initialCalendarDate = new Date();
let currentMonth = initialCalendarDate.getMonth();
let currentYear = initialCalendarDate.getFullYear();
let activeFilters = new Set(['gpbc', 'christian']); // Default to showing standard events
let currentPreset = 'this-week'; // Default to "All Events" preset
let selectedDate = null;
let currentEvent = null;

const CODE_OWNER = 'gilbert-baidya'; // Change to your GitHub username

// Google Sheets Database Configuration
const GOOGLE_SHEETS_URL = window.GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbxN025_2hB-8X00M3cDDkit0HqTSUuh2VttI3GJ26gbaohwKFncar3ExvJtJW4PtuqERQ/exec';
const USE_GOOGLE_SHEETS = true; // Set to false to use localStorage instead

// EmailJS configuration - replace with runtime config / environment placeholders
const EMAILJS_PUBLIC_KEY = window.EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = window.EMAILJS_SERVICE_ID || 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = window.EMAILJS_TEMPLATE_ID || 'YOUR_EMAILJS_TEMPLATE_ID';

// Cloudinary configuration - replace with runtime config / environment placeholders
const CLOUDINARY_CLOUD_NAME = window.CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUDINARY_CLOUD_NAME';
const CLOUDINARY_UPLOAD_PRESET = window.CLOUDINARY_UPLOAD_PRESET || 'YOUR_CLOUDINARY_UPLOAD_PRESET';
let cloudinaryWidget = null;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

function safeImageUrl(url) {
    if (!url) return '';
    try {
        const parsed = new URL(String(url), window.location.href);
        return parsed.protocol === 'https:' ? parsed.href : '';
    } catch (e) {
        return '';
    }
}

// Initialize EmailJS for notifications (only if configured)
if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// Initialize calendar on page load
let calendarFeedState = 'loading';
document.addEventListener('DOMContentLoaded', async function () {
    updateAdvancedCheckboxes();
    clearUnverifiedChurchEvents();
    initializeCalendar();
    setupEventListeners();
    setupCalendarViews();
    document.getElementById('calendarFeedRetry').addEventListener('click', () => refreshCalendarEvents(true));
    const qr = document.getElementById('calendarAccessQR');
    if (qr && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            loadCalendarLibrary('QRCode', 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js')
                .then(generateCalendarAccessQR).catch(() => { qr.textContent = 'Use the Open calendar link below.'; });
        });
        observer.observe(qr.parentElement);
    }
    await refreshCalendarEvents();
});

function setupCalendarViews() {
    const list = document.getElementById('month-event-list');
    const month = document.getElementById('calendar-month-table');
    const buttons = [document.getElementById('calendar-list-view'), document.getElementById('calendar-month-view')];
    function select(view) {
        list.hidden = view !== 'list';
        month.hidden = view !== 'month';
        document.getElementById('calendar-month-region').hidden = month.hidden;
        buttons[0].setAttribute('aria-pressed', String(view === 'list'));
        buttons[1].setAttribute('aria-pressed', String(view === 'month'));
    }
    buttons[0].addEventListener('click', () => select('list'));
    buttons[1].addEventListener('click', () => select('month'));
    select(matchMedia('(max-width: 767px)').matches ? 'list' : 'month');
}

async function refreshCalendarEvents(retry = false) {
    const status = document.getElementById('calendarFeedStatus');
    const button = document.getElementById('calendarFeedRetry');
    const region = document.getElementById('upcomingEventsList');
    const hadFocus = document.activeElement === button;
    button.disabled = true;
    calendarFeedState = 'loading';
    region.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading upcoming events…';
    renderMonthEvents();
    displayUpcomingEvents();
    const loaded = await loadEventsFromGoogleSheets();
    calendarFeedState = loaded ? 'ready' : 'error';
    region.setAttribute('aria-busy', 'false');
    button.disabled = false;
    button.hidden = loaded;
    if (!loaded) {
        clearUnverifiedChurchEvents();
        status.textContent = 'Upcoming events are unavailable. Please retry or contact the church.';
    } else {
        status.textContent = retry ? 'Upcoming events updated.' : '';
    }
    displayUpcomingEvents();
    renderCalendar();
    renderMonthEvents();
    if (loaded && hadFocus) {
        const heading = document.getElementById('currentMonth');
        heading.tabIndex = -1;
        heading.focus();
    }
}

const calendarLibraries = new Map();
function clearUnverifiedChurchEvents() {
    for (let index = events.length - 1; index >= 0; index--) {
        if (events[index].category === 'gpbc') events.splice(index, 1);
    }
}
function loadCalendarLibrary(name, url) {
    if (window[name]) return Promise.resolve();
    if (calendarLibraries.has(name)) return calendarLibraries.get(name);
    const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => { calendarLibraries.delete(name); script.remove(); reject(new Error('Library unavailable')); };
        document.head.appendChild(script);
    });
    calendarLibraries.set(name, promise);
    return promise;
}

function applyPreset(preset) {
    currentPreset = preset;

    switch (preset) {
        case 'sunday-services':
            // Show ONLY Sunday worship services - nothing else
            activeFilters = new Set(['gpbc-sunday-worship']);
            break;
        case 'prayer-meetings':
            // Show only the recurring prayer event series in this filtered view.
            activeFilters = new Set(['gpbc-prayer']);
            break;
        case 'christian-days':
            activeFilters = new Set(['christian', 'gpbc']);
            break;
        case 'this-week':
            activeFilters = new Set(['gpbc', 'christian']);
            break;
        default:
            activeFilters = new Set(['gpbc', 'christian']);
    }

    updatePresetButtons();
    updateAdvancedCheckboxes();
    renderCalendar();
    renderMonthEvents();
}

function updatePresetButtons() {
    document.querySelectorAll('.preset-filter').forEach(button => {
        const preset = button.dataset.preset;
        if (preset === currentPreset) {
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
        } else {
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
        }
    });
}

function updateAdvancedCheckboxes() {
    document.querySelectorAll('.filter').forEach(checkbox => {
        const category = checkbox.dataset.category;
        checkbox.checked = activeFilters.has(category);
    });
}

// Helper function to check if an event should be displayed based on active filters
function shouldDisplayEvent(event) {
    if (activeFilters.size === 0) {
        return false; // Don't show any events when no filters are active
    }

    // Handle dedicated service-specific filters
    if (activeFilters.has('gpbc-sunday-worship')) {
        // STRICT: Only Sunday worship services
        return event.eventCategory === 'GPBC' &&
            event.eventType === 'worship' &&
            event.eventDay === 'Sunday';
    }

    if (activeFilters.has('gpbc-prayer')) {
        // STRICT: Only prayer meetings (Friday + Saturday)
        return event.eventCategory === 'GPBC' &&
            event.eventType === 'prayer';
    }

    // Standard category-based filtering
    return activeFilters.has(event.category);
}

function generateCalendarAccessQR() {
    const qrDiv = document.getElementById('calendarAccessQR');
    if (qrDiv) {
        // Wait for QRCode library to load
        const generateQR = () => {
            if (typeof QRCode !== 'undefined') {
                qrDiv.innerHTML = ''; // Clear any existing content
                new QRCode(qrDiv, {
                    text: 'https://gracepraise.church/',
                    width: 180,
                    height: 180,
                    colorDark: "#667eea",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                annotateGeneratedQrCode(qrDiv, 'QR code to open the GPBC calendar website');
            } else {
                // Retry after 100ms if library not loaded yet
                setTimeout(generateQR, 100);
            }
        };
        generateQR();
    }
}

function annotateGeneratedQrCode(container, label) {
    if (!container) return;

    if (!container.getAttribute('role')) {
        container.setAttribute('role', 'img');
    }
    if (!container.getAttribute('aria-label')) {
        container.setAttribute('aria-label', label);
    }

    const applyMetadata = () => {
        const img = container.querySelector('img');
        if (img && img.getAttribute('alt') === null) {
            img.setAttribute('alt', label);
        }

        const canvas = container.querySelector('canvas');
        if (canvas) {
            if (!canvas.getAttribute('role')) {
                canvas.setAttribute('role', 'img');
            }
            if (!canvas.getAttribute('aria-label')) {
                canvas.setAttribute('aria-label', label);
            }
        }
    };

    applyMetadata();

    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
        applyMetadata();
        if (container.querySelector('img, canvas')) {
            observer.disconnect();
        }
    });
    observer.observe(container, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 2000);
}

function initializeCalendar() {
    renderCalendar();
    renderMonthEvents();
}

function setupEventListeners() {
    // Navigation buttons
    const prevMonthBtn = document.getElementById('prevMonth');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
            renderMonthEvents();
        });
    }

    const nextMonthBtn = document.getElementById('nextMonth');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
            renderMonthEvents();
        });
    }

    // Filter checkboxes (advanced filters)
    document.querySelectorAll('.filter').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const category = e.target.dataset.category;
            if (e.target.checked) {
                activeFilters.add(category);
            } else {
                activeFilters.delete(category);
            }
            currentPreset = null; // Clear preset when manually filtering
            updatePresetButtons();
            renderCalendar();
            renderMonthEvents();
        });
    });

    // Preset filter buttons
    document.querySelectorAll('.preset-filter').forEach(button => {
        button.addEventListener('click', (e) => {
            const preset = e.target.dataset.preset;
            applyPreset(preset);
        });
    });

    // Advanced filters toggle
    const advancedToggle = document.getElementById('advancedFiltersToggle');
    if (advancedToggle) {
        advancedToggle.addEventListener('click', () => {
            const advancedSection = document.getElementById('advancedFilters');
            const isExpanded = advancedToggle.getAttribute('aria-expanded') === 'true';
            advancedToggle.setAttribute('aria-expanded', !isExpanded);
            advancedSection.style.display = isExpanded ? 'none' : 'block';
            advancedToggle.textContent = isExpanded ? 'More Filters ▾' : 'Hide Filters ▴';
        });
    }

    // Initialize preset buttons on load
    updatePresetButtons();

    // Print button
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Download as image button
    const downloadImageBtn = document.getElementById('downloadImageBtn');
    if (downloadImageBtn) {
        downloadImageBtn.addEventListener('click', downloadCalendarAsImage);
    }

    // Share button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareEvents);
    }

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Add event form
    const addEventForm = document.getElementById('addEventForm');
    if (addEventForm) {
        addEventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addGPBCEvent();
        });
    }

    const cancelAddEvent = document.getElementById('cancelAddEvent');
    if (cancelAddEvent) {
        cancelAddEvent.addEventListener('click', () => {
            const addEventModal = document.getElementById('addEventModal');
            if (addEventModal) {
                addEventModal.style.display = 'none';
            }
        });
    }

    // Delete event button
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', deleteCurrentEvent);
    }

    // Donation button
    const donationBtn = document.getElementById('donationBtn');
    if (donationBtn) {
        donationBtn.addEventListener('click', showDonationModal);
    }
}

function renderCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const currentMonthEl = document.getElementById('currentMonth');
    if (currentMonthEl) {
        currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const prevLastDay = new Date(currentYear, currentMonth, 0);

    const firstDayIndex = firstDay.getDay();
    const lastDayDate = lastDay.getDate();
    const prevLastDayDate = prevLastDay.getDate();

    const calendarGrid = document.querySelector('.calendar-grid');

    // Keep weekday headers
    const body = calendarGrid.tBodies[0];
    body.replaceChildren();
    calendarGrid.caption.textContent = currentMonthEl.textContent;
    let row;
    let cellCount = 0;
    function appendDay(day) {
        if (cellCount++ % 7 === 0) row = body.insertRow();
        row.appendChild(day);
    }

    // Previous month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const day = createDayElement(prevLastDayDate - i, true);
        appendDay(day);
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= lastDayDate; i++) {
        const isToday = currentYear === today.getFullYear() &&
            currentMonth === today.getMonth() &&
            i === today.getDate();
        const day = createDayElement(i, false, isToday);
        appendDay(day);
    }

    // Next month days to fill the grid
    const totalCells = firstDayIndex + lastDayDate;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    for (let i = 1; i <= remainingCells; i++) {
        const day = createDayElement(i, true);
        appendDay(day);
    }
}

function createDayElement(dayNumber, isOtherMonth, isToday = false) {
    const dayDiv = document.createElement('td');
    dayDiv.className = 'day';
    const content = document.createElement('div');
    content.className = 'day-content';
    dayDiv.appendChild(content);

    if (isOtherMonth) {
        dayDiv.classList.add('other-month');
    }
    if (isToday) {
        dayDiv.classList.add('today');
    }

    // Add Sunday class for subtle highlighting
    if (!isOtherMonth) {
        const date = new Date(currentYear, currentMonth, dayNumber);
        if (date.getDay() === 0) { // Sunday
            dayDiv.classList.add('sunday');
        }
    }

    const dayNumberDiv = document.createElement('div');
    dayNumberDiv.className = 'day-number';
    dayNumberDiv.textContent = dayNumber;
    content.appendChild(dayNumberDiv);

    // Add events for this day
    if (!isOtherMonth) {
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        const dayEvents = getEventsForDate(dateString);

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        dayEvents.forEach(event => {
            if (shouldDisplayEvent(event)) {
                const eventMarker = document.createElement('a');
                eventMarker.href = '#eventDetailModal';
                eventMarker.className = `event-marker ${event.category}`;

                // Check if event was added in the last 7 days
                const isNew = event.timestamp && new Date(event.timestamp) > sevenDaysAgo;
                const newIcon = isNew ? '🆕 ' : '';

                // Check if first-time visitor friendly
                const isFriendly = isFirstTimeFriendly(event);
                const friendlyBadge = isFriendly ? '<span class="visitor-friendly-badge" title="A great service to start your journey with us">👋</span> ' : '';

                const icons = document.createElement('span');
                icons.setAttribute('aria-hidden', 'true');
                icons.innerHTML = `${friendlyBadge}${newIcon}${categoryEmojis[event.category]} `;
                const name = document.createElement('span');
                name.lang = /[\u0980-\u09ff]/.test(event.name) ? 'bn' : 'en';
                name.textContent = event.name;
                const fullDate = document.createElement('span');
                fullDate.lang = 'en';
                fullDate.className = 'sr-only';
                fullDate.textContent = ', ' + new Date(currentYear, currentMonth, dayNumber).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                eventMarker.append(icons, name, fullDate);

                // Add special styling for new events
                if (isNew) {
                    eventMarker.style.fontWeight = 'bold';
                    eventMarker.style.animation = 'pulse 2s infinite';
                }

                eventMarker.addEventListener('click', (e) => {
                    e.preventDefault();
                    showEventDetail(event);
                });
                content.appendChild(eventMarker);
            }
        });
    }

    return dayDiv;
}

function getEventsForDate(dateString) {
    return events.filter(event => event.date === dateString);
}

// Helper function to check if an event is first-time visitor friendly
function isFirstTimeFriendly(event) {
    // Check if explicitly marked
    if (event.isFirstTimeFriendly === true) {
        return true;
    }

    // Auto-detect based on event name keywords
    const friendlyKeywords = [
        'sunday worship',
        'sunday service',
        'church service',
        'bangla church service',
        'holy communion',
        'worship service',
        'welcome service',
        'newcomer',
        'visitor'
    ];

    const eventNameLower = event.name.toLowerCase();
    return friendlyKeywords.some(keyword => eventNameLower.includes(keyword));
}

function getEventsForMonth(month, year) {
    return events.filter(event => {
        // Fix timezone issue by treating as local date
        const [eventYear, eventMonth, eventDay] = event.date.split('-');
        return parseInt(eventMonth) - 1 === month && parseInt(eventYear) === year;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderMonthEvents() {
    const monthEventsDiv = document.getElementById('monthEvents');
    monthEventsDiv.setAttribute('aria-busy', String(calendarFeedState === 'loading'));
    if (calendarFeedState !== 'ready') {
        const message = document.createElement('li');
        message.textContent = calendarFeedState === 'loading'
            ? 'Loading events for this month…'
            : 'Events for this month are unavailable. Please retry or contact the church.';
        monthEventsDiv.replaceChildren(message);
        return;
    }
    const monthEvents = getEventsForMonth(currentMonth, currentYear).filter(shouldDisplayEvent);

    if (monthEvents.length === 0) {
        monthEventsDiv.innerHTML = '<li>No events this month</li>';
        return;
    }

    monthEventsDiv.innerHTML = '';

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const dateGroups = new Map();
    monthEvents.forEach(event => {
        if (shouldDisplayEvent(event)) {
            const eventItem = document.createElement('li');
            eventItem.className = `event-item ${event.category}`;

            // Fix timezone issue by treating as local date
            const [year, month, day] = event.date.split('-');
            const eventDate = new Date(year, month - 1, day);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });

            // Check if event was added in the last 7 days
            const isNew = event.timestamp && new Date(event.timestamp) > sevenDaysAgo;
            const newBadge = isNew ? '<span style="background: #ff4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; margin-left: 8px; font-weight: bold;">NEW</span>' : '';

            // Check if first-time visitor friendly
            const isFriendly = isFirstTimeFriendly(event);
            const friendlyBadge = isFriendly ? '<span class="visitor-friendly-badge-large" title="A great service to start your journey with us">👋 First-Time Visitor Friendly</span>' : '';

            // Add special styling for new events
            if (isNew) {
                eventItem.style.background = 'linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)';
                eventItem.style.borderLeft = '4px solid #ff4444';
                eventItem.style.boxShadow = '0 2px 8px rgba(255, 68, 68, 0.2)';
            }

            eventItem.innerHTML = `
                <a class="event-name" href="#eventDetailModal"><span lang="${/[\u0980-\u09ff]/.test(event.name) ? 'bn' : 'en'}">${escapeHtml(event.name)}</span> · <span lang="en">${formattedDate}</span></a>${newBadge}
                <div class="event-date">${formattedDate}</div><p>Time to be confirmed · Pacific Time · Place to be confirmed</p>
                ${friendlyBadge}
            `;

            eventItem.querySelector('a').addEventListener('click', e => { e.preventDefault(); showEventDetail(event); });
            if (!dateGroups.has(event.date)) {
                const group = document.createElement('li');
                const heading = document.createElement('h4');
                heading.textContent = formattedDate;
                const list = document.createElement('ol');
                group.append(heading, list);
                monthEventsDiv.appendChild(group);
                dateGroups.set(event.date, list);
            }
            dateGroups.get(event.date).appendChild(eventItem);
        }
    });
}

function showEventDetail(event) {
    currentEvent = event;
    const modal = document.getElementById('eventDetailModal');
    // Fix timezone issue by treating as local date
    const [year, month, day] = event.date.split('-');
    const eventDate = new Date(year, month - 1, day);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    document.getElementById('eventTitle').textContent = `${categoryEmojis[event.category]} ${event.name}`;
    document.getElementById('eventDate').textContent = formattedDate;
    document.getElementById('eventDescription').textContent = event.description;
    document.getElementById('eventTitle').lang = /[\u0980-\u09ff]/.test(event.name) ? 'bn' : 'en';
    document.getElementById('eventDescription').lang = /[\u0980-\u09ff]/.test(event.description || '') ? 'bn' : 'en';

    // Remove any existing contact info or image
    const existingContactInfo = document.querySelector('.event-contact-info');
    if (existingContactInfo) {
        existingContactInfo.remove();
    }
    const existingImage = document.querySelector('.event-detail-image');
    if (existingImage) {
        existingImage.remove();
    }

    // Add event image if available
    const descriptionElement = document.getElementById('eventDescription');
    if (safeImageUrl(event.imageUrl)) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'event-detail-image';
        imageContainer.style.cssText = `
            margin-top: 15px;
            text-align: center;
        `;
        imageContainer.innerHTML = `
            <img src="${escapeHtml(safeImageUrl(event.imageUrl))}" alt="${escapeHtml(event.name)}" style="max-width: 100%; max-height: 400px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        `;
        descriptionElement.parentNode.insertBefore(imageContainer, descriptionElement.nextSibling);
    }

    // Add contact info if available
    if (event.addedBy || event.contact) {
        const contactInfo = document.createElement('div');
        contactInfo.className = 'event-contact-info';
        contactInfo.style.cssText = `
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e9ecef;
            font-size: 0.9em;
            color: #666;
        `;
        contactInfo.innerHTML = `
            <strong>📋 Added by:</strong> ${escapeHtml(event.addedBy || 'Unknown')}<br>
            ${event.contact ? `<strong>📞 Contact:</strong> ${escapeHtml(event.contact)}` : ''}
        `;
        const insertAfter = document.querySelector('.event-detail-image') || descriptionElement;
        insertAfter.parentNode.insertBefore(contactInfo, insertAfter.nextSibling);
    }

    const categoryBadge = document.createElement('span');
    categoryBadge.style.cssText = `
        display: inline-block;
        padding: 5px 15px;
        background: ${categoryColors[event.category]};
        color: white;
        border-radius: 15px;
        margin-top: 10px;
        font-size: 0.9em;
    `;
    categoryBadge.textContent = event.category.charAt(0).toUpperCase() + event.category.slice(1);

    const categoryDiv = document.getElementById('eventCategory');
    categoryDiv.innerHTML = '';
    categoryDiv.appendChild(categoryBadge);

    // Add first-time visitor friendly badge if applicable
    if (isFirstTimeFriendly(event)) {
        const friendlyBadge = document.createElement('div');
        friendlyBadge.style.cssText = `
            margin-top: 15px;
            padding: 12px 16px;
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            border-left: 4px solid #2e7d32;
            border-radius: 8px;
            color: #1b5e20;
            font-size: 0.95em;
        `;
        friendlyBadge.innerHTML = `
            <strong>👋 First-Time Visitor Friendly</strong><br>
            <span style="font-size: 0.9em; color: #2e7d32;">A great service to start your journey with us. Everyone is welcome!</span>
        `;
        categoryDiv.appendChild(friendlyBadge);
    }

    // Show delete button for all GPBC events
    const deleteContainer = document.getElementById('deleteButtonContainer');
    if (event.category === 'gpbc') {
        deleteContainer.style.display = 'block';
    } else {
        deleteContainer.style.display = 'none';
    }

    modal.style.display = 'block';
}

function shareEvents() {
    const monthEvents = getEventsForMonth(currentMonth, currentYear);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    let shareText = `📅 Grace and Praise Bangladeshi Church\n1325 Richardson Street, San Bernardino, CA 92408\n\nCalendar Events - ${monthNames[currentMonth]} ${currentYear}\n\n`;

    monthEvents.forEach(event => {
        if (shouldDisplayEvent(event)) {
            const [year, month, day] = event.date.split('-');
            const eventDate = new Date(year, month - 1, day);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            shareText += `${categoryEmojis[event.category]} ${formattedDate}: ${event.name}\n`;
        }
    });

    shareText += `\n---\nView full calendar at Grace and Praise Bangladeshi Church`;

    if (navigator.share) {
        navigator.share({
            title: `Grace and Praise Bangladeshi Church - ${monthNames[currentMonth]} ${currentYear}`,
            text: shareText
        }).catch(err => {
            // console.log('Share failed:', err); // Removed for production
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Events copied to clipboard! You can now paste and share them.');
}

function displayUpcomingEvents() {
    const upcomingEventsList = document.getElementById('upcomingEventsList');
    if (calendarFeedState !== 'ready') {
        const message = document.createElement('p');
        message.textContent = calendarFeedState === 'loading'
            ? 'Loading upcoming events…'
            : 'Upcoming events are unavailable. Please retry or contact the church.';
        upcomingEventsList.replaceChildren(message);
        return;
    }
    const reminders = getUpcomingReminders().filter(event => event.category === 'gpbc').slice(0, 3); // Show max 3 events

    if (reminders.length === 0) {
        upcomingEventsList.innerHTML = '<div class="upcoming-events-empty">No other gatherings are scheduled yet</div>';
    } else {
        upcomingEventsList.innerHTML = '';
        reminders.forEach(reminder => {
            const eventCard = document.createElement('a');
            eventCard.href = '#eventDetailModal';
            eventCard.className = 'upcoming-event-card';

            eventCard.innerHTML = `
                <div class="event-date" lang="en">${new Date(reminder.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div class="event-title" lang="${/[\u0980-\u09ff]/.test(reminder.name) ? 'bn' : 'en'}">${escapeHtml(reminder.name)}</div><p>Time to be confirmed · Pacific Time · Place to be confirmed</p>
                <div class="event-category">${categoryEmojis[reminder.category]} ${escapeHtml(reminder.category)}</div>
            `;

            // Add click to show event details
            eventCard.style.cursor = 'pointer';
            eventCard.addEventListener('click', event => {
                event.preventDefault();
                showEventDetailsModal(reminder);
            });

            upcomingEventsList.appendChild(eventCard);
        });
    }
}

function checkAndShowReminders() {
    // Check if we should show automatic reminders (once per day)
    const lastCheck = localStorage.getItem('lastReminderCheck');
    const today = new Date().toDateString();

    if (lastCheck !== today) {
        const reminders = getUpcomingReminders().filter(r => r.daysUntil <= 60);
        if (reminders.length > 0) {
            localStorage.setItem('lastReminderCheck', today);
            // Show a subtle notification
            setTimeout(() => {
                const urgentReminders = reminders.filter(r => r.daysUntil <= 30);
                if (urgentReminders.length > 0) {
                    alert(`🔔 You have ${urgentReminders.length} event(s) coming up in the next month! Click "View Reminders" to see them.`);
                }
            }, 2000);
        }
    }
}

function showAddEventModal(dateString) {
    selectedDate = dateString;

    // Clear form first
    document.getElementById('eventAddedBy').value = '';
    document.getElementById('eventContact').value = '';
    document.getElementById('eventName').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('eventImageUrl').value = '';
    document.getElementById('imagePreview').style.display = 'none';

    // Set the date input value in YYYY-MM-DD format (what date inputs expect)
    // Use setTimeout to ensure the modal is rendered before setting the value
    setTimeout(() => {
        document.getElementById('eventDateInput').value = dateString;
    }, 10);

    document.getElementById('addEventModal').style.display = 'block';
    document.getElementById('eventAddedBy').focus();
}

async function addGPBCEvent() {
    const addedBy = document.getElementById('eventAddedBy').value.trim();
    const contact = document.getElementById('eventContact').value.trim();
    const name = document.getElementById('eventName').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const selectedDateFromInput = document.getElementById('eventDateInput').value; // Get date from input
    const imageUrl = document.getElementById('eventImageUrl').value.trim();

    if (!addedBy) {
        alert('Please enter your name');
        return;
    }

    if (!contact) {
        alert('Please enter your email or phone number');
        return;
    }

    if (!name) {
        alert('Please enter an event name');
        return;
    }

    if (!selectedDateFromInput) {
        alert('Please select a date');
        return;
    }

    const newEvent = {
        date: selectedDateFromInput, // Use the date from the input field
        name: name,
        category: 'gpbc',
        description: description || 'Grace and Praise Bangladeshi Church event',
        addedBy: addedBy,
        contact: contact,
        owner: CODE_OWNER, // Mark event as created by code owner
        timestamp: new Date().toISOString(), // Add timestamp for "NEW" badge
        imageUrl: imageUrl || '' // Add image URL
    };

    // Show loading
    showLoadingIndicator('Saving event...');

    // Try to save to Google Sheets first
    if (USE_GOOGLE_SHEETS && GOOGLE_SHEETS_URL !== 'YOUR_WEB_APP_URL_HERE') {
        const saved = await saveEventToGoogleSheets(newEvent);
        if (saved) {
            // Reload all events from Google Sheets to get the latest data
            await loadEventsFromGoogleSheets();
        } else {
            // Fallback to localStorage
            events.push(newEvent);
            saveCustomEvents();
        }
    } else {
        // Use localStorage
        events.push(newEvent);
        saveCustomEvents();
    }

    hideLoadingIndicator();

    // Send email notification
    sendEventNotification(newEvent);

    document.getElementById('addEventModal').style.display = 'none';
    renderCalendar();
    renderMonthEvents();
    alert(`✓ Event "${name}" added successfully!`);
}

async function deleteCurrentEvent() {
    if (!currentEvent || currentEvent.category !== 'gpbc') {
        alert('Only GPBC events can be deleted.');
        return;
    }

    if (confirm(`Are you sure you want to delete "${currentEvent.name}"?`)) {
        showLoadingIndicator('Deleting event...');

        // Try to delete from Google Sheets first
        if (USE_GOOGLE_SHEETS && GOOGLE_SHEETS_URL !== 'YOUR_WEB_APP_URL_HERE') {
            const deleted = await deleteEventFromGoogleSheets(currentEvent);
            if (deleted) {
                // Reload all events from Google Sheets to get the latest data
                await loadEventsFromGoogleSheets();
            } else {
                // Fallback to localStorage
                // console.log('Using localStorage fallback for delete'); // Removed for production
                const index = events.findIndex(e =>
                    e.date === currentEvent.date &&
                    e.name === currentEvent.name &&
                    e.category === 'gpbc'
                );

                if (index !== -1) {
                    events.splice(index, 1);
                    saveCustomEvents();
                }
            }
        } else {
            // Remove from local array when using localStorage
            const index = events.findIndex(e =>
                e.date === currentEvent.date &&
                e.name === currentEvent.name &&
                e.category === 'gpbc'
            );

            if (index !== -1) {
                events.splice(index, 1);
                saveCustomEvents();
            }
        }

        hideLoadingIndicator();

        // Close modal and refresh calendar
        document.getElementById('eventDetailModal').style.display = 'none';
        renderCalendar();
        renderMonthEvents();
        alert(`✓ Event "${currentEvent.name}" deleted successfully!`);
        currentEvent = null;
    }
}

async function downloadCalendarAsImage() {
    try { await loadCalendarLibrary('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'); }
    catch { alert('Calendar image could not be created. Please retry.'); return; }
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Create a vertical layout container for mobile/reels format (9:16 ratio)
    const originalContainer = document.querySelector('.container');
    const cloneContainer = originalContainer.cloneNode(true);

    // Create wrapper for vertical format (1080x1920 - YouTube Shorts/Reels size)
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        position: fixed;
        left: -10000px;
        top: 0;
        width: 1080px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px 30px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Style the cloned container
    cloneContainer.style.cssText = `
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        max-width: 100%;
    `;

    // Hide controls in clone
    const controls = cloneContainer.querySelector('.controls');
    if (controls) controls.style.display = 'none';

    // Adjust calendar grid for vertical view
    const calendarGrid = cloneContainer.querySelector('.calendar-grid');
    if (calendarGrid) {
        calendarGrid.style.padding = '15px';
        calendarGrid.style.margin = '15px';
    }

    // Adjust day cells for better mobile visibility
    const days = cloneContainer.querySelectorAll('.day');
    days.forEach(day => {
        day.style.minHeight = '90px';
        day.style.padding = '8px';
    });

    // Adjust event markers
    const eventMarkers = cloneContainer.querySelectorAll('.event-marker');
    eventMarkers.forEach(marker => {
        marker.style.fontSize = '0.7em';
        marker.style.padding = '2px 5px';
    });

    // Style events sidebar for vertical view
    const eventsSidebar = cloneContainer.querySelector('.events-sidebar');
    if (eventsSidebar) {
        eventsSidebar.style.padding = '20px';
        eventsSidebar.style.background = '#f8f9fa';
    }

    wrapper.appendChild(cloneContainer);
    document.body.appendChild(wrapper);

    // Capture with mobile-optimized dimensions
    html2canvas(wrapper, {
        backgroundColor: null,
        scale: 1.5,
        logging: false,
        useCORS: true,
        width: 1080,
        windowWidth: 1080
    }).then(canvas => {
        // Remove temporary wrapper
        document.body.removeChild(wrapper);

        // Convert to JPG and download
        canvas.toBlob(function (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GPBC-${monthNames[currentMonth]}-${currentYear}-Mobile.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert('✓ Mobile-optimized calendar downloaded!\nPerfect for Instagram Stories, YouTube Shorts, and Facebook Reels!');
        }, 'image/jpeg', 0.95);
    }).catch(err => {
        document.body.removeChild(wrapper);
        console.error('Screenshot failed:', err);
        alert('Failed to capture calendar. Please try again.');
    });
}

function setupDonationModal() {
    // Generate Zelle QR code
    const zelleQR = document.getElementById('zelleQR');
    if (zelleQR && zelleQR.innerHTML === '' && typeof QRCode !== 'undefined') {
        try {
            new QRCode(zelleQR, {
                text: 'mailto:gracepraisebangladeshichurch@gmail.com',
                width: 180,
                height: 180,
                colorDark: '#667eea',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            annotateGeneratedQrCode(zelleQR, 'QR code for Zelle giving');
        } catch (e) {
            // console.log('Error generating Zelle QR code:', e); // Removed for production
        }
    }

    // Generate PayPal QR code
    const paypalQR = document.getElementById('paypalQR');
    if (paypalQR && paypalQR.innerHTML === '' && typeof QRCode !== 'undefined') {
        try {
            new QRCode(paypalQR, {
                text: 'https://www.paypal.com/paypalme/gpbchurch',
                width: 180,
                height: 180,
                colorDark: '#0070ba',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            annotateGeneratedQrCode(paypalQR, 'QR code for PayPal giving');
        } catch (e) {
            // console.log('Error generating PayPal QR code:', e); // Removed for production
        }
    }
}

function showDonationModal() {
    try {
        const modal = document.getElementById('donationModal');
        if (!modal) {
            console.error('Donation modal not found');
            return;
        }
        setupDonationModal(); // Ensure QR codes are generated
        modal.style.display = 'block';
    } catch (e) {
        console.error('Error showing donation modal:', e);
        alert('Unable to open donation modal. Please refresh the page and try again.');
    }
}

function sendEventNotification(event) {
    // Skip if EmailJS is not configured
    if (typeof emailjs === 'undefined' || EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
        // console.log('Email notifications not configured. Event added successfully without notification.'); // Removed for production
        return;
    }

    // Format the date nicely
    const [year, month, day] = event.date.split('-');
    const eventDate = new Date(year, month - 1, day);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Email template parameters
    const templateParams = {
        to_email: 'gracepraisebangladeshichurch@gmail.com',
        cc_email: 'gilbert.baidya@gmail.com',
        event_name: event.name,
        event_date: formattedDate,
        event_description: event.description,
        added_by: event.addedBy || event.owner || 'User',
        contact_info: event.contact || 'Not provided',
        timestamp: new Date().toLocaleString()
    };

    // Send email using EmailJS
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(function (response) {
            // console.log('Email notification sent successfully!', response.status, response.text); // Removed for production
        }, function (error) {
            // console.log('Failed to send email notification:', error); // Removed for production
        });
}

// Cloudinary Widget Initialization
function initializeCloudinaryWidget() {
    if (typeof cloudinary === 'undefined') {
        console.error('Cloudinary widget library not loaded');
        return;
    }

    cloudinaryWidget = cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'camera', 'url'],
        multiple: false,
        maxFiles: 1,
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maxFileSize: 10000000, // 10MB
        theme: 'minimal',
        styles: {
            palette: {
                window: '#FFFFFF',
                windowBorder: '#667eea',
                tabIcon: '#667eea',
                menuIcons: '#667eea',
                textDark: '#000000',
                textLight: '#FFFFFF',
                link: '#667eea',
                action: '#667eea',
                inactiveTabIcon: '#999999',
                error: '#F44235',
                inProgress: '#667eea',
                complete: '#28a745',
                sourceBg: '#E4EBF1'
            }
        }
    }, (error, result) => {
        if (!error && result && result.event === 'success') {
            const imageUrl = result.info.secure_url;
            document.getElementById('eventImageUrl').value = imageUrl;
            document.getElementById('previewImg').src = imageUrl;
            document.getElementById('imagePreview').style.display = 'block';
        }
    });

    // Upload button click handler
    const uploadBtn = document.getElementById('uploadImageBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            cloudinaryWidget.open();
        });
    }

    // Remove image button handler
    const removeBtn = document.getElementById('removeImageBtn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            document.getElementById('eventImageUrl').value = '';
            document.getElementById('previewImg').src = '';
            document.getElementById('imagePreview').style.display = 'none';
        });
    }
}
