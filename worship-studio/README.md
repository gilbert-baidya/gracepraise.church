# GPBC Worship Song Studio — local presentation modes

This directory is a local-development foundation for the workflow:

`Songbook → Sunday Set → Auto Layout → Manual Edit → Preview → Export`

The Studio creates editable, set-specific Congregation, Musician, Phonetic + Chords, and Phonetic presentations, with local PPTX/PDF/PNG downloads, without writing to the master Songbook.

## Verified repository source

The Studio reads the same static JavaScript sources as `songbook.html`:

- `../songs-catalog.js`: metadata-first Bangla catalog used for the public Songbook's initial render.
- `../songs-data.js`: 1,410 full Bangla records, loaded on demand.
- `../english-songbook-data.js`: 82 English archive records.
- Total: 1,492 songs, unique stable integer IDs 1–1492, with no empty lyric records or duplicate IDs in the audited source.

Bangla records contain `id`, `title`, `category`, and `lyrics`. English records use the same core fields and may also include language, source/page, capo/key, section, parsing, duplicate, and rights-review metadata. The Studio adapter freezes read-only clones and never changes these global source arrays.

## Existing Songbook trace

- Route: Netlify serves the static repository root; `/songbook` resolves through the existing static-page behavior to `songbook.html`.
- Loading: `songbook.html` loads `songs-catalog.js` immediately. `songbook-app.js` injects `songs-data.js` when lyrics are first needed and combines those records with `window.GPBC_ENGLISH_SONGS`.
- Search: `songbook-app.js` normalizes Unicode text and searches titles, alternate titles, and lyrics after full data is loaded.
- Lyrics/chords: lyrics and chord rows are stored together in each song's raw `lyrics` string. A conservative chord-line parser plus `song-chord-alignments.js` / `english-songbook-alignment.js` supports the reader.
- Phonetics: Bangla phonetics are generated at read time by `convertToPhonetic()` in `songbook-app.js`, with a very small manual override map. `phonetic-v2.js` exists but is explicitly not loaded by the current Songbook. Generated phonetics are therefore not treated as reviewed master content.
- Transposition: `songbook-app.js` parses chord symbols, transposes chromatically, handles slash chords, and provides smart-capo display controls.
- Authentication/persistence: the public Songbook uses Firebase Auth plus Realtime Database playlists. Its current client code sets `isAuthorized = true` for every signed-in user. Separately, the V21 admin control center uses Firebase custom claims and trusted Functions/Firestore paths. The public playlist authorization is not sufficient to protect this Studio.

## Milestone architecture

- `index.html`: local-only Studio surface. It directly includes the existing catalog metadata and English data files.
- `songbook-adapter.mjs`: loads the existing full Bangla source on demand, validates unique IDs and required fields, freezes record copies, and provides catalog search. This is the only Studio boundary to master-song data.
- `layout-engine.mjs`: recognizes chord-only rows and verse/chorus markers, creates a configurable section sequence, maps 54pt to 72 CSS px, prefers three source lyric lines, balances each section, and limits slides to four rendered lines.
- `presentation-modes.mjs`: adapts the existing Songbook runtime into separate presentation copies, preserving source-line provenance and chord word anchors through mode-specific phrase layout.
- `studio-storage.mjs`: versioned browser-local Sunday-set persistence.
- `studio-app.mjs`: date/name editing, catalog search, add/remove/reorder, section order and chorus repetition, generation, manual editing, line movement, splitting/merging, slide reordering, preview, and save/reload.
- `studio.css`: responsive editor UI and a fixed 1600×900 logical slide canvas. Congregation remains 54pt; chorded modes fit within 54–48pt. The complete canvas is scaled as a unit for browser preview.

The persisted set stores only stable Songbook IDs, section order, and set-specific slides. Manual slide text is a derivative copy. It never writes edited text back to a song record.

## Persistence and access limits

