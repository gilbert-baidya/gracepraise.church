'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const functions = require('../index');

const adminFunctionNames = [
  'saveWebsiteDraft',
  'validateWebsiteDraftForPublish',
  'getWebsiteDraftPreview',
  'publishWebsiteConfiguration',
  'restoreWebsiteRevision'
];

test('published configuration is public while Admin callables remain protected', () => {
  const publicEndpoint = functions.getPublishedWebsiteConfiguration.__endpoint;

  assert.deepEqual(publicEndpoint.httpsTrigger.invoker, ['public']);
  assert.deepEqual(publicEndpoint.region, ['us-central1']);

  for (const name of adminFunctionNames) {
    const endpoint = functions[name].__endpoint;
    assert.ok(endpoint.callableTrigger, `${name} must remain callable`);
    assert.equal(endpoint.httpsTrigger, undefined, `${name} must not expose an HTTP trigger`);
  }
});
