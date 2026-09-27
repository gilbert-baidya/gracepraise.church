'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = require('@firebase/rules-unit-testing');
const { deleteDoc, doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

const rules = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
const projectId = 'demo-gpbc-v21-rules';
const documentPaths = [
  'websiteControl/draft',
  'websiteControl/published',
  'websiteControlRevisions/revision-1',
  'websiteControlAudit/audit-1'
];

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules }
  });
});

test.after(async () => {
  await testEnv.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seedProtectedDocuments() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(documentPaths.map((documentPath) => setDoc(doc(db, documentPath), { seeded: true })));
  });
}

function unauthenticatedDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function memberDb(claims = {}) {
  return testEnv.authenticatedContext('member-uid', claims).firestore();
}

function adminDb() {
  return testEnv.authenticatedContext('admin-uid', { admin: true }).firestore();
}

test('unauthenticated users cannot read or write Admin collections', async () => {
  const db = unauthenticatedDb();
  for (const documentPath of documentPaths) {
    await assertFails(getDoc(doc(db, documentPath)));
    await assertFails(setDoc(doc(db, documentPath), { attack: true }));
    await assertFails(updateDoc(doc(db, documentPath), { attack: true }));
    await assertFails(deleteDoc(doc(db, documentPath)));
  }
});

test('authenticated non-Admins cannot read or write Admin collections', async () => {
  await seedProtectedDocuments();
  const db = memberDb();
  for (const documentPath of documentPaths) {
    await assertFails(getDoc(doc(db, documentPath)));
    await assertFails(setDoc(doc(db, documentPath), { attack: true }));
    await assertFails(updateDoc(doc(db, documentPath), { attack: true }));
    await assertFails(deleteDoc(doc(db, documentPath)));
  }
});

test('email-shaped or string claims do not grant Admin access', async () => {
  await seedProtectedDocuments();
  const emailOnly = memberDb({ email: 'admin@example.com' });
  const stringClaim = memberDb({ admin: 'true' });
  await assertFails(getDoc(doc(emailOnly, 'websiteControl/draft')));
  await assertFails(getDoc(doc(stringClaim, 'websiteControl/draft')));
});

test('authorized Admins can read protected configuration data', async () => {
  await seedProtectedDocuments();
  const db = adminDb();
  for (const documentPath of documentPaths) {
    const snapshot = await assertSucceeds(getDoc(doc(db, documentPath)));
    assert.equal(snapshot.exists(), true);
  }
});

test('authorized Admin browser writes are denied and must use trusted Functions', async () => {
  const db = adminDb();
  const attackPayloads = [
    { schemaVersion: 1, status: 'draft', features: { 'evil.feature': { state: 'NOPE' } }, revision: 99 },
    { schemaVersion: 0, status: 'draft', features: {}, revision: 0 },
    { schemaVersion: 1, status: 'published', features: {}, revision: 1, publishedBy: 'forged-admin' },
    { action: 'PUBLISHED', uid: 'forged-uid', userEmail: 'forged@example.com', changedFeatures: ['evil.feature'] }
  ];

  for (const payload of attackPayloads) {
    for (const documentPath of documentPaths) {
      await assertFails(setDoc(doc(db, documentPath), payload));
    }
  }
});

test('revision, audit, configuration deletion, and metadata mutation are denied', async () => {
  await seedProtectedDocuments();
  const db = adminDb();
  const attempts = [
    updateDoc(doc(db, 'websiteControl/draft'), { revision: 1, createdBy: 'forged-uid' }),
    updateDoc(doc(db, 'websiteControl/published'), { publishedBy: 'forged-uid' }),
    updateDoc(doc(db, 'websiteControlRevisions/revision-1'), { revision: 999 }),
    updateDoc(doc(db, 'websiteControlAudit/audit-1'), { uid: 'forged-uid' }),
    deleteDoc(doc(db, 'websiteControl/draft')),
    deleteDoc(doc(db, 'websiteControl/published')),
    deleteDoc(doc(db, 'websiteControlRevisions/revision-1')),
    deleteDoc(doc(db, 'websiteControlAudit/audit-1'))
  ];
  for (const attempt of attempts) await assertFails(attempt);
});
