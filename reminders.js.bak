// Reminder System - Shows events 2 months in advance

function getUpcomingReminders() {
    const today = new Date();
    const twoMonthsFromNow = new Date(today);
    twoMonthsFromNow.setMonth(today.getMonth() + 2);
    
    const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today && eventDate <= twoMonthsFromNow;
    }).map(event => {
        const eventDate = new Date(event.date);
        const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
        
        return {
            ...event,
            daysUntil: daysUntil,
            dateFormatted: eventDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long', 
                day: 'numeric' 
            })
        };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
    
    return upcomingEvents;
}

// Get reminders for a specific category
function getRemindersByCategory(category) {
    return getUpcomingReminders().filter(reminder => reminder.category === category);
}

// Get urgent reminders (within next 30 days)
function getUrgentReminders() {
    return getUpcomingReminders().filter(reminder => reminder.daysUntil <= 30);
}

// Enable browser notifications (requires user permission)
function enableBrowserNotifications() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                localStorage.setItem('notificationsEnabled', 'true');
                checkDailyReminders();
            }
        });
    }
}

// Check for events happening today or soon
function checkDailyReminders() {
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    if (!notificationsEnabled) return;

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Check for events today
    const todayEvents = events.filter(event => event.date === todayString);
    
    todayEvents.forEach(event => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`📅 Event Today: ${event.name}`, {
                body: event.description,
                icon: '📅'
            });
        }
    });
    
    // Check for events in 7 days
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const sevenDaysString = sevenDaysFromNow.toISOString().split('T')[0];
    
    const upcomingEvents = events.filter(event => event.date === sevenDaysString);
    
    upcomingEvents.forEach(event => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🔔 Reminder: ${event.name} in 7 days`, {
                body: event.description,
                icon: '🔔'
            });
        }
    });
}

// Export reminders to calendar format (iCal)
function exportRemindersToICS() {
    const reminders = getUpcomingReminders();
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Calendar 2026//EN\n';
    
    reminders.forEach(event => {
        const eventDate = new Date(event.date);
        const dateString = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        icsContent += 'BEGIN:VEVENT\n';
        icsContent += `DTSTART:${dateString}\n`;
        icsContent += `SUMMARY:${event.name}\n`;
        icsContent += `DESCRIPTION:${event.description}\n`;
        icsContent += `CATEGORIES:${event.category.toUpperCase()}\n`;
        
        // Add reminder 2 months before (60 days)
        icsContent += 'BEGIN:VALARM\n';
        icsContent += 'TRIGGER:-P60D\n';
        icsContent += 'ACTION:DISPLAY\n';
        icsContent += `DESCRIPTION:Reminder: ${event.name} in 2 months\n`;
        icsContent += 'END:VALARM\n';
        
        // Add reminder 1 week before
        icsContent += 'BEGIN:VALARM\n';
        icsContent += 'TRIGGER:-P7D\n';
        icsContent += 'ACTION:DISPLAY\n';
        icsContent += `DESCRIPTION:Reminder: ${event.name} in 1 week\n`;
        icsContent += 'END:VALARM\n';
        
        icsContent += 'END:VEVENT\n';
    });
    
    icsContent += 'END:VCALENDAR';
    
    // Download the file
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar-2026-reminders.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Get reminder statistics
function getReminderStats() {
    const reminders = getUpcomingReminders();
    
    return {
        total: reminders.length,
        bangladeshi: reminders.filter(r => r.category === 'bangladeshi').length,
        american: reminders.filter(r => r.category === 'american').length,
        christian: reminders.filter(r => r.category === 'christian').length,
        special: reminders.filter(r => r.category === 'special').length,
        urgent: getUrgentReminders().length
    };
}

// Save reminder preferences to local storage
function saveReminderPreferences(preferences) {
    localStorage.setItem('reminderPreferences', JSON.stringify(preferences));
}

// Load reminder preferences from local storage
function loadReminderPreferences() {
    const saved = localStorage.getItem('reminderPreferences');
    return saved ? JSON.parse(saved) : {
        bangladeshi: true,
        american: true,
        christian: true,
        special: true,
        notifyDays: [60, 30, 7, 1] // Days before event to notify
    };
}

// Format reminder message
function formatReminderMessage(event, daysUntil) {
    const emoji = categoryEmojis[event.category];
    let timeText;
    
    if (daysUntil === 0) {
        timeText = 'TODAY';
    } else if (daysUntil === 1) {
        timeText = 'TOMORROW';
    } else if (daysUntil <= 7) {
        timeText = `in ${daysUntil} days`;
    } else if (daysUntil <= 30) {
        const weeks = Math.floor(daysUntil / 7);
        timeText = `in ${weeks} week${weeks > 1 ? 's' : ''}`;
    } else {
        const months = Math.floor(daysUntil / 30);
        timeText = `in ${months} month${months > 1 ? 's' : ''}`;
    }
    
    return `${emoji} ${event.name} - ${timeText}`;
}

// Initialize reminder system when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load preferences
    const prefs = loadReminderPreferences();
    
    // Check for daily reminders
    checkDailyReminders();
    
    // Set up periodic checks (every hour)
    setInterval(checkDailyReminders, 3600000);
});