Milestone persistence uses `localStorage` under `gpbc.worship-song-studio.sunday-sets.v1`, with one saved set per service date. Saving the same date replaces that browser-local date entry. It requires no schema migration or insecure database rules and supports save/reload on the same browser profile. It does not sync between devices or users, is cleared with browser storage, and provides no collaboration or server backup.

The Studio intentionally enables its UI only on `localhost`, `127.0.0.1`, or `[::1]`, is not linked from the public navigation, includes `noindex` page metadata, and shows a blocked screen on non-local hosts. The hostname gate limits accidental use of this unfinished browser-local workflow; it is not authentication or a publication safeguard.

These protections are distinct:

- **UI use:** the hostname check disables the normal Studio UI on non-local hosts. Client-side code can be bypassed.
- **Indexing:** robots metadata and any `X-Robots-Tag` header request that cooperative crawlers avoid indexing. They do not restrict access.
- **File publication:** the existing Netlify `publish = "."` can physically include this directory in a future deployment. Neither the UI gate nor robots directives exclude files from the deployed artifact.

This milestone must remain local-only operationally: do not deploy it. The unnecessary Studio-only Netlify header addition has been removed; no publish directory or deployment settings were changed for this local audit. Before any future publication, establish an explicit artifact-exclusion or authorized-publication decision. Trusted authorization and server-backed storage remain separate future work, not part of this milestone.

Local development requires no login on the exact loopback hostnames listed above. Every other hostname defaults to denied UI access, not an unauthenticated production session. The decision uses only `window.location.hostname`; no query parameter, cookie, browser-storage value, environment fallback, or hidden override enables local bypass. Automated tests cover direct access on `127.0.0.1` and `localhost`, a routed IPv6-loopback origin, and denial on production, non-local, deceptive loopback-suffix, and LAN hostnames even with client-side override attempts.

Storage parse, access, quota, and invalid-set errors are reported rather than silently clearing or replacing existing saved data. Reloading over unsaved edits requires confirmation. Merge and line-movement controls operate only between slides of the same song so that removing a song cannot erase another song's lyrics. Moving slides themselves remains unrestricted.

## Four local presentation modes

The mode buttons above the previews select Congregation (original lyrics, no chords), Musician (original lyrics with chords), Phonetic + Chords, or Phonetic. English archive lyrics remain English in every mode. Selecting an ungenerated mode creates its first presentation from the existing Sunday-set references; returning to an already generated mode never regenerates it. Generate slides explicitly replaces only the active mode after confirmation. Adding or reordering songs preserves existing presentations until explicit regeneration.

Each mode has its own editable slides and key/capo settings per song. The legacy `slides` storage field remains the congregation copy; schema version 2 adds `modeSlides`, `modeSettings`, and `activeMode` under the same browser-local storage key. Existing congregation-only saved sets load without changing their manual structure. Saving is explicit. Removing a song removes its derivative slides/settings in every mode, not master data.

### Shared Songbook runtime

`songbook-app.js` exposes an immutable `GPBCSongbookPresentation` facade for its existing computational helpers. Its reader initialization runs only when the reader's `songList` exists, so loading the same script in Studio does not initialize Firebase, copy protection, Songbook navigation, or reader UI. Existing Songbook authentication is unchanged.

Studio explicitly loads and awaits `songbook-app.js?studio-runtime=4` through the existing classic-script loader before catalog initialization, then validates the facade methods. It does not assume a global from another page. The distinct versioned URL avoids reuse of pre-facade bytes cached under the public reader's unversioned URL. The Studio entry module, every static module dependency, and stylesheet use the same `studio-startup=11` revision so cached resources from older revisions cannot mix with this bootstrap. Bump the entry/dependency revision together for future incompatible module changes. No caches, saved sets, service workers, or Netlify settings are cleared or changed. Resource failures remain visible rather than substituting data. Cold-start browser tests create their own new contexts and cover direct navigation, reload, cache-busted navigation, delayed runtime readiness, old unversioned reader/module isolation, and failed-resource reporting.

