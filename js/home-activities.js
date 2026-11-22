window.GPBC_HOME_ACTIVITIES = [
    // Annual theme: edit this entry for a new year. Optional showUntil is an inclusive Pacific date.
    {
        type: 'theme', slug: 'church-theme', year: 2026,
        title: { en: 'Rooted in Christ' },
        text: { en: 'Church Theme', bn: 'মণ্ডলীর থিম' },
        image: null, showUntil: null
    },
    {
        type: 'flyer', date: '2026-12-20', slug: 'pre-christmas-dec20', label: 'Pre-Christmas Celebration',
        start: '17:00', calendarTitle: 'Pre-Christmas Celebration',
        en: 'GPBC Pre-Christmas Celebration — Sunday 20 December 2026, 5 PM Pacific Time. Join us with your family.',
        bn: 'প্রাক-বড়দিনের উৎসব — রবিবার, ২০ ডিসেম্বর ২০২৬, বিকেল ৫টা (প্যাসিফিক সময়)। সপরিবারে যোগ দিন।'
    },
    {
        type: 'flyer', date: '2026-12-25', slug: 'christmas-day', label: 'Christmas Day',
        start: '10:00', calendarTitle: 'Christmas Day Worship',
        en: 'GPBC Christmas Day worship — Friday 25 December 2026, breakfast at 10 AM, worship at 11 AM, fellowship meal afterwards. All times Pacific. Join us with your family.',
        bn: 'বড়দিনের উপাসনা — শুক্রবার, ২৫ ডিসেম্বর ২০২৬; সকাল ১০টায় প্রাতরাশ, সকাল ১১টায় উপাসনা, পরে সহভাগিতার ভোজ (প্যাসিফিক সময়)। সপরিবারে যোগ দিন।'
    },
    {
        type: 'flyer', date: '2026-12-31', slug: 'gratitude-dec31', label: 'Year-end Gratitude',
        start: '19:00', calendarTitle: 'Year-end Gratitude Service',
        en: 'GPBC Year-end gratitude service — Thursday 31 December 2026, 7 PM Pacific Time. Join us with your family.',
        bn: 'বর্ষশেষের কৃতজ্ঞতা উপাসনা — বৃহস্পতিবার, ৩১ ডিসেম্বর ২০২৬, সন্ধ্যা ৭টা (প্যাসিফিক সময়)। সপরিবারে যোগ দিন।'
    },
    {
        type: 'flyer', date: '2027-01-01', slug: 'new-year-jan1', label: 'New Year Worship',
        start: '10:00', calendarTitle: 'New Year Worship',
        en: 'GPBC New Year worship — Friday 1 January 2027, breakfast at 10 AM, worship at 11 AM Pacific Time. All times Pacific. Join us with your family.',
        bn: 'নববর্ষের উপাসনা — শুক্রবার, ১ জানুয়ারি ২০২৭; সকাল ১০টায় প্রাতরাশ, সকাল ১১টায় উপাসনা (প্যাসিফিক সময়)। সপরিবারে যোগ দিন।'
    },
    {
        type: 'fast', slug: 'gratitude-fast-2027', date: '2027-01-01', endDate: '2027-01-27', allDay: true,
        title: { en: 'Gratitude Fast 2027', bn: 'কৃতজ্ঞতার উপবাস ২০২৭' },
        dates: { en: 'January 1 – 27, 2027', bn: '১–২৭ জানুয়ারি, ২০২৭' },
        railLabel: { en: 'Jan 1–27', bn: '১–২৭ জানু' },
        text: {
            en: 'A season of fasting only to thank God and bring Him joy for all He did in the past year — not to ask Him for anything.',
            bn: 'বিগত বছরে ঈশ্বর আমাদের জন্য যা কিছু করেছেন, তার জন্য কেবল তাঁকে ধন্যবাদ জানাতে ও সন্তুষ্ট করতে এই উপবাসপর্ব — তাঁর কাছে কিছু চাওয়ার জন্য নয়।'
        },
        calendarTitle: 'Gratitude Fast 2027'
    }
];

