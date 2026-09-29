#!/usr/bin/env node
'use strict';

const schema = require('../shared/website-control-schema');

const EXPECTED_PRODUCTION_PROJECT = 'admin-gpbc-website';
const EMULATOR_PROJECT = 'demo-admin-gpbc-website';
const args = new Set(process.argv.slice(2));

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const dryRun = args.has('--dry-run') || !args.has('--write');
const write = args.has('--write');
const emulator = args.has('--emulator');
const confirmProduction = args.has('--confirm-production');
const replaceExisting = args.has('--replace-existing');
const targetProject = valueAfter('--project-id')
  || process.env.GCLOUD_PROJECT
  || process.env.GOOGLE_CLOUD_PROJECT
  || (emulator ? EMULATOR_PROJECT : EXPECTED_PRODUCTION_PROJECT);

function fail(message) {
  console.error(`Initialization refused: ${message}`);
  process.exitCode = 1;
}

if (valueAfter('--project-id') === '--write' || valueAfter('--project-id') === '--dry-run') {
  fail('--project-id requires an explicit Firebase project ID.');
} else if (targetProject !== EXPECTED_PRODUCTION_PROJECT && !(emulator && targetProject === EMULATOR_PROJECT)) {
  fail(`Target Firebase project must be ${EXPECTED_PRODUCTION_PROJECT}. For local emulator work use --emulator --project-id ${EMULATOR_PROJECT}.`);
} else if (write && dryRun) {
  fail('Choose either --dry-run or --write; dry-run is the default.');
} else if (write && targetProject === EXPECTED_PRODUCTION_PROJECT && !confirmProduction) {
  fail('Production writes require --confirm-production after reviewing the displayed project ID.');
} else if (write && emulator && !process.env.FIRESTORE_EMULATOR_HOST) {
  fail('Emulator writes require FIRESTORE_EMULATOR_HOST to be set.');
} else {
  const features = schema.createInitialBaselineFeatures();
  const validation = schema.validateFeatureMap(features);
  if (validation.length > 0) {
    fail(`The initial baseline failed schema validation: ${validation[0]}`);
  } else {
    console.log(`Target Firebase project: ${targetProject}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN — no Firestore writes' : 'WRITE'}`);
    console.log(`Schema version: ${schema.SCHEMA_VERSION}`);
    console.log(`Initial Published baseline: ${schema.FEATURE_IDS.length} features, all ${schema.INITIAL_PUBLISHED_STATE}`);
    console.log('This baseline preserves the current hardcoded public website; ACTIVE controls only the reviewed allowlist.');

    if (write) {
      const admin = require('../functions/node_modules/firebase-admin');
      if (!admin.apps.length) admin.initializeApp({ projectId: targetProject });
      const db = admin.firestore();
      Promise.all([
        db.collection('websiteControl').doc('draft').get(),
        db.collection('websiteControl').doc('published').get()
      ]).then(async ([draftSnapshot, publishedSnapshot]) => {
        if ((draftSnapshot.exists || publishedSnapshot.exists) && !replaceExisting) {
          throw new Error('Draft or Published already exists. Use --replace-existing only after an explicit review.');
        }
        const now = admin.firestore.Timestamp.now();
        const draft = {
          schemaVersion: schema.SCHEMA_VERSION,
          status: 'draft',
          features,
          createdAt: now,
          createdBy: 'bootstrap-tool',
          updatedAt: now,
          updatedBy: 'bootstrap-tool',
          revision: 1
        };
        const published = {
          schemaVersion: schema.SCHEMA_VERSION,
          status: 'published',
          features,
          revision: 1,
          publishedAt: now,
          publishedBy: 'bootstrap-tool',
          sourceDraftRevision: 1
        };
        await db.collection('websiteControl').doc('draft').set(draft);
        await db.collection('websiteControl').doc('published').set(published);
        console.log('Initialized Draft Revision 1 and Published Revision 1.');
      }).catch((error) => {
        console.error(`Initialization failed: ${error.message}`);
        process.exitCode = 1;
      });
    }
  }
}
