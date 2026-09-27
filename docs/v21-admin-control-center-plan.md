# V21 Admin Control Center — Phase 1 Audit and Implementation Plan

Audit date: 2026-09-27
Repository: `gracepraise.church`
Branch: `v21-admin-control-center`
Audit scope: repository inspection and planning only; no runtime feature-control behavior is implemented here.

## V21 ADMIN CONTROL CENTER — PHASE 1 AUDIT COMPLETE

## Git

| Item | Result |
|---|---|
| Starting branch | `netlify-live` |
| Starting commit | `6092ef0 Integrate V18 with current song catalog architecture` |
| New branch | `v21-admin-control-center` |
| Branch base | `main` at `6092ef0`, equal to `origin/main`, `netlify-live`, and `origin/netlify-live` after `git fetch origin` |
| Working tree before | Clean |
| Working tree after | One uncommitted planning document only: `docs/v21-admin-control-center-plan.md` |
| Push performed | NO |
| Deployment performed | NO |

The starting branch contained no commits that were not already in `main`. No merge, rebase, reset, stash, production-branch change, or push was performed.

## Existing Architecture

GPBC is currently a Netlify-published static, multi-page site. The repository contains root-level HTML routes, nested ministry/game routes, page-specific CSS/JS, and a small TypeScript page-object/test registry. `netlify.toml` publishes the repository root directly (`publish = "."`); there is no application build step that assembles a single SPA.

The runtime architecture is mixed because the site has evolved through several generations:

- `platform-runtime.js` is loaded early and owns theme bootstrapping, partial loading, fallback header/footer injection, error hooks, and the blank-devotion guard.
- `js/partials.js` loads `partials/header.html` and either `partials/footer.html` or `partials/site-footer.html` into page mount points. Some pages still contain inline headers/nav markup; newer ministry pages use partial mounts.
- `navigation.js` is the global navigation state machine. It handles desktop hover menus, mobile/tablet accordion menus, anchor navigation, focus behavior, scroll padding, and header height synchronization. It is explicitly marked as locked.
- `partials/site-footer.html` is the current shared footer shell. `js/footer/footer-init.js`, `js/footer/footer.config.js`, and `js/footer/site-footer.js` render footer navigation, legal links, social links, and the current year.
- The theme/day-night system is split between `platform-runtime.js`, inline theme boot code in pages such as `index.html`, `liturgical-theme-engine.js`, `liturgical-calendar-engine.js`, and shared CSS token files.
- The service worker is `sw.js` (`gpbc-v13`). It uses network-first behavior for HTML/CSS/JS and cache-first behavior for static assets. Its current precache includes the homepage, shared assets, `plan-visit.html`, and `songbook.html`.
- Homepage content is authored directly in `index.html`. The current independent sections are the V2 hero, Sacred Focus, Plan Your Visit, Welcome Home, Community V5 carousel, dynamic special events, Featured Events/Get Involved flip cards, the Transformational Loop Slick carousel, the Lord's Prayer heptagon wheel, and Stay Connected.
- Devotion routes are static HTML pages backed by local JSON/data files and page-specific engines. Daily Devotion has the largest runtime surface, including the data mesh loader, Bible service, sharing stack, background intelligence, reminders, and the V16 experience layer.
- Songbook is a separate application surface inside `songbook.html`, with local song catalogs plus Firebase compat Auth and Realtime Database playlist persistence.
- Giving uses `give.html`, `give-v14.js`, and `donations.js`. Calendar uses `calendar.html`, `events.js`, Google Sheets integration, localStorage fallback, Cloudinary upload-widget code, EmailJS placeholders, member/prayer/donation helpers, and countdown code.
- Prayer requests post to a Google Apps Script endpoint through `prayer-form.js`; the page is not backed by Firebase.
- The existing `/admin/` is a Decap CMS shell (`admin/index.html` and `admin/config.yml`) using Netlify Identity and Git Gateway on `main`. It manages content collections such as settings, gallery, events, and testimonies; it is not the proposed V21 visibility-control dashboard.
- There is no current runtime feature-flag/configuration loader for public visibility. Existing configuration files such as `config/site-identity.json`, `config/site-footer.config.json`, and `config/seo-pages.json` are static repository assets.

### Existing route inventory

The repository contains these significant public routes. Test pages, partial templates, preview pages, redirect aliases, and generated page-object TypeScript files are listed separately below because they are not normal public feature controls.

