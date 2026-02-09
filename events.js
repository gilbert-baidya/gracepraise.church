// Comprehensive Events Database for 2026-2036 (10 years)
const events = [
    // GPBC RECURRING WEEKLY EVENTS (Generated for next 10 years from Jan 2026)
    // ✨ Friday 5:30 PM - Friday Connection (Prayer)
    ...Array.from({length: 520}, (_, i) => { // 52 weeks * 10 years
        const date = new Date(2026, 0, 2 + (i * 7)); // Start Jan 2, 2026 (Friday)
        return {
            date: date.toISOString().split('T')[0],
            name: '✨ Friday Connection (Prayer)',
            serviceKey: 'friday-connection',
            category: 'gpbc',
            eventCategory: 'GPBC',
            eventType: 'prayer',
            eventDay: 'Friday',
            eventTime: '5:30 PM',
            description: 'Friday evening prayer and worship connection'
        };
    }),
    // 🙌 Saturday 12:00 PM - Fasting Prayer
    ...Array.from({length: 520}, (_, i) => { // 52 weeks * 10 years
        const date = new Date(2026, 0, 3 + (i * 7)); // Start Jan 3, 2026 (Saturday)
        return {
            date: date.toISOString().split('T')[0],
            name: '🙌 Fasting Prayer',
            serviceKey: 'fasting-prayer',
            category: 'gpbc',
            eventCategory: 'GPBC',
            eventType: 'prayer',
            eventDay: 'Saturday',
            eventTime: '12:00 PM',
            description: 'Saturday fasting and prayer meeting'
        };
    }),
    // 🙏 Sunday 4:30 PM - Sunday Connection
    ...Array.from({length: 520}, (_, i) => { // 52 weeks * 10 years
        const date = new Date(2026, 0, 4 + (i * 7)); // Start Jan 4, 2026 (Sunday)
        return {
            date: date.toISOString().split('T')[0],
            name: '🙏 Sunday Connection',
            serviceKey: 'sunday-connection',
            category: 'gpbc',
            eventCategory: 'GPBC',
            eventType: 'worship',
            eventDay: 'Sunday',
            eventTime: '4:30 PM',
            description: 'Sunday Connection - fellowship and spiritual connection time'
        };
    }),
    // Sunday 5:00 PM - Worship Service
    ...Array.from({length: 520}, (_, i) => { // 52 weeks * 10 years
        const date = new Date(2026, 0, 4 + (i * 7)); // Start Jan 4, 2026 (Sunday)
        return {
            date: date.toISOString().split('T')[0],
            name: 'Worship Service',
            serviceKey: 'sunday-service',
            category: 'gpbc',
            eventCategory: 'GPBC',
            eventType: 'worship',
            eventDay: 'Sunday',
            eventTime: '5:00 PM',
            description: 'Sunday regular worship service at Grace and Praise Bangladeshi Church'
        };
    }),
    
    // HOLY COMMUNION SERVICE - First Sunday of every month (10 years: 2026-2036)
    ...Array.from({length: 120}, (_, i) => { // 12 months * 10 years
        const year = 2026 + Math.floor(i / 12);
        const month = i % 12;
        
        // Find the first Sunday of the month
        const firstDay = new Date(year, month, 1);
        const dayOfWeek = firstDay.getDay();
        const firstSunday = dayOfWeek === 0 ? 1 : (7 - dayOfWeek) + 1;
        
        const date = new Date(year, month, firstSunday);
        
        return {
            date: date.toISOString().split('T')[0],
            name: 'Holy Communion Service',
            category: 'gpbc',
            eventCategory: 'GPBC',
            eventType: 'worship',
            eventDay: 'Sunday',
            eventTime: '5:00 PM',
            description: 'Special monthly communion service - partaking in the Lord\'s Supper together as we remember Christ\'s sacrifice'
        };
    }),
    
    // BANGLADESHI NATIONAL EVENTS
    { date: '2026-02-21', name: 'International Mother Language Day', category: 'bangladeshi', description: 'UNESCO declared day celebrating martyrs who fought for Bengali language rights' },
    { date: '2026-03-17', name: 'Birthday of Bangabandhu Sheikh Mujibur Rahman', category: 'bangladeshi', description: 'National Children\'s Day - Birth anniversary of Father of the Nation' },
    { date: '2026-03-26', name: 'Independence Day', category: 'bangladeshi', description: 'Celebrating Bangladesh\'s declaration of independence in 1971' },
    { date: '2026-04-14', name: 'Pohela Boishakh', category: 'bangladeshi', description: 'Bengali New Year - First day of Bengali calendar year 1433' },
    { date: '2026-05-01', name: 'May Day', category: 'bangladeshi', description: 'International Workers\' Day' },
    { date: '2026-08-15', name: 'National Mourning Day', category: 'bangladeshi', description: 'Remembering martyrdom of Bangabandhu Sheikh Mujibur Rahman' },
    { date: '2026-12-16', name: 'Victory Day', category: 'bangladeshi', description: 'Celebrating victory in the Liberation War of 1971' },

    // AMERICAN EVENTS
    { date: '2026-01-01', name: 'New Year\'s Day', category: 'american', description: 'First day of the year celebration' },
    { date: '2026-01-19', name: 'Martin Luther King Jr. Day', category: 'american', description: 'Honoring civil rights leader Dr. Martin Luther King Jr.' },
    { date: '2026-02-16', name: 'Presidents\' Day', category: 'american', description: 'Honoring all U.S. presidents, especially Washington and Lincoln' },
    { date: '2026-05-25', name: 'Memorial Day', category: 'american', description: 'Honoring military personnel who died in service' },
    { date: '2026-07-04', name: 'Independence Day', category: 'american', description: 'Celebrating U.S. Declaration of Independence (1776)' },
    { date: '2026-09-07', name: 'Labor Day', category: 'american', description: 'Celebrating American workers and labor movement' },
    { date: '2026-10-12', name: 'Columbus Day', category: 'american', description: 'Commemorating Christopher Columbus\'s arrival in the Americas' },
    { date: '2026-11-11', name: 'Veterans Day', category: 'american', description: 'Honoring military veterans' },
    { date: '2026-11-26', name: 'Thanksgiving Day', category: 'american', description: 'Traditional harvest festival and day of gratitude' },

    // CHRISTIAN EVENTS
    { date: '2026-01-06', name: 'Epiphany', category: 'christian', description: 'Celebrating the visit of the Magi to baby Jesus' },
    { date: '2026-02-17', name: 'Ash Wednesday', category: 'christian', description: 'Beginning of Lent - 40 days before Easter' },
    { date: '2026-03-29', name: 'Palm Sunday', category: 'christian', description: 'Commemorating Jesus\'s entry into Jerusalem' },
    { date: '2026-04-02', name: 'Maundy Thursday', category: 'christian', description: 'Commemorating the Last Supper' },
    { date: '2026-04-02', name: 'Holy Thursday Feet Washing Service', category: 'gpbc', eventCategory: 'GPBC', eventType: 'worship', eventDay: 'Thursday', eventTime: '7:00 PM', description: 'Special service commemorating Jesus washing the disciples\' feet - a beautiful act of humility and servant leadership' },
    { date: '2026-04-03', name: 'Good Friday Service', category: 'gpbc', eventCategory: 'GPBC', eventType: 'worship', eventDay: 'Friday', eventTime: '7:00 PM', description: 'Special service commemorating the crucifixion of Jesus Christ - a solemn gathering with scripture readings, worship, and reflection' },
    { date: '2026-04-03', name: 'Good Friday', category: 'christian', description: 'Commemorating the crucifixion of Jesus Christ' },
    { date: '2026-04-05', name: 'Easter Sunday Service', category: 'gpbc', eventCategory: 'GPBC', eventType: 'worship', eventDay: 'Sunday', eventTime: '10:00 AM', description: 'Special Easter celebration service with uplifting worship, powerful resurrection message, communion, and fellowship breakfast' },
    { date: '2026-04-05', name: 'Easter Sunday', category: 'christian', description: 'Celebrating the resurrection of Jesus Christ' },
    { date: '2026-04-06', name: 'Easter Monday', category: 'christian', description: 'Day after Easter Sunday' },
    { date: '2026-05-14', name: 'Ascension Day', category: 'christian', description: 'Commemorating Jesus\'s ascension to heaven' },
    { date: '2026-05-24', name: 'Pentecost Sunday Service', category: 'gpbc', eventCategory: 'GPBC', eventType: 'worship', eventDay: 'Sunday', eventTime: '5:00 PM', description: 'Special service celebrating the birth of the Church and the outpouring of the Holy Spirit with dynamic worship and teaching' },
    { date: '2026-05-24', name: 'Pentecost', category: 'christian', description: 'Celebrating the descent of the Holy Spirit' },
    { date: '2026-11-29', name: 'First Sunday of Advent', category: 'christian', description: 'Beginning of the Christian liturgical year' },
    { date: '2026-12-13', name: 'Pre-Christmas Celebration Service', category: 'gpbc', eventCategory: 'GPBC', eventType: 'worship', eventDay: 'Sunday', eventTime: '5:00 PM', description: 'Special pre-Christmas service with traditional carols, nativity story, candlelight worship, and fellowship dinner' },
    { date: '2026-12-24', name: 'Christmas Eve Candlelight Service', category: 'gpbc', eventCategory: 'GPBC', eventType: 'worship', eventDay: 'Thursday', eventTime: '7:00 PM', description: 'Special Christmas Eve service celebrating the birth of Jesus with beautiful candlelight worship, Christmas music, and the Christmas story' },
    { date: '2026-12-24', name: 'Christmas Eve', category: 'christian', description: 'Evening before Christmas Day' },
    { date: '2026-12-25', name: 'Christmas Day', category: 'christian', description: 'Celebrating the birth of Jesus Christ' },
    { date: '2026-12-26', name: 'Boxing Day', category: 'christian', description: 'Traditional day of giving to the less fortunate' },
    { date: '2026-12-31', name: 'Gratitude & New Year Celebration', category: 'gpbc', eventCategory: 'GPBC', eventType: 'worship', eventDay: 'Thursday', eventTime: '10:30 PM', description: 'Special year-end service with worship music, testimonies of gratitude, prayer for the new year, and fellowship as we welcome 2027 together' },

    // SPECIAL DAYS
    { date: '2026-02-14', name: 'Valentine\'s Day', category: 'special', description: 'Day of love and romance' },
    { date: '2026-03-08', name: 'International Women\'s Day', category: 'special', description: 'Celebrating women\'s achievements and advocating for equality' },
    { date: '2026-04-22', name: 'Earth Day', category: 'special', description: 'Promoting environmental protection and awareness' },
    { date: '2026-05-10', name: 'Mother\'s Day', category: 'special', description: 'Honoring mothers and motherhood' },
    { date: '2026-06-21', name: 'Father\'s Day', category: 'special', description: 'Honoring fathers and fatherhood' },
    { date: '2026-12-31', name: 'New Year\'s Eve', category: 'special', description: 'Celebration on the last day of the year' },
];

