# Mobile Burger Menu Navigation Audit

**Issue:** User reports that clicking dropdown menu items redirects to homepage instead of the target page.

## Current Behavior Analysis

### HTML Structure (Verified)
```html
<li class="nav-dropdown">
    <a href="about.html">About ▼</a>
    <ul class="dropdown-menu">
        <li><a href="history.html">Our History</a></li>
        <li><a href="mission.html">Our Mission</a></li>
        ...
    </ul>
</li>
```
✅ Links are correct (history.html, mission.html, etc.)

### JavaScript Event Handlers (Found 3 competing handlers)

**Handler 1:** Submenu link handler (navigation.js lines 232-249)
- Attached to: `.dropdown-menu a`
- Action: `e.stopPropagation()`, close dropdown, setTimeout toggleMobileMenu
- Issue: Delays menu close by 100ms

**Handler 2:** Global link handler (navigation.js lines 352-358)
- Attached to: `.nav-links a:not(.nav-dropdown > a)`
- Action: Immediately calls `toggleMobileMenu()`
- **CONFLICT:** This fires BEFORE Handler 1's setTimeout

**Handler 3:** Nested dropdown handler (navigation.js lines 273-290)
- Similar to Handler 1 but for nested menus

### toggleMobileMenu() Function Behavior
When closing menu:
1. Removes 'mobile-open' class
2. Calls `window.scrollTo(0, scrollPosition)` 
3. **POTENTIAL ISSUE:** scrollTo might interrupt pending navigation

## Hypothesis

When user clicks "Our History":
1. Handler 2 fires immediately → calls toggleMobileMenu()
2. toggleMobileMenu() does window.scrollTo() → **might cancel navigation**
3. Handler 1's setTimeout fires 100ms later (too late)
4. Browser never navigates because scrollTo interrupted it

## Questions for User

1. When you click a dropdown item, does the menu close?
2. Does the page scroll to the top?
3. Do you stay on index.html or does it briefly try to load another page?
4. Does this happen on ALL dropdown items or just some?

## Recommended Fix

Remove the competing global handler (lines 352-358) for dropdown menu items, OR ensure it doesn't fire for dropdown submenu links.

The selector `.nav-links a:not(.nav-dropdown > a)` SHOULD exclude the toggle link but INCLUDES submenu links, causing the conflict.