| Area | Routes/source files | Current JS/CSS surface | V21 observation |
|---|---|---|---|
| Home | `/`, `/index.html` → `index.html` | `platform-runtime.js`, liturgical engines, homepage CSS, Community V5, flip cards, navigation, events/countdown, lazy homepage events, shape system, heptagon, footer, sermon player | The highest-density feature surface; control only by whole-section adapters. |
| About | `/about.html` → `about.html` | `about-v17.js`, shared runtime/partials/navigation/footer | Parent page for the About dropdown; child pages link back to it. |
| About children | `/history.html`, `/mission.html`, `/leadership.html`, `/beliefs.html`, `/core-values.html`, `/position-papers.html`, `/testimonies.html` | Mostly shared runtime/partials/navigation/footer; `about-v17.js`/`about-child.js` where present | Independently renderable, but all have navigation and/or footer/internal references. |
| Visit/contact | `/plan-visit.html`, `/contact.html` | `plan-visit.html` loads `events.js`; contact is mostly shared runtime/navigation/footer | Plan Your Visit is also a homepage section and footer destination. |
| Events/media | `/calendar.html`, `/gallery.html` | Calendar: Google Sheets, localStorage, Cloudinary, EmailJS, QR, reminders, prayers, donations; Gallery: `gallery.js` | Calendar and Gallery are menu destinations; Calendar also feeds homepage/banner behavior. |
| Prayer/giving | `/prayer-request.html`, `/give.html` | Prayer form + Google Apps Script; Giving + donation/payment helpers and QR | Both are linked from homepage cards, navigation, footer, and other CTAs. |
| Devotions | `/daily-devotion.html`, `/bible-reader.html`, `/couples-devotion.html`, `/family-devotion.html`, `/youth-devotion.html`, `/children-devotion.html` | Daily Devotion has the full devotion/share stack; other devotion pages have page-specific data/styles and shared runtime | Navigation has one Devotion parent with many child links. Hide/show must update the parent menu and incoming CTAs. |
| Fasting | `/fasting-21days.html`, `/fasting-30days.html`, `/fasting-40days.html`, `/lent-fasting.html`, `/gratitude-fasting.html` | Archive/devotion engines, data files, page-specific CSS/JS, shared runtime/footer | `fasting-40days.html` redirects to `lent-fasting.html`; aliases cannot be treated as independent content features. |
| Songbook | `/songbook.html` | Firebase compat Auth/Realtime Database, song data, `songbook-app.js`, `songbook-v18.js` | Firebase-backed feature; disabling it must remove About-menu entry and any direct CTA without touching Firebase initialization used by the page. |
| Ministries | `/ministries.html`, `/ministries/index.html` | `ministry-v19.js`, shared runtime/partials/navigation/footer | `/ministries/index.html` redirects to `/ministries.html`; one canonical feature ID is required. |
| Ministry details | `/ministries/bible-study.html`, `/community-development.html`, `/homeless-ministry.html`, `/hospital-ministry.html`, `/kids-ministry.html`, `/men-fellowship.html`, `/mission-outreach.html`, `/prison-ministry.html`, `/support-missionaries.html`, `/worship-ministry.html`, `/youth-ministry.html` | Shared partials/runtime/navigation/footer plus `ministry-v19.js` and `ministry-v19.css` | Menu and breadcrumb dependencies; Worship, Bible Study, Kids, and overview pages also receive homepage/footer CTAs. |
| Pastor/games | `/pastor/` → `pastor/index.html`; `/kids/games/` and `/youth/games/` → nested `index.html` | Pastor has page CSS; games use ministry V19 shell | Pastor is footer-linked; games are linked from ministry/devotion content and have their own page-object/test coverage. |
| Legal/communication | `/privacy-policy.html`, `/terms-conditions.html`, `/sms-opt-in.html` | Shared runtime/partials/navigation/footer | Keep available for legal, footer, and communication compliance; not normal visibility toggles. |

### Build, redirects, security, and tests

- `netlify.toml` contains the root publish configuration, global security headers, CSP, cache policies, `/admin/*` and `/preview/*` noindex policies, giving aliases, the fasting redirect, the ministries index redirect, and the pastor-subdomain redirect.
- The global Netlify CSP allows the current Google, Firebase, Netlify Identity, Cloudinary, Stripe/PayPal frame, Vimeo/YouTube, and script dependencies. `index.html` also has its own inline CSP meta policy, so a future Firebase/config fetch must account for both policy layers.
- `robots.txt` allows crawling and points to `sitemap.xml`. `manifest.json` exposes Daily Devotion, Give, and Prayer Request as PWA shortcuts.
- Playwright is configured in `playwright.config.ts` for Desktop Chrome/Safari/Firefox, iPad Pro 11 portrait/landscape, iPhone 14, and Pixel 7. Tests cover page smoke/core readiness, layout, navigation, accessibility, devotion regressions, ministries, SEO, footer rendering, performance, and visual snapshots.
- `tests/data/html-pages-inventory.json` and the generated page registry cover the current static route set. Any future V21 route/visibility behavior must extend the existing smoke, navigation, footer, and mobile regression coverage.