### Natural phonetic pronunciation (proposed for linguistic review)

The active Songbook converter, not the shadow V2 engine, supplies both phonetic modes and cached search. Bare final consonants and final y no longer acquire a mechanical `o`; explicit vowel signs remain intact. Conjunct consonant sounds are separated from their inherent vowel before applying a vowel sign. Nukta spellings are canonicalized in memory, never in master lyrics. Whitespace, punctuation, line boundaries and word counts are retained; existing approved song-specific line overrides still take precedence.

An explicit vocabulary table records user-confirmed name/style anchors, retained final-vowel exceptions and proposed high-confidence lexical corrections. A bounded set of common verb stems shares explicit suffix shapes proposed for review for infinitives, tense and person (for example `করতে` → `korte`, `করবেন` → `korben`, `করছি` → `korchhi`), rather than deleting medial vowels in arbitrary words. Ambiguous final ব/ত/হ and known conjunct vowels retain their established vowel unless an explicit lexical correction applies; this avoids damaging future-tense forms and adjectives through universal vowel deletion. Past-tense exceptions are retained explicitly. This is not a claim that every catalog word has been reviewed. Context-sensitive pronunciation, unreviewed ya-phala assimilation, nasalization and archaic words still require human review. Saved/manual mode copies are not silently regenerated: regenerate a mode explicitly to see updated pronunciation, preserving any edits first.

### Phonetic-English search

Both the public Songbook and Studio reuse `getSongSearchFields` / `matchSongSearch` from the active Songbook runtime. A WeakMap lazily caches normalized title, alternate title, lyric, category, and runtime-phonetic fields per immutable source record. Bangla searches do not require building phonetic fields; Latin queries reuse the same generated index after the first search. Normalization lowercases, trims, and treats punctuation/hyphens as word separators. Studio keeps original-title and lyric matches ahead of phonetic matches and returns each song at most once, with a small phonetic-match label.

The active converter's existing `য়` handling incorrectly compared a single UTF-16 character to the two-character `য়` sequence. It now canonicalizes precomposed `য়` in memory and consumes `য` plus nukta together, including its following vowel. Both `দয়া` and `দয়া` generate `Doya`, so `doya` is searchable without another transliteration system or changes to master lyrics. This targeted runtime correction also improves displayed phonetics containing that letter; other converter limitations remain reviewable.

