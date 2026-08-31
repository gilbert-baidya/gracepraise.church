# GPBC Calendar - Project Structure

## 📁 Folder Organization

```
GPBC-Calendar/
├── index.html              # Home page
├── about.html              # About page with history, mission, testimonies
├── calendar.html           # Events calendar
├── give.html               # Donation page
├── songbook.html           # Song book page
├── test-connection.html    # Testing page
├── robots.txt              # Search engine crawling rules
├── sitemap.xml             # Site map for SEO
│
├── css/                    # All stylesheets
│   ├── modern.css          # Main design system
│   ├── mobile-menu.css     # Mobile navigation styles
│   ├── countdown.css       # Countdown timer styles
│   ├── calendar.css        # Calendar page styles
│   └── songbook.css        # Songbook styles
│
├── js/                     # All JavaScript files
│   ├── modern.js           # Main interactions
│   ├── mobile-menu.js      # Mobile menu functionality
│   ├── countdown.js        # Countdown timer system
│   ├── calendar.js         # Calendar functionality
│   └── songbook.js         # Songbook functionality
│
├── images/                 # Images and graphics
│   └── (place images here)
│
├── assets/                 # Other assets
│   └── icons/              # Icon files
│
└── docs/                   # Documentation
    ├── README.md           # Main project documentation
    ├── GOOGLE_SHEETS_SETUP.md
    ├── PRAYER_REQUESTS_SETUP.md
    ├── SONGBOOK_SETUP_GUIDE.md
    ├── STRIPE_SETUP_GUIDE.md
    ├── EMAIL_SETUP_INSTRUCTIONS.md
    └── *.zip               # Archive files
```

## 🎯 Key Features

- **Responsive Design**: Mobile-first approach with desktop optimization
- **SEO Optimized**: Meta tags, structured data, sitemap
- **Dynamic Countdown**: Shows next upcoming service
- **Calendar Integration**: Google Sheets backend
- **Prayer Requests**: Submit and manage prayer requests
- **Song Book**: Browse worship songs with chords
- **Donation System**: Stripe integration for giving

## 🚀 Deployment

Hosted on GitHub Pages:
- **URL**: https://gracepraise.church/
- **Auto-deploy**: Pushes to `main` branch automatically deploy

## 📝 Development

All CSS and JS files are organized in their respective folders for better maintainability.
HTML files reference assets using relative paths (e.g., `css/modern.css`, `js/mobile-menu.js`).

## 🔧 Setup

1. Clone the repository
2. Open `index.html` in a browser
3. For backend features, follow setup guides in `docs/` folder

## 📞 Contact

Grace and Praise Bangladeshi Church
📍 1325 Richardson Street, CA 92408
📧 gracepraisebangladeshichurch@gmail.com