## Firebase Findings

Firebase is currently a Songbook-only client-side integration, not a site-wide configuration service.

- Initialization/configuration is in `firebase-config.js`; it is loaded only by `songbook.html` after Firebase 9.22 compat App, Auth, and Realtime Database SDKs.
- Services used are Google Authentication (`firebase.auth()`) and Firebase Realtime Database (`database.ref('playlists')`). No Firestore SDK or Firestore API usage was found.
- Songbook playlist reads/writes use the Realtime Database `playlists` path. The code includes an architectural comment recommending Auth ID tokens, custom claims, or database rules, but the current client sets `isAuthorized = true` for any authenticated user. This is not sufficient authorization for a future admin control plane.
- The Firebase client configuration is public browser configuration and was not copied into this document. No secret credentials were exposed in this audit.
- Firebase is not initialized globally by the public homepage or standard content pages. `firebase-config.js` declares global `auth`, `database`, `currentUser`, and authorization state for Songbook.
- The current CSP includes Firebase-related Google/Firebase origins in Netlify headers, while `index.html` uses a separate inline CSP that does not currently load Firebase. A future public config fetch must be designed against both policies.
- The service worker returns early for cross-origin requests, so it does not currently cache Firebase requests. That is useful for avoiding stale remote configuration, but it also means future configuration caching must be deliberate.
- A future `admin.gracepraise.church` flow needs an explicitly authorized Firebase domain, an admin/editor role based on custom claims or a protected role document, rules that enforce those roles, and separate configuration namespaces from Songbook playlists. UI-only hiding is not authorization.

## Safe Admin Controls

These are content surfaces that are structurally independent when controlled by a whole-root adapter. The future evaluator should target semantic feature IDs, while a code-owned registry maps each ID to the actual selector and lifecycle behavior.

| Feature | Feature ID | File/route | Classification | Notes |
|---|---|---|---|---|
| Sacred Focus / Light of the Cross | `homepage.sacredFocus` | `index.html`, root `#sacred-focus` | SAFE TO CONTROL | Canvas and GSAP/Three.js work are scoped to this section. Hide the complete section, not only the canvas/content child. |
| Welcome Home | `homepage.welcomeHome` | `index.html`, root `#about` / `.welcome-home-v4` | SAFE TO CONTROL | Independent copy/photo section; no page runtime dependency. |
| Community carousel | `homepage.community` | `index.html`, root `#community-v5` | SAFE TO CONTROL | `community-carousel-v5.js` exits when its root is missing. Hide the entire root to avoid empty carousel geometry. |
| Featured Events / Get Involved flip cards | `homepage.featuredEvents` | `index.html`, root `#featured-events` | SAFE TO CONTROL WITH LIFECYCLE GUARD | Content is independent, but GSAP ScrollTrigger currently assumes its trigger exists. Future adapter must guard/destroy animation state. |
| Transformational Loop | `homepage.transformationalLoop` | `index.html`, root `#block_gpbc_transformational_loop` | SAFE TO CONTROL WITH LIFECYCLE GUARD | Slick carousel is initialized by inline code without an explicit root-length guard. Control at the section root. |
| Lord's Prayer heptagon | `homepage.lordsPrayerWheel` | `index.html`, root `.heptagon-wheel-section` / `.heptagon-wheel-container` | SAFE TO CONTROL WITH LIFECYCLE GUARD | `heptagon-wheel-sacred.js` has a whole-container guard but assumes required child arrays are complete. |
| Stay Connected | `homepage.stayConnected` | `index.html`, root `#stay-connected` | SAFE TO CONTROL | Whole section can be removed; its five cards should not be hidden independently until the grid has an empty-state design. |
| Homepage hero | `homepage.hero` | `index.html`, root `#home` / `.v2-hero` | SAFE TO CONTROL, DEFAULT LIVE | It is visually independent, but it is the primary identity/entry surface. A future UI should strongly discourage hiding it and must preserve the main heading/alternate entry path. |

## Dependency-Controlled Features

The following features can be administered, but their connected navigation, footer, homepage CTA, redirect, and route behavior must be controlled as one dependency graph. A page status alone is not enough.

