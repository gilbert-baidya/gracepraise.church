'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const schema = require('../../shared/website-control-schema');
const { createService, BackendOperationError } = require('../lib/website-control-service');

function makeConfig(overrides = {}) {
  const features = schema.FEATURE_IDS.reduce((map, featureId) => {
    map[featureId] = { state: 'LIVE' };
    return map;
  }, {});
  Object.entries(overrides).forEach(([featureId, state]) => {
    features[featureId] = { state };
  });
  return { schemaVersion: schema.SCHEMA_VERSION, state: 'draft', features };
}

function makeFirestore() {
  const docs = new Map();
  let generatedId = 0;
  const resolve = (value) => {
    if (value && value.__serverTimestamp) return { seconds: 1, nanoseconds: 0 };
    if (Array.isArray(value)) return value.map(resolve);
    if (value && typeof value === 'object') {
      const output = {};
      Object.keys(value).forEach((key) => { output[key] = resolve(value[key]); });
      return output;
    }
    return value;
  };
  const clone = (value) => resolve(JSON.parse(JSON.stringify(value)));
  const ref = (collection, id) => ({
    path: `${collection}/${id}`,
    collection,
    id,
    async get() {
      const data = docs.get(`${collection}/${id}`);
      return { exists: Boolean(data), data: () => clone(data) };
    }
  });
  const db = {
    failCommit: false,
    collection(collection) {
      return {
        doc(id) {
          return ref(collection, id || `generated-${++generatedId}`);
        }
      };
    },
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        async get(documentRef) {
          const data = docs.get(documentRef.path);
          return { exists: Boolean(data), data: () => clone(data) };
        },
        set(documentRef, data) {
          writes.push({ type: 'set', documentRef, data });
        },
        create(documentRef, data) {
          writes.push({ type: 'create', documentRef, data });
        }
      };
      const result = await callback(transaction);
      if (db.failCommit) throw new Error('injected commit failure');
      for (const write of writes) {
        if (write.type === 'create' && docs.has(write.documentRef.path)) throw new Error('already exists');
      }
      for (const write of writes) docs.set(write.documentRef.path, clone(write.data));
      return result;
    }
  };
  return { db, docs };
}

function makeContext(uid = 'admin-uid', token = { admin: true, email: `${uid}@example.test` }) {
  return { auth: { uid, token } };
}

function serviceFor(firestore) {
  return createService({
    db: firestore.db,
    FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) }
  });
}

test('trusted Draft save authors metadata server-side and rejects stale revisions', async () => {
  const firestore = makeFirestore();
  const service = serviceFor(firestore);
  const first = await service.saveDraft({ config: makeConfig({ 'pages.prayer': 'HIDDEN' }), expectedRevision: 0 }, makeContext());
  assert.equal(first.revision, 1);

  const draft = firestore.docs.get('websiteControl/draft');
  assert.equal(draft.createdBy, 'admin-uid');
  assert.equal(draft.updatedBy, 'admin-uid');
  assert.equal(firestore.docs.get('websiteControlAudit/generated-2').uid, 'admin-uid');

  await assert.rejects(
    service.saveDraft({ config: makeConfig({ 'pages.prayer': 'LIVE' }), expectedRevision: 0 }, makeContext('other-admin')),
    (error) => error instanceof BackendOperationError && error.code === 'aborted'
  );
});

test('trusted Draft save rejects malformed configuration and non-Admin callers', async () => {
  const firestore = makeFirestore();
  const service = serviceFor(firestore);
  const invalid = makeConfig({ 'pages.prayer': 'NOT_A_STATE' });
  await assert.rejects(
    service.saveDraft({ config: invalid, expectedRevision: 0 }, makeContext()),
    (error) => error instanceof BackendOperationError && error.code === 'invalid-argument'
  );
  await assert.rejects(
    service.saveDraft({ config: makeConfig(), expectedRevision: 0 }, makeContext('member', { email: 'admin@example.test' })),
    (error) => error instanceof BackendOperationError && error.code === 'permission-denied'
  );
});

test('trusted Publish creates Published storage, revision, and audit atomically', async () => {
  const firestore = makeFirestore();
  const service = serviceFor(firestore);
  await service.saveDraft({ config: makeConfig({ 'pages.prayer': 'HIDDEN' }), expectedRevision: 0 }, makeContext());
  const result = await service.publishWebsiteConfiguration({ expectedDraftRevision: 1 }, makeContext());
  assert.equal(result.status, 'published-storage-only');
  assert.equal(result.publicIntegration, false);
  assert.deepEqual(result.capabilityWarnings.map((warning) => warning.featureId), ['pages.prayer']);
  assert.equal(firestore.docs.get('websiteControl/published').publishedBy, 'admin-uid');
  assert.equal(firestore.docs.get('websiteControl/published').sourceDraftRevision, 1);
  assert.equal(firestore.docs.get('websiteControlAudit/generated-4').action, 'PUBLISHED');
});

test('trusted Draft Preview returns only sanitized Draft state for Admins', async () => {
  const firestore = makeFirestore();
  const service = serviceFor(firestore);
  await service.saveDraft({ config: makeConfig({
    'pages.planVisit': 'COMING_SOON',
    'pages.gallery': 'ADMIN_PREVIEW'
  }), expectedRevision: 0 }, makeContext());

  const preview = await service.getWebsiteDraftPreview({}, makeContext());
  assert.deepEqual(Object.keys(preview).sort(), ['features', 'preview', 'revision', 'schemaVersion']);
  assert.equal(preview.preview, true);
  assert.equal(preview.revision, 1);
  assert.equal(preview.features['pages.planVisit'].state, 'COMING_SOON');
  assert.equal(preview.features['pages.gallery'].state, 'ADMIN_PREVIEW');
  assert.equal('uid' in preview, false);
  assert.equal('email' in preview, false);
  assert.equal('audit' in preview, false);
  assert.equal('published' in preview, false);

  await assert.rejects(
    service.getWebsiteDraftPreview({}, makeContext('member', { email: 'member@example.test' })),
    (error) => error instanceof BackendOperationError && error.code === 'permission-denied'
  );
});

test('trusted Restore to Draft creates a new revision and never directly changes Published', async () => {
  const firestore = makeFirestore();
  const service = serviceFor(firestore);
  await service.saveDraft({ config: makeConfig({ 'pages.prayer': 'HIDDEN' }), expectedRevision: 0 }, makeContext());
  await service.saveDraft({ config: makeConfig({ 'pages.prayer': 'ADMIN_PREVIEW' }), expectedRevision: 1 }, makeContext());
  const firstRevisionId = 'websiteControlRevisions/generated-1';
  const result = await service.restoreWebsiteRevision({ revisionId: firstRevisionId.split('/')[1], expectedRevision: 2 }, makeContext());
  assert.equal(result.status, 'restored');
  assert.equal(result.revision, 3);
  assert.equal(firestore.docs.get('websiteControl/draft').features['pages.prayer'].state, 'HIDDEN');
  assert.equal(firestore.docs.has('websiteControl/published'), false);
});

test('failed trusted transaction does not partially persist its writes', async () => {
  const firestore = makeFirestore();
  const service = serviceFor(firestore);
  await service.saveDraft({ config: makeConfig(), expectedRevision: 0 }, makeContext());
  const before = JSON.stringify([...firestore.docs.entries()]);
  firestore.db.failCommit = true;
  await assert.rejects(service.publishWebsiteConfiguration({ expectedDraftRevision: 1 }, makeContext()));
  assert.equal(JSON.stringify([...firestore.docs.entries()]), before);
});
