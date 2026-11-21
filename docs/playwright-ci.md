# Playwright CI coverage

## Run profiles

The push/PR/manual gate uses `PLAYWRIGHT_SUITE=pr`:

- All seven existing device/browser projects run navigation, device/theme,
  critical navigation/render regressions, and footer contracts.
- Desktop Chrome additionally runs every other spec, including both generated
  all-page smoke suites, accessibility, SEO, mocked Admin, Songbook/Builder,
  and Worship Studio contracts.
- Visual captures and performance measurements run nightly on Desktop Chrome.
- `Production Chrome` checks `public-build/` on port 8082 against the source
  server on port 8080. Both servers are started after a production build.

Four shards use two workers each, one retry, an 18-minute test budget and a
25-minute job timeout. The scheduled 03:15 UTC nightly uses the same coverage
plus visual/performance and `@quarantine` tests, with a 50-minute test budget
and 60-minute job timeout. Nightly failures are not marked continue-on-error.
Quarantined smoke and other non-performance checks also run on the other six
devices, preserving the originally failing mobile cases. CI uses Node 22 to
meet the installed Firebase packages' Node >=20 engine requirement.
The default local profile still runs the original full seven-project matrix.

```sh
npm run build:production
# In separate shells, start python3 -m http.server on 8080 (source) and
# 8082 --directory public-build (artifact; 8081 is reserved by Decap).
PLAYWRIGHT_SUITE=pr PRODUCTION_BASE_URL=http://127.0.0.1:8082 npx playwright test
PLAYWRIGHT_SUITE=nightly PRODUCTION_BASE_URL=http://127.0.0.1:8082 npx playwright test
node --test tests/ci-selection.test.mjs
```

`tests/ci-selection.test.mjs` checks that nightly retains every spec file,
contains all PR cases, and does not silently drop quarantined coverage.

## Opt-in integration

`songbook-auth.spec.ts`'s real Firebase session test requires
`SONGBOOK_AUTH_EMULATOR` pointing to a running Firebase Auth emulator and access
to the Firebase SDK CDN. Without it, the test explicitly skips with a reason.
Mocked session, signed-out access, and SDK-failure tests remain in the gate.
No real account credentials are required for the emulator test.
The two CMS console-error checks require the Decap local backend on
localhost:8081; opt in with `DECAP_LOCAL_BACKEND=1`. Other CMS HTTP/core checks
remain enabled. The source config enables `local_backend`, but CI does not
start the Decap proxy.

## Quarantine (assertions and budgets unchanged)

The generated smoke rules are in `tests/fixtures/quarantine.ts`; each affected
test carries `@quarantine` and a reason annotation. Remove the relevant rule
after fixing the site issue, not the assertion.

| Test | Reason |
| --- | --- |
| Both smoke suites: Give image alt checks | Generated PayPal QR has no alt attribute. |
| Both smoke suites: Calendar console checks | Placeholder Cloudinary configuration returns HTTP 400; Apps Script is an external dependency. |
| Generated POM smoke: Gallery console check | Gallery resources return HTTP 404. |
| Both smoke suites: Prayer Request overflow | Body scroll width measured 2005px at a 1920px viewport; visible clipping impact is unverified. |
| Both smoke suites: overflow on Admin Panel, DEVOTION_TEST, HOME_PAGE_TEST, SMS Opt-In, Translate Test | Existing viewport overflow. Development fixtures remain checked nightly rather than silently dropped. |
| SEO: Daily Devotion description length | Runtime description measured 267 characters, over the existing 260-character budget. |
| Performance: CLS | Measured 0.338 against 0.1 budget. |
| Performance: homepage request count | Measured 66 requests against fewer-than-50 budget. |
| Performance: homepage script count | Measured 27 against fewer-than-15 budget. |
| Device/theme: Contact shared header/toggle, both theme variants | Persisted dark theme can leave toggle `aria-pressed=false`. |
| Worship Studio: both Songbook 831 three-line phrase contracts | Two editable lines are generated instead of three. |

## Run 44863928943 diagnosis

Each of four shards collected 2,443 tests with one worker and two retries.
All were cancelled at 60 minutes before the reporter could emit full errors.
The four logs contain 246 failed first attempts (some are the same test on
different projects), dominated by 228 generated-POM smoke failures. Repeated
15-second stale-title waits and retries consumed most of the budget.

Local reproduction found:

- Generated POM titles predated page redesigns; obsolete hero/modal selectors
  and legacy footer expectations also blocked unrelated smoke assertions.
  The snapshots now name the existing page structures and canonical redirects.
- `all-pages.pom`: Ministries index intentionally redirects to `/ministries.html`.
- Mocked Admin: the registry has 51 features; the test hard-coded 50.
- SEO image dimensions: only five images were sampled, but the denominator
  counted every visible image. The existing 30% threshold now uses the sample.
- Production publication was pointed at the source server, so private source
  paths naturally returned 200. It now runs on the real built artifact.
- The Firebase integration defaulted to an emulator that CI never started.
- Songbook accessibility checks made thousands of sequential browser round trips.
  Both now inspect every visible button in one browser-side evaluation; none
  of the buttons or assertions is sampled away.
- Multi-page navigation assumed `index.html` and rejected the intentional
  root-qualified canonical URLs. It now verifies same-origin destinations and
  HTTP success. Runtime devotion data is awaited before asserting its contract.
- WebKit reports responsive SVG intrinsic widths that differ by viewport;
  footer tests now verify the correct SVG loaded with a positive intrinsic width.
- Modal tests explicitly request advanced sharing rather than the default
  one-tap flow. Adaptive font tests retain the 48–54pt bounds, persisted size,
  2:1 lyric/chord ratio and overflow floor without requiring a platform-specific
  50–53pt value for a fixture that fits at the 54pt default.
- The remaining measured site issues above are retained in nightly quarantine.

No website implementation or the separate concurrency change is included.
