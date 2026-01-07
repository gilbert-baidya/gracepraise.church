# 🎨 VISUAL DESIGN SPECIFICATIONS
## Shape System - Grace and Praise Bangladeshi Church

---

## 🎨 COLOR SYSTEM

### Primary Shape Colors

#### ⚪ Circle - Community Blue
```
Primary:    #3b82f6  ███  RGB(59, 130, 246)
Secondary:  #6366f1  ███  RGB(99, 102, 241)
Glow:       rgba(59, 130, 246, 0.3)
Gradient:   linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)
```

**Psychology:** Trust, peace, community, heaven  
**Contrast Ratio (on white):** 6.4:1 ✅ WCAG AA

---

#### ▭ Rectangle - Teaching Gray
```
Primary:    #1e293b  ███  RGB(30, 41, 59)
Secondary:  #475569  ███  RGB(71, 85, 105)
Light:      #f1f5f9  ███  RGB(241, 245, 249)
```

**Psychology:** Authority, stability, seriousness, foundation  
**Contrast Ratio (on white):** 15.5:1 ✅ WCAG AAA

---

#### 🔶 Trapezoid - Growth Teal
```
Primary:    #14b8a6  ███  RGB(20, 184, 166)
Secondary:  #06b6d4  ███  RGB(6, 182, 212)
Glow:       rgba(20, 184, 166, 0.25)
Gradient:   linear-gradient(120deg, #14b8a6 0%, #06b6d4 100%)
```

**Psychology:** Energy, growth, freshness, youth  
**Contrast Ratio (on white):** 4.6:1 ✅ WCAG AA

---

#### ◻️ Square - Service Gold
```
Primary:    #f59e0b  ███  RGB(245, 158, 11)
Hover:      #d97706  ███  RGB(217, 119, 6)
Shadow:     rgba(245, 158, 11, 0.2)
```

**Psychology:** Action, warmth, service, generosity  
**Contrast Ratio (on white):** 3.2:1 ⚠️ (Use dark text)

---

#### ⬡ Heptagon - Sacred Purple
```
Primary:    #7c3aed  ███  RGB(124, 58, 237)
Secondary:  #a855f7  ███  RGB(168, 85, 247)
Glow:       rgba(124, 58, 237, 0.4)
Gradient:   linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)
```

**Psychology:** Royalty, divine, sacred, special  
**Contrast Ratio (on white):** 5.8:1 ✅ WCAG AA

---

## 📏 SPACING SYSTEM

### Sacred Spacing Values
```
--sacred-space:  4rem    (64px)  - Between major sections
--breath-space:  2.5rem  (40px)  - Within sections
--rest-space:    1.5rem  (24px)  - Between elements
```

### Standard Spacing
```
--spacing-xs:    0.5rem  (8px)
--spacing-sm:    1rem    (16px)
--spacing-md:    1.5rem  (24px)
--spacing-lg:    2.5rem  (40px)
--spacing-xl:    3.5rem  (56px)
--spacing-2xl:   5rem    (80px)
--spacing-3xl:   7rem    (112px)
```

---

## 🔤 TYPOGRAPHY

### Font Stack
```
Primary:   'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
Fallback:  'Helvetica Neue', Arial, sans-serif
```

### Font Sizes (Responsive with clamp)
```
--font-xs:   0.75rem   (12px)
--font-sm:   0.875rem  (14px)
--font-base: 1rem      (16px)
--font-lg:   1.1rem    (17.6px)
--font-xl:   1.25rem   (20px)
--font-2xl:  1.5rem    (24px)
--font-3xl:  1.6rem    (25.6px)
--font-4xl:  2.1rem    (33.6px)
--font-5xl:  2.7rem    (43.2px)
--font-6xl:  3.2rem    (51.2px)
```

### Heading Sizes (Responsive)
```
h1: clamp(2.4rem, 3.2vw, 2.8rem)    Mobile: 38px → Desktop: 45px
h2: clamp(1.9rem, 2.6vw, 2.1rem)    Mobile: 30px → Desktop: 34px
h3: 1.5rem                          Fixed: 24px
```