function homeActivityCalendar(config, address, visitUrl, now = new Date()) {
    const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!config || !validDate(config.date) || !config.slug ||
        (config.allDay ? !validDate(config.endDate) || config.endDate < config.date
            : !time.test(config.start))) {
        throw new TypeError('Activity calendar requires valid dates, a stable slug and an all-day range or start time.');
    }
    const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const timestamp = time => config.date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GPBC//Church Activities//EN',
        'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VTIMEZONE', 'TZID:America/Los_Angeles',
        'BEGIN:DAYLIGHT', 'DTSTART:20070311T020000', 'TZOFFSETFROM:-0800', 'TZOFFSETTO:-0700',
        'TZNAME:PDT', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
        'BEGIN:STANDARD', 'DTSTART:20071104T020000', 'TZOFFSETFROM:-0700', 'TZOFFSETTO:-0800',
        'TZNAME:PST', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD', 'END:VTIMEZONE',
        'BEGIN:VEVENT', 'UID:' + escape(config.slug + '-' + config.date + '@gracepraise.church'),
        'DTSTAMP:' + now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
        ...(config.allDay ? [
            'DTSTART;VALUE=DATE:' + config.date.replace(/-/g, ''),
            'DTEND;VALUE=DATE:' + new Date(Date.parse(config.endDate) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, '')
        ] : [
            'DTSTART;TZID=America/Los_Angeles:' + timestamp(config.start)
        ]),
        'SUMMARY:' + escape(config.calendarTitle || config.label),
        'DESCRIPTION:' + escape((config.en || config.text?.en || '') + '\nPlan Your Visit: ' + visitUrl),
        'LOCATION:' + escape(address), 'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'
    ];
    const encoder = new TextEncoder();
    return lines.map(line => {
        const folded = [];
        let part = '', length = 0;
        for (const character of line) {
            const bytes = encoder.encode(character).length;
            if (length + bytes > 75) {
                folded.push(part);
                part = ' ';
                length = 1;
            }
            part += character;
            length += bytes;
        }
        folded.push(part);
        return folded.join('\r\n');
    }).join('\r\n') + '\r\n';
}

function renderHomeTheme(config, active = false) {
    const escape = value => String(value).replace(/[&<>"']/g, character =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    const bilingual = values => ['en', 'bn'].map(language =>
        `<span data-lang="${language}" lang="${values[language] ? language : 'en'}"${language === 'bn' ? ' hidden' : ''}>${escape(values[language] || values.en)}</span>`).join('');
    const state = active ? ` activity-slide is-active" data-activity="${escape(config.slug)}" role="group" aria-roledescription="slide" aria-label="1 of 1: ${escape(config.title.en)}" aria-hidden="false` : '';
    return `<div class="activity-theme${state}" data-theme-config="${escape(JSON.stringify(config))}"><svg class="activity-root-motif" viewBox="0 0 240 240" aria-hidden="true" focusable="false"><path d="M120 14V148 M120 48L82 20 M120 70L158 32 M120 92L64 58 M120 112L182 70 M120 148L92 180L72 216 M120 148L148 180L168 216 M120 148V226 M92 180L58 184 M148 180L182 184 M92 180L96 218 M148 180L144 218 M82 20L82 42 M158 32L162 52 M64 58L66 82 M182 70L178 94"/></svg>${config.image ? `<img class="activity-theme-image" src="${escape(config.image)}" alt="">` : ''}<div class="activity-theme-copy"><p class="activity-theme-year">${escape(config.year)}</p><h2>${bilingual(config.title)}</h2><p class="activity-theme-subtitle">${bilingual({ en: config.year + ' ' + config.text.en, bn: new Intl.NumberFormat('bn', { useGrouping: false }).format(config.year) + ' ' + config.text.bn })}</p></div></div>`;
}

function renderHomeFast(config) {
    const escape = value => String(value).replace(/[&<>"']/g, character =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    const bilingual = values => ['en', 'bn'].map(language =>
        `<span data-lang="${language}" lang="${language}"${language === 'bn' ? ' hidden' : ''}>${escape(values[language])}</span>`).join('');
    return `<div class="activity-fast"><svg class="activity-fast-motif" viewBox="0 0 300 300" aria-hidden="true" focusable="false"><circle cx="150" cy="150" r="100"/><circle cx="150" cy="150" r="120"/><path d="M150 10V40 M150 260V290 M10 150H40 M260 150H290 M50 50L72 72 M228 228L250 250 M50 250L72 228 M228 72L250 50"/></svg><div class="activity-fast-copy" tabindex="0" data-activity-focus="text:${escape(config.slug)}"><h2>${bilingual(config.title)}</h2><p class="activity-fast-dates">${bilingual(config.dates)}</p><p class="activity-fast-message">${bilingual(config.text)}</p></div></div>`;
}

function renderHomeActivityShell(config) {
    if (!config || config.type !== 'theme') return '';
    return `<div class="activity-carousel" data-enhanced="false" data-playing="false" data-activity-focus="carousel" role="region" aria-roledescription="carousel" aria-label="Church life and upcoming gatherings" tabindex="0"><div class="activity-heading"><h2><span data-lang="en" lang="en">Life at GPBC</span><span data-lang="bn" lang="bn" hidden>আমাদের মণ্ডলীর জীবন</span></h2><span class="activity-counter" aria-hidden="true">01 / 01</span></div><div class="activity-stage" aria-live="polite" aria-atomic="false">${renderHomeTheme(config, true)}</div><div class="activity-footer"><div class="activity-controls"></div><div class="activity-tool-slot" aria-live="off"></div><a class="btn btn-primary activity-cta" data-activity-focus="cta" data-gpbc-feature-link="pages.planVisit" data-gpbc-surface="homepage-cta" href="plan-visit.html?lang=en"><span data-lang="en" lang="en">Join us with your family</span><span data-lang="bn" lang="bn" hidden>সপরিবারে যোগ দিন</span></a></div></div>`;
}
