'use strict';

const schema = require('../../shared/website-control-schema');

const COLLECTIONS = Object.freeze({
  control: 'websiteControl',
  revisions: 'websiteControlRevisions',
  audit: 'websiteControlAudit'
});

const IDS = Object.freeze({ draft: 'draft', published: 'published' });

class BackendOperationError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'BackendOperationError';
    this.code = code;
    this.details = details;
  }
}

function requireAdmin(context) {
  if (!context || !context.auth) {
    throw new BackendOperationError('unauthenticated', 'Sign in before using the Admin Control Center.');
  }
  if (context.auth.token?.admin !== true) {
    throw new BackendOperationError('permission-denied', 'Administrator access is required for this operation.');
  }
  return context.auth;
}

function requireNonNegativeRevision(value, message = 'A valid revision is required.') {
  if (!Number.isInteger(value) || value < 0) {
    throw new BackendOperationError('invalid-argument', message);
  }
}

function requirePositiveRevision(value, message = 'A valid revision is required.') {
  if (!Number.isInteger(value) || value < 1) {
    throw new BackendOperationError('invalid-argument', message);
  }
}

function requireId(value, message) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 160) {
    throw new BackendOperationError('invalid-argument', message);
  }
}

function actor(auth) {
  return {
    uid: auth.uid,
    email: typeof auth.token?.email === 'string' ? auth.token.email : ''
  };
}

function validateStored(data, status) {
  const errors = schema.validateStoredDocument(data, status);
  if (errors.length > 0) {
    throw new BackendOperationError('failed-precondition', `Stored ${status} configuration failed validation.`);
  }
  return data;
}

function validateRevision(data) {
  const errors = schema.validateRevisionDocument(data);
  if (errors.length > 0) {
    throw new BackendOperationError('failed-precondition', 'The selected revision failed validation.');
  }
  return data;
}

function validateDraftInput(data) {
  const payload = data && data.config;
  const validation = schema.validateDraftPayload(payload);
  if (!validation.valid) {
    throw new BackendOperationError('invalid-argument', `Configuration validation failed: ${validation.errors[0]}`);
  }
  requireNonNegativeRevision(data.expectedRevision, 'The loaded Draft revision is invalid.');
  return payload;
}

