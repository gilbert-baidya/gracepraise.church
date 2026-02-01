# Logo Implementation Guide

## 📋 Overview
This guide explains how to use the GPBC logo system across the website, including adaptive logos, animated loading screens, and favicons.

## 🎨 Logo Assets

### SVG Logos (Vector - Recommended for web)
- `gpbc-white.svg` (921KB) - Light logo for dark backgrounds
- `gpbc-black.svg` (921KB) - Dark logo for light backgrounds  
- `gpbc-no-name.svg` (591KB) - Icon only version

### PNG Logos (Raster - Fallback)
- `logo white.png` (899KB, 1563x1563px)
- `logo dark.png` (968KB, 1563x1563px)
- `logo no name.png` (589KB, 1563x1563px)

### Animated Logos (MP4)
- `gpbc-glow-one.mp4` (847KB) - Glowing effect
- `glow-shine-fav.mp4` (801KB) - Shine effect ⭐
- `gpbc-dove-one-fav.mp4` (794KB) - Dove animation ⭐
- `gpbc-dove-2.mp4` (1.6MB) - Dove animation v2
- `gpbc-glow-name.mp4` (801KB) - Glow with name
- `gpbc-rotate-one.mp4` (2.3MB) - Rotating animation
- `gpbc-rotate.mp4` (1.8MB) - Rotating animation v2
- `bible-study.mp4` (1.7MB) - Bible study themed

## 🚀 Quick Start

### 1. Add Logo to Any Page

Add these in the `<head>` section:

```html
<!-- Logo System -->
<link rel="stylesheet" href="logo-loading.css">
<script src="logo-loader.js"></script>

<!-- Optional: Loading Screen with Animated Logo -->
<script src="logo-loading.js"></script>
```

### 2. Add Logo Element in HTML

```html
<a href="index.html" class="logo">GPBC</a>
```

The logo-loader.js will automatically:
- Replace "GPBC" text with the appropriate logo image
- Switch between white/black logo based on light/dark theme
- Handle smooth transitions when theme changes

## 🎬 Loading Screen

The loading screen shows a random animated logo video each time the page loads.

**Features:**
- Randomly selects from 3 favorite animations
- Auto-hides when page fully loads and video ends
- Fallback to static logo if video fails
- Minimum display time: 1.5 seconds
- Smooth fade-out transition

**To customize videos shown:**
Edit `logo-loading.js`:
```javascript
videoOptions: [
    '/images/logo/gpbc-glow-one.mp4',
    '/images/logo/glow-shine-fav.mp4',
    '/images/logo/gpbc-dove-one-fav.mp4'
]
```

## 🌓 Adaptive Theme Support

Logos automatically switch based on theme:
- **Light Mode**: Uses `gpbc-black.svg` (dark logo)
- **Dark Mode**: Uses `gpbc-white.svg` (light logo)

Configuration in `/content/settings/logo.json`:
```json
{
  "logo": "/images/logo/gpbc-white.svg",
  "logoDark": "/images/logo/gpbc-black.svg",
  "churchName": "Grace and Praise Bangladeshi Church",
  "abbreviation": "GPBC"
}
```

## 🔖 Favicons

### Add to All Pages
Copy content from `favicon-snippet.html` into the `<head>` section of each page.

### Files Structure
```
images/favicons/
├── favicon-16x16.png          (Browser tab)
├── favicon-32x32.png          (Browser tab)
├── apple-touch-icon.png       (iOS home screen - 180x180)
├── android-chrome-192x192.png (Android)
├── android-chrome-512x512.png (Android)
├── mstile-150x150.png         (Windows tiles)
├── site.webmanifest           (PWA manifest)
└── browserconfig.xml          (Microsoft config)
```

### Generate Favicon Images
**Option 1: Online Tool (Recommended)**
1. Visit https://realfavicongenerator.net/
2. Upload `gpbc-no-name.svg`
3. Download generated package
4. Extract to `images/favicons/`

**Option 2: Manual (ImageMagick)**
```bash
# From SVG
convert -background none images/logo/gpbc-no-name.svg -resize 192x192 images/favicons/android-chrome-192x192.png
convert -background none images/logo/gpbc-no-name.svg -resize 512x512 images/favicons/android-chrome-512x512.png
convert -background none images/logo/gpbc-no-name.svg -resize 180x180 images/favicons/apple-touch-icon.png
convert -background none images/logo/gpbc-no-name.svg -resize 32x32 images/favicons/favicon-32x32.png
convert -background none images/logo/gpbc-no-name.svg -resize 16x16 images/favicons/favicon-16x16.png
convert -background white images/logo/gpbc-no-name.svg -resize 150x150 images/favicons/mstile-150x150.png
```

## 📝 Usage Examples

### Standard Navigation
```html
<nav>
    <a href="index.html" class="logo">GPBC</a>
    <!-- logo-loader.js will replace with image -->
</nav>
```

### Multiple Logos on Same Page
```html
<header>
    <a href="index.html" class="logo">GPBC</a>
</header>

<footer>
    <a href="index.html" class="logo">GPBC</a>
</footer>
<!-- Both will be automatically replaced -->
```

### Manual Logo Usage (Without JS)
```html
<img src="/images/logo/gpbc-white.svg" alt="GPBC" style="height: 50px;">
```

## ⚡ Performance Notes

### Current File Sizes
- SVG files are unusually large (921KB) - typically should be <50KB
- Consider optimizing SVGs using SVGO or online tools

### Optimization Recommendations
1. **Optimize SVGs**: Reduce from 921KB to ~50KB
   - Use https://jakearchibald.github.io/svgomg/
   - Or run: `svgo images/logo/*.svg`

2. **Compress Videos**: Current MP4s are well-sized (800KB-2.3MB)
   - Consider creating WebM versions for better compression
   - Use poster images for faster initial display

3. **Lazy Load**: Videos in loading screen load immediately by design
   - Other page videos should use `loading="lazy"`

## 🎯 Best Practices

1. **Always include fallback text** in logo links: `<a class="logo">GPBC</a>`
2. **Use SVG logos** when possible (better quality, smaller size)
3. **Test both themes** (light/dark) to ensure logos are visible
4. **Keep loading screen videos under 2MB** for fast load times
5. **Generate all favicon sizes** for best device support

## 🔧 Troubleshooting

### Logo doesn't appear
- Check browser console for errors
- Verify `logo.json` has correct paths
- Ensure `logo-loader.js` is loaded before closing `</body>`

### Theme switching doesn't work
- Confirm your theme toggle updates `body` class or `data-theme` attribute
- Check for JavaScript errors in console

### Loading screen doesn't hide
- Check video file paths are correct
- Verify videos are accessible (check Network tab)
- Fallback timer will hide screen after 10 seconds

### Videos don't play on mobile
- Ensure `playsinline` attribute is present
- Videos must be muted for autoplay on mobile
- Consider smaller file sizes for mobile

## 📱 Mobile Support

All components are fully responsive:
- Logos scale appropriately on small screens
- Loading screen adjusts size for mobile
- Videos use `playsinline` for iOS compatibility
- Respects `prefers-reduced-motion` for accessibility

## ♿ Accessibility

- All logos include proper `alt` text
- Loading screen respects `prefers-reduced-motion`
- Semantic HTML with proper link structure
- High contrast between logo and backgrounds