| Parent feature | Dependent UI | Files/evidence | Required future behavior |
|---|---|---|---|
| `homepage.planVisit` / `pages.planVisit` | Hero Plan Your Visit CTA, homepage `#next-service` anchor, flip-card CTA, Transformational Loop CTA, footer Worship/Location links | `index.html`, `plan-visit.html`, `js/footer/footer.config.js` | Hide/Coming Soon must remove or transform all CTAs and preserve a valid Sunday-worship fallback. |
| `pages.calendar` / `homepage.specialEvents` | Header Calendar, countdown banner link, Stay Connected Events card, footer Events link, homepage dynamic event card | `index.html`, `calendar.html`, `events.js`, `countdown.js`, `homepage-events.js`, footer config | Calendar status must control homepage special-event rendering and banner targets. If the calendar is unavailable, retain a static worship/contact fallback. |
| `pages.prayer` | Header Prayer, Sacred Focus CTA, Stay Connected Prayer card, footer Prayer Request link, page form | `index.html`, inline/shared nav, `prayer-request.html`, `prayer-v15.js`, `prayer-form.js`, footer config | HIDDEN removes CTAs and nav links; COMING_SOON replaces the form destination with a safe notice; direct-route behavior must be defined. |
| `pages.giving` | Header Give, homepage Stay Connected Give card, dynamic event RSVP/Support CTA, footer Give link, giving aliases | `partials/header.html`, all inline nav variants, `index.html`, `homepage-events.js`, `give.html`, `netlify.toml`, footer config | One canonical ID controls `/give`, `/give.html`, and all redirect aliases. A hidden giving route must not leave payment CTAs pointing to it. |
| `pages.gallery` | Header Gallery and any gallery/content references | `partials/header.html`, inline nav copies, `gallery.html`, `gallery.js` | Remove the menu link and use a stable empty/coming-soon route if direct URLs remain reachable. |
| `pages.contact` | Footer Get Involved, ministry/game contact CTAs, page | `js/footer/footer.config.js`, ministry HTML, `contact.html` | Remove or replace dependent footer/CTA links together. |
| `pages.about` | About parent menu plus About Overview | `partials/header.html`, inline nav copies, `about.html` | Parent status must be coordinated with all About child routes. |
| `pages.about.history` | About dropdown, footer Our Story, cross-links | `partials/header.html`, inline nav copies, footer config, `history.html` | Hide link and any “Our Story”/history CTA together. |
| `pages.about.mission` | About dropdown, internal About links | `partials/header.html`, inline nav copies, `mission.html` | Same dependency behavior as other About children. |
| `pages.about.leadership` | About dropdown, footer Our Leadership, internal About links | `partials/header.html`, inline nav copies, footer config, `leadership.html` | Keep Pastor route behavior separate; do not infer one from the other. |
| `pages.about.beliefs` | About dropdown, footer Our Beliefs, internal About links | `partials/header.html`, inline nav copies, footer config, `beliefs.html` | Coordinated menu/footer updates required. |
| `pages.about.coreValues` | About dropdown, internal About links | `partials/header.html`, inline nav copies, `core-values.html` | Coordinated menu updates required. |
| `pages.about.positionPapers` | About dropdown, internal About links | `partials/header.html`, inline nav copies, `position-papers.html` | Coordinated menu updates required. |
| `pages.about.testimonies` | About dropdown, footer/content references, About links | `partials/header.html`, inline nav copies, footer/content files, `testimonies.html` | Remove the menu/CTA and preserve About page layout. |
| `pages.songbook` | About dropdown Songbook entry, any songbook CTA | `partials/header.html`, inline nav copies, `songbook.html`, Firebase/Songbook scripts | Hide UI entry and do not alter global runtime; Firebase only loads on the Songbook page. |
| `pages.devotions.daily` | Devotion parent menu, homepage Daily Devotion card, devotion cross-links, PWA shortcut | `partials/header.html`, inline nav copies, `index.html`, `daily-devotion.html`, `manifest.json` | HIDDEN must remove all public entry points and decide how the PWA shortcut behaves. |
| `pages.devotions.bibleReader` | Devotion dropdown and devotion cross-links | `partials/header.html`, inline nav copies, `bible-reader.html` | Coordinated menu/link update. |
| `pages.devotions.couples` | Devotion dropdown and devotion cross-links | `partials/header.html`, inline nav copies, `couples-devotion.html`, `assets/js/couples-devotion.js` | Coordinated menu/link update. |
| `pages.devotions.family` | Devotion dropdown and devotion cross-links | `partials/header.html`, inline nav copies, `family-devotion.html` | Coordinated menu/link update. |
| `pages.devotions.youth` | Devotion dropdown, Youth Games, ministry links | `partials/header.html`, inline nav copies, `youth-devotion.html`, `youth/games/index.html` | Coordinate devotion menu and Youth Games links. |
| `pages.devotions.children` | Devotion dropdown and Kids Ministry links | `partials/header.html`, inline nav copies, `children-devotion.html`, `ministries/kids-ministry.html` | Coordinate devotion menu and Kids links. |
| `pages.devotions.fasting21` | Devotion dropdown and devotion cross-links | `partials/header.html`, inline nav copies, `fasting-21days.html` | Archive guide can be hidden, but must not break the Devotion menu. |
| `pages.devotions.fasting30` | Devotion dropdown and devotion cross-links | `partials/header.html`, inline nav copies, `fasting-30days.html` | Archive guide can be hidden, but must not break the Devotion menu. |
| `pages.devotions.lent` | Devotion dropdown, `fasting-40days.html` redirect, Lent links | `partials/header.html`, `fasting-40days.html`, `lent-fasting.html`, `netlify.toml`, devotion scripts | One canonical ID must cover both the redirect alias and Lent destination. |
| `pages.devotions.gratitudeFasting` | Devotion dropdown and devotion cross-links | `partials/header.html`, inline nav copies, `gratitude-fasting.html` | Coordinated menu/link update. |
| `pages.ministries.overview` | Ministries parent menu, ministry breadcrumbs, homepage Start Serving CTA, footer Care & Outreach | `partials/header.html`, inline nav copies, `index.html`, `ministries.html`, footer config | Removing overview must also change breadcrumbs and overview CTAs. `/ministries/index.html` is a redirect alias. |
| `pages.ministries.bibleStudy` | Ministries dropdown, homepage Grow With Us card, breadcrumbs | `partials/header.html`, inline nav copies, `index.html`, `ministries/bible-study.html` | Hide dependent homepage card and menu item together. |
| `pages.ministries.communityDevelopment` | Ministries dropdown, breadcrumbs | `partials/header.html`, inline nav copies, `ministries/community-development.html` | Coordinated menu/breadcrumb behavior. |
| `pages.ministries.homeless` | Ministries dropdown, breadcrumbs | `partials/header.html`, inline nav copies, `ministries/homeless-ministry.html` | Coordinated menu/breadcrumb behavior. |
| `pages.ministries.hospital` | Ministries dropdown, breadcrumbs | `partials/header.html`, inline nav copies, `ministries/hospital-ministry.html` | Coordinated menu/breadcrumb behavior. |
| `pages.ministries.kids` | Ministries dropdown, Kids Devotion, Kids Games, breadcrumbs | `partials/header.html`, inline nav copies, `children-devotion.html`, `kids/games/index.html`, ministry page | Coordinate the family of Kids destinations. |
| `pages.ministries.menFellowship` | Ministries dropdown, footer/related ministry links, breadcrumbs | `partials/header.html`, inline nav copies, footer/content files | Coordinated menu/footer behavior. |
| `pages.ministries.missionOutreach` | Ministries dropdown, breadcrumbs | `partials/header.html`, inline nav copies, ministry page | Coordinated menu/breadcrumb behavior. |
| `pages.ministries.prison` | Ministries dropdown, breadcrumbs | `partials/header.html`, inline nav copies, ministry page | Coordinated menu/breadcrumb behavior. |
| `pages.ministries.supportMissionaries` | Ministries dropdown, breadcrumbs | `partials/header.html`, inline nav copies, ministry page | Coordinated menu/breadcrumb behavior. |
| `pages.ministries.worship` | Ministries dropdown, homepage Worship Together card, footer Praise & Worship link, breadcrumbs | `partials/header.html`, inline nav copies, `index.html`, footer config, ministry page | Hide/Coming Soon must remove homepage and footer ministry links. |
| `pages.ministries.youth` | Ministries dropdown, Youth Devotion, Youth Games, breadcrumbs | `partials/header.html`, inline nav copies, `youth-devotion.html`, `youth/games/index.html`, ministry page | Coordinate the Youth family of links. |
| `pages.pastor` | Footer Our Pastor, legacy pastor subdomain redirect | `js/footer/footer.config.js`, `netlify.toml`, `pastor/index.html` | Do not remove the footer link without an approved replacement. |
| `pages.kidsGames` / `pages.youthGames` | Ministry/devotion links and breadcrumbs | nested game `index.html` files, ministry/devotion routes, tests | Child resources should inherit parent status or display a safe coming-soon route. |

