# GPBC Bible Slide Builder

## Architecture decision record

Bible Slide Builder is a loopback-only, browser-local Scripture presentation tool. It is deliberately isolated from the public Bible reader and from Worship Song Studio so that a Scripture feature cannot change the mature Songbook pipeline.

The implementation is split into small modules:

- `bible-data-adapter.mjs` fetches the two XML files as bytes, verifies their locked SHA-256 digests, parses the actual case-insensitive Zefania-style elements, and builds one in-memory bilingual model. It imports the existing `services/bible/book-map.js` registry instead of creating a second maintained book list.
- `scripture-layout.mjs` performs verse-aware pagination on the 1600×900 logical canvas. Browser generation uses canvas text measurement at the real presentation font sizes. Scripture strings are only sliced at existing boundaries; rejoining stored fragments reproduces the adapter text exactly.
- `scripture-renderer.mjs` creates the live DOM presentation layer. Background, readability overlay, and Scripture are separate layers.
- `scripture-themes.mjs` owns the twelve immutable visual families and advisory program-type recommendations.
- `scripture-storage.mjs` owns the versioned localStorage schema and retains the previous revision whenever a set is saved again.
- `scripture-export.mjs` captures the approved slide DOM once at 3200×1800 and packages those same PNG captures as PPTX, PDF, or a PNG ZIP. It reuses Worship Studio's checked-in browser libraries; export never invokes pagination.
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

Manual operations modify only the saved presentation copy: move a verse block, split safely, merge adjacent slides, reorder slides, change overlays/themes, add a blank pause slide, or reset to measured auto-layout. The master XML is never writable from the UI.

## Themes and backgrounds

The initial families are Shepherd's Peace, Word & Light, River of Grace, Cross & Dawn, Resurrection Morning, Communion Table, Bethlehem Night, Prayer Sanctuary, Victory Summit, Bangla Heritage, Revival Fire, and Sacred Minimal. Each is composed from CSS gradients, locally authored SVG geometry, silhouettes, light, texture, and a dedicated readability overlay. Scripture never appears in a background image. A later local 3200×1800 image can be added to a theme token without changing layout or Scripture data.

## Storage, access, and production exclusion

Saved Scripture sets use the versioned key `gpbc.bible-slide-builder.sets.v1`. Set identity combines service date and set name. Re-saving creates an explicit revision and never silently discards the prior snapshot. Corrupt or newer schemas fail without clearing existing browser data.

The application enables itself only when `window.location.hostname` is exactly `localhost`, `127.0.0.1`, or `[::1]`. Query parameters, cookies, localStorage, deceptive suffixes, LAN addresses, and production hosts cannot bypass the gate. This is a local workflow guard, not remote authentication.

`scripts/build-production.mjs` excludes the entire `bible-slide-builder/` directory and the authoritative XML source directory from `public-build/`; the public derived Bible indexes remain unchanged. Admin V21 creates local-tool launchers only on an exact loopback hostname. Worship Song Studio remains a separate local tool and its behavior/data are not refactored.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/bible-slide-builder/`.

Automated checks:

```sh
npm run test:bible-slide-builder
npm run test:bible-slide-builder:e2e
npm run test:production-artifact
npm run test:worship-studio
```

## Known limitations

- Export slides are fidelity-first 3200×1800 images. PowerPoint Scripture is therefore not individually editable, and PDF text is not searchable.
- Saved sets are local to one browser profile; there is no cloud sharing or multi-user revision service.
- Browser canvas measurement is used for generation and DOM geometry is rechecked before export. A missing local font may alter line wrapping and is treated as an overflow that must be resolved.
- Source numbering discrepancies are intentionally blocked in bilingual mode until a human-approved alignment rule exists.
