/*
 * V21 public-control runtime contract.
 *
 * This is the only code-owned runtime-mode setting. Keep the checked-in
 * default at SHADOW until an explicitly approved release changes it. The
 * browser adapter may read endpoint/test-harness plumbing, but it must never
 * read a mode from HTML, a route, browser storage, or a query string.
 */
'use strict';

const MODES = Object.freeze({
  DISABLED: 'DISABLED',
  SHADOW: 'SHADOW',
  ACTIVE: 'ACTIVE'
});

const DEFAULT_MODE = MODES.SHADOW;

// Emergency protection is intentionally code-owned and independent of
// Firestore, Functions, Auth, LocalStorage, and query-string input.
const KILL_SWITCH = Object.freeze({
  enabled: false,
  fallbackMode: MODES.SHADOW,
  reason: 'Emergency public adapter disable switch is code-owned and inactive.'
});

// Only these five features have proven DOM/route adapters in V21. The Phase 7
// dependency surfaces for Plan Your Visit are included through the shared
// surface registry and route adapter, but do not expand this allowlist.
const ACTIVE_READY_FEATURE_IDS = Object.freeze([
  'homepage.planVisit',
  'homepage.welcomeHome',
  'homepage.community',
  'pages.gallery',
  'pages.planVisit'
]);

const CAPABILITIES = Object.freeze({
  ACTIVE_READY: 'ACTIVE_READY',
  SHADOW_ONLY: 'SHADOW_ONLY',
  SYSTEM_PROTECTED: 'SYSTEM_PROTECTED'
});

const CACHE_POLICY = Object.freeze({
  browserMaxAgeSeconds: 30,
  cdnSharedMaxAgeSeconds: 60,
  staleWhileRevalidateSeconds: 300,
  documentedPropagation: 'Approximately 30–60 seconds for fresh requests; stale responses may persist for up to approximately 5 minutes while revalidation occurs.'
});

function capabilityFor(featureId, registeredFeatureIds = []) {
  if (ACTIVE_READY_FEATURE_IDS.includes(featureId)) return CAPABILITIES.ACTIVE_READY;
  if (registeredFeatureIds.includes(featureId)) return CAPABILITIES.SHADOW_ONLY;
  return CAPABILITIES.SYSTEM_PROTECTED;
}

function buildCapabilityRegistry(registeredFeatureIds = []) {
  return Object.freeze(registeredFeatureIds.map((featureId) => Object.freeze({
    featureId,
    capability: capabilityFor(featureId, registeredFeatureIds)
  })));
}

function getRuntimeMode() {
  // This narrow hook exists only for localhost Playwright/emulator coverage.
  // It is ignored on every non-local host and is not a production setting.
  const harness = typeof window !== 'undefined' ? window.__GPBC_V21_TEST_HARNESS__ : null;
  const localHost = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const testMode = localHost && harness && harness.runtimeMode;
  const requestedMode = testMode || DEFAULT_MODE;
  if (KILL_SWITCH.enabled) return KILL_SWITCH.fallbackMode;
  return Object.values(MODES).includes(requestedMode) ? requestedMode : DEFAULT_MODE;
}

const exportedRuntime = Object.freeze({
  MODES,
  DEFAULT_MODE,
  KILL_SWITCH,
  ACTIVE_READY_FEATURE_IDS,
  CAPABILITIES,
  CACHE_POLICY,
  capabilityFor,
  buildCapabilityRegistry,
  getRuntimeMode
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exportedRuntime;
}

if (typeof window !== 'undefined') {
  window.GPBCWebsiteControlRuntime = exportedRuntime;
}