### Page dependency summary

The current header is not a single source of truth on every page. `partials/header.html` is used by partial-mounted pages, while many legacy/full pages contain copied inline nav markup. The footer is much more standardized: the `site-footer` partial is initialized across the tested route inventory and its link destinations are centralized in `js/footer/footer.config.js`. This means V21 should not attempt string replacement in HTML. It needs a route/feature registry that can drive both the shared footer renderer and the eventual page/template adapters, followed by a migration of inline nav copies.

## Protected System Components

These components must never be exposed as normal Admin visibility toggles:

- `platform-runtime.js`, including theme boot, partial loading, fallback header/footer, blank-devotion guard, and global error safety.
- `navigation.js`, the header framework, desktop navigation, mobile menu engine, dropdown state machine, anchor scrolling, and header height synchronization.
- `partials/header.html`, `partials/site-footer.html`, `partials/footer.html`, `js/partials.js`, `js/footer/footer-init.js`, `js/footer/site-footer.js`, and the footer rendering contract.
- Theme/day-night infrastructure: `platform-runtime.js`, inline theme boot code, `liturgical-calendar-engine.js`, `liturgical-theme-engine.js`, token systems, and the dark-mode control.
- Core accessibility behavior: skip link, focus management, menu focus trap, reduced-motion fallbacks, button/link labels, live regions, and page inert handling.
- Service-worker lifecycle and cache strategy in `sw.js`; a feature toggle must never be allowed to unregister, replace, or corrupt it.
- Configuration loading, schema validation, safe fallback, and error handling once V21 is implemented.
- Firebase SDK initialization and Songbook auth plumbing. Feature status may hide the Songbook surface; it must not disable core initialization code on a page that still loads it.
- Route/redirect infrastructure in `netlify.toml`, including the canonical `/give`, Lent, Ministries, and pastor redirects.
- 404/error handling and the public shell. The repository does not currently expose a dedicated 404 page, so future route gating must include a safe branded fallback rather than a blank response.
- Privacy Policy, Terms & Conditions, and essential contact/communication surfaces should not be normal content toggles because they support legal/footer/compliance expectations.
- Admin authentication and authorization. The future admin UI may control approved content IDs but never its own authorization enforcement.

