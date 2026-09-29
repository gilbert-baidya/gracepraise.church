# V21 Admin Control Center — Production Release Runbook

This runbook is for a later, explicitly approved production release. It is
documentation only: Phase 10 does not deploy Firebase, Netlify, DNS, Auth
domains, or public `ACTIVE` mode.

Target Firebase project:

```text
admin-gpbc-website
```

The first production website release is `SHADOW`. The public hardcoded site
must remain the source of visible behavior while the Published configuration,
Admin workflow, and endpoint are observed.

## Stage 1 — Firebase project preparation

Perform these checks in the approved Firebase/Google Cloud account:

1. Verify that the selected project ID is exactly
   `admin-gpbc-website` and that the Firebase Console is showing the
   same project.
2. Confirm Firestore is in Native mode. Do not convert or recreate a database
   without a separate approved migration plan.
3. Enable Email/Password Firebase Authentication if it is not already enabled.
4. Confirm the billing plan required by the deployed callable Functions is
   approved.
5. Add only the required Firebase Auth Authorized Domains. Add
   `admin.gracepraise.church` only after the Admin subdomain is approved and
   mapped.
6. Record the project, operator account, date, and approval in the operational
   change log.

No service-account key or credential belongs in Git.

## Stage 2 — Firebase security deployment

Review the rules and indexes from the approved feature-branch commit, then run
these commands manually from the repository root:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project admin-gpbc-website
```

Verify the command output names the intended project before confirming. This
deploys only Firestore Rules and indexes; it does not deploy Functions,
Hosting, Storage, or unrelated Firebase resources.

## Stage 3 — Firebase Functions deployment

After the security deployment is reviewed, deploy only the V21 Functions
codebase:

```bash
firebase deploy --only functions:gpbc-v21 --project admin-gpbc-website
```

The expected deployed Function names are:

- `saveWebsiteDraft`
- `validateWebsiteDraftForPublish`
- `getWebsiteDraftPreview`
- `publishWebsiteConfiguration`
- `restoreWebsiteRevision`
- `getPublishedWebsiteConfiguration`

Confirm the deployed region is `us-central1`. Do not use a broad
`firebase deploy` command for this release.

## Stage 4 — Bootstrap the first Admin

Use a trusted operator environment with Application Default Credentials or a
protected `GOOGLE_APPLICATION_CREDENTIALS` path outside the repository.

1. Verify the Firebase project and account again:

   ```bash
   gcloud config get-value project
   firebase projects:list
   ```

2. Identify the intended Firebase Auth UID through the approved Auth console
   or trusted operator process. Do not create a public registration path.
3. Assign only the Admin custom claim:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/secure/path/firebase-admin.json \
     node tools/set-admin-claim.js <firebase-auth-uid>
   ```

   The credential path is an example and must not point inside the repository.
4. Sign out and sign back in so the ID token refreshes.
5. Verify the user has `admin: true` in the trusted Auth/claims inspection
   path, and verify a normal signed-in user does not have the claim.

The browser cannot self-promote. Never commit credentials, tokens, or claim
exports.

## Stage 5 — Initialize the configuration

Initialize only after Rules, indexes, Functions, and the first Admin are ready.
The required order is:

1. Dry-run the tool and review the displayed project ID:

   ```bash
   node tools/initialize-website-control.js \
     --dry-run \
     --project-id admin-gpbc-website
   ```

2. Verify the output reports 50 recognized features and an all-`LIVE` baseline.
3. Confirm the baseline matches the existing hardcoded public site.
4. Obtain explicit production-write approval.
5. Initialize Draft and Published with the guarded production command:

   ```bash
   node tools/initialize-website-control.js \
     --write \
     --confirm-production \
     --project-id admin-gpbc-website
   ```

   The tool refuses to replace existing documents unless
   `--replace-existing` is explicitly added after a separate review. Do not
   use that option as part of ordinary first initialization.
6. Run the sanitized Published endpoint health check:

   ```bash
   npm run test:v21:public-config -- \
     --project-id admin-gpbc-website \
     --endpoint https://us-central1-admin-gpbc-website.cloudfunctions.net/getPublishedWebsiteConfiguration \
     --allow-production-read
   ```

   Confirm HTTP 200, the supported schema, a positive revision, exactly 50
   features, valid states, and no Draft/Auth/audit metadata.

## Stage 6 — Admin subdomain

