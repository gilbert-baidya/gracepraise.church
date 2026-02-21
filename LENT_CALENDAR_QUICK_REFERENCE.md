# Lent Calendar Calculator - Quick Reference

## 🚀 Quick Start

### Include in HTML
```html
<script src="js/lent-calendar-calculator.js"></script>
```

### Basic Usage
```javascript
// Get Easter date
const easter = window.LentCalendar.getEasterDate(2026);
// Returns: Date object for April 5, 2026

// Get Ash Wednesday
const ashWed = window.LentCalendar.getAshWednesday(2026);
// Returns: Date object for February 18, 2026

// Check if today is in Lent
const lentDay = window.LentCalendar.getLentDevotionDay(new Date());
// Returns: 1-40 (day number) or 0 (not in Lent)

// Get complete info
const info = window.LentCalendar.getLentInfo();
// Returns: { year, ashWednesday, easter, currentDay, isLentPeriod, window }
```

---

## 📅 2026 Lent Dates

- **Ash Wednesday**: February 18, 2026
- **Easter Sunday**: April 5, 2026
- **Lent Duration**: 40 days

---

## 🔧 API Reference

### `getEasterDate(year)`
Returns Easter Sunday date for given year.

**Parameters:**
- `year` (number): Year between 1583-4099

**Returns:** Date object

**Example:**
```javascript
const easter2027 = window.LentCalendar.getEasterDate(2027);
console.log(easter2027); // Sun Mar 28 2027
```

---

### `getAshWednesday(year)`
Returns Ash Wednesday date for given year.

**Parameters:**
- `year` (number): Year between 1583-4099

**Returns:** Date object

**Example:**
```javascript
const ashWed2027 = window.LentCalendar.getAshWednesday(2027);
console.log(ashWed2027); // Wed Feb 10 2027
```

---

### `getLentDevotionDay(date)`
Returns which day of Lent (1-40) the given date falls on.

**Parameters:**
- `date` (Date): Date to check

**Returns:** Number (1-40 if in Lent, 0 if not)

**Example:**
```javascript
const today = new Date();
const day = window.LentCalendar.getLentDevotionDay(today);
if (day > 0) {
    console.log(`Today is Day ${day} of Lent`);
}
```

---

### `getLentDevotionWindow(year)`
Generates complete 40-day Lent devotion schedule.

**Parameters:**
- `year` (number): Year to generate schedule for

**Returns:** Array of 40 objects with `{ day, date, dateString }`

**Example:**
```javascript
const window = window.LentCalendar.getLentDevotionWindow(2026);
console.log(window[0]);
// { day: 1, date: Date(2026-02-18), dateString: "2026-02-18" }
```

---

### `getLentInfo(year)`
Returns comprehensive Lent information.

**Parameters:**
- `year` (number, optional): Year to get info for (defaults to current)

**Returns:** Object with:
- `year` (number)
- `ashWednesday` (Date)
- `easter` (Date)
- `currentDay` (number)
- `isLentPeriod` (boolean)
- `window` (Array)

**Example:**
```javascript
const info = window.LentCalendar.getLentInfo(2026);
console.log(info.isLentPeriod); // true if today is in Lent
```

---

### `formatDate(date)`
Formats date as human-readable string.

**Parameters:**
- `date` (Date): Date to format

**Returns:** String (e.g., "Wednesday, February 18, 2026")

**Example:**
```javascript
const ashWed = window.LentCalendar.getAshWednesday(2026);
const formatted = window.LentCalendar.formatDate(ashWed);
console.log(formatted);
// "Wednesday, February 18, 2026"
```

---

## 📊 Integration Examples

### Automatic Lent Day Detection
```javascript
const lentInfo = window.LentCalendar.getLentInfo();

if (lentInfo.isLentPeriod) {
    console.log(`🕊️ Today is Day ${lentInfo.currentDay} of Lent`);
    loadDevotion(lentInfo.currentDay);
} else {
    console.log('Not currently in Lent period');
    loadDevotion(1); // Default to Day 1
}
```

### URL Override with Fallback
```javascript
const urlParams = new URLSearchParams(window.location.search);
const dayParam = urlParams.get('day');
const lentInfo = window.LentCalendar.getLentInfo();

let currentDay;
if (dayParam) {
    currentDay = parseInt(dayParam, 10);
} else if (lentInfo.isLentPeriod) {
    currentDay = lentInfo.currentDay;
} else {
    currentDay = 1;
}

loadDevotion(currentDay);
```

### Display Lent Schedule
```javascript
const info = window.LentCalendar.getLentInfo();
document.getElementById('ashWednesday').textContent = 
    window.LentCalendar.formatDate(info.ashWednesday);
document.getElementById('easter').textContent = 
    window.LentCalendar.formatDate(info.easter);
```

---

## 🧪 Testing

Run test suite: `http://localhost:8000/test-lent-calendar.html`

Console output:
```
[Lent Calendar] ✅ Initialized
[Lent Calendar] 2026 Ash Wednesday: Wednesday, February 18, 2026
[Lent Calendar] 2026 Easter Sunday: Sunday, April 5, 2026
[Lent Calendar] 🕊️ Currently Day 1 of Lent
```

---

## ✅ Validation

### Known Easter Dates (2024-2030)
```javascript
2024: March 31, 2024    ✅ Validated
2025: April 20, 2025    ✅ Validated
2026: April 5, 2026     ✅ Validated
2027: March 28, 2027    ✅ Validated
2028: April 16, 2028    ✅ Validated
2029: April 1, 2029     ✅ Validated
2030: April 21, 2030    ✅ Validated
```

---

## 🔒 Error Handling

```javascript
try {
    const easter = window.LentCalendar.getEasterDate(1500); // Invalid year
} catch (error) {
    console.error(error.message);
    // "Invalid year: 1500. Must be an integer between 1583 and 4099."
}
```

---

## 📁 File Structure

```
/js/lent-calendar-calculator.js    # Core module (289 lines)
/lent-fasting.html                 # Integrated page
/test-lent-calendar.html           # Test suite
/LENT_CALENDAR_IMPLEMENTATION.md   # Full documentation
/LENT_CALENDAR_QUICK_REFERENCE.md  # This file
```

---

## 🎯 Key Features

- ✅ Zero configuration required
- ✅ Accurate Easter calculation (1583-4099)
- ✅ Automatic Lent day detection
- ✅ No external dependencies
- ✅ Works offline
- ✅ Browser console diagnostics

---

## 📞 Support

- **Test Page**: Open `test-lent-calendar.html` in browser
- **Console**: Check browser DevTools for diagnostic output
- **Documentation**: See `LENT_CALENDAR_IMPLEMENTATION.md`

---

*Last Updated: February 16, 2026*  
*Version: 1.0.0*
