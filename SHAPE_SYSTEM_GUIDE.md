# 🎨 SPIRITUAL SHAPE DESIGN SYSTEM
## Grace and Praise Bangladeshi Church

---

## 📖 Core Philosophy

**"ONE SHAPE = ONE PURPOSE"**

Every geometric shape in our design system carries deep spiritual meaning and serves a specific functional purpose. This isn't decoration—it's theology expressed through form.

---

## 🎯 Design Principles

### Global Rules
1. ✅ **No Random Shapes** - Every shape has intentional meaning
2. ✅ **Page Hierarchy** - Each page uses 1 dominant + 1 supporting + 1 neutral shape
3. ✅ **Worship Motion** - All animations are slow, gentle, reverent (never flashy)
4. ✅ **Scripture First** - Design frames content, never overpowers it
5. ✅ **Accessibility** - ADA-compliant with reduced motion support
6. ✅ **Consistency** - Typography, colors, spacing remain uniform across shapes

---

## 🔷 THE FIVE SACRED SHAPES

### 1. ⚪ CIRCLE — Community & God's Eternity

**Spiritual Meaning:**
- Unity and fellowship
- God's eternal, never-ending love
- The circle of community in Christ
- Wholeness and completeness

**Usage:**
- Homepage hero carousel
- Sunday service highlights
- Testimonies section
- Worship moments