Real checks include `doya` (lyric match #2), `ar-kono nam nai` (title #117), `atmar dane hoy bhorpur` (lyric #117), Bangla search for #117, and English `10,000 reasons` (#1411). Catalog size remains 1,492.

Reused directly:

- `parseChordLine`, `getLyricWordTokens`, `getSongChordAlignments`: raw chord parsing, grapheme-safe logical word positions, Bangla source-spacing alignment, manual alignment overrides, and English PDF-sidecar anchors.
- `getSongPhoneticLine`: the production runtime converter and its existing song-specific overrides, including #117. `phonetic-v2.js` and its reviewed words/phrases remain shadow tooling and are **not** promoted into production use.
- `getSongBaseKey`, `transposeChord`, `transposeChordSymbol`, `transposeChordLine`: the same root, quality, grouped/optional, and slash-chord behavior as the reader.
- `getSuggestedCapos`, `getSongSourceCapo`: existing smart-capo suggestions and printed arrangement metadata. The suggestion helper accepts an optional semitone argument; its existing reader default is unchanged.

Studio's adapter supplies target-key selection, mode-local state, source-line association, phrase pagination, and chord/lyric word-box rendering. It does not implement another chord parser or transliteration engine.

### Chord/phonetic association and layout

Phonetics are generated for the **whole original lyric row** before phrase splitting, preserving runtime overrides. When source/display word counts correspond, the existing word-index anchors follow the same words into each split phrase; indexes are rebased for the new logical line. Chords appear above their corresponding words, never collected at the start of an otherwise aligned line.

Musician and Phonetic + Chords fit up to four meaningful logical phrases per slide. Each candidate tries 54pt with normal spacing, 54pt with tighter spacing, then 53, 52, 51, 50, 49 and 48pt. Chords are always half the lyric point size, calculated proportionally. The absolute floor is 48pt; no lower size or congregation shrinking is permitted.

Normal lyric leading is 1.25, chord leading 48 CSS px at 54pt, and phrase gap 12px. The tighter profile uses 1.16 lyric leading, proportional chord leading starting at 44px, and a 4px gap. Chorded-only canvas top/bottom padding is 52px (congregation remains 76px/66px). The measured content budget is 620px with protected title/footer margins. Chord and lyric word boxes stack without baseline collisions; lyric rows lacking positioned chords do not reserve empty chord-row height.

Generation measures word boxes (including rounded widths, padding, and widest chords over twelve transpositions). Original source rows remain intact if they can fit at the allowed floor. Otherwise existing smart phrase splitting runs at that width; final word-boundary splits rebalance short tails instead of leaving a single word. A section-local dynamic pagination pass minimizes safe page count and penalizes source-row boundaries, isolated short endings and uneven groups, favoring 2+2 or 3+2 over 3+1 or 4+1 when merging is unsafe. It never combines distinct sections or rewrites lyrics/chord anchors.

After rendering, the preview tries the same profiles against actual browser geometry, including chord/lyric rows, horizontal width and title/footer clearance. The label reports the actual point sizes, and a successful fit removes the red overflow warning. Only content still exceeding capacity at 48pt gets a split/review warning. Generated profiles persist as `chordLayout` in the existing mode-specific copies and are validated on reload. Legacy and manual chorded slides receive adaptive **styling only**: their lyric structure, ordering and anchor confidence are never automatically regenerated or repaginated. Use confirmed Generate slides to apply new section balancing to an existing copy.

Phonetic without chords retains its previous three-phrase behavior. All modes retain 16:9 canvases, the selected set-wide church theme, section order/repetition, and derived per-song serials.

The key selector uses the reader's original-key detection (first parsed chord root, **not a newly verified musical tonic**). Displayed chords use target-key semitones minus the selected capo; lyrics and master chords are untouched. Smart-capo suggestions show the reader's preferred shapes. Key/capo choices persist independently in each chorded mode.

### Review and manual-edit safeguards

- Missing chords produce an explicit notice and no fabricated progression.
- Bangla source-spacing anchors remain approximate and are labelled for musical review even when the reader rates them high-confidence.
- Ambiguous alignment, invalid anchors, or non-corresponding phonetic word counts retain the real progression as **unpositioned, review-required** data rather than guessing word associations. Unpaired chord rows remain visible in review notes.
- Runtime phonetic output is labelled for pronunciation review. The improved active converter still needs linguistic review; it is not silently replaced by the shadow engine.
- Editing lyrics with chords invalidates their automatic positioning. The progression remains visible; edit the source-key chord/1-based word positions and explicitly confirm positions before displaying anchors again.
- Split, merge, line movement, and slide movement carry the corresponding chord metadata. These actions never re-run phrase splitting or phonetic conversion.
- Chorded manual edits try the same safe 54–48pt fitting range without changing logical lines; only unresolved geometry is flagged. Congregation manual edits remain fixed at 54pt and are flagged rather than shrunk.

Real verification examples: #117 (Bangla chords, D reader key, inspected phonetic overrides; all four modes), #2 (compact Bangla chords, F# reader key), #831 (no chords and previous phrase/serial regressions), and #1411 (English archive/PDF anchors, A reader key).

Adaptive review includes #696, `দয়া কর আমার উপর ওহে যীশু দয়াবান`: four first-stanza lines with real chords now share one Musician slide, and the later `করিবার` endings remain attached to their phrases. Its newly generated Musician copy drops from 8 to 4 pages; Phonetic + Chords from 13 to 8. #62 provides a real reduced-font preview regression. Existing saved sets are not silently regenerated to these new counts.

## Same-song verse chord suggestions

`chord-propagation.mjs` automatically analyzes every song on Musician / Phonetic + Chords generation, never another song's chords. All usable real chorded sections, including later and partially chorded verses, are compared as song-local pattern families. Same-type sections may supply missing coverage; verse/chorus/bridge patterns are never transferred across types. Existing chorded target rows always win.

Sources are grouped by section type, ordered chord sequences, phrase count and approximate relative chord distributions across canonical phrase rows. Partially covered sources can join a family when shared confirmed rows agree and no covered rows conflict. Adjacent repeated lyric rows may be collapsed for comparison only; displayed lyrics remain untouched. A structural score combines phrase count, measured original-language width ratio, nearest-boundary mapping error, word-density difference, missing source coverage and agreement with already chorded target rows. A target selects the closest family, not automatically Verse 1. Unsupported rows in that family remain review-only instead of borrowing a different melody. Equally plausible conflicting placements also remain review-only. Exact repeated lyric evidence can support a row independently.

Studio recognizes printed standalone optional `(C)` chord tokens that the shared runtime parser currently misses. It recovers only those missing source rows via the shared aligner on a disposable song copy, preserves the printed optional symbols, and labels their spacing approximate. Every already recognized master alignment remains unchanged; the master runtime/catalog/sidecars are not rewritten.

Mapping uses measured **original-language** word starts, punctuation phrase groups, relative phrase widths and monotonic word-boundary placement, not equal word numbers. Printed verse-number prefixes are excluded from the musical width. Equal phrase counts map within the corresponding phrase; a small phrase-count difference uses whole-row proportional mapping and requires review. A trailing repeated ending may be excluded from the template when the target has one fewer row; it is never removed from the displayed source lyrics. Compact printed chord runs are separated into their actual parsed symbols only in suggestions; grouped/optional chords and every original source anchor remain unchanged.

Phrase/row beginnings and final-word cadences retain their boundary roles even when phrase counts differ. Punctuation-only tokens and explicit repeat markers are not chord targets. A syllable-continuation `--` is not mistaken for a new phrase. Contradictory source patterns no longer block the entire song: real #117 can use its later Verse 2 family for supported rows while retaining unsupported middle rows for review rather than blending the inferred opening refrain.

High confidence requires clean phrase/width mapping, reviewed high-confidence source positions (not approximate Bangla source spacing), no close conflicting family, and explicit verse headings or identical lyric evidence. Medium suggestions are displayed with `Suggested from Verse X — review positions`; low confidence places no chords and shows `Chord pattern needs review`. Songs without usable confirmed sources show `No confirmed chord source available.` These are structural heuristics, not melody/audio recognition or musical approval. Blank-line sections in the catalog are inferred verses, so their suggestions cannot claim high confidence solely from the parser label.

Each suggested row carries song-local provenance, source verse/row, pattern family, structural-score alternatives, confidence, reason and `suggested`, `confirmed` or `needs-review` status. The editor exposes **Confirm suggested chord positions** and existing chord/word-position adjustments. Edits invalidate confirmation until reviewed again. Sunday-set save/reload and export metadata retain those records; optional new fields preserve compatibility with older saved suggestions. No master chord sidecar or lyrics are written.

The song-level **Apply same-song chord suggestions** action updates already generated, non-manual chorded copies for that song only, using normal adaptive pagination including the added chords. Whole manual mode copies for that song are preserved and explicitly reported as skipped. Switching themes/modes or loading old saved copies never silently regenerates them. Use this action on legacy generated copies or confirmed Generate slides for a new copy. Musician and Phonetic + Chords derive the same original token identities; differing display widths may split phrases differently without changing those identities. Congregation / plain Phonetic do not receive chords.

For real #696, the opening four-row verse has a repeated final ending, while verses 2–4 each have three rows. All nine later rows receive **medium-confidence** suggestions from the first three opening rows, pending a musician's approval of the repeat/cadence relationship and exact word positions.

Real #1019 has a repeated opening lyric row and a separately chorded four-row final stanza. Its two-row Verse 2 and Verse 3 select the opening Verse 1 family, not the differently structured final stanza. Repeated-row matching and approximate printed spacing keep these suggestions medium-confidence, pending musical approval.

Run `node --test tests/worship-studio/chord-propagation.test.mjs` and the matching Playwright spec. The browser spec writes a full real-catalog audit with per-song/section confidence counts using actual Bangla canvas measurements, and records later-verse screenshots in both chorded modes.

## Congregation presentation design

The shared church theme engine supplies gradients, atmospheric vectors, depth treatment and coordinated accents. The lyric area remains clean with high-contrast warm-white text. Geometry stays 1600×900 (16:9), with 72 CSS px representing 54pt; congregation text is never shrunk to fit.

Before auto-layout, Studio-only phrase formatting measures each lyric row at 54pt. Rows that already fit remain intact. Over-width rows may split after existing comma, semicolon, colon, danda, or sentence punctuation followed by whitespace. Candidates must retain at least two words on each side, keep each fragment at least 22% of the text-area width, and reduce the widest fragment by at least 15%. The most balanced candidate wins; still-over-width phrases may be considered again. Numbered verse prefixes and numeric colon references are not phrase boundaries. Punctuation and words remain unchanged; the separating whitespace becomes a logical line break. This heuristic is not a language parser, so generated phrase choices should be visually reviewed.

When no qualifying punctuation boundary exists, word-space candidates are considered only if both resulting lines fit the text area. A trailing repeat-marked phrase of two or three words is prioritized: it may be as short as 12% of the text width, provided the widest phrase is reduced by at least 8%. Existing `-`, en/em dash, and parenthesized 2/3/4 markers (Bangla or Latin digits) are preserved exactly. Otherwise both halves require at least three words, at least 40% of the text width, a width ratio of at least 0.55, and a reduction of the widest phrase by at least 25%. No isolated word or detached verse number qualifies. A small Bangla/English linking-word guard rejects breaks after articles, possessives, and common connectors such as “এ”, “তোমার”, “the”, or “of”. This is a conservative visual heuristic, not a claim that every whitespace boundary is musically correct; review generated phrasing and use manual overrides where needed.

Auto-layout prefers up to three meaningful logical lyric lines while keeping a four-rendered-line safety limit. Indivisible phrases may wrap; only a phrase exceeding the full safe capacity is split at word/grapheme boundaries. Within each verse/chorus, an avoidable one-line ending is rebalanced when safe: five short lines become 3+2, seven become 3+2+2, and eight become 3+3+2. Different sections are never combined to improve balance. Phrase formatting runs only during generation, never on manual editing, movement, splitting/merging, or save/reload. Explicitly confirmed regeneration replaces manual structure as before.

Every canvas shows a theme-accented 36 CSS px page serial at bottom-right, smaller than the lyrics. The serial is derived from the current order and total count of slides sharing that Songbook ID, even when songs are interleaved. It updates after split, merge, deletion, slide movement, regeneration, and reload, and is never stored as lyric content.

The Theme selector now controls styling for the entire set across all four modes. Legacy deterministic song palette IDs remain as metadata for compatibility, but no longer select the visual design. Theme selection never modifies presentation content.

The Studio filters explicitly labelled writer/composer/tune credits and the source's standalone dash-prefixed attribution rows out of congregation generation. Numeric scripture references and ordinary lyrics containing words such as “কথা” or “সুর” are preserved. Reloading older local sets removes attribution rows and credit-only slides from the editable presentation copy, while retaining other manual text and leaving stored data unchanged until an explicit save. Master Songbook data and internal metadata are never modified or rendered as writer credits.

## Theme Studio and real local downloads

`themes.mjs` is the single styling-token registry. Its thirteen immutable definitions are Sunday Worship, Victory / Celebration, Good Friday, Holy Communion, Easter / Resurrection, Christmas, New Year, Thanksgiving, Prayer / Fasting, Revival, Pentecost / Holy Spirit, Baptism and Youth Worship. Tokens supply base/depth gradients, accents, chord color, lyric contrast, typography weight/shadow, atmosphere and a locally authored SVG symbol. Theme-specific atmospheric CSS consumes those tokens; it contains no separate color registry or copyrighted backgrounds.

Choose **Theme** to style every slide in the set immediately. No lyrics, phonetics, chords, anchors, layout profiles, mode copies or ordering are regenerated. The `themeId` and `showSectionLabels` settings persist in the existing saved-set schema; legacy sets default to Sunday Worship with section labels shown. Hiding labels preserves their geometry so adaptive fitting/footer clearance does not change. Event-name recommendations are advisory only; dates never infer or force a theological event. The Theme selection always wins.

Typography retains the established 700 weight and the existing 54pt / adaptive 54–48pt sizing, with a restrained highlight, small depth shadow and soft secondary shadow. Chords use a distinct theme accent and their existing proportional point size. No giant glow, extrusion or thick outline is used. All presentation modes retain the current content/pagination safeguards.

### Download workflow and fidelity

1. Select the service date, real songs and presentation mode.
2. Generate only when intended, then approve/edit the existing presentation copy.
3. Choose the church theme and optional section-label visibility.
4. Click **Download PPTX**, **Download PDF**, or **Download PNG Slides**.
5. To download another version, select that mode, review its independent copy, then download again.

Export snapshots the approved DOM and current mode copies before asynchronous work. It does not invoke the layout engine, phonetic converter or master catalog. Overflow blocks export with an explicit error; existing musical-alignment review notices remain visible in the captured slides. The editor is temporarily disabled while capturing, and restored on success or failure. Resource-load failures are retryable without clearing caches, saved sets or song data.

The shared preview renderer/theme is captured at **3200×1800** (2× the 1600×900 logical canvas). Both PPTX and PDF contain those same slide images, preserving Bengali glyph shaping, actual fonts, decorations, displayed transposed chords and word positions. **Text is not individually editable in PowerPoint or searchable/selectable in PDF.** This deliberate fidelity-first approach avoids an approximate second renderer and does not require Bengali fonts on the playback computer. PPTX speaker notes retain approved Unicode lyrics, current mode, theme, slide structure, serials, section labels, actual point-size inputs, anchor metadata and selected key/capo for audit. The PNG ZIP includes numbered PNGs plus the same approved-presentation manifest. No master-song catalog is exported.

- PPTX uses PptxGenJS with `LAYOUT_WIDE` (true 16:9); one full-bleed high-resolution image per approved slide.
- PDF uses jsPDF with a 960×540pt page (16:9) and the same full-page raster content.
- PNG ZIP uses JSZip with `Slide_001.png` etc., plus `approved-presentation.json`.
- Names follow `GPBC_YYYY-MM-DD_Congregation.pptx`, `Musician`, `Phonetic-Chords`, or `Phonetic`; PDF and ZIP follow the same convention.
- All generation is browser-local. No export service, CDN or upload is used.
- Export libraries are loaded lazily from `vendor/`. `npm run studio:vendor-export` reproducibly synchronizes installed browser bundles and license notices. Run it after any export dependency change.
- The PptxGenJS-only `image-size` override requires patched 2.x releases (>=2.0.3; currently resolved to 2.0.4). This avoids newly introducing known image-parser denial-of-service advisories; unrelated pre-existing dependency advisories are not silently changed.

Native editable-text/vector PPTX and one-click export of all four versions are not implemented. Each current version can be downloaded independently. Image decks can be larger than editable-text decks; large services may take longer and require substantial browser memory. Review the actual files in church PowerPoint/OBS before production use. The local host gate remains only a UI gate, not authentication or physical deployment exclusion.

The status confirms file preparation and that a download was requested; it cannot certify the browser's eventual disk-save or user cancellation. Some embedded/integrated browsers do not surface downloads. Use regular Chrome/Safari in that case; saved sets are browser-local, so load/recreate the reviewed copy there or open the provided review artifacts.

### Theme/export validation

Run `npm run test:worship-studio` for theme contrast tokens, immutable definitions, advisory recommendations, storage compatibility, active phonetics and full-catalog content/anchor checks. Run `npm run test:worship-studio:e2e` for Chrome, or select the explicit Studio specs with Desktop Safari and iPhone 14 as well.

The export browser tests download actual artifacts and unzip PPTX contents to validate geometry, counts, speaker-note Unicode, approved lyrics, manual changes/deletion, displayed chords and actual font sizes. Embedded PNGs must contain real foreground glyphs at 3200×1800 and visually match a native browser screenshot. PDF page/image geometry and PNG ZIP counts/manifest are validated. Seven requested themes have real #696/#117 congregation/musician screenshots; thirteen themes are checked for content/anchor integrity and save/reload behavior. Existing all-catalog geometry, local-auth denial, four-mode and search regressions remain active. Master Songbook data and internal metadata are never modified or rendered as writer credits.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/worship-studio/`.

Automated checks:

```sh
npm run test:worship-studio
npm run test:worship-studio:e2e
```

The unit suite reads all 1,492 real songs and verifies congregation/runtime-phonetic character preservation and source chord association. Both browser specs cover the four-mode workflow, independent edits, key/capo persistence, anchor positioning, missing data, Bangla/English search, existing section and manual workflows, storage failures, the loopback gate, actual geometry for every song in every mode, and the existing Songbook's phonetic/chord controls.

Run both Studio specs across the representative browser matrix without the repository's dashboard-generating reporter:

```sh
npx playwright test tests/worship-studio/*.spec.ts \
  --project='Desktop Chrome' --project='Desktop Safari' --project='iPhone 14' \
  --workers=2 --reporter=list --output=/tmp/gpbc-studio-test-results
```

For visual review, add #117 by searching `আর কোন নাম নাই`, generate once, then click each mode button. Review #831 for missing chords and #1411 for English/PDF alignment. Use the selected-song key/capo controls in either chorded mode. Mode switches preserve edits; regeneration is a deliberate, confirmed action.

## Remaining milestones

1. Add trusted Admin authentication and server-backed, per-user/per-service persistence with audit metadata.
2. Musically review approximate anchors and runtime phonetic pronunciation; promoting the V2/reviewed pipeline requires a separate approval.
3. Consider editable-vector PPTX text only after establishing reliable Bengali shaping/font embedding and equivalent chord geometry; current image-based exports prioritize fidelity.
4. Add server-side saved-set sharing, revision history, recovery, and export snapshots.

## Earlier Canva visual references and paused recovery

Both supplied Canva edit links were accessible in the connected browser, so only these directly observed details informed the visual direction:

- The musician file is titled **Song Chord for Teleprompter Library** and showed 312 pages. Inspected page 4 uses a black 16:9 field, large Bangla lyrics in white and gold, red chords aligned above the lyric phrases, and a green `1/3` page counter.
- The congregation file is titled **GPBC Song Library** and showed 165 pages. Inspected page 2 uses a black-to-gold gradient and large white Bangla text. That existing page also visibly contains chord letters and more text than fits cleanly at the bottom edge. The milestone follows the new product requirements instead: congregation slides remove chord-only rows, retain 54pt text, and add slides rather than shrinking or clipping overflow.

No other Canva template properties, font names, or export settings are assumed.

These earlier visual notes are not a catalog-wide chord audit. The later chord-recovery attempt was blocked by Canva login, audited no accessible pages, and imported no chords. Recovery remains paused pending authorized access or an export.
