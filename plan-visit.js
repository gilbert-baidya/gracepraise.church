(() => {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function initializeLanguage() {
    const storageKey = 'gpbc-language';
    let currentLanguage = 'en';
    try {
      currentLanguage = localStorage.getItem(storageKey) || 'en';
    } catch (error) {
      currentLanguage = 'en';
    }

    function switchLanguage(language) {
      currentLanguage = language;
      try {
        localStorage.setItem(storageKey, language);
      } catch (error) {
        // A storage restriction should not disable the page language toggle.
      }
      document.querySelectorAll('[data-lang]').forEach((element) => {
        element.style.display = 'none';
      });
      document.querySelectorAll(`[data-lang="${language}"]`).forEach((element) => {
        element.style.display = '';
      });
      document.querySelectorAll('[data-lang-btn]').forEach((button) => {
        button.classList.toggle('active', button.dataset.langBtn === language);
      });
      document.documentElement.lang = language;
    }

    const toggleButton = document.getElementById('langToggleBtn');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        switchLanguage(currentLanguage === 'en' ? 'bn' : 'en');
      });
    }
    switchLanguage(currentLanguage);
  }

  function initializeHighlights() {
    const container = document.getElementById('upcomingHighlights');
    if (!container) return;
    const eventList = typeof events === 'undefined' ? [] : events;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const categoryEmoji = {
      christian: '✝️',
      gpbc: '🎉',
      bangladeshi: '🇧🇩',
      american: '🇺🇸',
      special: '⭐'
    };
    eventList
      .filter((event) => new Date(event.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 2)
      .forEach((event) => {
        const eventDate = new Date(event.date);
        const item = document.createElement('div');
        item.className = 'highlight-item';
        item.innerHTML = `
          <div class="highlight-icon">${categoryEmoji[event.category] || '📅'}</div>
          <div class="highlight-content">
            <h3>${event.name}</h3>
            <p class="highlight-date">${eventDate.toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}</p>
            <p class="highlight-desc">${event.description || ''}</p>
          </div>
        `;
        container.appendChild(item);
      });
  }

  function initializeCalendarLinks() {
    const start = new Date();
    const daysUntilSunday = (7 - start.getDay()) % 7 || 7;
    start.setDate(start.getDate() + daysUntilSunday);
    start.setHours(17, 0, 0, 0);
    const end = new Date(start.getTime() + 90 * 60000);
    const formatDate = (date) => `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    const title = 'Sunday Worship Service – Grace and Praise Bangladeshi Church';
    const description = 'Join us for worship, prayer, and Bible-based message. Everyone is welcome!';
    const location = '1325 Richardson Street, San Bernardino, CA 92408';
    const googleParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description,
      location,
      dates: `${formatDate(start)}/${formatDate(end)}`,
      recur: 'RRULE:FREQ=WEEKLY;BYDAY=SU'
    });
    const googleLink = document.getElementById('addToGoogleCal');
    if (googleLink) googleLink.href = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//Grace and Praise Bangladeshi Church//Sunday Worship//EN',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `DTSTART:${formatDate(start)}`, `DTEND:${formatDate(end)}`,
      'RRULE:FREQ=WEEKLY;BYDAY=SU', `SUMMARY:${title}`,
      `DESCRIPTION:${description}`, `LOCATION:${location}`,
      `UID:sunday-worship-${Date.now()}@gracepraise.church`,
      'STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const icsUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    ['addToAppleCal', 'addToOutlookCal'].forEach((id) => {
      const link = document.getElementById(id);
      if (link) link.href = icsUrl;
    });
  }

  onReady(() => {
    initializeLanguage();
    initializeHighlights();
    initializeCalendarLinks();
  });
})();
