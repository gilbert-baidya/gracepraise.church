(() => {
  'use strict';

  const configApi = window.GPBCAdminConfig;
  const authApi = window.GPBCAdminAuth;
  const firestoreApi = window.GPBCAdminFirestore;
  const STORAGE_KEY = 'gpbc-v21-admin-draft';
  const LOCAL_TOOL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

  const dom = {};
  const ids = [
    'authView',
    'authCheckingView',
    'accessDeniedView',
    'dashboardView',
    'loginForm',
    'adminEmail',
    'adminPassword',
    'signInButton',
    'button-label',
    'button-spinner',
    'authError',
    'authBusy',
    'headerSignOut',
    'accessDeniedSignOut',
    'accessDeniedReason',
    'dashboardNotice',
    'localDraftPanel',
    'localDraftMessage',
    'importLocalDraftButton',
    'discardLocalDraftButton',
    'featureGroups',
    'countLive',
    'countHidden',
    'countComingSoon',
    'countAdminPreview',
    'unsavedBadge',
    'saveStateLabel',
    'lastSavedLabel',
    'saveDraftButton',
    'previewDraftButton',
    'publishButton',
    'signedInAs',
    'comparisonSummary',
    'comparisonList',
    'readinessSummary',
    'readinessList',
    'runtimeMode',
    'publishedRevision',
    'draftRevision',
    'activeReadyCount',
    'shadowOnlyCount',
    'blockingIssueCount',
    'warningCount',
    'publicEndpointStatus',
    'lastValidation',
    'recentChanges',
    'recentRevisions',
    'protectedComponents'
  ];

  let currentConfig = null;
  let savedConfig = null;
  let currentUser = null;
  let isDirty = false;
  let activeUserId = null;
  let serverRevision = 0;
  let publishedConfig = null;
  let publishedRevision = 0;
  let serverAvailable = false;
  let pendingLocalDraft = null;
  let recentChanges = [];
  let recentRevisions = [];
  let publishInProgress = false;
  let restoreInProgress = false;
  let readinessBlocking = false;
  let readinessWarnings = 0;

  function cacheDom() {
    ids.forEach((id) => {
      dom[id] = document.getElementById(id);
    });
  }

  function setHidden(element, hidden) {
    if (element) element.hidden = hidden;
  }

  function setView(view) {
    setHidden(dom.authView, view !== 'auth');
    setHidden(dom.authCheckingView, view !== 'checking');
    setHidden(dom.accessDeniedView, view !== 'denied');
    setHidden(dom.dashboardView, view !== 'dashboard');
  }

  function setAuthError(message) {
    if (!dom.authError) return;
    dom.authError.textContent = message || '';
    dom.authError.hidden = !message;
  }

  function setDashboardNotice(message, type = 'info') {
    if (!dom.dashboardNotice) return;
    dom.dashboardNotice.className = `message message-${type}`;
    dom.dashboardNotice.textContent = message || '';
    dom.dashboardNotice.hidden = !message;
  }

  function setFeatureControlsDisabled(disabled) {
    document.querySelectorAll('.state-select').forEach((select) => {
      select.disabled = disabled;
    });
    if (dom.saveDraftButton) dom.saveDraftButton.disabled = disabled;
    updatePreviewButton();
    updatePublishButton();
  }

  function updatePreviewButton() {
    if (!dom.previewDraftButton) return;
    dom.previewDraftButton.disabled = !serverAvailable || isDirty || serverRevision < 1 || publishInProgress || restoreInProgress;
  }

  function updatePublishButton() {
    if (!dom.publishButton) return;
    dom.publishButton.disabled = !serverAvailable || isDirty || serverRevision < 1 || publishInProgress || restoreInProgress || readinessBlocking;
  }

  function setLocalDraftPanel(visible, message = '') {
    if (!dom.localDraftPanel) return;
    dom.localDraftPanel.hidden = !visible;
    if (dom.localDraftMessage) dom.localDraftMessage.textContent = message;
  }

  function setSignInLoading(isLoading) {
    if (!dom.signInButton) return;
    dom.signInButton.disabled = isLoading;
    const label = dom.signInButton.querySelector('.button-label');
    const spinner = dom.signInButton.querySelector('.button-spinner');
    if (label) label.textContent = isLoading ? 'Signing In…' : 'Sign In';
    if (spinner) spinner.hidden = !isLoading;
  }

  function displayName(user) {
    if (!user) return '—';
    return user.email || user.displayName || 'Signed-in administrator';
  }

  function formatDate(value) {
    if (!value) return 'Not saved on server';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not saved on server';
    return `Last saved ${date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderProtectedComponents() {
    if (!dom.protectedComponents || !configApi) return;
    dom.protectedComponents.replaceChildren();
    configApi.PROTECTED_COMPONENTS.forEach((component) => {
      dom.protectedComponents.appendChild(createElement('li', '', component));
    });
  }

  function renderLocalWorshipResources() {
    const panel = document.getElementById('worshipResources');
    const actions = document.getElementById('worshipResourceActions');
    if (!panel || !actions || !LOCAL_TOOL_HOSTS.has(window.location.hostname)) return;
    const tools = [
      { name: 'Worship Song Studio', detail: 'Songbook presentation workflow', path: '../../worship-studio/' },
      { name: 'Bible Slide Builder', detail: 'Bangla-first Scripture presentations', path: '../../bible-slide-builder/' }
    ];
    actions.replaceChildren(...tools.map((tool) => {
      const link = createElement('a', 'worship-resource-link');
      link.href = new URL(tool.path, window.location.href).href;
      link.append(createElement('strong', '', tool.name), createElement('span', '', tool.detail), createElement('b', '', 'Open →'));
      return link;
    }));
    panel.hidden = false;
  }

  function renderFeatureGroups() {
    if (!dom.featureGroups || !configApi || !currentConfig) return;
    dom.featureGroups.replaceChildren();

    configApi.getGroupDefinitions().forEach(({ group, features }) => {
      const groupSection = createElement('section', 'feature-group');
      groupSection.setAttribute('aria-labelledby', `feature-group-${group.toLowerCase()}`);

      const groupHeading = createElement('div', 'feature-group-heading');
      const heading = createElement('h3', '', group);
      heading.id = `feature-group-${group.toLowerCase()}`;
      groupHeading.appendChild(heading);
      groupHeading.appendChild(createElement('span', '', `${features.length} feature${features.length === 1 ? '' : 's'}`));
      groupSection.appendChild(groupHeading);

      const featureList = createElement('div', 'feature-list');
      features.forEach((definition) => {
        const row = createElement('div', 'feature-row');
        const information = createElement('div', 'feature-information');
        information.appendChild(createElement('span', 'feature-name', definition.displayName));
        information.appendChild(createElement('span', 'feature-description', definition.description));
        information.appendChild(createElement('span', 'feature-id', definition.id));
        const capabilityBadge = createElement('span', `capability-badge capability-${definition.capability.toLowerCase().replace(/_/g, '-')}`, `${definition.capabilityLabel} · ${definition.capabilityDescription}`);
        capabilityBadge.title = definition.capabilityDescription;
        capabilityBadge.setAttribute('aria-label', `${definition.displayName}: ${definition.capabilityLabel}. ${definition.capabilityDescription}`);
        information.appendChild(capabilityBadge);

        if (definition.dependencies.length > 0) {
          const dependencyNames = definition.dependencies.map((dependencyId) => {
            const dependency = configApi.FEATURE_REGISTRY.find((item) => item.id === dependencyId);
            return dependency ? dependency.displayName : dependencyId;
          });
          information.appendChild(createElement(
            'span',
            'dependency-note',
            `Dependency note: Changing this may also affect ${dependencyNames.join(', ')}.`
          ));
        }

        const controls = createElement('div', 'feature-controls');
        const selectId = `state-${definition.id.replace(/[^a-z0-9]+/gi, '-')}`;
        const label = createElement('label', 'control-label', 'Draft state');
        label.htmlFor = selectId;
        const select = document.createElement('select');
        select.id = selectId;
        select.className = 'state-select';
        select.name = `features.${definition.id}.state`;
        select.dataset.featureId = definition.id;
        select.setAttribute('aria-label', `Draft state for ${definition.displayName}`);

        Object.values(configApi.FEATURE_STATES).forEach((state) => {
          const option = document.createElement('option');
          option.value = state;
          option.textContent = configApi.FEATURE_STATE_LABELS[state];
          option.title = configApi.FEATURE_STATE_DESCRIPTIONS[state];
          select.appendChild(option);
        });

        select.value = currentConfig.features[definition.id].state;
        select.addEventListener('change', () => {
          const previousState = currentConfig.features[definition.id].state;
          const nextState = select.value;
          if (previousState === nextState) return;
          currentConfig.features[definition.id].state = nextState;
          isDirty = true;
          recentChanges.unshift({
            label: definition.displayName,
            detail: `${configApi.FEATURE_STATE_LABELS[previousState]} → ${configApi.FEATURE_STATE_LABELS[nextState]}`,
            at: new Date()
          });
          recentChanges = recentChanges.slice(0, 8);
          renderRecentChanges();
          updateDraftSummary();
        });

        controls.appendChild(label);
        controls.appendChild(select);
        row.appendChild(information);
        row.appendChild(controls);
        featureList.appendChild(row);
      });

      groupSection.appendChild(featureList);
      dom.featureGroups.appendChild(groupSection);
    });
  }

  function renderRecentChanges() {
    if (!dom.recentChanges) return;
    dom.recentChanges.replaceChildren();
    if (recentChanges.length === 0) {
      dom.recentChanges.appendChild(createElement('li', 'muted', 'No changes in this session.'));
      return;
    }

    recentChanges.forEach((change) => {
      const item = createElement('li');
      const label = change.action || change.label || 'Configuration change';
      let detail = change.detail || '';
      if (Array.isArray(change.changedFeatures) && change.changedFeatures.length > 0) {
        const names = change.changedFeatures.map((featureId) => {
          const definition = configApi.FEATURE_REGISTRY.find((item) => item.id === featureId);
          return definition ? definition.displayName : featureId;
        });
        detail = names.join(', ');
      }
      item.appendChild(createElement('strong', '', label));
      item.appendChild(document.createTextNode(detail ? ` — ${detail}` : ''));
      dom.recentChanges.appendChild(item);
    });
  }

  function formatRevisionDate(value) {
    if (!value) return 'Timestamp pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Timestamp unavailable'
      : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function renderRecentRevisions() {
    if (!dom.recentRevisions) return;
    dom.recentRevisions.replaceChildren();
    if (recentRevisions.length === 0) {
      dom.recentRevisions.appendChild(createElement('li', 'muted', 'No saved revisions yet.'));
      return;
    }

    recentRevisions.forEach((revision) => {
      const item = createElement('li', 'recent-revision');
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = `Revision ${revision.revision} · ${revision.action || 'Snapshot'} · ${formatRevisionDate(firestoreApi.timestampToIso(revision.createdAt))}`;
      details.appendChild(summary);

      const detailGroup = createElement('div', 'revision-details');
      detailGroup.appendChild(createElement('span', '', `Source: ${revision.source || 'draft'} · Previous: ${revision.previousRevision || 0}`));
      const changedFeatures = Array.isArray(revision.changedFeatures) ? revision.changedFeatures : [];
      detailGroup.appendChild(createElement('span', '', `${changedFeatures.length || 'No recorded'} feature${changedFeatures.length === 1 ? '' : 's'} changed in the matching audit event.`));
      if (changedFeatures.length > 0) {
        const names = changedFeatures.map((featureId) => {
          const definition = configApi.FEATURE_REGISTRY.find((item) => item.id === featureId);
          return definition ? definition.displayName : featureId;
        });
        detailGroup.appendChild(createElement('span', '', names.join(', ')));
      }
      if (revision.source === 'draft') {
        const restoreButton = createElement('button', 'button button-secondary revision-restore', 'Restore to Draft');
        restoreButton.type = 'button';
        restoreButton.dataset.revisionId = revision.id;
        detailGroup.appendChild(restoreButton);
      }
      details.appendChild(detailGroup);
      item.appendChild(details);
      dom.recentRevisions.appendChild(item);
    });
  }

  function updateDraftSummary() {
    if (!currentConfig || !configApi) return;
    const counts = configApi.countStates(currentConfig);
    if (dom.countLive) dom.countLive.textContent = String(counts.LIVE);
    if (dom.countHidden) dom.countHidden.textContent = String(counts.HIDDEN);
    if (dom.countComingSoon) dom.countComingSoon.textContent = String(counts.COMING_SOON);
    if (dom.countAdminPreview) dom.countAdminPreview.textContent = String(counts.ADMIN_PREVIEW);
    setHidden(dom.unsavedBadge, !isDirty);
    if (dom.saveStateLabel) {
      dom.saveStateLabel.textContent = !serverAvailable
        ? 'Server storage unavailable'
        : (isDirty ? 'Unsaved Changes' : `Draft Revision: ${serverRevision}`);
    }
    if (dom.lastSavedLabel) {
      dom.lastSavedLabel.textContent = !serverAvailable
        ? 'Editing is disabled until the saved server draft is available.'
        : (isDirty ? 'Save Draft creates a new Firestore revision.' : formatDate(currentConfig.updatedAt));
    }
    updatePublishButton();
    updatePreviewButton();
    renderDraftComparison();
    renderActivationHealth();
  }

  function renderActivationHealth(checks = []) {
    if (!configApi) return;
    const capabilityCounts = configApi.getCapabilityCounts();
    const blocking = checks.filter((check) => check.status === 'blocking').length;
    const warnings = checks.filter((check) => check.status === 'warning').length;
    if (dom.runtimeMode) dom.runtimeMode.textContent = window.GPBCWebsiteControlRuntime?.DEFAULT_MODE || 'SHADOW';
    if (dom.publishedRevision) dom.publishedRevision.textContent = publishedRevision ? String(publishedRevision) : '—';
    if (dom.draftRevision) dom.draftRevision.textContent = serverRevision ? String(serverRevision) : '—';
    if (dom.activeReadyCount) dom.activeReadyCount.textContent = String(capabilityCounts.ACTIVE_READY || 0);
    if (dom.shadowOnlyCount) dom.shadowOnlyCount.textContent = String(capabilityCounts.SHADOW_ONLY || 0);
    if (dom.blockingIssueCount) dom.blockingIssueCount.textContent = checks.length ? String(blocking) : '—';
    if (dom.warningCount) dom.warningCount.textContent = checks.length ? String(warnings) : '—';
    if (dom.publicEndpointStatus) {
      dom.publicEndpointStatus.textContent = 'Local/emulator helper';
      dom.publicEndpointStatus.dataset.status = 'info';
    }
    if (dom.lastValidation && checks.length) dom.lastValidation.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    readinessWarnings = warnings;
  }

  function stateLabel(state) {
    return configApi.FEATURE_STATE_LABELS[state] || state || 'Live';
  }

  function renderDraftComparison() {
    if (!dom.comparisonList || !dom.comparisonSummary || !currentConfig || !configApi) return;
    const baseline = publishedConfig?.features || {};
    const changes = configApi.FEATURE_REGISTRY.filter((definition) => {
      const publishedState = baseline[definition.id]?.state || definition.defaultState;
      return publishedState !== currentConfig.features[definition.id].state;
    });
    const publishedLabel = publishedConfig ? `Published Revision ${publishedRevision}` : 'No Published configuration';
    dom.comparisonSummary.textContent = changes.length === 0
      ? `${publishedLabel} · No changes`
      : `${publishedLabel} · ${changes.length} feature change${changes.length === 1 ? '' : 's'}`;
    dom.comparisonList.replaceChildren();
    if (changes.length === 0) {
      dom.comparisonList.appendChild(createElement('li', 'muted', 'Draft matches Published storage.'));
      return;
    }
    changes.forEach((definition) => {
      const publishedState = baseline[definition.id]?.state || definition.defaultState;
      const draftState = currentConfig.features[definition.id].state;
      const item = createElement('li', 'comparison-item');
      item.dataset.changeState = draftState;
      item.appendChild(createElement('strong', '', definition.displayName));
      item.appendChild(createElement('span', '', `Published: ${stateLabel(publishedState)} · Draft: ${stateLabel(draftState)}`));
      dom.comparisonList.appendChild(item);
    });
  }

  function appendReadinessItem(status, label, detail) {
    const item = createElement('li', 'readiness-item');
    item.dataset.status = status;
    const icon = status === 'safe' ? '✓' : (status === 'warning' ? '⚠' : (status === 'info' ? 'i' : '✕'));
    item.appendChild(createElement('strong', '', `${icon} ${label}`));
    item.appendChild(createElement('span', '', detail));
    dom.readinessList?.appendChild(item);
  }

  async function inspectRouteHealth(route) {
    try {
      const response = await fetch(new URL(`/${route.path}`, window.location.origin).href, { credentials: 'omit', cache: 'no-store' });
      if (!response.ok) return { status: 'blocking', label: `${route.pageName} route`, detail: `Route returned HTTP ${response.status}.` };
      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const rootFound = Boolean(parsed.querySelector(route.rootSelector));
      const adapterFound = html.includes('website-control.js');
      if (!rootFound || !adapterFound) {
        return {
          status: 'blocking',
          label: `${route.pageName} route`,
          detail: `${rootFound ? 'Root marker found' : 'Missing controlled DOM root'}; ${adapterFound ? 'adapter bootstrap found' : 'missing adapter bootstrap'}.`
        };
      }
      return { status: 'safe', label: `${route.pageName} route`, detail: `Route, feature marker, and adapter bootstrap are ready.` };
    } catch (error) {
      return { status: 'warning', label: `${route.pageName} route`, detail: 'Route health could not be fetched from this Admin session.' };
    }
  }

  async function inspectSurfaceHealth() {
    const staticSources = [
      { label: 'Homepage surfaces', path: 'index.html', selector: '[data-gpbc-feature="homepage.planVisit"], [data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="homepage-cta"]', expectedCount: 5, featureId: 'homepage.planVisit / pages.planVisit' },
      { label: 'About CTA surface', path: 'about.html', selector: '[data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="about-cta"]', expectedCount: 2, featureId: 'pages.planVisit' },
      { label: 'Contact CTA surface', path: 'contact.html', selector: '[data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="contact-cta"]', expectedCount: 1, featureId: 'pages.planVisit' },
      { label: 'Position Papers CTA surface', path: 'position-papers.html', selector: '[data-gpbc-feature-link="pages.planVisit"][data-gpbc-surface="position-papers-cta"]', expectedCount: 1, featureId: 'pages.planVisit' }
    ];
    const results = await Promise.all(staticSources.map(async (source) => {
      try {
        const response = await fetch(new URL(`/${source.path}`, window.location.origin).href, { credentials: 'omit', cache: 'no-store' });
        const html = response.ok ? await response.text() : '';
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const count = parsed.querySelectorAll(source.selector).length;
        const expectedAction = currentConfig.features[source.featureId.split(' / ')[0]]?.state || 'LIVE';
        if (count === 0) {
          return { status: 'blocking', label: source.label, detail: `Expected marker is missing from ${source.path}; feature association ${source.featureId}.` };
        }
        if (count !== source.expectedCount) {
          return { status: 'warning', label: source.label, detail: `${count} markers found in ${source.path}; expected ${source.expectedCount}. Feature ${source.featureId}; expected ACTIVE action CONTROL_${expectedAction}.` };
        }
        return { status: 'safe', label: source.label, detail: `${count} markers found in ${source.path}. Feature ${source.featureId}; expected ACTIVE action CONTROL_${expectedAction}.` };
      } catch (error) {
        return { status: 'warning', label: source.label, detail: `Could not inspect ${source.path} from this Admin session.` };
      }
    }));
    results.push({ status: 'safe', label: 'Footer surface', detail: '5 renderer-owned markers configured for injected footer links; feature association pages.planVisit.' });
    results.push({ status: 'warning', label: 'Navigation surface', detail: 'No Plan Your Visit navigation marker is currently registered in the public header.' });
    return results;
  }

  async function runReadinessChecks() {
    if (!dom.readinessList || !configApi || !currentConfig) return;
    dom.readinessList.replaceChildren();
    if (dom.readinessSummary) dom.readinessSummary.textContent = 'Running route, dependency, and controlled-surface checks…';
    const checks = [];
    const validation = configApi.validateConfig(currentConfig);
    checks.push(validation.valid
      ? { status: 'safe', label: 'Draft schema', detail: 'All 50 feature entries and states are valid.' }
      : { status: 'blocking', label: 'Draft schema', detail: validation.errors[0] });

    const knownIds = new Set(configApi.FEATURE_REGISTRY.map((definition) => definition.id));
    const unknownDependencies = configApi.FEATURE_REGISTRY.flatMap((definition) => definition.dependencies
      .filter((dependencyId) => !knownIds.has(dependencyId))
      .map((dependencyId) => `${definition.id} → ${dependencyId}`));
    checks.push(unknownDependencies.length === 0
      ? { status: 'safe', label: 'Dependency registry', detail: 'All configured dependency references resolve to approved feature IDs.' }
      : { status: 'blocking', label: 'Dependency registry', detail: `Unknown dependency metadata: ${unknownDependencies.join(', ')}.` });

    const capabilityCounts = configApi.getCapabilityCounts();
    const capabilityRegistryValid = capabilityCounts.ACTIVE_READY === 5
      && capabilityCounts.SHADOW_ONLY === configApi.FEATURE_REGISTRY.length - 5;
    checks.push(capabilityRegistryValid
      ? { status: 'safe', label: 'Capability registry', detail: 'Five features are ACTIVE-ready; the remaining 45 registered features are Shadow-only.' }
      : { status: 'blocking', label: 'Capability registry', detail: 'The ACTIVE-ready allowlist does not match the reviewed V21 release scope.' });

    const capabilityWarnings = configApi.getCapabilityWarnings(currentConfig, publishedConfig);
    if (capabilityWarnings.length > 0) {
      checks.push({
        status: 'warning',
        label: 'Shadow-only feature states',
        detail: capabilityWarnings.map((warning) => warning.message).join(' ')
      });
    } else {
      checks.push({ status: 'safe', label: 'Shadow-only feature states', detail: 'No unsupported public change is requested by this Draft.' });
    }

    checks.push({
      status: 'info',
      label: 'Public endpoint health',
      detail: 'Use the local/emulator-only public-config health helper for HTTP, schema, revision, and metadata checks. Production is not called from readiness.'
    });

    const routeResults = await Promise.all(configApi.CONTROLLED_ROUTE_DEFINITIONS.map(inspectRouteHealth));
    checks.push(...routeResults);
    checks.push(...await inspectSurfaceHealth());

    readinessBlocking = checks.some((check) => check.status === 'blocking');
    readinessWarnings = checks.filter((check) => check.status === 'warning').length;
    checks.forEach((check) => appendReadinessItem(check.status, check.label, check.detail));
    if (dom.readinessSummary) {
      dom.readinessSummary.textContent = readinessBlocking
        ? 'Blocking checks must be resolved before Publish Configuration.'
        : readinessWarnings > 0
          ? 'No blocking checks found. Review Shadow-only warnings before publishing.'
          : 'No blocking readiness checks found. Review the workflow before publishing.';
    }
    renderActivationHealth(checks);
    updatePublishButton();
  }

  function readStoredDraft() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { config: null, error: null };
      return { config: JSON.parse(raw), error: null };
    } catch (error) {
      console.warn('[GPBC Admin] Stored draft could not be read.', error);
      return { config: null, error: 'Browser storage was unavailable or contained invalid data.' };
    }
  }

  function clearStoredDraft() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[GPBC Admin] Local draft could not be cleared.', error);
    }
  }

  function applyServerDraft(result) {
    currentConfig = configApi.cloneConfig(result.config);
    savedConfig = configApi.cloneConfig(currentConfig);
    serverRevision = result.revision;
    serverAvailable = true;
    isDirty = false;
    renderFeatureGroups();
    setFeatureControlsDisabled(false);
    updateDraftSummary();
  }

  function inspectLocalDraft() {
    pendingLocalDraft = null;
    setLocalDraftPanel(false);
    if (!serverAvailable) return;

    const stored = readStoredDraft();
    if (!stored.config) return;

    const validation = configApi.validateConfig(stored.config);
    if (!validation.valid) {
      setLocalDraftPanel(true, 'A local draft was found, but it failed schema validation and cannot be imported.');
      if (dom.importLocalDraftButton) dom.importLocalDraftButton.disabled = true;
      return;
    }

    pendingLocalDraft = configApi.cloneConfig(validation.value);
    setLocalDraftPanel(true, 'A valid Phase 2 local draft was found. Importing it will not write to Firestore until you choose Save Draft.');
    if (dom.importLocalDraftButton) dom.importLocalDraftButton.disabled = false;
  }

  async function loadRecentServerAudit() {
    try {
      recentChanges = await firestoreApi.loadRecentAudit(5);
      renderRecentChanges();
    } catch (error) {
      console.warn('[GPBC Admin] Recent audit records could not be loaded.', error);
      recentChanges = [{
        label: 'Recent Changes',
        detail: 'Audit history is temporarily unavailable.'
      }];
      renderRecentChanges();
    }
  }

  async function loadRecentServerRevisions() {
    try {
      const revisions = await firestoreApi.loadRecentRevisions(8);
      const auditByRevision = new Map(recentChanges
        .filter((change) => Number.isInteger(change.toRevision))
        .map((change) => [change.toRevision, change]));
      recentRevisions = revisions.map((revision) => ({
        ...revision,
        changedFeatures: auditByRevision.get(revision.revision)?.changedFeatures || []
      }));
      renderRecentRevisions();
    } catch (error) {
      console.warn('[GPBC Admin] Revision history could not be loaded.', error);
      recentRevisions = [];
      if (dom.recentRevisions) {
        dom.recentRevisions.replaceChildren(createElement('li', 'muted', 'Revision history is temporarily unavailable.'));
      }
    }
  }

  async function loadServerDraft() {
    serverAvailable = false;
    serverRevision = 0;
    publishedConfig = null;
    publishedRevision = 0;
    readinessBlocking = false;
    pendingLocalDraft = null;
    setLocalDraftPanel(false);
    setFeatureControlsDisabled(true);
    setDashboardNotice('Loading the saved server draft…', 'info');

    try {
      const result = await firestoreApi.loadDraft();
      applyServerDraft(result);
      try {
        const published = await firestoreApi.loadPublished();
        publishedConfig = published.config ? configApi.cloneConfig(published.config) : null;
        publishedRevision = published.revision || 0;
      } catch (error) {
        publishedConfig = null;
        publishedRevision = 0;
      }
      renderDraftComparison();
      inspectLocalDraft();
      await loadRecentServerAudit();
      await loadRecentServerRevisions();
      await runReadinessChecks();
      if (result.status === 'missing') {
        setDashboardNotice('No server Draft exists yet. Safe all-LIVE defaults are loaded; Save Draft will initialize Firestore.', 'warning');
      } else {
        setDashboardNotice(`Draft Revision ${result.revision} loaded from Firestore. The public website does not read it.`, 'info');
      }
    } catch (error) {
      currentConfig = configApi.createDefaultConfig();
      publishedConfig = null;
      publishedRevision = 0;
      serverAvailable = false;
      serverRevision = 0;
      isDirty = false;
      renderFeatureGroups();
      setFeatureControlsDisabled(true);
      updateDraftSummary();
      setDashboardNotice(
        error && error.message
          ? error.message
          : 'Configuration service unavailable. The saved server draft could not be loaded. Changes cannot be safely published.',
        'error'
      );
      renderDraftComparison();
    }
  }

  function importLocalDraft() {
    if (!pendingLocalDraft || !serverAvailable) return;
    currentConfig = configApi.cloneConfig(pendingLocalDraft);
    isDirty = true;
    pendingLocalDraft = null;
    setLocalDraftPanel(false);
    renderFeatureGroups();
    setFeatureControlsDisabled(false);
    updateDraftSummary();
    setDashboardNotice('Local draft imported into the editor. Save Draft to create a new Firestore revision.', 'warning');
  }

  function discardLocalDraft() {
    clearStoredDraft();
    pendingLocalDraft = null;
    setLocalDraftPanel(false);
    setDashboardNotice('The local Phase 2 draft was discarded. The server draft remains unchanged.', 'info');
  }

  async function saveDraft() {
    if (!currentConfig || !configApi || !serverAvailable) {
      setDashboardNotice('Configuration service unavailable. Changes cannot be safely saved.', 'error');
      return;
    }
    const validation = configApi.validateConfig(currentConfig);
    if (!validation.valid) {
      setDashboardNotice(`Draft could not be saved: ${validation.errors[0]}`, 'error');
      return;
    }

    const originalLabel = dom.saveDraftButton ? dom.saveDraftButton.textContent : 'Save Draft';
    if (dom.saveDraftButton) {
      dom.saveDraftButton.disabled = true;
      dom.saveDraftButton.textContent = 'Saving Draft…';
    }

    try {
      const result = await firestoreApi.saveDraft(validation.value, serverRevision);
      if (result.status === 'unchanged') {
        isDirty = false;
        updateDraftSummary();
        setDashboardNotice(`Draft Revision ${result.revision} is already current.`, 'info');
        return;
      }

      clearStoredDraft();
      pendingLocalDraft = null;
      setLocalDraftPanel(false);
      const latest = await firestoreApi.loadDraft();
      applyServerDraft(latest);
      await loadRecentServerAudit();
      await loadRecentServerRevisions();
      await runReadinessChecks();
      setDashboardNotice(`Draft saved to Firestore as Revision ${latest.revision}. The public website remains unchanged.`, 'success');
    } catch (error) {
      setDashboardNotice(
        error && error.message
          ? error.message
          : 'Draft could not be saved. No public configuration was changed.',
        'error'
      );
    } finally {
      if (dom.saveDraftButton) dom.saveDraftButton.textContent = originalLabel;
      if (serverAvailable) setFeatureControlsDisabled(false);
      updateDraftSummary();
    }
  }

  function previewDraft() {
    if (!serverAvailable || isDirty || serverRevision < 1 || publishInProgress || restoreInProgress) return;
    const previewUrl = new URL('../../index.html?gpbc-preview=1', window.location.href).href;
    const previewWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');
    if (previewWindow) {
      setDashboardNotice(`Trusted Draft Preview opened for saved Revision ${serverRevision}. Only this authenticated Admin session can load it.`, 'success');
    } else {
      setDashboardNotice('The browser blocked the Preview window. Allow pop-ups for the Admin Control Center and try again.', 'warning');
    }
  }

  async function publishConfiguration() {
    if (!serverAvailable || isDirty || serverRevision < 1 || publishInProgress) return;
    if (readinessBlocking) {
      setDashboardNotice('Publish is blocked until the Activation Readiness checks are safe.', 'error');
      return;
    }
    const confirmed = window.confirm('Publish this validated Draft to Firestore published storage? The public website will remain unchanged until a future activation step.');
    if (!confirmed) return;

    publishInProgress = true;
    updatePublishButton();
    setDashboardNotice('Validating the Draft with the trusted backend…', 'info');
    try {
      const validation = await firestoreApi.validateDraftForPublish(serverRevision);
      if (Array.isArray(validation.dependencyImpacts) && validation.dependencyImpacts.length > 0) {
        setDashboardNotice('Dependency review passed. Writing Published configuration storage only…', 'warning');
      }
      if (Array.isArray(validation.capabilityWarnings) && validation.capabilityWarnings.length > 0) {
        setDashboardNotice('Shadow-only states are being stored for future work; they will not change the public website in the current release.', 'warning');
      }
      const result = await firestoreApi.publishDraft(serverRevision);
      const published = await firestoreApi.loadPublished();
      publishedConfig = published.config ? configApi.cloneConfig(published.config) : null;
      publishedRevision = published.revision || 0;
      await loadRecentServerAudit();
      await loadRecentServerRevisions();
      renderDraftComparison();
      await runReadinessChecks();
      setDashboardNotice(`Published successfully · Published Revision: ${result.revision}. Public configuration has been updated. The runtime remains SHADOW; changes may take approximately 30–60 seconds for fresh requests and up to approximately 5 minutes for stale cache revalidation.`, 'success');
    } catch (error) {
      setDashboardNotice(
        error && error.message
          ? error.message
          : 'Publishing could not be completed. No public website changes occurred.',
        'error'
      );
    } finally {
      publishInProgress = false;
      updatePublishButton();
    }
  }

  async function restoreRevision(event) {
    const button = event.target.closest('.revision-restore');
    if (!button || !serverAvailable || isDirty) return;
    const confirmed = window.confirm('Restore this historical revision to Draft for review? This creates a new Draft revision and does not publish it.');
    if (!confirmed) return;

    restoreInProgress = true;
    updatePublishButton();
    setFeatureControlsDisabled(true);
    setDashboardNotice('Restoring the selected revision through the trusted backend…', 'info');
    try {
      const result = await firestoreApi.restoreRevisionToDraft(button.dataset.revisionId, serverRevision);
      const latest = await firestoreApi.loadDraft();
      applyServerDraft(latest);
      await loadRecentServerAudit();
      await loadRecentServerRevisions();
      await runReadinessChecks();
      setDashboardNotice(`Revision restored to Draft Revision ${result.revision}. Review it before any future publish.`, 'success');
    } catch (error) {
      setDashboardNotice(
        error && error.message
          ? error.message
          : 'The revision could not be restored. No public website changes occurred.',
        'error'
      );
    } finally {
      if (serverAvailable) setFeatureControlsDisabled(false);
      restoreInProgress = false;
      updatePublishButton();
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError('');

    const email = dom.adminEmail ? dom.adminEmail.value.trim() : '';
    const password = dom.adminPassword ? dom.adminPassword.value : '';
    if (!email || !password) {
      setAuthError('Enter your email address and password to continue.');
      return;
    }

    setSignInLoading(true);
    setHidden(dom.authBusy, false);
    try {
      await authApi.signIn(email, password);
    } catch (error) {
      setSignInLoading(false);
      setHidden(dom.authBusy, true);
      setAuthError(error && error.message ? error.message : 'Sign-in could not be completed. Please try again.');
    }
  }

  async function handleSignOut() {
    try {
      await authApi.signOut();
    } catch (error) {
      console.error('[GPBC Admin] Sign-out failed.', error);
      setAuthError('Sign-out could not be completed. Please try again.');
    }
  }

  function handleAuthState(state) {
    setSignInLoading(false);
    setHidden(dom.authBusy, true);

    if (state.status === 'signed-out' || state.status === 'error') {
      currentUser = null;
      activeUserId = null;
      serverAvailable = false;
      serverRevision = 0;
      publishedConfig = null;
      publishedRevision = 0;
      readinessBlocking = false;
      publishInProgress = false;
      updatePreviewButton();
      updatePublishButton();
      setHidden(dom.headerSignOut, true);
      setView('auth');
      if (state.status === 'error') {
        setAuthError(state.error || 'The sign-in service is unavailable.');
      }
      return;
    }

    currentUser = state.user;
    setHidden(dom.headerSignOut, false);
    if (dom.signedInAs) dom.signedInAs.textContent = displayName(currentUser);

    if (state.status === 'checking') {
      setAuthError('');
      setView('checking');
      return;
    }

    if (state.status === 'unauthorized') {
      if (dom.accessDeniedReason) {
        dom.accessDeniedReason.textContent = state.authorization?.claimMissing
          ? 'Administrator access was recently updated, or this account is not an Admin. Sign out and sign in again after a trusted claim change.'
          : 'Administrator access requires an explicit Firebase Auth claim. No dashboard controls are available to this account.';
      }
      setView('denied');
      return;
    }

    if (state.status === 'authorized') {
      setAuthError('');
      setView('dashboard');
      if (activeUserId !== currentUser.uid) {
        activeUserId = currentUser.uid;
        loadServerDraft();
      }
    }
  }

  function init() {
    cacheDom();
    renderLocalWorshipResources();
    renderProtectedComponents();
    renderRecentChanges();

    dom.loginForm?.addEventListener('submit', handleLogin);
    dom.headerSignOut?.addEventListener('click', handleSignOut);
    dom.accessDeniedSignOut?.addEventListener('click', handleSignOut);
    dom.saveDraftButton?.addEventListener('click', saveDraft);
    dom.previewDraftButton?.addEventListener('click', previewDraft);
    dom.publishButton?.addEventListener('click', publishConfiguration);
    dom.importLocalDraftButton?.addEventListener('click', importLocalDraft);
    dom.discardLocalDraftButton?.addEventListener('click', discardLocalDraft);
    dom.recentRevisions?.addEventListener('click', restoreRevision);

    window.addEventListener('beforeunload', (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    });

    if (!configApi || !authApi || !firestoreApi) {
      setView('auth');
      setAuthError('The Admin foundation could not load its secure configuration service.');
      return;
    }

    authApi.subscribe(handleAuthState);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
