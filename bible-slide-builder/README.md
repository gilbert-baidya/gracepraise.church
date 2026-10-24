# GPBC Bible Slide Builder

## Architecture decision record

Bible Slide Builder is an authenticated GPBC Songbook ministry tool with browser-local Scripture presentation storage. It keeps its existing HTML pages and rendering pipeline, separate from the public Bible reader and Worship Song Studio.

The implementation is split into small modules:

- `bible-data-adapter.mjs` fetches the two XML files as bytes, verifies their locked SHA-256 digests, parses the actual case-insensitive Zefania-style elements, and builds one in-memory bilingual model. It imports the existing `services/bible/book-map.js` registry instead of creating a second maintained book list.
- `scripture-layout.mjs` performs verse-aware pagination on the 1600×900 logical canvas. Browser generation uses canvas text measurement at the real presentation font sizes. Scripture strings are only sliced at existing boundaries; rejoining stored fragments reproduces the adapter text exactly.
- `scripture-renderer.mjs` creates the live DOM presentation layer. Background, readability overlay, and Scripture are separate layers.
- `scripture-themes.mjs` owns the twelve immutable visual families and advisory program-type recommendations.
- `scripture-storage.mjs` owns the versioned localStorage schema and retains the previous revision whenever a set is saved again.
- `scripture-export.mjs` captures the approved slide DOM once at 3200×1800 and packages those same PNG captures as PPTX, PDF, or a PNG ZIP. The shared script loader is `js/presentation-library-loader.mjs`; licensed export bundles live in `assets/presentation/vendor/`. `npm run studio:vendor-export` synchronizes these and Studio's existing bundles from installed packages. Export never invokes pagination.
- `bible-slide-app.mjs` owns only UI state and orchestration.

## Authoritative Scripture source

The only Scripture sources are:

- `data/bible/source/bn-bsi-2016-ov.xml` — Bengali (BSI) 2016 O.V.
- `data/bible/source/en-niv-1984.xml` — English NIV 1984

Both XML files are read-only. Their byte-level SHA-256 values are locked in the adapter and in an independent regression test. XML entity decoding and removal of structural merged-verse markers such as `[6-7]` are parser operations; spelling, punctuation, and Scripture characters are never normalized, corrected, translated, or AI-rewritten. The adapter parses once at startup and caches the resulting model for the session.

The Bangla source does not encode book names. Its `bnumber` is joined to the existing verified repository map. The English source includes `bname`; the adapter audits it against the same canonical number. A bilingual request is refused when the two sources cannot be aligned to the same individual book, chapter, and verse. Merged or discrepant numbering is surfaced rather than silently paired.

## Presentation rules

All slides use a 1600×900 logical 16:9 canvas and a 3200×1800 export. Bangla and English single-language bodies target 54pt (72 CSS px). Bilingual mode keeps Bangla at 54pt and uses a 34pt supporting English block. The font is never reduced to fit: additional slides or continuation slides are created. The bilingual reference ribbon remains visible in every language mode and uses Bengali numerals on the Bangla side.

Pagination prefers complete verses, then existing sentence punctuation, Bengali danda, semicolon, colon, comma, whitespace, and finally a Unicode grapheme boundary for an indivisible long token. Verse numbers never become detached content. Continuation fragments retain their exact string slices and are marked `(cont.)` / `(চলমান)`. A final one-verse orphan is rebalanced when the preceding slide can safely donate a verse.

Automatic pagination never trims continuation slices. Each verse is reconstructed and compared with its source text before slides are accepted. If even one measured grapheme cannot fit, generation reports an error instead of silently emitting an overflowing or rewritten fragment.

Manual operations modify only the saved presentation copy: move a verse block, split safely, merge adjacent slides, reorder slides, change overlays/themes, add a blank pause slide, or reset to measured auto-layout. The master XML is never writable from the UI.

## Themes and backgrounds

The initial families are Shepherd's Peace, Word & Light, River of Grace, Cross & Dawn, Resurrection Morning, Communion Table, Bethlehem Night, Prayer Sanctuary, Victory Summit, Bangla Heritage, Revival Fire, and Sacred Minimal. Each is composed from CSS gradients, locally authored SVG geometry, silhouettes, light, texture, and a dedicated readability overlay. Scripture never appears in a background image. A later local 3200×1800 image can be added to a theme token without changing layout or Scripture data.

