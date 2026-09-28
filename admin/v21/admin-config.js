(() => {
  'use strict';

  const FEATURE_STATES = Object.freeze({
    LIVE: 'LIVE',
    HIDDEN: 'HIDDEN',
    COMING_SOON: 'COMING_SOON',
    ADMIN_PREVIEW: 'ADMIN_PREVIEW'
  });

  const FEATURE_STATE_LABELS = Object.freeze({
    LIVE: 'Live',
    HIDDEN: 'Hidden',
    COMING_SOON: 'Coming Soon',
    ADMIN_PREVIEW: 'Admin Preview'
  });

  const FEATURE_STATE_DESCRIPTIONS = Object.freeze({
    LIVE: 'Available to the public website.',
    HIDDEN: 'Intended to be unavailable to the public website.',
    COMING_SOON: 'Visible as an upcoming feature in a future integration.',
    ADMIN_PREVIEW: 'Reserved for an authenticated admin preview.'
  });

  const runtime = window.GPBCWebsiteControlRuntime;
  const SCHEMA_VERSION = 1;
  const CAPABILITIES = runtime?.CAPABILITIES || Object.freeze({
    ACTIVE_READY: 'ACTIVE_READY',
    SHADOW_ONLY: 'SHADOW_ONLY',
    SYSTEM_PROTECTED: 'SYSTEM_PROTECTED'
  });
  const ACTIVE_READY_FEATURE_IDS = Object.freeze(runtime?.ACTIVE_READY_FEATURE_IDS || []);
  const CAPABILITY_LABELS = Object.freeze({
    ACTIVE_READY: 'ACTIVE-ready',
    SHADOW_ONLY: 'Shadow-only',
    SYSTEM_PROTECTED: 'Protected / system'
  });
  const CAPABILITY_DESCRIPTIONS = Object.freeze({
    ACTIVE_READY: 'Proven V21 adapter coverage; ACTIVE may control this feature.',
    SHADOW_ONLY: 'Registered and previewable, but ACTIVE preserves the existing website behavior.',
    SYSTEM_PROTECTED: 'Not a public feature control; lifecycle and safety remain code-owned.'
  });

  const feature = (id, displayName, group, description, dependencies = []) => Object.freeze({
    id,
    displayName,
    group,
    description,
    dependencies: Object.freeze(dependencies),
    defaultState: FEATURE_STATES.LIVE,
    dependencyControlled: dependencies.length > 0,
    capability: ACTIVE_READY_FEATURE_IDS.includes(id) ? CAPABILITIES.ACTIVE_READY : CAPABILITIES.SHADOW_ONLY,
    capabilityLabel: ACTIVE_READY_FEATURE_IDS.includes(id) ? CAPABILITY_LABELS.ACTIVE_READY : CAPABILITY_LABELS.SHADOW_ONLY,
    capabilityDescription: ACTIVE_READY_FEATURE_IDS.includes(id)
      ? CAPABILITY_DESCRIPTIONS.ACTIVE_READY
      : CAPABILITY_DESCRIPTIONS.SHADOW_ONLY
  });

  // Code-owned semantic registry. Selectors and lifecycle behavior stay out of
  // configuration data so a future public adapter can validate changes safely.
  const FEATURE_REGISTRY = Object.freeze([
    feature('homepage.hero', 'Homepage Hero', 'Homepage', 'Primary church identity and entry surface.'),
    feature('homepage.sacredFocus', 'Sacred Focus', 'Homepage', 'Light of the Cross and Sacred Focus section.'),
    feature('homepage.planVisit', 'Plan Your Visit Section', 'Homepage', 'Homepage visit information and service CTAs.', ['pages.planVisit']),
    feature('homepage.welcomeHome', 'Welcome Home', 'Homepage', 'Welcome message and introductory church story.'),
    feature('homepage.community', 'Community Carousel', 'Homepage', 'Community V5 carousel and related storytelling.'),
    feature('homepage.specialEvents', 'Special Events', 'Homepage', 'Dynamic special-event content and countdown entry points.', ['pages.calendar', 'pages.giving']),
    feature('homepage.featuredEvents', 'Featured Events / Get Involved', 'Homepage', 'Featured event flip cards and engagement CTAs.', ['pages.calendar']),
    feature('homepage.transformationalLoop', 'Transformational Loop', 'Homepage', 'Transformational ministry and worship carousel.', ['pages.planVisit', 'ministries.worship']),
    feature("homepage.lordsPrayerWheel", "Lord's Prayer Wheel", 'Homepage', 'Interactive Lord’s Prayer heptagon wheel.'),
    feature('homepage.stayConnected', 'Stay Connected', 'Homepage', 'Homepage cards linking visitors to key church resources.', ['pages.calendar', 'pages.prayer', 'pages.giving', 'devotions.daily', 'ministries.worship']),

    feature('pages.about', 'About Overview', 'About', 'About GPBC overview page and parent navigation.', ['pages.about.history', 'pages.about.mission', 'pages.about.leadership', 'pages.about.beliefs', 'pages.about.coreValues', 'pages.about.positionPapers', 'pages.about.testimonies']),
    feature('pages.about.history', 'Our History', 'About', 'Church history and story.' , ['pages.about']),
    feature('pages.about.mission', 'Our Mission', 'About', 'Mission and purpose content.', ['pages.about']),
    feature('pages.about.leadership', 'Our Leadership', 'About', 'Leadership information and related footer links.', ['pages.about']),
    feature('pages.about.beliefs', 'Our Beliefs', 'About', 'Statement of faith and beliefs.', ['pages.about']),
    feature('pages.about.coreValues', 'Core Values', 'About', 'Core values content.', ['pages.about']),
    feature('pages.about.positionPapers', 'Position Papers', 'About', 'Position papers and related resources.', ['pages.about']),
    feature('pages.about.testimonies', 'Testimonies', 'About', 'Testimonies and related content references.', ['pages.about']),

    feature('pages.planVisit', 'Plan Your Visit', 'Pages', 'Canonical visit-information route.', ['homepage.planVisit']),
    feature('pages.calendar', 'Calendar', 'Pages', 'Events calendar, reminders, and homepage event dependencies.', ['homepage.specialEvents', 'homepage.featuredEvents']),
    feature('pages.gallery', 'Gallery', 'Pages', 'Church gallery route and navigation entry.'),
    feature('pages.contact', 'Contact', 'Pages', 'Contact route and connected footer/CTA links.'),
    feature('pages.prayer', 'Prayer Request', 'Pages', 'Prayer request form and connected prayer CTAs.', ['homepage.sacredFocus', 'homepage.stayConnected']),
    feature('pages.giving', 'Giving', 'Pages', 'Giving route, aliases, and connected payment CTAs.', ['homepage.specialEvents', 'homepage.stayConnected']),
    feature('pages.songbook', 'Songbook', 'Pages', 'Songbook route and navigation entry.'),
    feature('pages.pastor', 'Pastor', 'Pages', 'Pastor route and footer destination.'),

    feature('devotions.daily', 'Daily Devotion', 'Devotions', 'Daily devotion experience and PWA entry point.', ['homepage.stayConnected']),
    feature('devotions.bibleReader', 'Bible Reader', 'Devotions', 'Bible reader route and devotion navigation.'),
    feature('devotions.couples', 'Couples Devotion', 'Devotions', 'Couples devotion route and navigation.'),
    feature('devotions.family', 'Family Devotion', 'Devotions', 'Family devotion route and navigation.'),
    feature('devotions.youth', 'Youth Devotion', 'Devotions', 'Youth devotion route and Youth resource links.', ['ministries.youth', 'resources.youthGames']),
    feature('devotions.children', 'Children’s Devotion', 'Devotions', 'Children’s devotion route and Kids resource links.', ['ministries.kids', 'resources.kidsGames']),
    feature('devotions.fasting21', '21-Day Fasting', 'Devotions', '21-day fasting guide.'),
    feature('devotions.fasting30', '30-Day Fasting', 'Devotions', '30-day fasting guide.'),
    feature('devotions.lent', 'Lent / 40-Day Fasting', 'Devotions', 'Canonical Lent route and fasting-40days redirect.', ['pages.about']),
    feature('devotions.gratitudeFasting', 'Gratitude Fasting', 'Devotions', 'Gratitude fasting route and navigation.'),

    feature('ministries.overview', 'Ministries Overview', 'Ministries', 'Ministries parent route, breadcrumbs, and overview CTAs.', ['ministries.bibleStudy', 'ministries.worship', 'ministries.kids', 'ministries.youth']),
    feature('ministries.bibleStudy', 'Bible Study', 'Ministries', 'Bible Study ministry and homepage growth CTA.', ['ministries.overview']),
    feature('ministries.communityDevelopment', 'Community Development', 'Ministries', 'Community Development ministry.', ['ministries.overview']),
    feature('ministries.homeless', 'Homeless Ministry', 'Ministries', 'Homeless Ministry.', ['ministries.overview']),
    feature('ministries.hospital', 'Hospital Ministry', 'Ministries', 'Hospital Ministry.', ['ministries.overview']),
    feature('ministries.kids', 'Kids Ministry', 'Ministries', 'Kids Ministry and connected children resources.', ['ministries.overview', 'devotions.children', 'resources.kidsGames']),
    feature('ministries.menFellowship', 'Men Fellowship', 'Ministries', 'Men Fellowship ministry.', ['ministries.overview']),
    feature('ministries.missionOutreach', 'Mission Outreach', 'Ministries', 'Mission Outreach ministry.', ['ministries.overview']),
    feature('ministries.prison', 'Prison Ministry', 'Ministries', 'Prison Ministry.', ['ministries.overview']),
    feature('ministries.supportMissionaries', 'Support Missionaries', 'Ministries', 'Support Missionaries ministry.', ['ministries.overview']),
    feature('ministries.worship', 'Worship Ministry', 'Ministries', 'Worship Ministry and connected homepage/footer links.', ['ministries.overview', 'homepage.transformationalLoop']),
    feature('ministries.youth', 'Youth Ministry', 'Ministries', 'Youth Ministry and connected youth resources.', ['ministries.overview', 'devotions.youth', 'resources.youthGames']),

    feature('resources.kidsGames', 'Kids Games', 'Resources', 'Kids Games resource route.', ['ministries.kids', 'devotions.children']),
    feature('resources.youthGames', 'Youth Games', 'Resources', 'Youth Games resource route.', ['ministries.youth', 'devotions.youth'])
  ]);

  const PROTECTED_COMPONENTS = Object.freeze([
    'Global Runtime and Error Safety',
    'Global Navigation and Mobile Menu',
    'Theme / Day-Night Engine',
    'Header and Footer Framework',
    'Core Accessibility Behavior',
    'Service Worker and Cache Strategy',
    'Configuration Loading and Validation',
    'Firebase SDK Initialization and Songbook Auth',
    'Route and Redirect Infrastructure',
    '404 / Error Handling and Public Shell',
    'Privacy Policy and Terms & Conditions',
    'Admin Authentication and Authorization'
  ]);

  const featureMap = Object.freeze(FEATURE_REGISTRY.reduce((map, definition) => {
    map[definition.id] = definition;
    return map;
  }, {}));

  const CONTROLLED_SURFACE_DEFINITIONS = Object.freeze([
    { id: 'homepage.planVisit.section', featureId: 'homepage.planVisit', surfaceType: 'homepage-section' },
    { id: 'homepage.planVisit.cta', featureId: 'pages.planVisit', surfaceType: 'homepage-cta' },
    { id: 'about.planVisit.cta', featureId: 'pages.planVisit', surfaceType: 'about-cta' },
    { id: 'contact.planVisit.cta', featureId: 'pages.planVisit', surfaceType: 'contact-cta' },
    { id: 'positionPapers.planVisit.cta', featureId: 'pages.planVisit', surfaceType: 'position-papers-cta' },
    { id: 'navigation.planVisit.link', featureId: 'pages.planVisit', surfaceType: 'navigation-link' },
    { id: 'footer.planVisit.link', featureId: 'pages.planVisit', surfaceType: 'footer-link' }
  ]);

  const CONTROLLED_ROUTE_DEFINITIONS = Object.freeze([
    {
      featureId: 'pages.gallery',
      pageName: 'Gallery',
      path: 'gallery.html',
      rootSelector: '[data-gpbc-route-feature="pages.gallery"]',
      script: 'gallery.js'
    },
    {
      featureId: 'pages.planVisit',
      pageName: 'Plan Your Visit',
      path: 'plan-visit.html',
      rootSelector: '[data-gpbc-route-feature="pages.planVisit"]',
      script: 'plan-visit.js'
    }
  ]);

  const validState = (state) => Object.prototype.hasOwnProperty.call(FEATURE_STATES, state);

  function createDefaultConfig() {
    return createDraftConfig();
  }

  function createInitialBaselineConfig() {
    return createDraftConfig();
  }

  function createDraftConfig(features = null, metadata = {}) {
    const source = features && typeof features === 'object' ? features : {};
    return {
      schemaVersion: SCHEMA_VERSION,
      state: 'draft',
      updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : null,
      updatedBy: typeof metadata.updatedBy === 'string' ? metadata.updatedBy : null,
      features: FEATURE_REGISTRY.reduce((features, definition) => {
        const requestedState = source[definition.id] && source[definition.id].state;
        features[definition.id] = {
          state: validState(requestedState) ? requestedState : definition.defaultState
        };
        return features;
      }, {})
    };
  }

  function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
  }

  function normalizeConfig(candidate) {
    const source = candidate && typeof candidate.features === 'object' ? candidate.features : {};
    return createDraftConfig(source, {
      updatedAt: typeof candidate?.updatedAt === 'string' ? candidate.updatedAt : null,
      updatedBy: typeof candidate?.updatedBy === 'string' ? candidate.updatedBy : null
    });
  }

  function validateFeatureMap(features) {
    const errors = [];
    if (!features || typeof features !== 'object' || Array.isArray(features)) {
      return ['Configuration features must be an object.'];
    }

    const registryIds = new Set(FEATURE_REGISTRY.map((definition) => definition.id));
    Object.keys(features).forEach((featureId) => {
      if (!registryIds.has(featureId)) {
        errors.push(`Unknown feature ID: ${featureId}.`);
      }
    });

    FEATURE_REGISTRY.forEach((definition) => {
      const entry = features[definition.id];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`Feature ${definition.id} is missing or malformed.`);
        return;
      }
      const entryKeys = Object.keys(entry);
      if (entryKeys.some((key) => key !== 'state')) {
        errors.push(`Feature ${definition.id} contains unsupported fields.`);
      }
      if (!validState(entry.state)) {
        errors.push(`Feature ${definition.id} has an invalid state.`);
      }
    });

    return errors;
  }

  function validateConfig(candidate) {
    const errors = [];
    if (!candidate || typeof candidate !== 'object') {
      return { valid: false, errors: ['Configuration must be an object.'], value: createDefaultConfig() };
    }
    if (candidate.schemaVersion !== SCHEMA_VERSION) {
      errors.push(`Unsupported schema version. Expected ${SCHEMA_VERSION}.`);
    }
    if (candidate.state !== 'draft') {
      errors.push('Admin editing is limited to the draft configuration.');
    }
    errors.push(...validateFeatureMap(candidate.features));

    FEATURE_REGISTRY.forEach((definition) => {
      definition.dependencies.forEach((dependencyId) => {
        if (!featureMap[dependencyId]) {
          errors.push(`Feature ${definition.id} references an unknown dependency.`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      value: normalizeConfig(candidate)
    };
  }

  function countStates(config) {
    const counts = {
      LIVE: 0,
      HIDDEN: 0,
      COMING_SOON: 0,
      ADMIN_PREVIEW: 0
    };

    FEATURE_REGISTRY.forEach((definition) => {
      const state = config?.features?.[definition.id]?.state;
      if (validState(state)) counts[state] += 1;
    });

    return counts;
  }

  function getGroupDefinitions() {
    return ['Homepage', 'About', 'Pages', 'Devotions', 'Ministries', 'Resources'].map((group) => ({
      group,
      features: FEATURE_REGISTRY.filter((definition) => definition.group === group)
    }));
  }

  function getCapabilityCounts() {
    return FEATURE_REGISTRY.reduce((counts, definition) => {
      counts[definition.capability] = (counts[definition.capability] || 0) + 1;
      return counts;
    }, {
      [CAPABILITIES.ACTIVE_READY]: 0,
      [CAPABILITIES.SHADOW_ONLY]: 0,
      [CAPABILITIES.SYSTEM_PROTECTED]: 0
    });
  }

  function getCapabilityWarnings(config, baseline = null) {
    const previous = baseline?.features || {};
    return FEATURE_REGISTRY
      .filter((definition) => definition.capability === CAPABILITIES.SHADOW_ONLY)
      .filter((definition) => {
        const currentState = config?.features?.[definition.id]?.state || definition.defaultState;
        const previousState = previous[definition.id]?.state || definition.defaultState;
        return currentState !== definition.defaultState || currentState !== previousState;
      })
      .map((definition) => ({
        featureId: definition.id,
        displayName: definition.displayName,
        state: config?.features?.[definition.id]?.state || definition.defaultState,
        message: `${definition.displayName} is Shadow-only. This setting is stored and previewable but will not change the public website in the current release.`
      }));
  }

  window.GPBCAdminConfig = Object.freeze({
    SCHEMA_VERSION,
    FEATURE_STATES,
    FEATURE_STATE_LABELS,
    FEATURE_STATE_DESCRIPTIONS,
    CAPABILITIES,
    ACTIVE_READY_FEATURE_IDS,
    CAPABILITY_LABELS,
    CAPABILITY_DESCRIPTIONS,
    FEATURE_REGISTRY,
    CONTROLLED_SURFACE_DEFINITIONS,
    CONTROLLED_ROUTE_DEFINITIONS,
    PROTECTED_COMPONENTS,
    createDefaultConfig,
    createInitialBaselineConfig,
    createDraftConfig,
    cloneConfig,
    normalizeConfig,
    validateFeatureMap,
    validateConfig,
    countStates,
    getGroupDefinitions,
    getCapabilityCounts,
    getCapabilityWarnings
  });
})();