function createService({ db, FieldValue }) {
  if (!db || !FieldValue || typeof FieldValue.serverTimestamp !== 'function') {
    throw new Error('Firestore service dependencies are unavailable.');
  }

  const timestamp = () => FieldValue.serverTimestamp();
  const document = (collection, id) => db.collection(collection).doc(id);

  function auditRecord({ action, auth, fromRevision, toRevision, changedFeatures }) {
    const user = actor(auth);
    return {
      action,
      uid: user.uid,
      userEmail: user.email,
      timestamp: timestamp(),
      fromRevision,
      toRevision,
      changedFeatures
    };
  }

  function revisionRecord({ config, revision, previousRevision, action, auth, source }) {
    const user = actor(auth);
    return {
      schemaVersion: schema.SCHEMA_VERSION,
      status: 'snapshot',
      source,
      action,
      features: config.features,
      revision,
      previousRevision,
      createdAt: timestamp(),
      createdBy: user.uid,
      actorEmail: user.email
    };
  }

  async function saveDraft(data, context) {
    const auth = requireAdmin(context);
    const payload = validateDraftInput(data);
    let result;

    await db.runTransaction(async (transaction) => {
      const draftRef = document(COLLECTIONS.control, IDS.draft);
      const draftSnapshot = await transaction.get(draftRef);
      const existing = draftSnapshot.exists ? draftSnapshot.data() : null;
      const currentRevision = existing ? existing.revision : 0;

      if (existing) validateStored(existing, 'draft');
      if (currentRevision !== data.expectedRevision) {
        throw new BackendOperationError('aborted', 'This configuration changed in another session. Reload the latest Draft before saving.');
      }

      const changedFeatures = schema.changedFeatureIds(existing?.features, payload.features);
      if (existing && changedFeatures.length === 0) {
        result = {
          status: 'unchanged',
          revision: currentRevision,
          changedFeatures: [],
          dependencyImpacts: []
        };
        return;
      }

      const nextRevision = currentRevision + 1;
      const action = existing ? 'DRAFT_UPDATED' : 'DRAFT_CREATED';
      const now = timestamp();
      const draftData = {
        schemaVersion: schema.SCHEMA_VERSION,
        status: 'draft',
        features: payload.features,
        createdAt: existing ? existing.createdAt : now,
        createdBy: existing ? existing.createdBy : auth.uid,
        updatedAt: now,
        updatedBy: auth.uid,
        revision: nextRevision
      };
      const config = { features: payload.features };
      const revisionRef = db.collection(COLLECTIONS.revisions).doc();
      const auditRef = db.collection(COLLECTIONS.audit).doc();

      transaction.set(draftRef, draftData);
      transaction.create(revisionRef, revisionRecord({
        config,
        revision: nextRevision,
        previousRevision: currentRevision,
        action,
        auth,
        source: 'draft'
      }));
      transaction.create(auditRef, auditRecord({
        action,
        auth,
        fromRevision: currentRevision,
        toRevision: nextRevision,
        changedFeatures: existing && changedFeatures.length > 0
          ? changedFeatures
          : schema.FEATURE_IDS
      }));

      result = {
        status: 'saved',
        revision: nextRevision,
        changedFeatures,
        dependencyImpacts: schema.dependencyImpacts(changedFeatures)
      };
    });

    return result;
  }

  async function validateDraftForPublish(data, context) {
    requireAdmin(context);
    requirePositiveRevision(data?.expectedDraftRevision, 'A valid Draft revision is required before publishing.');
    const snapshot = await document(COLLECTIONS.control, IDS.draft).get();
    if (!snapshot.exists) throw new BackendOperationError('not-found', 'Create a Draft before publishing.');
    const draft = validateStored(snapshot.data(), 'draft');
    if (draft.revision !== data.expectedDraftRevision) {
      throw new BackendOperationError('aborted', 'This Draft changed in another session. Reload before publishing.');
    }
    const publishedSnapshot = await document(COLLECTIONS.control, IDS.published).get();
    const published = publishedSnapshot.exists ? validateStored(publishedSnapshot.data(), 'published') : null;
    const changedFeatures = schema.changedFeatureIds(published?.features, draft.features);
    return {
      revision: draft.revision,
      changedFeatures,
      dependencyImpacts: schema.dependencyImpacts(changedFeatures),
      publicIntegration: false
    };
  }

  async function getPublishedPublicConfig() {
    const snapshot = await document(COLLECTIONS.control, IDS.published).get();
    if (!snapshot.exists) {
      throw new BackendOperationError('not-found', 'Published configuration is not available.');
    }

    const published = validateStored(snapshot.data(), 'published');
    const features = schema.FEATURE_IDS.reduce((map, featureId) => {
      map[featureId] = { state: published.features[featureId].state };
      return map;
    }, {});

    return {
      schemaVersion: schema.SCHEMA_VERSION,
      revision: published.revision,
      features
    };
  }

  async function getWebsiteDraftPreview(data, context) {
    requireAdmin(context);
    const snapshot = await document(COLLECTIONS.control, IDS.draft).get();
    if (!snapshot.exists) {
      throw new BackendOperationError('not-found', 'Create and save a Draft before opening Preview.');
    }

    const draft = validateStored(snapshot.data(), 'draft');
    const features = schema.FEATURE_IDS.reduce((map, featureId) => {
      map[featureId] = { state: draft.features[featureId].state };
      return map;
    }, {});

    // This is the complete Preview payload. Do not add authorship, audit,
    // Firestore, or Auth metadata here: the browser only needs state and
    // revision to exercise the same public adapter.
    return {
      schemaVersion: schema.SCHEMA_VERSION,
      revision: draft.revision,
      preview: true,
      features
    };
  }

  async function publishWebsiteConfiguration(data, context) {
    const auth = requireAdmin(context);
    requirePositiveRevision(data?.expectedDraftRevision, 'A valid Draft revision is required before publishing.');
    let result;

    await db.runTransaction(async (transaction) => {
      const draftRef = document(COLLECTIONS.control, IDS.draft);
      const publishedRef = document(COLLECTIONS.control, IDS.published);
      const draftSnapshot = await transaction.get(draftRef);
      const publishedSnapshot = await transaction.get(publishedRef);
      if (!draftSnapshot.exists) throw new BackendOperationError('not-found', 'Create a Draft before publishing.');

      const draft = validateStored(draftSnapshot.data(), 'draft');
      if (draft.revision !== data.expectedDraftRevision) {
        throw new BackendOperationError('aborted', 'This Draft changed in another session. Reload before publishing.');
      }
      const published = publishedSnapshot.exists ? validateStored(publishedSnapshot.data(), 'published') : null;
      const nextRevision = published ? published.revision + 1 : 1;
      const changedFeatures = schema.changedFeatureIds(published?.features, draft.features);
      const publishedData = {
        schemaVersion: schema.SCHEMA_VERSION,
        status: 'published',
        features: draft.features,
        revision: nextRevision,
        publishedAt: timestamp(),
        publishedBy: auth.uid,
        sourceDraftRevision: draft.revision
      };
      const revisionRef = db.collection(COLLECTIONS.revisions).doc();
      const auditRef = db.collection(COLLECTIONS.audit).doc();

      transaction.set(publishedRef, publishedData);
      transaction.create(revisionRef, revisionRecord({
        config: { features: draft.features },
        revision: nextRevision,
        previousRevision: published ? published.revision : 0,
        action: 'PUBLISHED',
        auth,
        source: 'published'
      }));
      transaction.create(auditRef, auditRecord({
        action: 'PUBLISHED',
        auth,
        fromRevision: published ? published.revision : 0,
        toRevision: nextRevision,
        changedFeatures
      }));

      result = {
        status: 'published-storage-only',
        revision: nextRevision,
        sourceDraftRevision: draft.revision,
        changedFeatures,
        dependencyImpacts: schema.dependencyImpacts(changedFeatures),
        publicIntegration: false
      };
    });

    return result;
  }

  async function restoreWebsiteRevision(data, context) {
    const auth = requireAdmin(context);
    requireId(data?.revisionId, 'A revision must be selected before restoring.');
    requireNonNegativeRevision(data?.expectedRevision, 'The loaded Draft revision is invalid.');
    let result;

    await db.runTransaction(async (transaction) => {
      const revisionRef = document(COLLECTIONS.revisions, data.revisionId);
      const draftRef = document(COLLECTIONS.control, IDS.draft);
      const revisionSnapshot = await transaction.get(revisionRef);
      const draftSnapshot = await transaction.get(draftRef);
      if (!revisionSnapshot.exists) throw new BackendOperationError('not-found', 'That revision is no longer available.');
      const revision = validateRevision(revisionSnapshot.data());
      if (revision.source !== 'draft') throw new BackendOperationError('invalid-argument', 'Only Draft revisions can be restored to Draft.');

      const existing = draftSnapshot.exists ? validateStored(draftSnapshot.data(), 'draft') : null;
      const currentRevision = existing ? existing.revision : 0;
      if (currentRevision !== data.expectedRevision) {
        throw new BackendOperationError('aborted', 'This configuration changed in another session. Reload before restoring.');
      }

      const nextRevision = currentRevision + 1;
      const now = timestamp();
      const draftData = {
        schemaVersion: schema.SCHEMA_VERSION,
        status: 'draft',
        features: revision.features,
        createdAt: existing ? existing.createdAt : now,
        createdBy: existing ? existing.createdBy : auth.uid,
        updatedAt: now,
        updatedBy: auth.uid,
        revision: nextRevision
      };
      const newRevisionRef = db.collection(COLLECTIONS.revisions).doc();
      const auditRef = db.collection(COLLECTIONS.audit).doc();
      const changedFeatures = schema.changedFeatureIds(existing?.features, revision.features);

      transaction.set(draftRef, draftData);
      transaction.create(newRevisionRef, revisionRecord({
        config: { features: revision.features },
        revision: nextRevision,
        previousRevision: currentRevision,
        action: 'DRAFT_RESTORED',
        auth,
        source: 'draft'
      }));
      transaction.create(auditRef, auditRecord({
        action: 'DRAFT_RESTORED',
        auth,
        fromRevision: currentRevision,
        toRevision: nextRevision,
        changedFeatures
      }));
      result = {
        status: 'restored',
        revision: nextRevision,
        changedFeatures,
        dependencyImpacts: schema.dependencyImpacts(changedFeatures)
      };
    });

    return result;
  }

  return Object.freeze({
    saveDraft,
    validateDraftForPublish,
    getPublishedPublicConfig,
    getWebsiteDraftPreview,
    publishWebsiteConfiguration,
    restoreWebsiteRevision
  });
}

module.exports = Object.freeze({
  COLLECTIONS,
  IDS,
  BackendOperationError,
  createService
});
