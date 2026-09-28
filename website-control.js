(() => {
  'use strict';

  const schema = window.GPBCWebsiteControlSchema;
  const MODES = Object.freeze({ DISABLED: 'DISABLED', SHADOW: 'SHADOW', ACTIVE: 'ACTIVE' });
  const DEFAULT_MODE = MODES.SHADOW;
  const DEFAULT_TIMEOUT_MS = 1200;
  const PUBLIC_ENDPOINT = 'https://us-central1-grace-and-praise-bangladesh.cloudfunctions.net/getPublishedWebsiteConfiguration';
  const ACTIVE_TEST_FEATURES = Object.freeze([
    'homepage.planVisit',
    'homepage.welcomeHome',
    'homepage.community'
  ]);
  const CONTROLLED_ROUTES = Object.freeze({
    'pages.gallery': Object.freeze({
      featureId: 'pages.gallery',
      pageName: 'Gallery',
      paths: Object.freeze(['/gallery.html']),
      script: 'gallery.js'
    })
  });
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
    'pages.gallery': 'Gallery page script is loaded only after a LIVE route decision.'
  });
  const ROUTE_STATE_COPY = Object.freeze({
    HIDDEN: Object.freeze({
      title: 'Gallery Unavailable',
      message: 'This page is currently unavailable. Please return to the home page for the latest church information.',
      linkLabel: 'Return Home'
    }),
    COMING_SOON: Object.freeze({
      title: 'Gallery Coming Soon',
      message: 'Our church gallery is being prepared. Please check back soon.',
      linkLabel: 'Return Home'
    })
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
    routeState: null
  };

  function options() {
    const configured = window.GPBC_WEBSITE_CONTROL_CONFIG;
    return configured && typeof configured === 'object' ? configured : {};
  }

  function normalizeMode(value) {
    const mode = String(value || DEFAULT_MODE).toUpperCase();
    return Object.values(MODES).includes(mode) ? mode : DEFAULT_MODE;
  }

  function currentMode() {
    return normalizeMode(options().mode || document.documentElement.dataset.gpbcControlMode);
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

  function ownState(featureId, config) {
    return config?.features?.[featureId]?.state || 'LIVE';
  }

  function resolveState(featureId, config = state.config, visiting = new Set()) {
    if (!schema || !schema.FEATURE_IDS.includes(featureId)) return 'HIDDEN';
    const selectedState = ownState(featureId, config);
    if (selectedState === 'HIDDEN' || selectedState === 'ADMIN_PREVIEW') return 'HIDDEN';

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
      const activeTarget = ACTIVE_TEST_FEATURES.includes(featureId);
      const routeMatch = currentRoute?.featureId === featureId;
      const expectedAction = state.mode === MODES.ACTIVE && (activeTarget || routeMatch)
        ? (routeMatch && effectiveState !== 'LIVE' ? `CONTROLLED_ROUTE_${effectiveState}` : effectiveState)
        : 'NO_DOM_CHANGE';
      const wouldApply = routeMatch
        ? (effectiveState === 'LIVE' ? 'LIVE_ROUTE' : `CONTROLLED_ROUTE_${effectiveState}`)
        : (activeTarget ? effectiveState : 'NO_DOM_CHANGE');
      return {
        featureId,
        configuredState,
        effectiveState,
        routeMatch: routeMatch ? currentRoute.paths[0] : 'NONE',
        domPresence: elements.length > 0 ? 'PRESENT' : 'ABSENT',
        dependentLinksFound: linksFor(featureId),
        expectedAction,
        wouldApply,
        actualAction: state.mode === MODES.SHADOW ? 'NONE — SHADOW MODE' : expectedAction,
        potentialJsRisk: JS_RISK_NOTES[featureId] || 'Not assessed for Phase 6 ACTIVE mode.',
        potentialLayoutRisk: elements.length > 0 ? 'Review section collapse and adjoining spacing.' : 'No marked DOM boundary found.'
      };
    });
  }

  function applyActiveMode() {
    if (state.mode !== MODES.ACTIVE || !state.config) return;

    ACTIVE_TEST_FEATURES.forEach((featureId) => {
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
  }

  function setBoundaryState(status, pending = false) {
    document.documentElement.dataset.gpbcControlMode = state.mode;
    document.documentElement.dataset.gpbcControlStatus = status;
    if (pending) {
      document.documentElement.dataset.gpbcControlPending = 'true';
    } else {
      delete document.documentElement.dataset.gpbcControlPending;
    }
  }

  function controlledRouteElements(route) {
    return [...document.querySelectorAll(routeFeatureSelector(route.featureId))];
  }

  function setMetaContent(selector, content) {
    const meta = document.querySelector(selector);
    if (meta) meta.setAttribute('content', content);
  }

  function updateRouteMetadata(route, routeState) {
    const copy = ROUTE_STATE_COPY[routeState];
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
    const copy = ROUTE_STATE_COPY[routeState];
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
      ? resolveState(route.featureId, state.config)
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
      diagnostics: state.diagnostics.map((item) => ({ ...item }))
    };
  }

  async function load(loadOptions = {}) {
    state.mode = normalizeMode(loadOptions.mode || currentMode());
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
      setBoundaryState(state.status);
      state.diagnostics = buildShadowReport();
      initializeControlledRoute();
      return snapshot();
    } finally {
      if (timeout) window.clearTimeout(timeout);
    }
  }

  function boot() {
    if (options().autoLoad === false) {
      setBoundaryState('idle');
      initializeControlledRoute();
      return;
    }

    // SHADOW and DISABLED must preserve the existing route immediately. ACTIVE
    // waits for the published decision while the route boundary stays hidden.
    if (state.mode !== MODES.ACTIVE) initializeControlledRoute();
    window.setTimeout(() => load(), 0);
  }

  state.mode = currentMode();
  setBoundaryState('idle', state.mode === MODES.ACTIVE);

  const api = Object.freeze({
    MODES,
    DEFAULT_MODE,
    ACTIVE_TEST_FEATURES,
    CONTROLLED_ROUTES,
    load,
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