## JavaScript Toggle Risks

The following risks were found by inspecting actual selectors, event listeners, animation initialization, and page-specific scripts. They are findings only; no fixes were made in Phase 1.

| Feature | File/location | Risk | Future fix |
|---|---|---|---|
| Featured Events flip cards | `event-flip-cards.js:27-69` | Creates a GSAP/ScrollTrigger timeline using the string trigger `.flip-scroll-section` without first requiring the section or any cards. Hiding/removing the section after initialization could leave an orphaned trigger/pin or an empty animation timeline. | Add a root existence/child validation guard and an explicit destroy/refresh lifecycle for status changes. |
| Transformational Loop Slick carousel | `index.html:1246-1320` | Inline jQuery/Slick initialization does not explicitly check that `#block_gpbc_transformational_loop .slider` exists. Empty jQuery collections are mostly no-ops, but this is not a safe dynamic lifecycle contract. | Gate initialization on `$slider.length`, keep a feature-owned initializer, and call Slick teardown before dynamic removal. |
| Lord's Prayer heptagon | `heptagon-wheel-sacred.js:17-20, 342-369, 421-425` | Whole-container absence is guarded at `:484-487`, but a partially removed/malformed wheel can leave `rotatingLayer` null or mismatch center items, labels, and dots. `announceContent()` assumes an indexed center item exists. | Validate required children and equal array lengths; store/destroy the instance on the feature root. |
| Shape-system carousels | `shape-system.js:18-19, 57-75, 153-205` | Circle slides assume matching dots; the Trapezoid slider assumes the current/next slide exists once a slider root is found. Partial child toggles can cause undefined element access. | Admin-control only at the feature root until markup validation and lifecycle support exist. |
| Sacred Focus canvas/motion | `index.html:4865-5157` | The initial canvas guard is good, but once Three.js/GSAP starts, observers, animation loops, and window listeners have no teardown path if a runtime status change removes the section. | Treat the section as immutable for the first rollout; later add an owner object with stop/disconnect methods. |
| Gallery | `gallery.js:29, 55-69, 181-185` | Error handling assumes `#noPhotos`; render assumes `#galleryGrid`/`#noPhotos`; the lightbox listener is attached at module load without a null guard. | Keep route-level gating outside the page script, add DOM guards, and make the gallery controller lifecycle-aware. |
| Firebase Songbook auth UI | `firebase-config.js:137-176` | `authButton` and `userInfo` are used without null guards; the script is safe only on the Songbook markup. More importantly, any authenticated user is currently marked authorized in client state. | Keep the script page-scoped, add guards, and move authorization to custom claims/rules/server validation before any admin reuse. |
| Calendar helpers | `calendar.js` and `members.js` | The page loads many helpers together; some functions assume calendar/member modal nodes. Removing individual markup without removing the page bundle can produce errors. | Gate each controller on its root and keep calendar as a route-level dependency-controlled feature. |
| Homepage event loader | `index.html:5171-5203`, `homepage-events.js:8-19` | The loader is correctly guarded by `#dynamic-events-container`, but the controller will render a generated `section.special-event-details` and CTAs to Give/Calendar if the container exists. | Give the dynamic event surface a semantic feature ID and make loader/rendering honor the published status before mounting. |
| Countdown banner | `countdown.js:726-784` | The inline banner is guarded, but the countdown still runs from the global page bundle and writes banner links/anchors. Hiding only the banner leaves an unnecessary interval; hiding Calendar without coordination can leave a bad target. | Coordinate banner with `homepage.specialEvents`/`pages.calendar`, and add a cancellable controller. |
| Navigation and partials | `navigation.js`, `js/partials.js`, `platform-runtime.js` | These are intentionally broad and expect the header/footer shell to exist or be loadable. Removing them to hide a page/section would break core navigation or fallback behavior. | Keep protected; future status evaluation must happen after shell boot and before feature-specific rendering. |

