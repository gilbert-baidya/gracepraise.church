'use strict';

const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
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
exports.publishWebsiteConfiguration = expose((data, context) => service.publishWebsiteConfiguration(data, context));
exports.restoreWebsiteRevision = expose((data, context) => service.restoreWebsiteRevision(data, context));
