'use strict';

const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2/options');
const { BackendOperationError, createService } = require('./lib/website-control-service');

if (!admin.apps.length) admin.initializeApp();

setGlobalOptions({ region: 'us-central1', maxInstances: 3 });

const service = createService({
  db: getFirestore(),
  FieldValue
});

function expose(handler) {
  return onCall(async (request) => {
    try {
      return await handler(request.data || {}, request);
    } catch (error) {
      if (error instanceof BackendOperationError) {
        throw new HttpsError(error.code, error.message, error.details || undefined);
      }
      console.error('[GPBC V21] Trusted operation failed.', error);
      throw new HttpsError('internal', 'The trusted configuration service could not complete that operation.');
    }
  });
}

exports.saveWebsiteDraft = expose((data, context) => service.saveDraft(data, context));
exports.validateWebsiteDraftForPublish = expose((data, context) => service.validateDraftForPublish(data, context));
exports.getWebsiteDraftPreview = expose((data, context) => service.getWebsiteDraftPreview(data, context));
exports.publishWebsiteConfiguration = expose((data, context) => service.publishWebsiteConfiguration(data, context));
exports.restoreWebsiteRevision = expose((data, context) => service.restoreWebsiteRevision(data, context));

exports.getPublishedWebsiteConfiguration = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.set('Allow', 'GET');
    response.set('Cache-Control', 'no-store');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const config = await service.getPublishedPublicConfig();
    response.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
    response.type('application/json').status(200).send(JSON.stringify(config));
  } catch (error) {
    if (error instanceof BackendOperationError && error.code === 'not-found') {
      response.set('Cache-Control', 'no-store');
      response.status(404).json({ error: 'Published configuration is not available.' });
      return;
    }

    console.error('[GPBC V21] Public configuration delivery failed.', error);
    response.set('Cache-Control', 'no-store');
    response.status(500).json({ error: 'Published configuration is temporarily unavailable.' });
  }
});