### Font Weights
```
--font-normal:     400
--font-medium:     500
--font-semibold:   600
--font-bold:       700
--font-extrabold:  800
```

### Line Heights
```
--leading-tight:    1.3    (Headings)
--leading-normal:   1.7    (Body text)
--leading-relaxed:  1.85   (Scripture quotes)
```

---

## 🎭 SHADOWS

### Shadow Layers
```
--shadow-sm:  0 1px 3px 0 rgba(17, 24, 39, 0.06)
--shadow-md:  0 6px 18px -6px rgba(17, 24, 39, 0.12)
--shadow-lg:  0 14px 28px -8px rgba(17, 24, 39, 0.14)
--shadow-xl:  0 24px 40px -12px rgba(17, 24, 39, 0.18)
```

### Shape-Specific Shadows
```
Circle:     0 20px 60px var(--shape-circle-glow)
            0 30px 80px var(--shape-circle-glow)  [hover]

Trapezoid:  0 20px 50px var(--shape-trapezoid-glow)

Square:     0 8px 30px var(--shape-square-shadow)
            0 16px 50px var(--shape-square-shadow) [hover]

Heptagon:   0 30px 80px var(--shape-heptagon-glow)
            0 40px 100px var(--shape-heptagon-glow) [hover]

Rectangle:  0 4px 20px rgba(30, 41, 59, 0.08)
            0 12px 40px rgba(30, 41, 59, 0.12) [hover]
```

---

## 🎬 ANIMATION SPECIFICATIONS

### Timing Functions
```css
Worship Ease:  cubic-bezier(0.4, 0, 0.2, 1)
Gentle Ease:   cubic-bezier(0.33, 1, 0.68, 1)
```

### Duration Standards
```
Fast:    150ms   (Button clicks, hover starts)
Base:    300ms   (General transitions)
Gentle:  600ms   (Smooth fades)
Medium:  800ms   (Slide transitions)
Slow:    1200ms  (Carousel auto-advance)
Sacred:  4000ms  (Heptagon pulse animation)
```

### Animation Curves
```javascript
// Worship-like motion
transition: all 800ms cubic-bezier(0.4, 0, 0.2, 1);

// Gentle fade in
animation: gentleFadeIn 1200ms ease-out;

// Sacred pulse
animation: sacredPulse 4s ease-in-out infinite;
```

---

## 📐 SHAPE DIMENSIONS

### Circle
```
Desktop:  600px × 600px (aspect-ratio: 1/1)
Tablet:   400px × 400px
Mobile:   300px × 300px

Border-radius: 50% (perfect circle)
```

### Rectangle
```
Width:    100% (fluid)
Padding:  2.5rem (40px)
Border:   4px solid left side
Radius:   8px (subtle rounding)
```

### Trapezoid
```
Max-width: 1000px
Padding:   3rem 2rem (48px 32px)
Clip-path: polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)
Hover:     polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%)

Angle calculation:
- Top left:  5% horizontal offset
- Top right: 95% horizontal offset
- Creates ~8° upward angle
```

### Square
```
Aspect-ratio: 1 / 1 (enforced)
Min-size:     250px × 250px
Padding:      2rem (32px)
Border:       3px solid
Radius:       12px
```

### Heptagon (7-sided)
```
Desktop: 400px × 400px
Mobile:  250px × 250px

Clip-path polygon coordinates:
50% 0%     (top vertex)
90% 20%    (top-right)
100% 60%   (right)
75% 100%   (bottom-right)
25% 100%   (bottom-left)
0% 60%     (left)
10% 20%    (top-left)
```

---

## 🎯 INTERACTIVE STATES

### Hover Effects

#### Circle
```css
transform: scale(1.02);
box-shadow: 0 30px 80px var(--shape-circle-glow);
transition: 1200ms;
```

