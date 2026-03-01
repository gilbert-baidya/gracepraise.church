# Daily Devotion English Content Audit (Mar 1-Apr 30, 2026)

## Scope
- Requested window: `2026-03-01` through `2026-04-30` (inclusive)
- Control windows:
  - `2026-02-15` through `2026-02-29` (requested; note `2026-02-29` is not a valid date in 2026 because 2026 is not a leap year)
  - `2026-05-01` through `2026-05-15`

## Where Daily Devotion Data Lives
- Page/template: `daily-devotion.html`
- Runtime loader: `devotions-data.js`
- Primary yearly data source: `devotions-2026.json`
- Monthly source files used to build bundled data:
  - `devotions-data/03-march.json`
  - `devotions-data/04-april.json`
  - (controls checked in `devotions-data/02-february.json`, `devotions-data/05-may.json`)
- Bundled fallback data:
  - `devotions-db-2026.js`
  - built by `scripts/bundle-devotions.js`

## Devotion Entry Structure
- Canonical date format: `YYYY-MM-DD` (e.g., `2026-03-01`)
- Per-day keys:
  - `date`
  - `title`, `titleBn`
  - `verse`
  - `reflection`, `reflectionBn`
  - `prayer`, `prayerBn`

## Audit Method
- Script created: `scripts/audit-daily-devotion-en.js`
- Rules used for English field quality:
  - Reflection fail if missing, shorter than 200 chars, or ending in `...` / `…`
  - Prayer fail if missing, shorter than 90 chars, or ending in `...` / `…`
  - Additional short-fragment signal for very short strings

## Audit Results
- Total entries found in target window (`2026-03-01`..`2026-04-30`): **61 / 61**
- Entries with missing/truncated English Reflection: **61**
- Entries with missing/truncated English Prayer: **61**
- Entries with either Reflection or Prayer failure: **61**

### Affected Dates
- `2026-03-01`
- `2026-03-02`
- `2026-03-03`
- `2026-03-04`
- `2026-03-05`
- `2026-03-06`
- `2026-03-07`
- `2026-03-08`
- `2026-03-09`
- `2026-03-10`
- `2026-03-11`
- `2026-03-12`
- `2026-03-13`
- `2026-03-14`
- `2026-03-15`
- `2026-03-16`
- `2026-03-17`
- `2026-03-18`
- `2026-03-19`
- `2026-03-20`
- `2026-03-21`
- `2026-03-22`
- `2026-03-23`
- `2026-03-24`
- `2026-03-25`
- `2026-03-26`
- `2026-03-27`
- `2026-03-28`
- `2026-03-29`
- `2026-03-30`
- `2026-03-31`
- `2026-04-01`
- `2026-04-02`
- `2026-04-03`
- `2026-04-04`
- `2026-04-05`
- `2026-04-06`
- `2026-04-07`
- `2026-04-08`
- `2026-04-09`
- `2026-04-10`
- `2026-04-11`
- `2026-04-12`
- `2026-04-13`
- `2026-04-14`
- `2026-04-15`
- `2026-04-16`
- `2026-04-17`
- `2026-04-18`
- `2026-04-19`
- `2026-04-20`
- `2026-04-21`
- `2026-04-22`
- `2026-04-23`
- `2026-04-24`
- `2026-04-25`
- `2026-04-26`
- `2026-04-27`
- `2026-04-28`
- `2026-04-29`
- `2026-04-30`

## Control Window Verification
- February sample (`2026-02-15`..`2026-02-28`): **14/14 pass**, **0 fail**
- Requested `2026-02-29` does not exist in year 2026.
- May sample (`2026-05-01`..`2026-05-15`): **15/15 pass**, **0 fail**

## Root Cause Hypothesis
- This is a **content-data issue**, not a page rendering issue:
  - English `reflection` and `prayer` values in March/April source files are short/truncated fragments, frequently ending with `...`.
  - Corresponding Bangla fields (`reflectionBn`, `prayerBn`) are complete and substantially longer.
  - The loader (`devotions-data.js`) and bundler (`scripts/bundle-devotions.js`) pass values through as-is, so truncated source content propagates directly to runtime datasets (`devotions-2026.json` and `devotions-db-2026.js`).
- Example observed pattern (`2026-03-01`):
  - English reflection: `God promises a heart made tender and a spirit made new...`
  - Bangla reflection: full paragraph-length content.

## Fix Summary
- Implemented on branch: `fix/daily-devotion-en-mar01-apr30`
- Date window fixed: `2026-03-01` through `2026-04-30` (**61 days**)
- Files changed for content repair:
  - `devotions-data/03-march.json`
  - `devotions-data/04-april.json`
- Regenerated runtime datasets from monthly sources:
  - `devotions-2026.json` (via `python3 build-complete-devotions.py`)
  - `devotions-db-2026.js` (via `node scripts/bundle-devotions.js`)

### Before/After Audit Counts
- Before fix (`2026-03-01`..`2026-04-30`):
  - Reflection failures: **61**
  - Prayer failures: **61**
  - Any-failure dates: **61**
- After fix (`2026-03-01`..`2026-04-30`):
  - Reflection failures: **0**
  - Prayer failures: **0**
  - Any-failure dates: **0**
- Control windows after fix:
  - February sample (`2026-02-15`..`2026-02-28`): **0 failures**
  - May sample (`2026-05-01`..`2026-05-15`): **0 failures**

### Translation Method
- For each affected date, English `reflection` and `prayer` were rewritten from the existing Bangla `reflectionBn` and `prayerBn` fields as the source of truth.
- Existing theological intent, verse references, and devotional tone were preserved.
- Truncated fragments/ellipsis endings were removed and replaced with complete English prose suitable for page display.