## Storage, authentication, and production

Saved Scripture sets use the versioned key `gpbc.bible-slide-builder.sets.v1`. Set identity combines service date and set name. Re-saving creates an explicit revision and never silently discards the prior snapshot. Corrupt or newer schemas fail without clearing existing browser data.

Sign in with the existing Google button in `songbook.html`. Its authenticated actions include **Bible Slide Builder**. Both Builder pages load the same `firebase-config.js`, Firebase 9.22 compat SDK, default Firebase app, and Auth instance. No separate Firebase project, credentials, login screen, or persistence override is introduced. Firebase's existing local persistence restores the session across same-origin navigation, refresh, and tabs.

`protectSongbookTool` keeps content hidden and defers importing the rendering modules (and fetching XML) until `onAuthStateChanged` confirms a user. Signed-out visitors are redirected to `/songbook.html?returnTo=...#authButton`. Only the two exact Builder destinations are accepted; external URLs and unrelated paths are ignored. After login the original destination opens automatically. Auth initialization errors show an explicit failure state instead of granting access. Sign-out also hides and redirects already-open Builder tabs. Back/forward-cache restores recheck Firebase. **Back to Songbook** retains the same session.

`scripts/build-production.mjs` includes Builder runtime pages/modules, shared export assets, and the complete authoritative Bible XML files under the confirmed GPBC redistribution permission. Review screenshots, development files, and the entire Worship Studio remain excluded. Existing public derived Bible indexes are unchanged.

Builder controls are disabled in the initial HTML and remain disabled while XML is loaded, controls are populated, and listeners are bound. `SOURCE LOCK VERIFIED` is shown only after initialization completes. Failure leaves controls disabled and offers **Retry initialization**, which reloads the page without removing saved sets or changing the Firebase session.

Production selection rejects debug, patch, probe, scratch, temporary, trace and generated test-artifact names/directories even if Git tracks them. Preserve local probes, but do not include them in the release commit. Netlify is pinned to Node 22.22.3, compatible with the current locked dependencies; no dependency upgrade is required.

Authoritative Bible XML files are included in the production artifact under the confirmed redistribution permission. See [Bible source documentation](../data/bible/README.md) for the source and integrity details.

This is client-side application access protection, matching Songbook's static-site architecture. Static HTML, JavaScript, and XML bytes are not private server resources; a JavaScript-disabled visitor still receives the loading shell, not the interactive Builder. Confidential files would require server-side Firebase token verification rather than this UI guard. Saved sets remain in browser localStorage after logout and are not isolated by Firebase user.

## Run and verify

From the repository root:

```sh
npm run local:review
```

Open the Songbook page, sign in with an authorized account, and select **Bible Slide Builder**. The current site hostname must be authorized in the existing Firebase project's Auth settings.

Automated checks:

```sh
npm run test:bible-slide-builder
npm run test:bible-slide-builder:e2e
npm run test:production-artifact
npm run test:worship-studio
```

The real Firebase session browser test uses an isolated Auth emulator (no production users are created). Start it on port 9198 with `firebase emulators:start --only auth --project demo-gpbc-songbook --config <local-emulator-config>`, using an emulator config with `emulators.auth.port` set to 9198 and UI disabled. Then run `npm run test:bible-slide-builder:e2e` against the local review server. Set `BASE_URL` and `SONGBOOK_AUTH_EMULATOR` to override the website and emulator URLs. Other Builder regressions use a test-only Auth stub; no stub or emulator routing is shipped to the website.

## Known limitations

- Export slides are fidelity-first 3200×1800 images. PowerPoint Scripture is therefore not individually editable, and PDF text is not searchable.
- Saved sets are local to one browser profile; there is no cloud sharing or multi-user revision service.
- Browser canvas measurement is used for generation and DOM geometry is rechecked before export. A missing local font may alter line wrapping and is treated as an overflow that must be resolved.
- Source numbering discrepancies are intentionally blocked in bilingual mode until a human-approved alignment rule exists.
