# Bible Source Infrastructure

This directory holds the future Bible engine source files and generated lookup indexes for Grace and Praise Bangladeshi Church.

## Source Files

The repository source XML files live in [`source/`](./source/):

- `en-niv-1984.xml`
  - English source
  - Translation: New International Version (1984)
- `bn-bsi-2016-ov.xml`
  - Bangla source
  - Translation: Bengali (BSI) 2016 O.V. Bible

These files are canonical inputs, not evidence of redistribution permission. They should not be edited by the build script or by application code.

## Copyright and public access

No permission document establishing public redistribution of these complete translations is recorded here. Repository possession and the earlier "licensed" description do not establish that permission. Before release, the owner must provide evidence covering full NIV 1984 and BSI 2016 O.V. XML distribution, derived indexes, and presentation/export use, including required attribution and restrictions.

The production build excludes both complete XML files from publication to prevent public distribution, while retaining the existing derived JSON indexes for ministry lookup. Complete XML files remain available only in the local review and development environment. Songbook authentication protects the Builder UI in normal browser use; it does not authorize static-file delivery on the server. `noindex` and hidden links do not make the translations private. Public deployment of complete translations remains subject to explicit owner/legal sign-off; no Bible text was replaced or modified.

## Generated Indexes

The index builder writes JSON lookup files into [`index/`](./index/):

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

- reads the repository XML source files
- handles uppercase and lowercase XML tags
- trims whitespace
- ignores empty verse nodes
- expands Bengali merged verse markers such as `[6-7]` or `[15,16]`
- writes optimized JSON lookup indexes for the future Bible service

## Service Module

The runtime lookup API lives in [`services/bible/bible-service.js`](../../services/bible/bible-service.js).

Supported language mapping:

- `en` -> `niv1984`
- `bn` -> `bsi2016ov`

This infrastructure is intentionally isolated. No existing devotion page, JSON dataset, share flow, or SEO code depends on it yet.
