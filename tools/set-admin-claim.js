#!/usr/bin/env node
'use strict';

const admin = require('../functions/node_modules/firebase-admin');
const EXPECTED_PRODUCTION_PROJECT = 'admin-gpbc-website';

const uid = process.argv[2];
if (!uid || uid.startsWith('-')) {
  console.error(`Usage: GOOGLE_APPLICATION_CREDENTIALS=/secure/path/credentials.json node tools/set-admin-claim.js <firebase-auth-uid> (project: ${EXPECTED_PRODUCTION_PROJECT})`);
  process.exitCode = 1;
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: EXPECTED_PRODUCTION_PROJECT
  });
  admin.auth().setCustomUserClaims(uid, { admin: true })
    .then(() => {
      console.log(`Assigned admin: true to Firebase Auth UID ${uid}. The user must sign out and sign in again to refresh the ID token.`);
    })
    .catch((error) => {
      console.error('Admin claim assignment failed:', error.message);
      process.exitCode = 1;
    });
}