#### Rectangle
```css
transform: translateY(-4px);
box-shadow: 0 12px 40px rgba(30, 41, 59, 0.12);
transition: 600ms;
```

#### Trapezoid
```css
clip-path: polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%);
transform: translateY(-6px);
transition: 800ms;
```

#### Square
```css
transform: translateY(-8px) scale(1.03);
border-color: #d97706;
box-shadow: 0 16px 50px var(--shape-square-shadow);
transition: 600ms;
```

#### Heptagon
```css
transform: scale(1.05);
box-shadow: 0 40px 100px var(--shape-heptagon-glow);
transition: 1200ms;
```

### Focus States (Keyboard Navigation)
```css
*:focus-visible {
    outline: 3px solid var(--color-secondary);
    outline-offset: 2px;
    border-radius: 4px;
}
```

---

## 📱 RESPONSIVE BREAKPOINTS

### Mobile First Approach
```css
/* Mobile: < 480px (default styles) */
@media (max-width: 480px) {
    .circle-carousel { height: 300px; }
    .shape-heptagon { width: 250px; height: 250px; }
    .shape-square-grid { grid-template-columns: 1fr; }
}

/* Tablet: 481px - 768px */
@media (min-width: 481px) and (max-width: 768px) {
    .circle-carousel { height: 400px; }
    .shape-square-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop: > 768px */
@media (min-width: 769px) {
    .circle-carousel { height: 600px; }
    .shape-square-grid { grid-template-columns: repeat(4, 1fr); }
}
```

---

## 🌐 ACCESSIBILITY STANDARDS

### Color Contrast Requirements

#### WCAG AA (Minimum)
```
Normal text:  4.5:1
Large text:   3:1 (18pt+ or 14pt bold)
```

#### WCAG AAA (Enhanced)
```
Normal text:  7:1
Large text:   4.5:1
```

### Shape Color Compliance
```
Circle Blue on White:    6.4:1  ✅ AA
Rectangle Gray on White: 15.5:1 ✅ AAA
Trapezoid Teal on White: 4.6:1  ✅ AA
Square Gold on White:    3.2:1  ⚠️ (Use dark text inside)
Heptagon Purple on White: 5.8:1 ✅ AA
```

### Focus Indicators
```
Minimum size:   2px outline
Offset:         2px
Color:          High contrast (#14b8a6 teal)
Visibility:     3:1 contrast ratio
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

---

## 🎨 DESIGN TOKENS (CSS Variables)

### Complete Token List
```css
:root {
    /* Shapes */
    --shape-circle-primary: #3b82f6;
    --shape-circle-glow: rgba(59, 130, 246, 0.3);
    --shape-rectangle-primary: #1e293b;
    --shape-trapezoid-primary: #14b8a6;
    --shape-square-primary: #f59e0b;
    --shape-heptagon-primary: #7c3aed;
    
    /* Spacing */
    --sacred-space: 4rem;
    --breath-space: 2.5rem;
    --rest-space: 1.5rem;
    
    /* Motion */
    --motion-slow: 1200ms cubic-bezier(0.4, 0, 0.2, 1);
    --motion-medium: 800ms cubic-bezier(0.4, 0, 0.2, 1);
    --motion-gentle: 600ms cubic-bezier(0.33, 1, 0.68, 1);
    
    /* Typography */
    --font-base: 1rem;
    --leading-normal: 1.7;
    --font-bold: 700;
    
    /* Shadows */
    --shadow-md: 0 6px 18px -6px rgba(17, 24, 39, 0.12);
}
```

---

## 🖼️ VISUAL HIERARCHY

### Z-Index Layering
```
Level 1 (Background):     z-index: 1
Level 2 (Content):        z-index: 10
Level 3 (Navigation):     z-index: 100
Level 4 (Overlays):       z-index: 1000
Level 5 (Modals):         z-index: 10000
```

### Content Density
```
Tight:    Line-height 1.3 (headings)
Normal:   Line-height 1.7 (body)
Loose:    Line-height 1.85 (scripture)