**Design Characteristics:**
- Border-radius: 50% (perfect circle)
- Gradient: Blue spectrum (#3b82f6 to #6366f1)
- Motion: Gentle fade, slow parallax, subtle glow
- Shadow: Soft, diffused (0 20px 60px rgba)

**Emotional Impact:**
- Warm and welcoming
- Safe and inclusive
- Peaceful and eternal

**CSS Classes:**
```css
.shape-circle-container
.shape-circle
.shape-circle-content
.circle-carousel
.circle-carousel-item
.circle-nav-dots
```

**Code Example:**
```html
<div class="shape-circle-container">
    <div class="circle-carousel">
        <div class="circle-carousel-item active">
            <div class="shape-circle">
                <div class="shape-circle-content">
                    <h2>Join Us in Worship</h2>
                    <p class="shape-scripture">"Taste and see that the Lord is good..." - Psalm 34:8</p>
                </div>
            </div>
        </div>
    </div>
    <div class="circle-nav-dots">
        <button class="circle-dot active"></button>
    </div>
</div>
```

---

### 2. ▭ RECTANGLE — Teaching & Stability

**Spiritual Meaning:**
- Foundation of Scripture
- Stability and truth
- The solid rock of God's Word
- Order and structure in doctrine

**Usage:**
- Sermon displays
- Bible study cards
- Event schedules
- Navigation bar & footer

**Design Characteristics:**
- Clean right angles
- Neutral colors (grays, white backgrounds)
- Subtle left border accent (4px solid)
- Minimal motion (gentle hover lift only)

**Emotional Impact:**
- Trustworthy and reliable
- Clear and organized
- Calm and focused

**CSS Classes:**
```css
.shape-rectangle-container
.shape-rectangle
.rectangle-grid
.rectangle-header
```

**Code Example:**
```html
<section class="shape-rectangle-container">
    <div class="rectangle-header">
        <h2>Grounded in God's Word</h2>
    </div>
    <div class="rectangle-grid">
        <div class="shape-rectangle">
            <h3>Sunday Sermon</h3>
            <p>Living by Faith, Not by Sight</p>
        </div>
    </div>
</section>
```

---

### 3. 🔶 TRAPEZOID — Growth & Movement

**Spiritual Meaning:**
- Spiritual journey upward
- Growth and transformation
- The upward call of God
- Youth energy and momentum

**Usage:**
- Youth ministry sliders
- Outreach stories
- Mission trip highlights
- Progress-focused content

**Design Characteristics:**
- Subtle angled edges (clip-path polygon)
- Teal/cyan gradient (#14b8a6 to #06b6d4)
- Directional motion (slide transitions)
- Upward-pointing arrows

**Emotional Impact:**
- Energetic and forward-moving
- Progressive and dynamic
- Youthful and aspirational

**CSS Classes:**
```css
.shape-trapezoid-container
.shape-trapezoid
.trapezoid-slider
.trapezoid-slide
.trapezoid-arrow
```

**Code Example:**
```html
<section class="shape-trapezoid-container">
    <div class="trapezoid-slider">
        <div class="trapezoid-slide">
            <div class="shape-trapezoid">
                <h3>Friday Night Live <span class="growth-arrow">↗</span></h3>
                <p>Youth worship every Friday at 7 PM</p>
            </div>
        </div>
        <button class="trapezoid-arrow left">‹</button>
        <button class="trapezoid-arrow right">›</button>
    </div>
</section>
```

---

### 4. ◻️ SQUARE — Service & Structure

**Spiritual Meaning:**
- Strength and reliability
- Action and responsibility
- Serving with integrity
- Structured ministry

**Usage:**
- Volunteer sign-ups
- Ministry opportunity cards
- Giving portals
- Service team grids

**Design Characteristics:**
- Perfect 1:1 aspect ratio
- Gold/amber color (#f59e0b)
- Soft hover lift effect
- Even padding all sides

**Emotional Impact:**
- Confident and capable
- Action-oriented
- Dependable and strong

**CSS Classes:**
```css
.shape-square-container
.shape-square-grid
.shape-square
.shape-square-icon
```

**Code Example:**
```html
<section class="shape-square-container">
    <div class="shape-square-grid">
        <div class="shape-square worship-hover" tabindex="0">
            <div class="shape-square-icon">🙏</div>
            <h3>Worship Team</h3>
            <p>Share your musical gifts</p>
        </div>
    </div>
</section>
```

---

### 5. ⬡ HEPTAGON (7-sided) — Spiritual Depth & Sacred Focus

**Spiritual Meaning:**
- Biblical number 7 (completeness, perfection)
- God's perfect work
- Sacred and holy focus
- Special divine emphasis

**Usage:**
- Annual church theme
- Special sermon series
- Conference highlights
- Major spiritual initiatives

**Design Characteristics:**
- 7-sided polygon (clip-path)
- Purple gradient (#7c3aed to #a855f7)
- Sacred pulse animation (4s cycle)
- Badge: "Biblical Number 7"

**Emotional Impact:**
- Sacred and reverent
- Special and intentional
- Divine and complete

**⚠️ STRICT RULE:**
**MAXIMUM ONE HEPTAGON PER PAGE**

**CSS Classes:**
```css
.shape-heptagon-container
.shape-heptagon
.shape-heptagon-content
.heptagon-badge
.sacred-number
```

**Code Example:**
```html
<section class="shape-heptagon-container">
    <div class="heptagon-badge">
        <span class="sacred-number">7</span>
        Biblical Number of Completeness
    </div>
    <div class="shape-heptagon">
        <div class="shape-heptagon-content">
            <h2>2026: Year of Gratitude</h2>
            <p class="shape-scripture">"Give thanks in all circumstances..." - 1 Thess 5:18</p>
        </div>
    </div>
</section>
```

---

## 📐 Page Rhythm Guidelines

### Homepage Layout
```
Circle (Hero Worship)
    ↓
Trapezoid (Youth Energy)
    ↓
Square (Service Opportunities)
    ↓
Rectangle (Teaching/Sermons)
    ↓
Heptagon (2026 Theme - ONE ONLY)
```

### Youth Page Layout
```
Trapezoid (Primary - Youth Slider)
    ↓
Heptagon (Current Series - ONE ONLY)
    ↓
Rectangle (Content/Resources)
```

### Sermon Page Layout
```
Rectangle (Primary - Teaching Cards)
    ↓
Circle (Speaker Images/Bio)
```

### Giving Page Layout
```
Square (Primary - Giving Options)
    ↓
Rectangle (Support - Teaching on Giving)
```

---

## 🎬 Motion Philosophy

### "Worship-Like Motion"

All animations follow these principles:
- **Slow:** 800ms - 1200ms transitions
- **Gentle:** Cubic-bezier easing (0.4, 0, 0.2, 1)
- **Reverent:** No spinning, flashing, or aggressive effects
- **Purposeful:** Motion serves meaning, not decoration

### Animation Speeds
```css
--motion-slow: 1200ms cubic-bezier(0.4, 0, 0.2, 1)
--motion-medium: 800ms cubic-bezier(0.4, 0, 0.2, 1)
--motion-gentle: 600ms cubic-bezier(0.33, 1, 0.68, 1)
```

### Approved Motion Types
- ✅ Gentle fade in/out
- ✅ Slow parallax scroll
- ✅ Subtle hover lift (4-8px)
- ✅ Soft glow/shadow expansion
- ✅ Smooth slide transitions

### Prohibited Motion
- ❌ Spinning/rotation
- ❌ Flashing or blinking
- ❌ Aggressive bounce
- ❌ Fast slides (<500ms)
- ❌ Parallax > 30% speed

---

## ♿ Accessibility Requirements

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

### Keyboard Navigation
- All carousels: Arrow keys (← →)
- All cards: Tab-focusable
- All buttons: Enter/Space activation
- Skip links for screen readers

### Color Contrast
- Minimum WCAG AA: 4.5:1 for body text
- Minimum WCAG AA: 3:1 for large text
- All shapes have high-contrast text

### ARIA Labels
- `role="region"` for carousels
- `aria-label` for navigation
- `aria-selected` for active states
- `aria-live="polite"` for dynamic content

---

## 🎨 Color Palette

### Shape Colors
```css
/* Circle - Community Blue */
--shape-circle-primary: #3b82f6;
--shape-circle-gradient: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);

/* Rectangle - Stability Gray */
--shape-rectangle-primary: #1e293b;
--shape-rectangle-light: #f1f5f9;

/* Trapezoid - Growth Teal */
--shape-trapezoid-primary: #14b8a6;
--shape-trapezoid-gradient: linear-gradient(120deg, #14b8a6 0%, #06b6d4 100%);

/* Square - Service Gold */
--shape-square-primary: #f59e0b;
--shape-square-hover: #d97706;

/* Heptagon - Sacred Purple */
--shape-heptagon-primary: #7c3aed;
--shape-heptagon-gradient: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
```

---

## 📱 Responsive Breakpoints

### Mobile (< 480px)
- Circle: Reduced height (300px)
- Trapezoid: Softer clip-path angles
- Square: Single column grid
- Heptagon: Scaled to 250px

### Tablet (481px - 768px)
- Circle: Medium height (400px)
- Square: 2-column grid
- All text: Responsive font sizes (clamp)

### Desktop (> 768px)
- Full layout as designed
- Multi-column grids
- Enhanced hover effects

---

## 🛠️ Implementation Guide

### Step 1: Include CSS
```html
<link rel="stylesheet" href="shape-system.css">
```

### Step 2: Include JavaScript
```html
<script src="shape-system.js"></script>
```

### Step 3: Use Shape Components
Copy from `shape-sections.html` template

### Step 4: Verify Accessibility
- Test keyboard navigation
- Check screen reader compatibility
- Verify reduced motion works

---

## ✅ Quality Checklist

Before launching any page:

- [ ] Only ONE heptagon present (if any)
- [ ] Each page has clear dominant shape
- [ ] All animations are < 1200ms
- [ ] Scripture is readable (not overpowered)
- [ ] Color contrast passes WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Reduced motion preference works
- [ ] Mobile layout tested on real device
- [ ] Content makes theological sense with shape

---

## 🚫 Common Mistakes to Avoid

### ❌ Don't:
1. Mix shapes randomly without purpose
2. Use more than ONE heptagon per page
3. Create fast, flashy animations
4. Obscure Scripture with decorative shapes
5. Use shapes as pure decoration
6. Ignore accessibility requirements
7. Override shape colors without reason
8. Create spinning or aggressive motion

### ✅ Do:
1. Choose shapes intentionally by meaning
2. Let content breathe within shapes
3. Test on multiple devices
4. Keep motion slow and reverent
5. Ensure high contrast for readability
6. Use semantic HTML
7. Follow the page rhythm guidelines
8. Document any customizations

---

## 📚 File Structure

```
/Calendar 2026/
├── shape-system.css          # Core shape CSS
├── shape-system.js           # Interactive behaviors
├── shape-sections.html       # HTML templates
├── SHAPE_SYSTEM_GUIDE.md    # This documentation
└── index.html               # Homepage implementation
```

---

## 🙏 Spiritual Design Rationale

### Why Shapes Matter

1. **Visual Theology**: Design communicates truth. Circles represent God's eternal nature. Rectangles represent His unchanging Word.

2. **Intentional Symbolism**: Youth feel respected when their section uses upward-moving trapezoids (calling). Adults appreciate stable rectangles (teaching).

3. **Sacred Focus**: The heptagon (7 sides) reminds us of God's complete work—seven days of creation, seven churches in Revelation.

4. **Unity Through Consistency**: Using ONE shape system creates cohesive visual language that unites the whole church family.

---

## 📞 Support & Questions

For questions about the shape system:
- Review this guide thoroughly
- Check `shape-sections.html` for examples
- Inspect existing implementations
- Test in browser DevTools

**Remember:** "Let all things be done decently and in order." — 1 Corinthians 14:40

Design with intention. Build with excellence. Honor God with beauty.

---

## 🎯 Quick Reference Card

| Shape | Meaning | Usage | Color | Max Per Page |
|-------|---------|-------|-------|--------------|
| ⚪ Circle | Community/Eternity | Hero, Testimonies | Blue | Unlimited |
| ▭ Rectangle | Teaching/Stability | Sermons, Studies | Gray | Unlimited |
| 🔶 Trapezoid | Growth/Movement | Youth, Missions | Teal | Unlimited |
| ◻️ Square | Service/Structure | Volunteering, Giving | Gold | Unlimited |
| ⬡ Heptagon | Sacred/Complete | Annual Theme | Purple | **ONE ONLY** |

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Church:** Grace and Praise Bangladeshi Church  
**Design Philosophy:** ONE SHAPE = ONE PURPOSE