## Layout Toggle Risks

- The homepage sections use substantial responsive padding and several `min-height`/viewport-height contracts. Hiding an entire root element should remove its space; hiding only an inner heading, card, canvas, or grid child can leave an orphaned background or large empty region.
- Sacred Focus uses an absolutely positioned canvas/background inside `.sacred-focus`. The canvas and content must be hidden as a unit.
- Plan Your Visit uses a two-column grid, an image with desktop `min-height: 38rem`, legacy anchor spans, and a four-column expectation grid. Any future subfeature control must preserve or recompute the grid; root-level status is safer.
- Community V5 uses an absolutely positioned 3D carousel track with a fixed/clamped stage height. Hiding slides individually can leave incorrect transforms, empty controls, or a misleading carousel count.
- Featured Events uses `height: 110vh`, a sticky wrapper, absolutely positioned cards, and ScrollTrigger pinning. It must be controlled as a root feature with animation teardown/refresh; otherwise blank scroll distance or a pinned empty section is likely.
- The Transformational Loop has Slick-generated dots and layout rules tied to four slides. Hiding one slide without rebuilding dot geometry creates empty/incorrect dot positions.
- The heptagon wheel has a `min-height: 100vh` section, absolutely positioned geometry, and mobile-specific square sizing. Hide the whole section, never the wheel's inner layers independently.
- Stay Connected uses a five-card CSS grid with desktop two-row and mobile one-column layouts. Hiding individual cards needs an explicit empty-grid policy; root-level control is safe.
- Homepage and page-specific styles are broad and sometimes duplicated/legacy. Future render adapters should prefer root `[hidden]`/`display:none` plus a controlled empty-state class rather than raw CSS selector configuration.
- Desktop/mobile nav copies are not guaranteed to have the same links. A visibility change must be tested at desktop, iPad portrait/landscape, and mobile widths using the existing Playwright matrix.
- `lent-fasting.html` contains duplicate footer partial mounts in the current source at two locations. This is an existing structural risk and was not changed in this phase; future route-level config work should avoid increasing that duplication.

## Proposed Firestore Model

The current repository does not use Firestore. For V21, use Firestore for configuration only after a separate security design/review. Do not store raw CSS selectors in Firestore; selectors belong in a versioned code registry.

### Semantic feature registry in code

```ts
type FeatureStatus = 'LIVE' | 'HIDDEN' | 'COMING_SOON' | 'ADMIN_PREVIEW';

type FeatureDefinition = {
  id: string;                  // e.g. homepage.planVisit
  kind: 'homepage-section' | 'page' | 'page-family';
  defaultStatus: 'LIVE';
  dependencies: string[];     // semantic IDs, not selectors
  route?: string;              // code-owned canonical route
  fallback: 'omit' | 'coming-soon' | 'safe-shell';
};
```

Recommended initial IDs derived from this audit:

```text
homepage.hero
homepage.sacredFocus
homepage.planVisit
homepage.welcomeHome
homepage.community
homepage.specialEvents
homepage.featuredEvents
homepage.transformationalLoop
homepage.lordsPrayerWheel
homepage.stayConnected

pages.about
pages.about.history
pages.about.mission
pages.about.leadership
pages.about.beliefs
pages.about.coreValues
pages.about.positionPapers
pages.about.testimonies
pages.planVisit
pages.calendar
pages.gallery
pages.contact
pages.prayer
pages.giving
pages.songbook
pages.pastor

devotions.daily
devotions.bibleReader
devotions.couples
devotions.family
devotions.youth
devotions.children
devotions.fasting21
devotions.fasting30
devotions.lent
devotions.gratitudeFasting

ministries.overview
ministries.bibleStudy
ministries.communityDevelopment
ministries.homeless
ministries.hospital
ministries.kids
ministries.menFellowship
ministries.missionOutreach
ministries.prison
ministries.supportMissionaries
ministries.worship
ministries.youth

resources.kidsGames
resources.youthGames
system.privacyPolicy
system.terms
```

