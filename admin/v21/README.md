# GPBC V21 Admin Foundation

This directory is the isolated V21 Admin Control Center foundation for the future `admin.gracepraise.church` workspace.

## Current behavior

- The existing `/admin/` Decap CMS shell is preserved unchanged.
- V21 is available at `/admin/v21/` when the repository is served locally.
- Firebase Auth is loaded only on this isolated page through a named app (`gpbc-v21-admin`).
- Sign-in uses existing public browser Firebase configuration with email/password Auth.
- Dashboard access requires the explicit Firebase Auth custom claim `admin: true`.
- Draft configuration is schema-validated and stored in Firestore under `websiteControl/draft`.
- Firestore revision snapshots are stored under `websiteControlRevisions/{revisionId}`.
- Append-only Admin audit records are stored under `websiteControlAudit/{auditId}`.
- Browser mutations are disabled by Firestore rules; Draft saves, publish, and restore run through trusted callable Functions.
- Published configuration is written only by the trusted backend and remains disconnected from the public website.
- The Phase 2 browser draft is never uploaded automatically; it requires an explicit import action.
- The Admin UI can validate and publish configuration storage, with an explicit Phase 4 public-integration warning.
- The public website does not read Draft or Published configuration.

## Authorization status

The frontend claim gate and Firestore rules both require the trusted Firebase Auth custom claim `admin: true`. A successful Auth session alone does not open the dashboard, and there is no registration flow or local-storage/query-string bypass.

Trusted Functions author Draft, Published, revision, and audit writes with the authenticated callable context. The browser cannot submit arbitrary audit UID/email metadata or mutate historical records directly.

Before production activation, configure and verify:

1. Firebase Auth email/password provider and authorized domains.
2. Create the Firestore database in Native mode for project `admin-gpbc-website`.
3. Install Functions dependencies inside `functions/` and deploy Rules/Functions/indexes only from a trusted review-approved environment.
4. Assign `admin: true` only through a trusted Firebase Admin SDK process, Cloud Function, or equivalent server-side tool. The repository includes a local Application Default Credentials workflow at `tools/set-admin-claim.js`.
5. Add the approved Admin domain to Firebase Auth authorized domains.
6. Add a separate configuration namespace from Songbook playlists.
7. Run emulator/staging authorization and atomicity tests before production activation.

## Firestore repository configuration

- `firebase.json` contains Firestore, Functions, and local emulator configuration; it does not configure Firebase Hosting.
- `firestore.rules` allows Admin-claim reads only. All configuration mutations are denied to browser clients and are performed by the trusted Functions/Admin SDK path.
- `firestore.indexes.json` is intentionally empty because the current direct-document and single-field audit query needs no composite index.
- `functions/` contains callable trusted operations for Draft save, publish validation, publish, and restore-to-Draft.
- No Firebase CLI deploy, Firestore enablement, rule deployment, Function deployment, claim assignment, or data migration was performed in this phase.

## Future subdomain setup

No DNS, Netlify site, domain setting, or redirect is activated in Phase 4. When approved, `admin.gracepraise.church` should be mapped to this isolated app (`/admin/v21/`) through a reviewed Netlify subdomain/site configuration. Keep the existing Decap CMS route at `/admin/`, retain `noindex` headers, and ensure the Admin path is excluded from public/service-worker caches.
