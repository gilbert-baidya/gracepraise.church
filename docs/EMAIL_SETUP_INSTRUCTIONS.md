# Email Notification Setup Instructions

## Current Status

✅ **Donation Modal**: Working - Click the "💝 Donate" button to see Zelle and PayPal options  
⚠️ **Email Notifications**: Not configured yet - Events are added successfully but no emails are sent

The calendar works perfectly without email setup. Email notifications are **optional** and won't affect any other features.

---

## Why No Emails Are Sent Yet

You need to configure EmailJS (a free email service) to enable automatic notifications. Without this setup:
- ✅ Events are still added normally
- ✅ All features work perfectly
- ❌ No email notifications sent

---

## Quick Setup (10 minutes)

### Step 1: Create EmailJS Account

1. Go to https://www.emailjs.com/
2. Click "Sign Up" and create a free account
3. Verify your email address

### Step 2: Connect Your Gmail

1. In EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Select "Gmail"
4. Connect: **gracepraisebangladeshichurch@gmail.com**
5. Note your **Service ID** (looks like: `service_abc123`)

### Step 3: Create Email Template

1. Go to "Email Templates"
2. Click "Create New Template"
3. Copy this template:

**Subject:**
```
New Event Added to GPBC Calendar 2026
```

**Content:**
```html
Hello,

A new event has been added to the Grace and Praise Bangladeshi Church Calendar:

━━━━━━━━━━━━━━━━━━━━━━━
Event: {{event_name}}
Date: {{event_date}}
Description: {{event_description}}
━━━━━━━━━━━━━━━━━━━━━━━

Added by: {{added_by}}
Contact: {{contact_info}}
Added on: {{timestamp}}

View the full calendar at: https://gracepraise.church/

God Bless,
GPBC Calendar System
```

**Settings:**
- To Email: `{{to_email}}`
- Reply To: `gracepraisebangladeshichurch@gmail.com`

4. Click "Save"
5. Note your **Template ID** (looks like: `template_abc123`)

### Step 4: Get Your Public Key

1. Click "Account" in the dashboard
2. Find your **Public Key** (looks like: `user_abc123xyz`)
3. Copy it

### Step 5: Update Your Code

Open `/Users/gbaidya/Documents/Project cool/Calendar 2026/calendar.js`

Find lines 10-12 and replace:
```javascript
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
```

With your actual values:
```javascript
const EMAILJS_PUBLIC_KEY = 'user_abc123xyz';  // Your Public Key
const EMAILJS_SERVICE_ID = 'service_abc123';   // Your Service ID
const EMAILJS_TEMPLATE_ID = 'template_abc123'; // Your Template ID
```

### Step 6: Add CC to Gilbert

In EmailJS template, add **gilbert.baidya@gmail.com** to CC field in settings.

### Step 7: Test It!

1. Save the file
2. Refresh your calendar in browser (Ctrl+Shift+R / Cmd+Shift+R)
3. Add a test event
4. Check your email in 1-2 minutes!

---

## Troubleshooting

**Donate button not working?**
- Hard refresh the page: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check browser console (F12) for errors
- Make sure you're viewing the latest version

**No emails received?**
- Check the browser console (F12) for errors
- Verify all 3 IDs are correct in calendar.js
- Check EmailJS dashboard for error logs
- Look in spam folder
- Verify Gmail is connected in EmailJS

**Still having issues?**
- Open browser console (F12) and check for errors
- Make sure QRCode library is loaded
- Clear browser cache and reload

---

## What You Get

### Email Notifications Include:
- ✅ Event name, date, and description
- ✅ Who added it and when
- ✅ Sent to: gracepraisebangladeshichurch@gmail.com
- ✅ CC to: gilbert.baidya@gmail.com

### Donation Features:
- ✅ Beautiful modal with Bible verse (2 Corinthians 9:7)
- ✅ Zelle QR code
- ✅ PayPal QR code
- ✅ Direct links to payment platforms
- ✅ Mobile responsive

---

## Free Tier Limits

- 200 emails/month (plenty for calendar notifications)
- No credit card required
- Perfect for church use

---

## Need Help?

- EmailJS Docs: https://www.emailjs.com/docs/
- EmailJS Support: https://www.emailjs.com/support/

---

**Remember**: The calendar works perfectly right now! Email setup is optional and just adds automatic notifications.

