'use strict';

// This is the server-side schema contract for V21 website configuration.
// The browser registry remains the source of display labels and UI metadata;
// scripts/verify-v21-schema.mjs proves the two approved ID/dependency lists
// stay aligned.
const SCHEMA_VERSION = 1;

const ALLOWED_STATES = Object.freeze([
  'LIVE',
  'HIDDEN',
  'COMING_SOON',
  'ADMIN_PREVIEW'
]);

const FEATURE_DEFINITIONS = Object.freeze([
  { id: 'homepage.hero', dependencies: [] },
  { id: 'homepage.sacredFocus', dependencies: [] },
  { id: 'homepage.planVisit', dependencies: ['pages.planVisit'] },
  { id: 'homepage.welcomeHome', dependencies: [] },
  { id: 'homepage.community', dependencies: [] },
  { id: 'homepage.specialEvents', dependencies: ['pages.calendar', 'pages.giving'] },
  { id: 'homepage.featuredEvents', dependencies: ['pages.calendar'] },
  { id: 'homepage.transformationalLoop', dependencies: ['pages.planVisit', 'ministries.worship'] },
  { id: 'homepage.lordsPrayerWheel', dependencies: [] },
  { id: 'homepage.stayConnected', dependencies: ['pages.calendar', 'pages.prayer', 'pages.giving', 'devotions.daily', 'ministries.worship'] },

  { id: 'pages.about', dependencies: ['pages.about.history', 'pages.about.mission', 'pages.about.leadership', 'pages.about.beliefs', 'pages.about.coreValues', 'pages.about.positionPapers', 'pages.about.testimonies'] },
  { id: 'pages.about.history', dependencies: ['pages.about'] },
  { id: 'pages.about.mission', dependencies: ['pages.about'] },
  { id: 'pages.about.leadership', dependencies: ['pages.about'] },
  { id: 'pages.about.beliefs', dependencies: ['pages.about'] },
  { id: 'pages.about.coreValues', dependencies: ['pages.about'] },
  { id: 'pages.about.positionPapers', dependencies: ['pages.about'] },
  { id: 'pages.about.testimonies', dependencies: ['pages.about'] },

  { id: 'pages.planVisit', dependencies: ['homepage.planVisit'] },
  { id: 'pages.calendar', dependencies: ['homepage.specialEvents', 'homepage.featuredEvents'] },
  { id: 'pages.gallery', dependencies: [] },
  { id: 'pages.contact', dependencies: [] },
  { id: 'pages.prayer', dependencies: ['homepage.sacredFocus', 'homepage.stayConnected'] },
  { id: 'pages.giving', dependencies: ['homepage.specialEvents', 'homepage.stayConnected'] },
  { id: 'pages.songbook', dependencies: [] },
  { id: 'pages.pastor', dependencies: [] },

  { id: 'devotions.daily', dependencies: ['homepage.stayConnected'] },
  { id: 'devotions.bibleReader', dependencies: [] },
  { id: 'devotions.couples', dependencies: [] },
  { id: 'devotions.family', dependencies: [] },
  { id: 'devotions.youth', dependencies: ['ministries.youth', 'resources.youthGames'] },
  { id: 'devotions.children', dependencies: ['ministries.kids', 'resources.kidsGames'] },
  { id: 'devotions.fasting21', dependencies: [] },
  { id: 'devotions.fasting30', dependencies: [] },
  { id: 'devotions.lent', dependencies: ['pages.about'] },
  { id: 'devotions.gratitudeFasting', dependencies: [] },

  { id: 'ministries.overview', dependencies: ['ministries.bibleStudy', 'ministries.worship', 'ministries.kids', 'ministries.youth'] },
  { id: 'ministries.bibleStudy', dependencies: ['ministries.overview'] },
  { id: 'ministries.communityDevelopment', dependencies: ['ministries.overview'] },
  { id: 'ministries.homeless', dependencies: ['ministries.overview'] },
  { id: 'ministries.hospital', dependencies: ['ministries.overview'] },
  { id: 'ministries.kids', dependencies: ['ministries.overview', 'devotions.children', 'resources.kidsGames'] },
  { id: 'ministries.menFellowship', dependencies: ['ministries.overview'] },
  { id: 'ministries.missionOutreach', dependencies: ['ministries.overview'] },
  { id: 'ministries.prison', dependencies: ['ministries.overview'] },
  { id: 'ministries.supportMissionaries', dependencies: ['ministries.overview'] },
  { id: 'ministries.worship', dependencies: ['ministries.overview', 'homepage.transformationalLoop'] },
  { id: 'ministries.youth', dependencies: ['ministries.overview', 'devotions.youth', 'resources.youthGames'] },

  { id: 'resources.kidsGames', dependencies: ['ministries.kids', 'devotions.children'] },
  { id: 'resources.youthGames', dependencies: ['ministries.youth', 'devotions.youth'] }
].map((definition) => Object.freeze({
  id: definition.id,
  dependencies: Object.freeze(definition.dependencies)
})));

