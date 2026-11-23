(() => {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
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

  function nextSundayDate(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now).map(part => [part.type, part.value]));
    const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    const days = (7 - date.getUTCDay()) % 7 || 7;
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  function sundayCalendar(date, now = new Date()) {
    if (typeof date !== 'string' || !/^\d{8}$/.test(date)) throw new TypeError('A Sunday calendar date is required.');
    const civil = new Date(date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6) + 'T00:00:00Z');
    if (!Number.isFinite(civil.getTime()) || civil.toISOString().slice(0, 10).replace(/-/g, '') !== date || civil.getUTCDay() !== 0) {
      throw new TypeError('A valid Sunday calendar date is required.');
    }
    const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//Grace and Praise Bangladeshi Church//Sunday Worship//EN',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE', 'TZID:America/Los_Angeles', 'BEGIN:DAYLIGHT',
      'DTSTART:20070311T020000', 'TZOFFSETFROM:-0800', 'TZOFFSETTO:-0700',
      'TZNAME:PDT', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
      'BEGIN:STANDARD', 'DTSTART:20071104T020000', 'TZOFFSETFROM:-0700', 'TZOFFSETTO:-0800',
      'TZNAME:PST', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD', 'END:VTIMEZONE',
      'BEGIN:VEVENT', 'DTSTART;TZID=America/Los_Angeles:' + date + 'T170000',
      'DTEND;TZID=America/Los_Angeles:' + date + 'T183000',
      'DTSTAMP:' + now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
      'RRULE:FREQ=WEEKLY;BYDAY=SU',
      'SUMMARY:' + escape('Sunday Worship Service – Grace and Praise Bangladeshi Church'),
      'DESCRIPTION:' + escape('Join us for worship, prayer, and Bible-based message. Everyone is welcome!'),
      'LOCATION:' + escape('1325 Richardson Street, San Bernardino, CA 92408'),
      'UID:sunday-worship@gracepraise.church',
      'STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR'
    ];
    const encoder = new TextEncoder();
    return lines.map(line => {
      let result = '', part = '';
      for (const character of line) {
        if (encoder.encode(part + character).length > 75) {
          result += part + '\r\n';
          part = ' ';
        }
        part += character;
      }
      return result + part;
    }).join('\r\n') + '\r\n';
  }

  window.GPBCVisitCalendar = { nextSundayDate, sundayCalendar };

  function initializeCalendarLinks() {
    const date = nextSundayDate();
    const googleParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Sunday Worship Service – Grace and Praise Bangladeshi Church',
      details: 'Join us for worship, prayer, and Bible-based message. Everyone is welcome!',
      location: '1325 Richardson Street, San Bernardino, CA 92408',
      dates: date + 'T170000/' + date + 'T183000',
      ctz: 'America/Los_Angeles',
      recur: 'RRULE:FREQ=WEEKLY;BYDAY=SU'
    });
    const googleLink = document.getElementById('addToGoogleCal');
    if (googleLink) googleLink.href = 'https://calendar.google.com/calendar/render?' + googleParams.toString();
    const icsUrl = URL.createObjectURL(new Blob([sundayCalendar(date)], { type: 'text/calendar;charset=utf-8' }));
    ['addToAppleCal', 'addToOutlookCal'].forEach(id => {
      const link = document.getElementById(id);
      if (link) link.href = icsUrl;
    });
  }
  onReady(() => {
    initializeHighlights();
    initializeCalendarLinks();
  });
})();
