'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const admin = require('../../functions/node_modules/firebase-admin');
const schema = require('../../shared/website-control-schema');

const projectId = process.env.GCLOUD_PROJECT || 'grace-and-praise-bangladesh';
const functionHost = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const functionBase = `http://${functionHost}/${projectId}/us-central1`;

if (!admin.apps.length) admin.initializeApp({ projectId });
const db = admin.firestore();
const auth = admin.auth();

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

async function signIn(email, password) {
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const body = await response.json();
  assert.equal(response.ok, true, JSON.stringify(body));
  return body.idToken;
}

async function callFunction(name, token, data) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${functionBase}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data })
  });
  const body = await response.json();
  if (body.error) {
    const error = new Error(body.error.message || body.error.status || 'Callable failed.');
    error.code = String(body.error.status || '').toLowerCase().replaceAll('_', '-');
    throw error;
  }
  const result = body.data ?? body.result;
  if (!result) {
    throw new Error(`Callable response did not contain data: ${JSON.stringify(body)}`);
  }
  assert.equal(response.ok, true, JSON.stringify(body));
  return result;
}

async function expectCallableError(operation, expectedCode) {
  await assert.rejects(operation, (error) => error.code === expectedCode);
}

test('callable Draft, Publish, and Restore operations enforce Auth claims and persist atomically', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `v21-admin-${suffix}@example.test`;
  const memberEmail = `v21-member-${suffix}@example.test`;
  const password = 'V21-safe-test-password-123!';
  const adminUser = await auth.createUser({ email: adminEmail, password });
  await auth.setCustomUserClaims(adminUser.uid, { admin: true });
  const memberUser = await auth.createUser({ email: memberEmail, password });
  const adminToken = await signIn(adminEmail, password);
  const memberToken = await signIn(memberEmail, password);

  await expectCallableError(
    callFunction('saveWebsiteDraft', null, { config: makeConfig(), expectedRevision: 0 }),
    'unauthenticated'
  );
  await expectCallableError(
    callFunction('saveWebsiteDraft', memberToken, { config: makeConfig(), expectedRevision: 0 }),
    'permission-denied'
  );

  const firstSave = await callFunction('saveWebsiteDraft', adminToken, {
    config: makeConfig({ 'pages.prayer': 'HIDDEN' }),
    expectedRevision: 0,
    uid: 'forged-client-uid',
    email: 'forged-client@example.test',
    action: 'FORGED_ACTION'
  });
  assert.equal(firstSave.revision, 1);

  const draftSnapshot = await db.collection('websiteControl').doc('draft').get();
  assert.equal(draftSnapshot.data().createdBy, adminUser.uid);
  assert.equal(draftSnapshot.data().updatedBy, adminUser.uid);
  const firstAudit = await db.collection('websiteControlAudit').where('toRevision', '==', 1).get();
  assert.equal(firstAudit.size, 1);
  assert.equal(firstAudit.docs[0].data().uid, adminUser.uid);
  assert.notEqual(firstAudit.docs[0].data().uid, 'forged-client-uid');

  const malformed = makeConfig();
  delete malformed.features['pages.prayer'];
  await expectCallableError(
    callFunction('saveWebsiteDraft', adminToken, { config: malformed, expectedRevision: 1 }),
    'invalid-argument'
  );
  await expectCallableError(
    callFunction('publishWebsiteConfiguration', adminToken, { expectedDraftRevision: 0 }),
    'invalid-argument'
  );
  await expectCallableError(
    callFunction('validateWebsiteDraftForPublish', adminToken, { expectedDraftRevision: 99 }),
    'aborted'
  );
  await expectCallableError(
    callFunction('publishWebsiteConfiguration', memberToken, { expectedDraftRevision: 1 }),
    'permission-denied'
  );

  const validation = await callFunction('validateWebsiteDraftForPublish', adminToken, { expectedDraftRevision: 1 });
  assert.equal(validation.publicIntegration, false);
  assert.equal(validation.revision, 1);

  const published = await callFunction('publishWebsiteConfiguration', adminToken, { expectedDraftRevision: 1 });
  assert.equal(published.status, 'published-storage-only');
  assert.equal(published.publicIntegration, false);
  const publishedSnapshot = await db.collection('websiteControl').doc('published').get();
  assert.equal(publishedSnapshot.data().sourceDraftRevision, 1);
  assert.equal(publishedSnapshot.data().publishedBy, adminUser.uid);

  const publicResponse = await fetch(`${functionBase}/getPublishedWebsiteConfiguration`, {
    headers: { origin: 'http://127.0.0.1:8080' }
  });
  const publicBody = await publicResponse.json();
  assert.equal(publicResponse.ok, true, JSON.stringify(publicBody));
  assert.match(publicResponse.headers.get('cache-control') || '', /max-age=30/);
  assert.deepEqual(Object.keys(publicBody).sort(), ['features', 'revision', 'schemaVersion']);
  assert.equal(publicBody.schemaVersion, schema.SCHEMA_VERSION);
  assert.equal(publicBody.revision, 1);
  assert.equal(publicBody.features['pages.prayer'].state, 'HIDDEN');
  assert.equal('publishedBy' in publicBody, false);
  assert.equal('publishedAt' in publicBody, false);
  assert.equal('sourceDraftRevision' in publicBody, false);

  const publicPostResponse = await fetch(`${functionBase}/getPublishedWebsiteConfiguration`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:8080' },
    body: '{}'
  });
  assert.equal(publicPostResponse.status, 405);
  assert.deepEqual(await publicPostResponse.json(), { error: 'Method not allowed.' });

  const draftRevision = (await db.collection('websiteControlRevisions').get()).docs
    .find((document) => document.data().source === 'draft' && document.data().revision === 1);
  assert.ok(draftRevision, 'The initial Draft revision must be available for restore.');
  const restored = await callFunction('restoreWebsiteRevision', adminToken, {
    revisionId: draftRevision.id,
    expectedRevision: 1
  });
  assert.equal(restored.status, 'restored');
  assert.equal(restored.revision, 2);
  assert.equal((await db.collection('websiteControl').doc('draft').get()).data().revision, 2);
  assert.equal((await db.collection('websiteControl').doc('published').get()).data().revision, 1);
  assert.equal((await db.collection('websiteControlAudit').where('action', '==', 'DRAFT_RESTORED').get()).size, 1);
  assert.equal((await db.collection('websiteControlRevisions').get()).size, 3);
  assert.equal(memberUser.uid.length > 0, true);
});
