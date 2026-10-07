# Production publication artifact

Netlify runs `npm run build:production` and publishes `public-build/` for production,
deploy previews and inherited branch contexts. Existing headers, CSP and redirects
retain their URL paths and values. This change does not deploy the site.

The dependency-free assembler uses Git's tracked-file inventory and copies eligible
working-tree files byte-for-byte in sorted order. Public runtime files must be tracked
(stage a new public asset before a local build). Untracked files are never published.
The generated directory is ignored by Git and is replaced on each successful build.
Only this fixed generated directory is removed; source directories are not moved or
deleted.

## Selection and release checks

Selection preserves static pages, browser JS/MJS, CSS, images, fonts, audio/video,
JSON/XML/text, Bible data, CMS gallery Markdown and `admin/config.yml`. It is not a
hand-maintained list of individual public pages. Source-controlled backup HTML
routes such as `give-backup.html` remain available because existing redirects use
them; backup suffix files such as `.bak` and `.backup-*` do not.

Excluded content includes:

- The entire `worship-studio/`, including export vendors and licenses.
- Tests, fixtures, Page Objects, Node dependencies, Firebase Functions source,
  scripts/tools, documentation, QA and audit screenshots.
- Dotfiles/directories, environment files, credential/private-key filenames,
  temporary/backup files, logs, maps and Playwright/coverage/session artifacts.
- Known root diagnostic/test pages and scripts; server-only AI generation services
  and their configuration.
- Unsupported source/development file types and all untracked files.

An existing runtime file named `share-panel-verification.js` is intentionally
preserved: the public devotion page actually loads it. CMS content names containing
“test” and legitimate image names are not treated as test code.

Unsafe relative paths and symlinked files, parent directories or output directories
fail the build. A final recursive check rejects excluded entries, Studio filenames
or references in text, and byte-identical Studio HTML/CSS/JS/MJS copied to another
path. Verification failure removes the incomplete artifact and exits unsuccessfully.
This is a fail-closed publication boundary, not an authentication implementation.

Run:

```sh
npm run build:production
npm run test:production-artifact
```

Tests check exclusion, alternate-path leaks, accidental-copy failure, symlinks,
traversal, stale-output replacement, public route/asset preservation and existing
literal local asset references. New web file types or runtime directories need
deliberate policy review. This filter is not a general-purpose secret detector:
review public source and scan the final artifact before release.

## Local development

Continue serving the repository root on `http://127.0.0.1:8080`.
`/worship-studio/` remains available there, with its existing exact-loopback bypass.
Serving `public-build/` separately must return 404 for every Studio path.
No Admin auth, Songbook access, Studio storage, themes, exports or cache code changes
are part of this safeguard.
