# Dark Mode Testing Checklist

**Date:** 2026-01-31  
**Purpose:** Manual testing checklist for dark mode audit and contrast verification

---

## ✅ COMPLETED FIXES

### 1. Dark Mode Toggle Icons
- [x] Sun icon visible in dark mode
- [x] Moon icon visible in light mode
- [x] Toggle button clickable and functional
- [x] Icons animate smoothly on transition

### 2. Mobile Horizontal Overflow
- [x] No horizontal scrollbar on mobile (375px width)
- [x] Mesh gradient animations contained
- [x] Carousel elements don't overflow
- [x] Page content stays within viewport

### 3. Logo Visibility
- [x] Logo visible in light mode
- [x] Logo visible in dark mode (inverted/brightened)
- [x] Logo maintains quality and clarity
- [x] Hover effects work in both modes

---

## 🔍 MANUAL TESTING REQUIRED

### Header & Navigation
- [ ] **Site logo** - Clear and visible in both modes
- [ ] **Navigation links** - Readable text color
- [ ] **Navigation hover states** - Visible feedback
- [ ] **Mobile menu button** - Visible and functional
- [ ] **Dropdown menus** - Proper background and text contrast
- [ ] **Countdown banner** - Text readable against background

### Hero Section
- [ ] **Main heading** - High contrast, easily readable
- [ ] **Subheading/description** - Sufficient contrast
- [ ] **Call-to-action buttons** - Visible borders and text
- [ ] **Button hover states** - Clear visual feedback
- [ ] **Background video overlay** - Doesn't obscure text
- [ ] **Mesh gradient effects** - Don't interfere with readability

### Content Sections

#### Daily Devotion Section
- [ ] **Section heading** - Clear and prominent
- [ ] **Card backgrounds** - Distinct from page background
- [ ] **Card text** - Readable body text
- [ ] **Card titles** - High contrast
- [ ] **Card borders** - Visible separation
- [ ] **Read more links** - Visible and distinguishable

#### Events/What's Happening
- [ ] **Event cards** - Proper background contrast
- [ ] **Event titles** - Readable
- [ ] **Event dates/times** - Visible metadata
- [ ] **Event descriptions** - Sufficient text contrast
- [ ] **Event images** - Proper borders/separation

#### Service Times
- [ ] **Service time cards** - Background contrast
- [ ] **Time text** - Large and readable
- [ ] **Service descriptions** - Adequate contrast
- [ ] **Location information** - Visible

#### Testimonials/Quotes
- [ ] **Quote text** - Readable against background
- [ ] **Attribution text** - Visible but distinct
- [ ] **Quote marks/decorations** - Appropriate contrast

### Forms & Interactive Elements

#### Contact/Prayer Request Forms
- [ ] **Input fields** - Visible borders
- [ ] **Input field backgrounds** - Distinct from page
- [ ] **Placeholder text** - Readable but subtle
- [ ] **Input text** - High contrast
- [ ] **Labels** - Clear and readable
- [ ] **Required field indicators** - Visible
- [ ] **Submit buttons** - Clear and prominent
- [ ] **Error messages** - High visibility (if applicable)
- [ ] **Success messages** - Clearly visible

#### Search Functionality
- [ ] **Search input** - Visible border and background
- [ ] **Search icon/button** - Clearly visible
- [ ] **Search results** - Proper contrast

### Footer
- [ ] **Footer background** - Distinct from main content
- [ ] **Footer text** - Readable
- [ ] **Footer links** - Visible and distinguishable
- [ ] **Footer link hover states** - Clear feedback
- [ ] **Social media icons** - Visible
- [ ] **Copyright text** - Readable
- [ ] **Contact information** - Clear

### Special Elements

#### Modals/Popups
- [ ] **Modal background overlay** - Visible but not too dark
- [ ] **Modal content background** - High contrast
- [ ] **Modal text** - Readable
- [ ] **Close button** - Clearly visible
- [ ] **Modal buttons** - Proper contrast

#### Tooltips
- [ ] **Tooltip background** - Distinct
- [ ] **Tooltip text** - Readable
- [ ] **Tooltip arrows** - Visible

#### Alerts/Notifications
- [ ] **Alert backgrounds** - Appropriate contrast
- [ ] **Alert text** - High visibility
- [ ] **Alert icons** - Clear

---

## 🎨 CONTRAST TESTING GUIDELINES

### Minimum Contrast Ratios (WCAG AA)
- **Normal text:** 4.5:1
- **Large text (18pt+):** 3:1
- **UI components:** 3:1

### Testing Tools
1. **Browser DevTools** - Inspect element colors
2. **WebAIM Contrast Checker** - https://webaim.org/resources/contrastchecker/
3. **Browser Extensions** - WAVE, axe DevTools

### Common Issues to Look For
- Dark text on dark backgrounds
- Light text on light backgrounds
- Low contrast borders
- Invisible focus indicators
- Unreadable placeholder text
- Poor button visibility

---

## 📋 TESTING PROCEDURE

1. **Open index.html in browser**
2. **Start in light mode** - Verify baseline appearance
3. **Toggle to dark mode** - Click the dark mode toggle
4. **Scroll through entire page** - Check each section systematically
5. **Test interactions** - Hover, click, focus on interactive elements
6. **Test on mobile** - Resize browser to 375px width
7. **Document issues** - Note specific elements with problems

---

## 🐛 ISSUE REPORTING FORMAT

When you find a contrast issue, note:

```
Section: [e.g., Daily Devotion]
Element: [e.g., Card title]
Issue: [e.g., Dark gray text on dark blue background - hard to read]
Current Colors: [e.g., text: #334155, background: #1e293b]
Suggested Fix: [e.g., Change text to #e2e8f0]
```

---

## ✨ NEXT STEPS AFTER TESTING

1. **Compile list of issues** found during testing
2. **Prioritize by severity** (critical, high, medium, low)
3. **Apply CSS fixes** to redesign-styles.css
4. **Re-test** to verify fixes
5. **Document changes** in this checklist

---

## 📞 NEED HELP?

If you find issues and need CSS fixes, provide:
- Element class or ID
- Current appearance description
- Desired appearance

Example fix pattern:
```css
body.dark .element-class,
[data-theme="dark"] .element-class {
    color: #e2e8f0;
    background: rgba(15, 23, 42, 0.8);
    border-color: rgba(148, 163, 184, 0.3);
}
```

---

**Testing Status:** 🟡 In Progress  
**Last Updated:** 2026-01-31
