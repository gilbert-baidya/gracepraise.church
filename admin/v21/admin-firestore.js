(() => {
  'use strict';

  const DRAFT_COLLECTION = 'websiteControl';
  const REVISION_COLLECTION = 'websiteControlRevisions';
  const AUDIT_COLLECTION = 'websiteControlAudit';
  const DRAFT_ID = 'draft';
  const PUBLISHED_ID = 'published';
  const FUNCTIONS_REGION = 'us-central1';

  const configApi = window.GPBCAdminConfig;
  const authApi = window.GPBCAdminAuth;

  class AdminDataError extends Error {
    constructor(code, message, cause = null) {
      super(message);
      this.name = 'AdminDataError';
      this.code = code;
      this.cause = cause;
    }
  }

  function getDb() {
    if (!window.firebase || typeof firebase.firestore !== 'function') {
      throw new AdminDataError('sdk-unavailable', 'The secure configuration service is not available on this page.');
    }
    if (!authApi || typeof authApi.getFirebaseAuth !== 'function') {
      throw new AdminDataError('auth-unavailable', 'Administrator authentication is not available.');
    }

    authApi.getFirebaseAuth();
    let app;
    try {
      app = firebase.app('gpbc-v21-admin');
    } catch (error) {
      throw new AdminDataError('app-unavailable', 'The Admin Firebase app could not be initialized.', error);
    }

    try {
      return app.firestore();
    } catch (error) {
      throw new AdminDataError('firestore-unavailable', 'Firestore is not configured for this Admin app.', error);
    }
  }

  function getFunctions() {
    if (!window.firebase || typeof firebase.functions !== 'function') {
      throw new AdminDataError('functions-unavailable', 'The trusted Admin backend is not available on this page.');
    }
    if (!authApi || typeof authApi.getFirebaseAuth !== 'function') {
      throw new AdminDataError('auth-unavailable', 'Administrator authentication is not available.');
    }

    authApi.getFirebaseAuth();
    let app;
    try {
      app = firebase.app('gpbc-v21-admin');
    } catch (error) {
      throw new AdminDataError('app-unavailable', 'The Admin Firebase app could not be initialized.', error);
    }

    try {
      if (typeof app.functions === 'function') return app.functions(FUNCTIONS_REGION);
      return firebase.functions(app, FUNCTIONS_REGION);
    } catch (error) {
      throw new AdminDataError('functions-unavailable', 'The trusted Admin backend is not configured for this app.', error);
    }
  }

  async function callTrusted(functionName, payload) {
    try {
      const callable = getFunctions().httpsCallable(functionName);
      const response = await callable(payload);
      return response.data;
    } catch (error) {
      throw mapFirestoreError(error);
    }
  }

  function getCurrentUser() {
    const auth = authApi.getFirebaseAuth();
    if (!auth.currentUser) {
      throw new AdminDataError('signed-out', 'Sign in again before accessing configuration.');
    }
    return auth.currentUser;
  }

  function serverTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  function timestampToIso(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return null;
  }

  function mapFirestoreError(error) {
    if (error instanceof AdminDataError) return error;
    const code = error && error.code ? String(error.code) : '';
    if (code.includes('permission-denied')) {
      return new AdminDataError('permission-denied', 'The trusted Admin backend denied this operation. Verify the Admin claim.', error);
    }
    if (code.includes('aborted')) {
      return new AdminDataError('stale-revision', 'This configuration changed in another session. Reload the latest Draft before continuing.', error);
    }
    if (code.includes('invalid-argument')) {
      return new AdminDataError('invalid-config', 'Configuration validation failed. Review the Draft before continuing.', error);
    }
    if (code.includes('not-found')) {
      return new AdminDataError('not-found', 'The requested configuration or revision was not found.', error);
    }
    if (code.includes('unavailable') || code.includes('deadline-exceeded') || code.includes('network')) {
      return new AdminDataError('network-failure', 'Configuration service unavailable. The saved server draft could not be loaded or saved.', error);
    }
    if (code.includes('failed-precondition')) {
      return new AdminDataError('failed-precondition', 'Firestore is not enabled or the required configuration is not ready yet.', error);
    }
    return new AdminDataError('firestore-error', 'The configuration service could not complete that operation.', error);
  }

  function validateServerDocument(data, expectedStatus) {
    if (!data || typeof data !== 'object') {
      throw new AdminDataError('malformed-config', 'The server returned an invalid configuration document.');
    }
    const expectedFields = expectedStatus === 'draft'
      ? ['schemaVersion', 'status', 'features', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'revision']
      : ['schemaVersion', 'status', 'features', 'revision', 'publishedAt', 'publishedBy', 'sourceDraftRevision'];
    const actualFields = Object.keys(data).sort();
    if (actualFields.join('|') !== expectedFields.slice().sort().join('|')) {
      throw new AdminDataError('malformed-config', 'The server configuration contains unsupported or missing fields.');
    }
    if (data.schemaVersion !== configApi.SCHEMA_VERSION || data.status !== expectedStatus) {
      throw new AdminDataError('malformed-config', 'The server configuration schema or status is invalid.');
    }
    const featureErrors = configApi.validateFeatureMap(data.features);
    if (featureErrors.length > 0) {
      throw new AdminDataError('malformed-config', `The server configuration failed validation: ${featureErrors[0]}`);
    }
    if (!Number.isInteger(data.revision) || data.revision < 1) {
      throw new AdminDataError('malformed-config', 'The server configuration revision is invalid.');
    }
    if (expectedStatus === 'draft') {
      if (!timestampToIso(data.createdAt) || !timestampToIso(data.updatedAt)
        || typeof data.createdBy !== 'string' || typeof data.updatedBy !== 'string') {
        throw new AdminDataError('malformed-config', 'The server Draft metadata is invalid.');
      }
    } else if (!timestampToIso(data.publishedAt)
      || typeof data.publishedBy !== 'string'
      || !Number.isInteger(data.sourceDraftRevision)
      || data.sourceDraftRevision < 1) {
      throw new AdminDataError('malformed-config', 'The server Published metadata is invalid.');
    }
    return data;
  }

  function toDraftResult(data) {
    validateServerDocument(data, 'draft');
    return {
      status: 'found',
      revision: data.revision,
      config: configApi.createDraftConfig(data.features, {
        updatedAt: timestampToIso(data.updatedAt),
        updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null
      }),
      raw: data
    };
  }

  async function loadDraft() {
    try {
      const db = getDb();
      const snapshot = await db.collection(DRAFT_COLLECTION).doc(DRAFT_ID).get();
      if (!snapshot.exists) {
        return {
          status: 'missing',
          revision: 0,
          config: configApi.createDefaultConfig(),
          raw: null
        };
      }
      return toDraftResult(snapshot.data());
    } catch (error) {
      throw mapFirestoreError(error);
    }
  }

  function featureChanges(previousFeatures, nextFeatures) {
    return configApi.FEATURE_REGISTRY
      .filter((definition) => {
        const previousState = previousFeatures?.[definition.id]?.state || definition.defaultState;
        const nextState = nextFeatures?.[definition.id]?.state || definition.defaultState;
        return previousState !== nextState;
      })
      .map((definition) => definition.id);
  }

  async function saveDraft(config, expectedRevision) {
    const validation = configApi.validateConfig(config);
    if (!validation.valid) {
      throw new AdminDataError('invalid-config', `Draft could not be saved: ${validation.errors[0]}`);
    }
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      throw new AdminDataError('invalid-revision', 'The loaded draft revision is invalid. Reload before saving.');
    }

    return callTrusted('saveWebsiteDraft', {
      config: {
        schemaVersion: validation.value.schemaVersion,
        state: validation.value.state,
        features: validation.value.features
      },
      expectedRevision
    });
  }

  async function loadRecentAudit(limit = 5) {
    try {
      const db = getDb();
      const snapshot = await db.collection(AUDIT_COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(Math.min(Math.max(limit, 1), 10))
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw mapFirestoreError(error);
    }
  }

  async function loadRecentRevisions(limit = 8) {
    try {
      const db = getDb();
      const snapshot = await db.collection(REVISION_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(Math.min(Math.max(limit, 1), 12))
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw mapFirestoreError(error);
    }
  }

  async function restoreRevisionToDraft(revisionId, expectedRevision) {
    if (typeof revisionId !== 'string' || !revisionId) {
      throw new AdminDataError('invalid-revision', 'A revision must be selected before restoring.');
    }
    return callTrusted('restoreWebsiteRevision', { revisionId, expectedRevision });
  }

  async function validateDraftForPublish(expectedDraftRevision) {
    return callTrusted('validateWebsiteDraftForPublish', { expectedDraftRevision });
  }

  async function publishDraft(expectedDraftRevision) {
    if (!Number.isInteger(expectedDraftRevision) || expectedDraftRevision < 1) {
      throw new AdminDataError('invalid-revision', 'A valid Draft revision is required before publishing.');
    }

    return callTrusted('publishWebsiteConfiguration', { expectedDraftRevision });
  }

  window.GPBCAdminFirestore = Object.freeze({
    AdminDataError,
    loadDraft,
    saveDraft,
    loadRecentAudit,
    loadRecentRevisions,
    restoreRevisionToDraft,
    validateDraftForPublish,
    publishDraft,
    timestampToIso
  });
})();
