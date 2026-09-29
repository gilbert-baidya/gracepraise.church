'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const functions = require('../index');

const adminFunctionNames = [
  'saveWebsiteDraft',
  'validateWebsiteDraftForPublish',
  'getWebsiteDraftPreview',
  'publishWebsiteConfiguration',
  'restoreWebsiteRevision'
];

test('published configuration is public while Admin callables remain application-protected', () => {
  const publicEndpoint = functions.getPublishedWebsiteConfiguration.__endpoint;
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');

  assert.deepEqual(publicEndpoint.httpsTrigger.invoker, ['public']);
  assert.deepEqual(publicEndpoint.region, ['us-central1']);
  assert.match(source, /return onCall\(\{ invoker: 'public' \}/);

  for (const name of adminFunctionNames) {
    const endpoint = functions[name].__endpoint;
    assert.ok(endpoint.callableTrigger, `${name} must remain callable`);
    assert.equal(endpoint.httpsTrigger, undefined, `${name} must not expose an HTTP trigger`);
  }
});
