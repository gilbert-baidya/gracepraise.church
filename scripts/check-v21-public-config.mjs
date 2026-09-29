import { setTimeout as delay } from 'node:timers/promises';
import schema from '../shared/website-control-schema.js';

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const projectId = valueAfter('--project-id') || process.env.GCLOUD_PROJECT || 'admin-gpbc-website';
const endpoint = valueAfter('--endpoint') || `http://127.0.0.1:5001/${projectId}/us-central1/getPublishedWebsiteConfiguration`;
const allowProductionRead = args.includes('--allow-production-read');
const isProductionEndpoint = endpoint.includes('cloudfunctions.net');

if (isProductionEndpoint && !allowProductionRead) {
  throw new Error('Refusing a production endpoint. Use a local/emulator endpoint, or explicitly pass --allow-production-read for a read-only check.');
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 3000);
let response;
try {
  response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}

if (!response.ok) throw new Error(`Public configuration endpoint returned HTTP ${response.status}.`);
const payload = await response.json();
const expectedKeys = ['features', 'revision', 'schemaVersion'].sort().join('|');
if (Object.keys(payload).sort().join('|') !== expectedKeys) throw new Error('Public response contains Draft/Admin metadata or unsupported fields.');
if (payload.schemaVersion !== schema.SCHEMA_VERSION) throw new Error(`Unsupported schema version: ${payload.schemaVersion}.`);
if (!Number.isInteger(payload.revision) || payload.revision < 1) throw new Error('Public response revision is invalid.');
if (Object.keys(payload.features || {}).length !== schema.FEATURE_IDS.length) throw new Error(`Expected ${schema.FEATURE_IDS.length} public feature entries.`);
const errors = schema.validateFeatureMap(payload.features);
if (errors.length > 0) throw new Error(errors[0]);
for (const feature of Object.values(payload.features)) {
  if (Object.keys(feature).some((key) => key !== 'state')) throw new Error('Public feature entry contains non-state metadata.');
}

console.log(`V21 public configuration health passed: HTTP 200, schema ${payload.schemaVersion}, revision ${payload.revision}, ${schema.FEATURE_IDS.length} sanitized features.`);
if (isProductionEndpoint) {
  await delay(0);
  console.log('Read-only production check was explicitly authorized by the caller; no data was mutated.');
}
