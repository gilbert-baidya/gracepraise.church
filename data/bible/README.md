# Licensed Bible Infrastructure

This directory holds the future Bible engine source files and generated lookup indexes for Grace and Praise Bangladeshi Church.

## Source Files

The licensed source XML files live in [`/data/bible/source/`](/Users/gbaidya/Documents/Project cool/Calendar 2026/data/bible/source):

- `en-niv-1984.xml`
  - English source
  - Translation: New International Version (1984)
- `bn-bsi-2016-ov.xml`
  - Bangla source
  - Translation: Bengali (BSI) 2016 O.V. Bible

These files are treated as the canonical licensed Bible sources for future integration work. They should not be edited by the build script or by application code.

## Generated Indexes

The index builder writes JSON lookup files into [`/data/bible/index/`](/Users/gbaidya/Documents/Project cool/Calendar 2026/data/bible/index):

- `niv1984.json`
- `bsi2016ov.json`

Each index is keyed by canonical English book name, then chapter number, then verse number.

Example:

```json
{
  "John": {
    "3": {
      "16": "For God so loved the world..."
    }
  }
}
```

## Build Process

Run the index builder from the repository root:

```bash
node scripts/build-bible-index.js
```

The script:

- reads the licensed XML source files
- handles uppercase and lowercase XML tags
- trims whitespace
- ignores empty verse nodes
- expands Bengali merged verse markers such as `[6-7]` or `[15,16]`
- writes optimized JSON lookup indexes for the future Bible service

## Service Module

The runtime lookup API lives in [`/services/bible/bible-service.js`](/Users/gbaidya/Documents/Project cool/Calendar 2026/services/bible/bible-service.js).

Supported language mapping:

- `en` -> `niv1984`
- `bn` -> `bsi2016ov`

This infrastructure is intentionally isolated. No existing devotion page, JSON dataset, share flow, or SEO code depends on it yet.
