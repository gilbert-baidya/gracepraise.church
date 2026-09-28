# V21 Route Control — Phase 6

Phase 6 extends the public adapter from marked homepage sections to one complete, low-risk route: `pages.gallery`.

## Repository findings

- Public route: `/gallery.html`.
- HTML entry point: `gallery.html`.
- Page-specific JavaScript: `gallery.js`.
- Page-specific CSS: the large inline style block in `gallery.html`; shared styling also comes from `redesign-styles.css`, `logo-loading.css`, `logo-styles.css`, `dark-mode-toggle-position.css`, and `css/footer-v3.css` through the footer partial.
- Shared page scripts: `platform-runtime.js`, `navigation.js`, `countdown.js`, logo scripts, and `js/footer/footer-init.js`.
- Footer: injected through `<div data-partial="site-footer">` and `footer-init.js`.
- Gallery data: `gallery.js` fetches `/content/gallery/`, reads linked Markdown front matter, sorts by date, then creates lazy-loaded gallery images. The lightbox image is also marked `loading="lazy"`.
- Service worker: `sw.js` treats same-origin HTML navigations and JavaScript/CSS as network-first. It has no Gallery-specific route-state behavior and does not cache the public configuration cross-origin request.
- Netlify routing: there is no `/gallery` redirect or alias. `/gallery.html` is the only supported Gallery route discovered in `netlify.toml`.

The repository contains Gallery links in the shared header/navigation and in the static navigation copies used by the homepage, About/history/mission/leadership/beliefs/core-values/position-papers/testimonies, calendar, plan-visit, prayer, songbook, devotions, giving variants, privacy, terms, pastor, and related templates. Those are navigation surfaces, not route-state dependencies. The Phase 2 non-dependency classification remains correct; no shared navigation or footer behavior was changed.

## Architecture

`website-control.js` now owns reusable route resolution:

```text
window.location.pathname
  → CONTROLLED_ROUTES lookup
  → pages.gallery feature ID
  → schema dependency/state resolution
  → LIVE, HIDDEN, or COMING_SOON route behavior
```

The route registry currently maps only `/gallery.html` to `pages.gallery`. No unsupported `/gallery` alias was invented. The adapter exposes `resolveControlledRoute()` and `renderControlledRouteState()` for future route integrations. The route renderer preserves the global shell, inserts a semantic controlled `<main>`, and uses DOM APIs/text content rather than remote HTML.

Shadow diagnostics for the Gallery route include the configured state, effective state, matched path, `wouldApply` action, and `actualAction: NONE — SHADOW MODE`; they are internal only and are not rendered to visitors.

Gallery-specific JavaScript is no longer loaded statically. In `SHADOW`, `DISABLED`, or configuration failure it is loaded immediately as the existing route behavior. In `ACTIVE`, it is loaded only after the route resolves to `LIVE`. HIDDEN, COMING_SOON, and ADMIN_PREVIEW do not initialize Gallery JavaScript.

## State semantics

| Published state | Public result |
| --- | --- |
| LIVE | Existing Gallery page, data loading, filters, lightbox, header, footer, and theme behavior remain available. |
| HIDDEN | Main Gallery content and lightbox are hidden from visual and accessibility trees; a branded “Gallery Unavailable” main with a Home link is shown. |
| COMING_SOON | Main Gallery content and lightbox are suppressed; a branded “Gallery Coming Soon” main with a Home link is shown. |
| ADMIN_PREVIEW | Resolves to HIDDEN for public visitors. No query string or LocalStorage value grants preview access. |

The ACTIVE pending boundary uses `visibility: hidden` only on the controlled Gallery content, preserving its layout while the same 1.2-second adapter timeout resolves. Header and footer remain available. Delivery failure clears the pending state and restores normal Gallery behavior.

## SEO and caching

HIDDEN, COMING_SOON, and public ADMIN_PREVIEW states update the document title, description/social descriptions, and add `robots: noindex, nofollow`. The current static Netlify architecture cannot return a real 404/410 from browser-side JavaScript; that would require a Netlify Edge/Function or equivalent server-side route layer and is deferred. The canonical URL is retained while `noindex` prevents the suppressed page from presenting normal indexable Gallery content.

The Phase 5 public endpoint cache remains unchanged: browser `max-age=30`, CDN `s-maxage=60`, and `stale-while-revalidate=300`. A newly published route state may therefore take approximately 30–60 seconds to become fresh for normal requests, with a stale response potentially served for up to five minutes while revalidation occurs.

## Validation

The Phase 6 browser suite covers Desktop Chrome route behavior for LIVE, HIDDEN, COMING_SOON, ADMIN_PREVIEW, SHADOW, fallback, theme, responsive widths (`375`, `390`, `768`, `1024`, `1440`), and Home → Gallery → Back → Forward navigation. It also asserts that hidden routes have no dynamically loaded `gallery.js`, no visible Gallery content, and no console-error path caused by missing Gallery DOM.

Phase 6 does not expand ACTIVE scope to any other page or modify production defaults. The checked-in mode remains `SHADOW`.
