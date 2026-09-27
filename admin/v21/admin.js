(() => {
  'use strict';

  const configApi = window.GPBCAdminConfig;
  const authApi = window.GPBCAdminAuth;
  const firestoreApi = window.GPBCAdminFirestore;
  const STORAGE_KEY = 'gpbc-v21-admin-draft';

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
    'publishButton',
    'signedInAs',
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
  let serverAvailable = false;
  let pendingLocalDraft = null;
  let recentChanges = [];
  let recentRevisions = [];
  let publishInProgress = false;
  let restoreInProgress = false;

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
    updatePublishButton();
  }

  function updatePublishButton() {
    if (!dom.publishButton) return;
    dom.publishButton.disabled = !serverAvailable || isDirty || serverRevision < 1 || publishInProgress || restoreInProgress;
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
    pendingLocalDraft = null;
    setLocalDraftPanel(false);
    setFeatureControlsDisabled(true);
    setDashboardNotice('Loading the saved server draft…', 'info');

    try {
      const result = await firestoreApi.loadDraft();
      applyServerDraft(result);
      inspectLocalDraft();
      await loadRecentServerAudit();
      await loadRecentServerRevisions();
      if (result.status === 'missing') {
        setDashboardNotice('No server Draft exists yet. Safe all-LIVE defaults are loaded; Save Draft will initialize Firestore.', 'warning');
      } else {
        setDashboardNotice(`Draft Revision ${result.revision} loaded from Firestore. The public website does not read it.`, 'info');
      }
    } catch (error) {
      currentConfig = configApi.createDefaultConfig();
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

  async function publishConfiguration() {
    if (!serverAvailable || isDirty || serverRevision < 1 || publishInProgress) return;
    const confirmed = window.confirm('Publish this validated Draft to Firestore published storage? The public website will remain unchanged in Phase 4.');
    if (!confirmed) return;

    publishInProgress = true;
    updatePublishButton();
    setDashboardNotice('Validating the Draft with the trusted backend…', 'info');
    try {
      const validation = await firestoreApi.validateDraftForPublish(serverRevision);
      if (Array.isArray(validation.dependencyImpacts) && validation.dependencyImpacts.length > 0) {
        setDashboardNotice('Dependency review passed. Writing Published configuration storage only…', 'warning');
      }
      const result = await firestoreApi.publishDraft(serverRevision);
      await loadRecentServerAudit();
      await loadRecentServerRevisions();
      setDashboardNotice(`Published Configuration Revision ${result.revision} is stored in Firestore. Public website integration is not enabled yet.`, 'success');
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
      publishInProgress = false;
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
    renderProtectedComponents();
    renderRecentChanges();

    dom.loginForm?.addEventListener('submit', handleLogin);
    dom.headerSignOut?.addEventListener('click', handleSignOut);
    dom.accessDeniedSignOut?.addEventListener('click', handleSignOut);
    dom.saveDraftButton?.addEventListener('click', saveDraft);
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