### Conceptual Firestore documents

```text
/siteConfig/draft
{
  schemaVersion: 1,
  state: 'draft',
  updatedAt: Timestamp,
  updatedBy: uid,
  features: {
    'homepage.planVisit': { status: 'LIVE' },
    'pages.calendar': { status: 'LIVE' },
    'devotions.daily': { status: 'LIVE' }
  }
}

/siteConfig/published
{
  schemaVersion: 1,
  state: 'published',
  publishedAt: Timestamp,
  publishedBy: uid,
  revision: number,
  features: { ...validated semantic status map... }
}

/siteConfig/revisions/{revisionId}
{
  source: 'draft' | 'published',
  createdAt: Timestamp,
  createdBy: uid,
  validation: { valid: boolean, errors: string[] },
  features: { ...immutable snapshot... }
}

/siteConfig/audit/{eventId}
{
  action: 'save-draft' | 'publish' | 'rollback',
  actorUid: uid,
  createdAt: Timestamp,
  revision: number,
  changedFeatureIds: string[]
}
```

The public website must read only `/siteConfig/published`. Admin writes must be restricted by server-enforced role claims/rules. Draft writes, publish operations, and rollback operations should be separately auditable. The public client should never be able to write configuration.

### Draft/published flow

```text
Admin change
  ↓
Save draft
  ↓
Validate schema + dependency graph
  ↓
Preview draft in an authenticated/admin-only context
  ↓
Publish immutable revision
  ↓
Published Firestore configuration
  ↓
Public website consumes published state only
```

### Failure-safe behavior

- Embed a versioned all-LIVE default map in the public bundle so a missing config preserves the current public site.
- Fetch published config with a short timeout and an `AbortController`; do not block first paint or core shell boot on Firebase.
- Validate `schemaVersion`, status enum, feature IDs, dependency references, and route canonicalization before applying any change.
- Ignore unknown feature IDs and malformed optional entries; reject the entire candidate published document if required validation fails.
- Keep the last known valid published config in memory and optionally in a versioned local cache, but never let stale config override a newer valid response without an explicit policy.
- Treat missing, unavailable, partially populated, or slow config as “use safe defaults / last-known-valid”; never render a blank page.
- Public behavior for `ADMIN_PREVIEW` should be equivalent to the safe public fallback (normally HIDDEN or COMING_SOON), while authenticated preview uses a separate, non-public preview path.
- Do not cache preview responses in `sw.js`; keep preview requests authenticated and isolated from public caches.
- Hide/show navigation, footer links, homepage CTAs, banners, and route shells through dependency-aware code, not by asking the admin to maintain selectors.
- Keep core navigation, theme, footer, error handling, accessibility, service worker, and Firebase initialization outside the feature-status evaluator.

## Recommended V21 Implementation Sequence

1. **Registry and schema contract** — Add a code-owned semantic feature registry, the four statuses, dependency metadata, route canonicalization, and all-LIVE defaults. No remote reads or public rendering changes yet.
2. **Dependency graph and adapters** — Create explicit adapters for homepage root sections, route shells, navigation, footer, homepage CTAs, banners, redirects, and devotion/ministry families. Add tests that prove a status cannot leave broken internal links.
3. **Published-config read path** — Add a read-only, timeout-bounded Firestore published-config client with schema validation, all-LIVE fallback, last-known-valid handling, and no impact on shell boot. Keep it behind a feature flag until tested.
4. **Admin authentication/authorization** — Design `admin.gracepraise.church` authentication using Firebase Auth plus server-enforced claims/rules. Do not reuse Songbook’s “any signed-in user is authorized” behavior.
5. **Draft, preview, publish, audit** — Build the Admin Control Center around draft and published documents, validation feedback, authenticated preview, immutable revisions, publish confirmation, and audit logs. Keep preview out of public/service-worker caches.
6. **Public enforcement and rollout** — Enable published statuses for dependency-controlled routes/sections, update the inline-nav migration plan, extend Playwright desktop/tablet/mobile coverage, and roll out gradually with a rollback revision ready.

## Files Changed

- `docs/v21-admin-control-center-plan.md` — this Phase 1 audit and planning document.

No HTML, JavaScript, CSS, Firebase, Netlify, service-worker, security-rule, data, or production configuration file was modified.

## Confirmation

- Existing public behavior was not changed.
- `main` was not modified.
- `netlify-live` was not modified.
- No production deployment occurred.
- No Firebase production data or rules were changed.
- No DNS or `admin.gracepraise.church` record was created.
- No Admin dashboard, login, Firestore read, route, or runtime feature toggle was implemented.
- Current branch is `v21-admin-control-center`.
