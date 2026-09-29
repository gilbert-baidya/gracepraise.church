# V21 Public Integration Adapter — Phase 5

Phase 5 connects the static public website to the published V21 configuration through a narrow, read-only adapter. The website does not read Firestore directly and does not load Firebase SDKs for this feature.

## Public configuration delivery

The trusted backend exposes:

`GET https://us-central1-admin-gpbc-website.cloudfunctions.net/getPublishedWebsiteConfiguration`

The response contains only:

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "features": {
    "homepage.planVisit": { "state": "LIVE" }
  }
}
```

The real response includes the complete shared feature registry. Published author, UID, timestamp, and source-draft metadata are deliberately excluded. The endpoint is GET-only, has a short public cache window, and returns generic no-store errors when the Published document is missing or invalid.

## Adapter modes

`website-control.js` supports:

- `DISABLED`: no request and no DOM change.
- `SHADOW`: fetch and validate Published configuration, generate diagnostics, and make no DOM change.
- `ACTIVE`: fetch and validate Published configuration, then apply behavior only to the explicitly selected low-risk test markers.

The checked-in default is `SHADOW`, owned by `shared/website-control-runtime.js`. Pages and route scripts do not provide a mode; the adapter only accepts endpoint/test plumbing, and an admin-only preview uses a trusted application surface rather than a query-string authorization flag.

The adapter uses the shared browser/server schema, a 1.2-second timeout, `credentials: omit`, and fallback behavior that leaves the existing page visible when delivery fails. It does not block initial rendering or add a loading overlay. In ACTIVE mode, the approved homepage markers and controlled routes use temporary `visibility: hidden` while the request is pending, preserving their layout boxes; the boundary is removed on success, timeout, or any validation failure.

## Phase 5 ACTIVE test features

Only these homepage sections are actively controlled in Phase 5:

- `homepage.planVisit`
- `homepage.welcomeHome`
- `homepage.community`

They have stable `data-gpbc-feature` markers and are isolated section boundaries. `HIDDEN` sets `hidden` and `aria-hidden`; `COMING_SOON` adds a state marker/class without removing content; `LIVE` restores the section. `ADMIN_PREVIEW` is treated as unavailable to public visitors.

Giving, Prayer, Songbook, authentication, forms, payments, navigation, footer, theme, service-worker behavior, and Firebase initialization are intentionally not ACTIVE-controlled in this phase.

## State and direct-route strategy

The dependency engine resolves a feature’s own state and its declared dependencies. `HIDDEN` and `ADMIN_PREVIEW` propagate as unavailable; `COMING_SOON` propagates to a LIVE dependent feature. Cycles are bounded by the resolver’s visiting set.

Future direct-route handling should be implemented in route/page entry logic, not by public query strings:

- `HIDDEN`: direct visits resolve to the site’s controlled unavailable/not-found experience.
- `COMING_SOON`: direct visits resolve to a controlled Coming Soon experience with a stable return path.
- `ADMIN_PREVIEW`: direct public visits resolve exactly like `HIDDEN`; preview access belongs behind authenticated admin authorization.

Phase 5 does not rewrite direct routes. It reports route links in Shadow mode and limits ACTIVE behavior to marked homepage sections.

## Service worker and performance

The existing service worker continues to exclude `/admin/v21` and does not cache cross-origin requests. The public configuration endpoint therefore remains outside the static asset cache. The adapter has no Firebase SDK dependency, uses a short timeout, and accepts a small response with a bounded cache policy.

The public endpoint is read-only, sends no credentials, and returns only sanitized Published state. Production deployment should still verify the desired origin policy at the hosting and function layer.