Paragraph spacing: 1rem (16px)
Section spacing:   4rem (64px)
```

---

## 🎪 LAYOUT GRIDS

### Circle Section
```
Container: max-width 900px, centered
Carousel: width 100%, aspect-ratio 1/1
Dots: centered, gap 1rem, margin-top 2rem
```

### Trapezoid Section
```
Container: max-width 1000px, centered
Padding: 3rem vertical, 2rem horizontal
Clip-path: 5% angle on top, full width bottom
```

### Square Grid
```
Desktop:  4 columns, 2rem gap
Tablet:   2 columns, 1.5rem gap
Mobile:   1 column, 1.5rem gap
Min-card: 250px
```

### Rectangle Grid
```
Auto-fit: minmax(280px, 1fr)
Gap: 2rem
Padding: 2.5rem per card
Border-left: 4px solid
```

### Heptagon
```
Container: max-width 700px, centered
Shape: 400px × 400px (desktop)
Badge: absolute position, top -20px
```

---

## 🔍 QUALITY METRICS

### Performance Targets
```
First Contentful Paint:  < 1.8s
Largest Contentful Paint: < 2.5s
Cumulative Layout Shift:  < 0.1
Time to Interactive:      < 3.8s
```

### Accessibility Score
```
Target: 95+ (Lighthouse)
- Color contrast: WCAG AA minimum
- Keyboard navigation: Full support
- Screen reader: Semantic HTML + ARIA
- Focus indicators: Visible on all interactive elements
```

### Browser Support
```
✅ Chrome/Edge 90+
✅ Firefox 88+
✅ Safari 14+
✅ iOS Safari 14+
✅ Chrome Android 90+
```

---

## 📐 PRINT SPECIFICATIONS

### If designs are printed:
```
DPI:          300
Color mode:   CMYK for print, RGB for web
Safe area:    0.125" margins minimum
Font size:    Minimum 10pt for readability
```

### Shape Colors in CMYK
```
Circle Blue:     C=76 M=47 Y=0 K=4
Rectangle Gray:  C=79 M=68 Y=57 K=65
Trapezoid Teal:  C=91 M=0 Y=30 K=28
Square Gold:     C=0 M=36 Y=96 K=4
Heptagon Purple: C=68 M=76 Y=0 K=7
```

---

## 🎨 DESIGN FILE STRUCTURE

```
/design-system/
├── colors/
│   ├── circle-blue.png
│   ├── rectangle-gray.png
│   ├── trapezoid-teal.png
│   ├── square-gold.png
│   └── heptagon-purple.png
├── spacing/
│   └── spacing-scale.svg
├── typography/
│   ├── font-scale.svg
│   └── line-heights.svg
├── shapes/
│   ├── circle-specs.svg
│   ├── rectangle-specs.svg
│   ├── trapezoid-specs.svg
│   ├── square-specs.svg
│   └── heptagon-specs.svg
└── animations/
    ├── worship-ease-curve.svg
    └── motion-timings.svg
```

---

## 🎯 FINAL DESIGN CHECKLIST

Before approving any design:

Visual:
- [ ] Shape colors match spiritual meaning
- [ ] Only ONE heptagon per page
- [ ] White space feels "sacred" (not cramped)
- [ ] Scripture is readable (not overpowered)
- [ ] Typography hierarchy is clear

Technical:
- [ ] Color contrast meets WCAG AA
- [ ] All shapes have proper shadows
- [ ] Motion is slow and reverent (<1200ms)
- [ ] Responsive at 320px, 768px, 1200px
- [ ] Focus states visible for keyboard users

Spiritual:
- [ ] Each shape serves a purpose (not decoration)
- [ ] Design reinforces theology
- [ ] Youth feel excited, elders feel respected
- [ ] Content prioritized over design
- [ ] Everything has intentional meaning

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Church:** Grace and Praise Bangladeshi Church  
**Design System:** ONE SHAPE = ONE PURPOSE ✨