// Category colors for visual distinction
const categoryColors = {
    bangladeshi: '#006A4E', // Bangladesh green
    american: '#B22234', // USA red
    christian: '#663399', // Purple
    special: '#FF1493', // Deep pink
    gpbc: '#FF8C00' // GPBC orange
};

// Category emojis
const categoryEmojis = {
    bangladeshi: '🇧🇩',
    american: '🇺🇸',
    christian: '✝️',
    special: '❤️',
    gpbc: '⛪'
};

// Events database version - increment when structure changes
const EVENTS_VERSION = '3.1';

// Load custom GPBC events from localStorage
function loadCustomEvents() {
    // Check version and clear old data if outdated
    const savedVersion = localStorage.getItem('gpbcEventsVersion');
    if (savedVersion !== EVENTS_VERSION) {
        // console.log('Events database updated - clearing old localStorage data'); // Removed for production
        localStorage.removeItem('gpbcEvents');
        localStorage.setItem('gpbcEventsVersion', EVENTS_VERSION);
        return;
    }
    
    const saved = localStorage.getItem('gpbcEvents');
    if (saved) {
        const customEvents = JSON.parse(saved);
        customEvents.forEach(event => {
            if (!events.find(e => e.date === event.date && e.name === event.name)) {
                events.push(event);
            }
        });
    }
}

// Save custom GPBC events to localStorage
function saveCustomEvents() {
    const gpbcEvents = events.filter(e => e.category === 'gpbc');
    localStorage.setItem('gpbcEvents', JSON.stringify(gpbcEvents));
}

// Load custom events on initialization
loadCustomEvents();
