(() => {
  'use strict';

  const schema = window.GPBCWebsiteControlSchema;
  const runtime = window.GPBCWebsiteControlRuntime;
  const MODES = runtime?.MODES || Object.freeze({ DISABLED: 'DISABLED', SHADOW: 'SHADOW', ACTIVE: 'ACTIVE' });
  const DEFAULT_MODE = runtime?.DEFAULT_MODE || MODES.SHADOW;
  const DEFAULT_TIMEOUT_MS = 1200;
  const PUBLIC_ENDPOINT = 'https://us-central1-grace-and-praise-bangladesh.cloudfunctions.net/getPublishedWebsiteConfiguration';
  const PREVIEW_QUERY_PARAM = 'gpbc-preview';
  const PREVIEW_SCRIPT = 'website-preview.js';
  const KILL_SWITCH = runtime?.KILL_SWITCH || Object.freeze({
    enabled: true,
    fallbackMode: MODES.SHADOW,
    reason: 'Runtime contract unavailable; safe fallback is SHADOW.'
  });
  const ACTIVE_READY_FEATURES = runtime?.ACTIVE_READY_FEATURE_IDS || Object.freeze([]);
  const CONTROLLED_ROUTES = Object.freeze({
    'pages.planVisit': Object.freeze({
      featureId: 'pages.planVisit',
      pageName: 'Plan Your Visit',
      paths: Object.freeze(['/plan-visit.html']),
      script: 'plan-visit.js',
      stateSource: 'configured'
    }),
    'pages.gallery': Object.freeze({
      featureId: 'pages.gallery',
      pageName: 'Gallery',
      paths: Object.freeze(['/gallery.html']),
      script: 'gallery.js',
      stateSource: 'effective'
    })
  });
  const CONTROLLED_SURFACES = Object.freeze(schema?.CONTROLLED_SURFACE_DEFINITIONS || []);
  const ROUTE_LINKS = Object.freeze({
    'pages.planVisit': ['plan-visit.html'],
    'pages.calendar': ['calendar.html'],
    'pages.about': ['about.html'],
    'pages.prayer': ['prayer-request.html'],
    'pages.giving': ['give.html'],
    'pages.gallery': ['gallery.html']
  });
  const JS_RISK_NOTES = Object.freeze({
    'homepage.community': 'Community carousel must tolerate the section being absent.',
    'homepage.planVisit': 'No feature-specific runtime dependency identified.',
    'homepage.welcomeHome': 'No feature-specific runtime dependency identified.',
    'pages.gallery': 'Gallery page script is loaded only after a LIVE route decision.',
    'pages.planVisit': 'Plan Your Visit runtime is loaded only after a LIVE route decision.'
  });

  const state = {
    mode: DEFAULT_MODE,
    status: 'idle',
    source: 'fallback',
    revision: null,
    config: null,
    error: null,
    diagnostics: [],
    loadedAt: null,
    routeInitialized: false,
    routeState: null,
    surfaceObserver: null,
    preview: Object.freeze({ active: false, revision: null }),
    previewLoaderPromise: null,
    observability: {
      counts: {},
      lastEvent: null
    }
  };

  function options() {
    const configured = window.GPBC_WEBSITE_CONTROL_CONFIG;
    return configured && typeof configured === 'object' ? configured : {};
  }

  function normalizeMode(value) {
    const mode = String(value || DEFAULT_MODE).toUpperCase();
    if (KILL_SWITCH.enabled) return KILL_SWITCH.fallbackMode;
    return Object.values(MODES).includes(mode) ? mode : DEFAULT_MODE;
  }

  function isPreviewIntent() {
    try {
      return new URLSearchParams(window.location.search).get(PREVIEW_QUERY_PARAM) === '1';
    } catch (error) {
      return false;
    }
  }

  function recordObservation(eventName) {
    const counts = state.observability.counts;
    counts[eventName] = (counts[eventName] || 0) + 1;
    state.observability.lastEvent = { name: eventName, at: new Date().toISOString() };
    if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('gpbc:control-observability', {
        detail: { name: eventName, mode: state.mode, source: state.source }
      }));
    }
  }

  function currentMode() {
    return normalizeMode(runtime?.getRuntimeMode?.() || DEFAULT_MODE);
  }

  function endpoint() {
    return typeof options().endpoint === 'string' && options().endpoint
      ? options().endpoint
      : PUBLIC_ENDPOINT;
  }

  function featureSelector(featureId) {
    return `[data-gpbc-feature="${featureId.replace(/"/g, '')}"]`;
  }

  function routeFeatureSelector(featureId) {
    return `[data-gpbc-route-feature="${featureId.replace(/"/g, '')}"]`;
  }

  function surfaceElements(surface) {
    return [...document.querySelectorAll(surface.selector)];
  }

  function normalizePathname(pathname) {
    let normalized = String(pathname || '/');
    try {
      normalized = new URL(normalized, window.location.origin).pathname;
    } catch (error) {
      normalized = normalized.split('?')[0].split('#')[0];
    }
    normalized = normalized.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '');
    return normalized || '/';
  }

  function resolveControlledRoute(pathname = window.location.pathname) {
    const normalized = normalizePathname(pathname);
    return Object.values(CONTROLLED_ROUTES).find((route) => route.paths.includes(normalized)) || null;
  }

  function stateForSurface(surface, config = state.config) {
    const selectedState = surface.stateSource === 'configured'
      ? ownState(surface.featureId, config)
      : resolveState(surface.featureId, config);
    return selectedState === 'ADMIN_PREVIEW'
      ? (state.preview.active ? 'LIVE' : 'HIDDEN')
      : selectedState;
  }

  function stateForRoute(route, config = state.config) {
    const selectedState = route.stateSource === 'configured'
      ? ownState(route.featureId, config)
      : resolveState(route.featureId, config);
    return selectedState === 'ADMIN_PREVIEW'
      ? (state.preview.active ? 'LIVE' : 'HIDDEN')
      : selectedState;
  }

  function validatePublishedConfig(payload) {
    if (!schema || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Published configuration is not an object.');
    }

    const expectedKeys = ['features', 'revision', 'schemaVersion'].sort().join('|');
    if (Object.keys(payload).sort().join('|') !== expectedKeys) {
      throw new Error('Published configuration contains unsupported or missing fields.');
    }
    if (payload.schemaVersion !== schema.SCHEMA_VERSION) {
      throw new Error('Published configuration schema version is unsupported.');
    }
    if (!Number.isInteger(payload.revision) || payload.revision < 1) {
      throw new Error('Published configuration revision is invalid.');
    }

    const errors = schema.validateFeatureMap(payload.features);
    if (errors.length > 0) throw new Error(errors[0]);
    return {
      schemaVersion: payload.schemaVersion,
      revision: payload.revision,
      features: schema.FEATURE_IDS.reduce((map, featureId) => {
        map[featureId] = { state: payload.features[featureId].state };
        return map;
      }, {})
    };
  }

  function validatePreviewConfig(payload) {
    if (!schema || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Draft Preview configuration is not an object.');
    }
    const expectedKeys = ['features', 'preview', 'revision', 'schemaVersion'].sort().join('|');
    if (Object.keys(payload).sort().join('|') !== expectedKeys) {
      throw new Error('Draft Preview configuration contains unsupported or missing fields.');
    }
    if (payload.preview !== true) throw new Error('Draft Preview authorization was not confirmed.');
    if (payload.schemaVersion !== schema.SCHEMA_VERSION) throw new Error('Draft Preview schema version is unsupported.');
    if (!Number.isInteger(payload.revision) || payload.revision < 1) throw new Error('Draft Preview revision is invalid.');
    const errors = schema.validateFeatureMap(payload.features);
    if (errors.length > 0) throw new Error(errors[0]);
    return {
      schemaVersion: payload.schemaVersion,
      revision: payload.revision,
      preview: true,
      features: schema.FEATURE_IDS.reduce((map, featureId) => {
        map[featureId] = { state: payload.features[featureId].state };
        return map;
      }, {})
    };
  }

  function ownState(featureId, config) {
    return config?.features?.[featureId]?.state || 'LIVE';
  }

  function resolveState(featureId, config = state.config, visiting = new Set()) {
    if (!schema || !schema.FEATURE_IDS.includes(featureId)) return 'HIDDEN';
    const configuredState = ownState(featureId, config);
    if (configuredState === 'HIDDEN') return 'HIDDEN';
    if (configuredState === 'ADMIN_PREVIEW' && !state.preview.active) return 'HIDDEN';
    const selectedState = configuredState === 'ADMIN_PREVIEW' ? 'LIVE' : configuredState;

    const definition = schema.FEATURE_DEFINITIONS.find((item) => item.id === featureId);
    if (!definition || visiting.has(featureId)) return selectedState;

    const nextVisiting = new Set(visiting);
    nextVisiting.add(featureId);
    let dependencyComingSoon = false;
    for (const dependencyId of definition.dependencies) {
      const dependencyState = resolveState(dependencyId, config, nextVisiting);
      if (dependencyState === 'HIDDEN') return 'HIDDEN';
      if (dependencyState === 'COMING_SOON') dependencyComingSoon = true;
    }
    return dependencyComingSoon && selectedState === 'LIVE' ? 'COMING_SOON' : selectedState;
  }

  function linkTargets(featureId) {
    const definition = schema?.FEATURE_DEFINITIONS?.find((item) => item.id === featureId);
    const ids = [featureId, ...(definition ? definition.dependencies : [])];
    return [...new Set(ids.flatMap((id) => ROUTE_LINKS[id] || []))];
  }

  function linksFor(featureId) {
    const targets = linkTargets(featureId);
    if (targets.length === 0) return [];
    return [...document.querySelectorAll('a[href]')]
      .map((link) => link.getAttribute('href') || '')
      .filter((href) => targets.some((target) => href.split('#')[0].endsWith(target)));
  }

  function surfaceDiagnostics(featureId) {
    return CONTROLLED_SURFACES
      .filter((surface) => surface.featureId === featureId)
      .map((surface) => {
        const elements = surfaceElements(surface);
        const expectedAction = stateForSurface(surface, state.config);
        return {
          surfaceId: surface.id,
          dependentSelector: surface.selector,
          surfaceType: surface.surfaceType,
          domPresence: elements.length > 0 ? 'PRESENT' : 'ABSENT',
          expectedActiveAction: expectedAction === 'LIVE' ? 'SHOW_NORMAL' : `CONTROL_${expectedAction}`,
          actualShadowAction: state.mode === MODES.SHADOW ? 'NONE — SHADOW MODE' : `CONTROL_${expectedAction}`
        };
      });
  }

  function buildShadowReport() {
    if (!schema) return [];
    const currentRoute = resolveControlledRoute();
    return schema.FEATURE_IDS.map((featureId) => {
      const elements = [
        ...document.querySelectorAll(featureSelector(featureId)),
        ...document.querySelectorAll(routeFeatureSelector(featureId))
      ];
      const configuredState = ownState(featureId, state.config);
      const effectiveState = resolveState(featureId, state.config);
      const activeTarget = ACTIVE_READY_FEATURES.includes(featureId);
      const routeMatch = currentRoute?.featureId === featureId;
      const routeState = routeMatch ? stateForRoute(currentRoute, state.config) : null;
      const expectedAction = state.mode === MODES.ACTIVE && (activeTarget || routeMatch)
        ? (routeMatch && routeState !== 'LIVE' ? `CONTROLLED_ROUTE_${routeState}` : routeState || effectiveState)
        : 'NO_DOM_CHANGE';
      const wouldApply = routeMatch
        ? (routeState === 'LIVE' ? 'LIVE_ROUTE' : `CONTROLLED_ROUTE_${routeState}`)
        : (activeTarget ? effectiveState : 'NO_DOM_CHANGE');
      return {
        featureId,
        configuredState,
        effectiveState,
        routeState,
        routeMatch: routeMatch ? currentRoute.paths[0] : 'NONE',
        domPresence: elements.length > 0 ? 'PRESENT' : 'ABSENT',
        dependentLinksFound: linksFor(featureId),
        dependentSurfaces: surfaceDiagnostics(featureId),
        expectedAction,
        wouldApply,
        actualAction: state.mode === MODES.SHADOW ? 'NONE — SHADOW MODE' : expectedAction,
        potentialJsRisk: JS_RISK_NOTES[featureId] || 'Not assessed for Phase 6 ACTIVE mode.',
        potentialLayoutRisk: elements.length > 0 ? 'Review section collapse and adjoining spacing.' : 'No marked DOM boundary found.'
      };
    });
  }

  function applySurfaceState(surface) {
    const surfaceState = stateForSurface(surface, state.config);
    surfaceElements(surface).forEach((element) => {
      const target = surface.hideContainer ? element.closest(surface.hideContainer) || element : element;
      if (!Object.prototype.hasOwnProperty.call(element.dataset, 'gpbcOriginalTabIndex')) {
        element.dataset.gpbcOriginalTabIndex = element.getAttribute('tabindex') || '';
      }
      if (!Object.prototype.hasOwnProperty.call(element.dataset, 'gpbcOriginalAriaLabel')) {
        element.dataset.gpbcOriginalAriaLabel = element.getAttribute('aria-label') || '';
      }

      target.dataset.gpbcControlState = surfaceState;
      element.dataset.gpbcControlState = surfaceState;
      target.classList.toggle('gpbc-control-coming-soon', surfaceState === 'COMING_SOON');
      element.classList.toggle('gpbc-control-coming-soon-link', surfaceState === 'COMING_SOON');

      if (surfaceState === 'HIDDEN') {
        target.hidden = true;
        target.setAttribute('aria-hidden', 'true');
        target.setAttribute('inert', '');
        element.tabIndex = -1;
        return;
      }

      target.hidden = false;
      target.removeAttribute('aria-hidden');
      target.removeAttribute('inert');
      const originalTabIndex = element.dataset.gpbcOriginalTabIndex;
      if (originalTabIndex) element.setAttribute('tabindex', originalTabIndex);
      else element.removeAttribute('tabindex');

      if (surfaceState === 'COMING_SOON') {
        const originalLabel = element.dataset.gpbcOriginalAriaLabel || element.textContent.replace(/\s+/g, ' ').trim();
        element.setAttribute('aria-label', `${originalLabel} — coming soon`);
        element.title = 'Coming soon';
      } else {
        const originalAriaLabel = element.dataset.gpbcOriginalAriaLabel;
        if (originalAriaLabel) element.setAttribute('aria-label', originalAriaLabel);
        else element.removeAttribute('aria-label');
        element.removeAttribute('title');
      }
    });
  }

  function applyControlledSurfaces() {
    if (state.mode !== MODES.ACTIVE || !state.config) return;
    CONTROLLED_SURFACES.forEach(applySurfaceState);
  }

  function observeControlledSurfaces() {
    if (state.surfaceObserver || !document.body || typeof MutationObserver !== 'function') return;
    state.surfaceObserver = new MutationObserver(() => applyControlledSurfaces());
    state.surfaceObserver.observe(document.body, { childList: true, subtree: true });
  }

  function applyActiveMode() {
    if (state.mode !== MODES.ACTIVE || !state.config) return;

    const surfaceFeatureIds = new Set(CONTROLLED_SURFACES.map((surface) => surface.featureId));
    ACTIVE_READY_FEATURES.filter((featureId) => !surfaceFeatureIds.has(featureId)).forEach((featureId) => {
      const effectiveState = resolveState(featureId, state.config);
      document.querySelectorAll(featureSelector(featureId)).forEach((element) => {
        element.dataset.gpbcControlState = effectiveState;
        element.classList.toggle('gpbc-control-coming-soon', effectiveState === 'COMING_SOON');
        if (effectiveState === 'HIDDEN') {
          element.hidden = true;
          element.setAttribute('aria-hidden', 'true');
        } else {
          element.hidden = false;
          element.removeAttribute('aria-hidden');
        }
      });
    });
    applyControlledSurfaces();
    observeControlledSurfaces();
  }

  function setBoundaryState(status, pending = false) {
    document.documentElement.dataset.gpbcControlStatus = status;
    if (pending) {
      document.documentElement.dataset.gpbcControlPending = 'true';
    } else {
      delete document.documentElement.dataset.gpbcControlPending;
    }
  }

  function removePreviewBanner() {
    document.getElementById('gpbc-admin-preview-banner')?.remove();
    document.documentElement.removeAttribute('data-gpbc-preview');
  }

  function renderPreviewBanner(revision) {
    let banner = document.getElementById('gpbc-admin-preview-banner');
    if (!banner) {
      banner = document.createElement('aside');
      banner.id = 'gpbc-admin-preview-banner';
      banner.className = 'gpbc-admin-preview-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-label', 'GPBC administrator preview status');
      document.body.prepend(banner);
    }
    banner.replaceChildren();
    const copy = document.createElement('div');
    copy.className = 'gpbc-admin-preview-banner__copy';
    const title = document.createElement('strong');
    title.textContent = 'GPBC ADMIN PREVIEW';
    const status = document.createElement('span');
    status.textContent = `Draft Revision ${revision} · Not visible to public visitors`;
    copy.append(title, status);
    const returnLink = document.createElement('a');
    returnLink.href = new URL('admin/v21/index.html', window.location.origin).href;
    returnLink.textContent = 'Return to Admin';
    returnLink.className = 'gpbc-admin-preview-banner__link';
    banner.append(copy, returnLink);
    document.documentElement.dataset.gpbcPreview = 'active';
  }

  function ensurePreviewSession() {
    if (window.GPBCWebsitePreview && typeof window.GPBCWebsitePreview.load === 'function') {
      return Promise.resolve(window.GPBCWebsitePreview);
    }
    if (state.previewLoaderPromise) return state.previewLoaderPromise;

    state.previewLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-gpbc-preview-script="${PREVIEW_SCRIPT}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.GPBCWebsitePreview), { once: true });
        existing.addEventListener('error', () => reject(new Error('preview-session-script-unavailable')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      const scriptUrl = new URL(PREVIEW_SCRIPT, window.location.origin);
      // Preview is an authenticated, short-lived session. A cache-busting
      // token prevents a stale preview helper from surviving a route change.
      scriptUrl.searchParams.set('gpbc-preview-script', String(Date.now()));
      script.src = scriptUrl.href;
      script.dataset.gpbcPreviewScript = PREVIEW_SCRIPT;
      script.addEventListener('load', () => {
        if (window.GPBCWebsitePreview && typeof window.GPBCWebsitePreview.load === 'function') {
          resolve(window.GPBCWebsitePreview);
        } else {
          reject(new Error('preview-session-unavailable'));
        }
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('preview-session-script-unavailable')), { once: true });
      document.head.appendChild(script);
    });
    return state.previewLoaderPromise;
  }

  function handlePreviewAuthLost() {
    if (!state.preview.active) return;
    recordObservation('preview_session_ended');
    state.preview = Object.freeze({ active: false, revision: null });
    removePreviewBanner();
    state.routeInitialized = false;
    state.config = null;
    state.revision = null;
    state.mode = currentMode();
    loadPublished({ forcePublished: true, previewFallback: true });
  }

  function beginPreviewSessionMonitoring() {
    if (!window.GPBCWebsitePreview || typeof window.GPBCWebsitePreview.onAuthLost !== 'function') return;
    window.GPBCWebsitePreview.onAuthLost(handlePreviewAuthLost);
  }

  function controlledRouteElements(route) {
    return [...document.querySelectorAll(routeFeatureSelector(route.featureId))];
  }

  function setMetaContent(selector, content) {
    const meta = document.querySelector(selector);
    if (meta) meta.setAttribute('content', content);
  }

  function updateRouteMetadata(route, routeState) {
    const copy = routeStateCopy(route, routeState);
    if (!copy) return;

    document.title = `${copy.title} | Grace and Praise Bangladeshi Church`;
    setMetaContent('meta[name="description"]', copy.message);
    setMetaContent('meta[property="og:title"]', document.title);
    setMetaContent('meta[property="og:description"]', copy.message);
    setMetaContent('meta[name="twitter:title"]', document.title);
    setMetaContent('meta[name="twitter:description"]', copy.message);

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';
  }

  function routeStateCopy(route, routeState) {
    if (!['HIDDEN', 'COMING_SOON'].includes(routeState)) return null;
    if (route.featureId === 'pages.gallery') {
      return routeState === 'HIDDEN'
        ? {
            title: 'Gallery Unavailable',
            message: 'This page is currently unavailable. Please return to the home page for the latest church information.',
            linkLabel: 'Return Home'
          }
        : {
            title: 'Gallery Coming Soon',
            message: 'Our church gallery is being prepared. Please check back soon.',
            linkLabel: 'Return Home'
          };
    }
    return routeState === 'HIDDEN'
      ? {
          title: `${route.pageName} Unavailable`,
          message: 'This page is currently unavailable. Please return to the home page for the latest church information.',
          linkLabel: 'Return Home'
        }
      : {
          title: `${route.pageName} Coming Soon`,
          message: `Our ${route.pageName.toLowerCase()} page is being prepared. Please check back soon.`,
          linkLabel: 'Return Home'
        };
  }

  function removeRouteState() {
    const stateElement = document.getElementById('gpbc-route-state');
    if (stateElement) stateElement.remove();
    state.routeState = null;
  }

  function restoreRouteElements(route) {
    controlledRouteElements(route).forEach((element) => {
      element.hidden = false;
      element.removeAttribute('aria-hidden');
      element.removeAttribute('inert');
    });
  }

  function renderControlledRouteState(route, routeState) {
    const copy = routeStateCopy(route, routeState);
    if (!copy) return;

    controlledRouteElements(route).forEach((element) => {
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
    });

    let stateElement = document.getElementById('gpbc-route-state');
    if (!stateElement) {
      stateElement = document.createElement('main');
      stateElement.id = 'gpbc-route-state';
      stateElement.className = 'gpbc-route-state';
      const anchor = controlledRouteElements(route)[0];
      if (anchor?.parentNode) anchor.parentNode.insertBefore(stateElement, anchor);
      else document.body.appendChild(stateElement);
    }

    const titleId = 'gpbc-route-state-title';
    stateElement.replaceChildren();
    stateElement.setAttribute('aria-labelledby', titleId);

    const panel = document.createElement('div');
    panel.className = 'gpbc-route-state__panel';
    const title = document.createElement('h1');
    title.id = titleId;
    title.textContent = copy.title;
    const message = document.createElement('p');
    message.textContent = copy.message;
    const link = document.createElement('a');
    link.className = 'gpbc-route-state__link';
    link.href = 'index.html#home';
    link.textContent = copy.linkLabel;
    panel.append(title, message, link);
    stateElement.appendChild(panel);
    state.routeState = routeState;
    updateRouteMetadata(route, routeState);
  }

  function loadControlledRouteScript(route) {
    if (!route.script || document.querySelector(`script[data-gpbc-route-script="${route.featureId}"]`)) return;
    const script = document.createElement('script');
    script.dataset.gpbcRouteScript = route.featureId;
    script.src = new URL(route.script, window.location.href).href;
    document.body.appendChild(script);
  }

  function initializeControlledRoute() {
    if (state.routeInitialized) return;
    const route = resolveControlledRoute();
    if (!route) return;

    state.routeInitialized = true;
    const activeDecision = state.mode === MODES.ACTIVE && state.config
      ? stateForRoute(route, state.config)
      : 'LIVE';

    if (state.mode === MODES.ACTIVE && ['HIDDEN', 'COMING_SOON'].includes(activeDecision)) {
      renderControlledRouteState(route, activeDecision);
      return;
    }

    removeRouteState();
    restoreRouteElements(route);
    loadControlledRouteScript(route);
  }

  function snapshot() {
    return {
      mode: state.mode,
      status: state.status,
      source: state.source,
      revision: state.revision,
      error: state.error,
      loadedAt: state.loadedAt,
      routeState: state.routeState,
      preview: { ...state.preview },
      killSwitch: { ...KILL_SWITCH },
      observability: {
        counts: { ...state.observability.counts },
        lastEvent: state.observability.lastEvent ? { ...state.observability.lastEvent } : null
      },
      diagnostics: state.diagnostics.map((item) => ({ ...item }))
    };
  }

  async function loadPublished(loadOptions = {}) {
    // Runtime mode is resolved only by the shared contract. Callers may
    // provide endpoint/timeout plumbing, but cannot select the public mode.
    state.mode = normalizeMode(currentMode());
    state.preview = Object.freeze({ active: false, revision: null });
    removePreviewBanner();
    setBoundaryState('loading', state.mode === MODES.ACTIVE);
    state.error = null;
    state.config = null;
    state.revision = null;
    state.source = 'fallback';
    state.diagnostics = buildShadowReport();

    if (state.mode === MODES.DISABLED) {
      state.status = 'disabled';
      setBoundaryState(state.status);
      initializeControlledRoute();
      return snapshot();
    }

    if (typeof window.fetch !== 'function') {
      state.status = 'fallback';
      state.error = 'fetch-unavailable';
      setBoundaryState(state.status);
      state.diagnostics = buildShadowReport();
      initializeControlledRoute();
      return snapshot();
    }

    state.status = 'loading';
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutMs = Number.isInteger(loadOptions.timeoutMs) ? loadOptions.timeoutMs : DEFAULT_TIMEOUT_MS;
    const timeout = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await window.fetch(loadOptions.endpoint || endpoint(), {
        method: 'GET',
        credentials: 'omit',
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) throw new Error(`endpoint-${response.status}`);
      state.config = validatePublishedConfig(await response.json());
      state.revision = state.config.revision;
      state.source = 'published';
      state.status = 'ready';
      state.loadedAt = new Date().toISOString();
      recordObservation('published_config_loaded');
      setBoundaryState(state.status);
      state.diagnostics = buildShadowReport();
      applyActiveMode();
      initializeControlledRoute();
      return snapshot();
    } catch (error) {
      state.status = 'fallback';
      state.source = 'fallback';
      state.error = error?.name === 'AbortError' ? 'timeout' : (error?.message || 'configuration-unavailable');
      state.config = null;
      state.revision = null;
      recordObservation('published_config_fallback');
      setBoundaryState(state.status);
      state.diagnostics = buildShadowReport();
      initializeControlledRoute();
      return snapshot();
    } finally {
      if (timeout) window.clearTimeout(timeout);
    }
  }

  async function loadPreview(loadOptions = {}) {
    state.mode = MODES.ACTIVE;
    state.preview = Object.freeze({ active: false, revision: null });
    state.status = 'preview-authenticating';
    state.source = 'preview';
    state.error = null;
    state.config = null;
    state.revision = null;
    state.routeInitialized = false;
    recordObservation('preview_attempted');
    setBoundaryState('loading', true);

    try {
      const previewApi = await ensurePreviewSession();
      beginPreviewSessionMonitoring();
      const payload = await previewApi.load();
      const previewConfig = validatePreviewConfig(payload);
      state.preview = Object.freeze({ active: true, revision: previewConfig.revision });
      state.config = previewConfig;
      state.revision = previewConfig.revision;
      state.source = 'draft-preview';
      state.status = 'preview-ready';
      state.loadedAt = new Date().toISOString();
      renderPreviewBanner(previewConfig.revision);
      recordObservation('preview_authorized');
      setBoundaryState(state.status);
      state.diagnostics = buildShadowReport();
      applyActiveMode();
      initializeControlledRoute();
      return snapshot();
    } catch (error) {
      const previewError = error?.message || 'preview-unavailable';
      recordObservation('preview_fallback');
      removePreviewBanner();
      state.preview = Object.freeze({ active: false, revision: null });
      state.routeInitialized = false;
      // A failed preview never exposes Draft. The ordinary Published/SHADOW
      // path is the only fallback, even when the URL contains preview intent.
      await loadPublished({ ...loadOptions, forcePublished: true, previewFallback: true });
      state.error = `preview:${previewError}`;
      return snapshot();
    }
  }

  async function load(loadOptions = {}) {
    if (isPreviewIntent() && !loadOptions.forcePublished) return loadPreview(loadOptions);
    return loadPublished(loadOptions);
  }

  function boot() {
    if (options().autoLoad === false) {
      setBoundaryState('idle');
      initializeControlledRoute();
      return;
    }

    // SHADOW and DISABLED must preserve the existing route immediately. ACTIVE
    // waits for the published decision while the route boundary stays hidden.
    if (state.mode !== MODES.ACTIVE && !isPreviewIntent()) initializeControlledRoute();
    window.setTimeout(() => load(), 0);
  }

  state.mode = isPreviewIntent() ? MODES.ACTIVE : currentMode();
  setBoundaryState('idle', state.mode === MODES.ACTIVE);

  const api = Object.freeze({
    MODES,
    DEFAULT_MODE,
    KILL_SWITCH,
    ACTIVE_READY_FEATURES,
    ACTIVE_TEST_FEATURES: ACTIVE_READY_FEATURES,
    CONTROLLED_ROUTES,
    CONTROLLED_SURFACES,
    load,
    loadPreview,
    isPreviewIntent,
    getState: snapshot,
    getPublishedConfig: () => state.config ? JSON.parse(JSON.stringify(state.config)) : null,
    resolveFeatureState: (featureId) => resolveState(featureId, state.config),
    resolveControlledRoute,
    renderControlledRouteState,
    buildShadowReport
  });

  window.GPBCWebsiteControl = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
