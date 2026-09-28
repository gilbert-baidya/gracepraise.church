# V21 Admin Control Center — Phase 8

Phase 8 adds trusted Draft Preview and activation-readiness tooling without
adding another controlled route or changing the checked-in public mode.

## Checkpoint

Phase 7 was reviewed, committed, and pushed before Phase 8 work:

- `4ec0659 Add V21 dependency-aware route controls`
- branch: `v21-admin-control-center`
- `main` and `netlify-live` remain unchanged

## Trusted Draft Preview

`getWebsiteDraftPreview` is a Firebase callable Function. It requires an
authenticated Firebase user with the server-verified `admin: true` claim,
loads the saved Draft server-side, validates it against the shared schema, and
returns only:

- `schemaVersion`
- `revision`
- `preview: true`
- sanitized feature states

It does not return UID, email, audit records, Auth claims, Firestore paths, or
private metadata. The public Published endpoint remains separate and public.

The Admin action is disabled until the Draft is saved. Preview opens the public
site with an innocuous intent marker; the website then verifies Firebase Auth
and calls the trusted Function. Failed authentication, authorization, schema,
network, or session checks fall back to normal Published/SHADOW behavior.

## Preview semantics

Authorized Draft Preview uses the same route resolver, dependency resolver,
controlled-surface engine, route content boundary, and page-runtime gating as
future ACTIVE behavior. Draft `ADMIN_PREVIEW` states are visible only in the
verified Preview session. Public visitors and signed-in non-Admins treat them
as HIDDEN.

The system banner is fixed, accessible, responsive, and not feature-toggleable:

`GPBC ADMIN PREVIEW · Draft Revision N · Not visible to public visitors`

Auth loss, claim removal, and token refresh failure terminate Preview and
reload the safe public path.

## Admin readiness

The Admin dashboard now includes:

- Draft vs Published feature comparison;
- change counts by HIDDEN, COMING_SOON, and ADMIN_PREVIEW;
- route health for Gallery and Plan Your Visit;
- dependency registry validation;
- controlled-surface marker counts, feature association, expected ACTIVE
  action, and warning/blocking status;
- Preview Draft gating and saved-revision status.

Publish remains storage-only and the readiness panel blocks schema or missing
marker failures. No public activation switch was added.

## Observability and kill switch

The public adapter records safe in-memory operational counters for Published
load, fallback, Preview attempt, Preview authorization, Preview fallback, and
Preview session termination. It emits a local `gpbc:control-observability`
event without sending user or configuration data to an external service.

The code-owned `KILL_SWITCH` is present and inactive. Its safe fallback is
SHADOW; it is not controlled by query strings, browser storage, CSS, or public
metadata.

## Security guarantees

- Draft is never served by the public HTTP endpoint.
- Callable Preview requires Firebase Auth and `admin: true` on the server.
- Ordinary visitors cannot unlock Preview with URL parameters, storage,
  cookies, classes, fragments, or email matching.
- Preview is browser-session-specific and does not mutate Published storage,
  CDN state, Netlify routing, or global ACTIVE mode.
- Firestore browser writes remain denied; trusted Functions remain the only
  mutation path.

## Validation

- Backend unit tests: 6/6 passed; lint passed.
- Functions/Auth/Firestore integration: 1/1 passed, including Preview.
- Firestore/Auth rules: 6/6 passed.
- Admin Control Center: 7/7 passed.
- Public adapter: 22/22 passed.
- Targeted public Chromium regression: 53 passed, 5 skipped.
- Schema alignment: 50 feature IDs and 7 controlled surfaces passed.

No production deploy, Firebase production deployment, Netlify deployment,
merge, DNS change, or public ACTIVE activation was performed.