Future `admin.gracepraise.church` setup must be separately approved:

1. Map the subdomain in Netlify, preferably to a dedicated Admin site or a
   reviewed host-specific entry-point rule for `/admin/v21/index.html`.
2. Create the exact DNS record Netlify provides for that site. Do not guess a
   target or create a wildcard record.
3. Add `admin.gracepraise.church` to Firebase Auth Authorized Domains only
   after the DNS and HTTPS mapping are verified.
4. Preserve the Admin `noindex` metadata and `/admin/*` `X-Robots-Tag`; keep
   Admin routes out of public/service-worker caches.
5. Preserve the existing CSP and add only the exact Admin/Auth/Functions
   origins required by the reviewed flow. Do not broaden sources with `*`.
6. Keep public endpoint CORS limited to its intended sanitized read behavior;
   keep Admin callable operations claim-protected.
7. Keep the existing Decap CMS at `/admin/` unchanged. V21 lives at
   `/admin/v21/`; coexistence is not a CMS migration.

## Stage 7 — First website deployment in SHADOW

The first production website release must remain `SHADOW`:

1. Merge the approved V21 feature branch into `main` through the normal review
   process.
2. Verify `main` contains the intended commits and still has the checked-in
   runtime default `SHADOW`.
3. Prepare `netlify-live` according to the repository release policy.
4. Manually deploy through the approved GPBC production process.
5. Verify the public site, Admin site, Published endpoint, Preview, and
   Draft/Published comparison.
6. Confirm the public DOM and current hardcoded behavior remain unchanged.

No Phase 10 step performs this sequence.

## Stage 8 — Production SHADOW observation

Before any ACTIVE approval, perform and record the following checks in an
operator-selected observation window. The window should be agreed and logged;
it is not a propagation or availability promise.

- Public endpoint returns HTTP 200, the supported schema, a valid revision,
  exactly 50 sanitized features, and no Admin/Draft metadata.
- Public responses do not leak Auth, audit, Firestore, or Draft fields.
- Homepage, navigation, mobile navigation, footer, theme, Giving, Prayer,
  Songbook, Gallery, Plan Your Visit, Devotions, Ministries, and About have no
  console errors or layout regressions.
- Admin authentication succeeds for the provisioned Admin and fails for a
  non-Admin account.
- Draft load/save, trusted Preview, comparison, Publish, revision history, and
  Restore work privately.
- The public runtime remains `SHADOW`; no visitor DOM change is attributed to
  a stored configuration state.

## Stage 9 — Controlled ACTIVE activation

ACTIVE is a later, explicit code/release approval. The initial capability
scope is limited to exactly:

- `homepage.planVisit`
- `homepage.welcomeHome`
- `homepage.community`
- `pages.gallery`
- `pages.planVisit`

All other 45 registered features remain `SHADOW_ONLY`. Do not switch the
checked-in default or activate this scope as part of the production setup
sequence. Use the local/emulator ACTIVE smoke and failure-safe suites before
requesting approval.

## Production smoke checklist

After manual production deployment:

```text
□ Homepage loads
□ Desktop navigation works
□ Mobile navigation works
□ Theme toggle works
□ Giving works
□ Prayer works
□ Songbook works
□ Gallery works
□ Plan Your Visit works
□ Footer works
□ Admin login works
□ Non-admin denied
□ Draft loads
□ Preview Draft works
□ Published endpoint returns valid sanitized config
□ No Draft data visible publicly
□ Runtime remains SHADOW
□ No console errors
```

## Emergency runbook

### A — Configuration problem

Use configuration rollback only:

```text
Restore prior revision
→ Save Draft
→ Preview
→ Publish
```

Historical snapshots remain immutable. Confirm the restored state before
publishing it as a new revision.

### B — V21 runtime problem

Use the code-owned kill switch or revert the effective runtime to `SHADOW` or
`DISABLED` through a reviewed code release. This path does not depend on
Firestore or the public configuration endpoint.

### C — Bad website deployment

Use the existing Netlify/code rollback process to return the website to the
last known-good release. This is a code/deployment rollback, not a
configuration rollback; record and review the two incidents separately.

## Release boundary

- Production setup commands above are not executed by this runbook.
- No DNS, Auth Authorized Domain, Netlify, Firebase, or ACTIVE change is
  implied by this document.
- The public runtime default remains `SHADOW` until a separate approval changes
  it.