const FEATURE_IDS = Object.freeze(FEATURE_DEFINITIONS.map((definition) => definition.id));
const FEATURE_ID_SET = new Set(FEATURE_IDS);
const STATE_SET = new Set(ALLOWED_STATES);
const FEATURE_MAP_KEYS = Object.freeze(['state']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateFeatureMap(features) {
  const errors = [];
  if (!isRecord(features)) return ['Configuration features must be an object.'];

  Object.keys(features).forEach((featureId) => {
    if (!FEATURE_ID_SET.has(featureId)) errors.push(`Unknown feature ID: ${featureId}.`);
  });

  FEATURE_DEFINITIONS.forEach((definition) => {
    const entry = features[definition.id];
    if (!isRecord(entry)) {
      errors.push(`Feature ${definition.id} is missing or malformed.`);
      return;
    }
    if (Object.keys(entry).some((key) => !FEATURE_MAP_KEYS.includes(key))) {
      errors.push(`Feature ${definition.id} contains unsupported fields.`);
    }
    if (!STATE_SET.has(entry.state)) {
      errors.push(`Feature ${definition.id} has an invalid state.`);
    }
  });

  return errors;
}

function validateDraftPayload(payload) {
  const errors = [];
  if (!isRecord(payload)) return { valid: false, errors: ['Draft payload must be an object.'] };
  const keys = Object.keys(payload).sort().join('|');
  if (keys !== 'features|schemaVersion|state') {
    errors.push('Draft payload contains unsupported or missing fields.');
  }
  if (payload.schemaVersion !== SCHEMA_VERSION) errors.push(`Unsupported schema version. Expected ${SCHEMA_VERSION}.`);
  if (payload.state !== 'draft') errors.push('Only draft configuration may be saved.');
  errors.push(...validateFeatureMap(payload.features));
  return { valid: errors.length === 0, errors };
}

function validateStoredDocument(data, expectedStatus) {
  const errors = [];
  if (!isRecord(data)) return ['Stored configuration must be an object.'];
  const expectedFields = expectedStatus === 'draft'
    ? ['schemaVersion', 'status', 'features', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'revision']
    : ['schemaVersion', 'status', 'features', 'revision', 'publishedAt', 'publishedBy', 'sourceDraftRevision'];
  if (Object.keys(data).sort().join('|') !== expectedFields.slice().sort().join('|')) {
    errors.push('Stored configuration contains unsupported or missing fields.');
  }
  if (data.schemaVersion !== SCHEMA_VERSION || data.status !== expectedStatus) {
    errors.push(`Stored configuration must have status ${expectedStatus}.`);
  }
  errors.push(...validateFeatureMap(data.features));
  if (!Number.isInteger(data.revision) || data.revision < 1) errors.push('Stored configuration revision is invalid.');

  if (expectedStatus === 'draft') {
    if (!data.createdAt || !data.updatedAt) errors.push('Draft timestamps are required.');
    if (typeof data.createdBy !== 'string' || typeof data.updatedBy !== 'string') errors.push('Draft authorship metadata is invalid.');
  } else {
    if (!data.publishedAt) errors.push('Published timestamp is required.');
    if (typeof data.publishedBy !== 'string') errors.push('Published authorship metadata is invalid.');
    if (!Number.isInteger(data.sourceDraftRevision) || data.sourceDraftRevision < 1) errors.push('Published source revision is invalid.');
  }
  return errors;
}

function validateRevisionDocument(data) {
  const errors = [];
  if (!isRecord(data)) return ['Revision must be an object.'];
  const expectedFields = ['schemaVersion', 'status', 'source', 'action', 'features', 'revision', 'previousRevision', 'createdAt', 'createdBy', 'actorEmail'];
  if (Object.keys(data).sort().join('|') !== expectedFields.slice().sort().join('|')) errors.push('Revision contains unsupported or missing fields.');
  if (data.schemaVersion !== SCHEMA_VERSION || data.status !== 'snapshot') errors.push('Revision schema is invalid.');
  if (!['draft', 'published'].includes(data.source)) errors.push('Revision source is invalid.');
  if (!['DRAFT_CREATED', 'DRAFT_UPDATED', 'DRAFT_RESTORED', 'PUBLISH_PREPARED', 'PUBLISHED'].includes(data.action)) errors.push('Revision action is invalid.');
  errors.push(...validateFeatureMap(data.features));
  if (!Number.isInteger(data.revision) || data.revision < 1) errors.push('Revision number is invalid.');
  if (!Number.isInteger(data.previousRevision) || data.previousRevision < 0) errors.push('Previous revision is invalid.');
  if (!data.createdAt || typeof data.createdBy !== 'string' || typeof data.actorEmail !== 'string') errors.push('Revision metadata is invalid.');
  return errors;
}

function changedFeatureIds(previousFeatures, nextFeatures) {
  return FEATURE_DEFINITIONS
    .filter((definition) => {
      const previousState = previousFeatures?.[definition.id]?.state || 'LIVE';
      const nextState = nextFeatures?.[definition.id]?.state || 'LIVE';
      return previousState !== nextState;
    })
    .map((definition) => definition.id);
}

function dependencyImpacts(changedIds) {
  const changed = new Set(changedIds);
  return FEATURE_DEFINITIONS
    .filter((definition) => definition.dependencies.some((dependencyId) => changed.has(dependencyId)))
    .map((definition) => ({
      featureId: definition.id,
      dependsOn: definition.dependencies.filter((dependencyId) => changed.has(dependencyId))
    }));
}

module.exports = Object.freeze({
  SCHEMA_VERSION,
  ALLOWED_STATES,
  FEATURE_DEFINITIONS,
  FEATURE_IDS,
  validateFeatureMap,
  validateDraftPayload,
  validateStoredDocument,
  validateRevisionDocument,
  changedFeatureIds,
  dependencyImpacts
});
