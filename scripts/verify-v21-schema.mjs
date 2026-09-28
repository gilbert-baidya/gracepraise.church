import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const serverSchema = require('../shared/website-control-schema.js');
const browserSource = fs.readFileSync(new URL('../admin/v21/admin-config.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(browserSource, sandbox, { filename: 'admin-config.js' });
const browserRegistry = sandbox.window.GPBCAdminConfig.FEATURE_REGISTRY;
const browserSurfaces = sandbox.window.GPBCAdminConfig.CONTROLLED_SURFACE_DEFINITIONS;

const browserIds = browserRegistry.map((feature) => feature.id);
const serverIds = serverSchema.FEATURE_DEFINITIONS.map((feature) => feature.id);
if (JSON.stringify(browserIds) !== JSON.stringify(serverIds)) {
  throw new Error('Browser and trusted backend feature ID registries do not match.');
}

for (const browserFeature of browserRegistry) {
  const serverFeature = serverSchema.FEATURE_DEFINITIONS.find((feature) => feature.id === browserFeature.id);
  if (JSON.stringify(browserFeature.dependencies) !== JSON.stringify(serverFeature.dependencies)) {
    throw new Error(`Dependency metadata mismatch for ${browserFeature.id}.`);
  }
}

console.log(`V21 schema alignment passed: ${serverIds.length} feature IDs and dependency lists match.`);

const serverSurfaceIds = serverSchema.CONTROLLED_SURFACE_DEFINITIONS.map((surface) => surface.id);
const browserSurfaceIds = browserSurfaces.map((surface) => surface.id);
if (JSON.stringify(browserSurfaceIds) !== JSON.stringify(serverSurfaceIds)) {
  throw new Error('Browser and trusted backend controlled surface registries do not match.');
}

console.log(`Controlled surface alignment passed: ${serverSurfaceIds.length} surface definitions match.`);
