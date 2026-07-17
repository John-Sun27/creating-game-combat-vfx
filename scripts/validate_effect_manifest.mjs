import fs from 'node:fs';
import path from 'node:path';

const manifestPath = process.argv[2];
const archetypes = new Set([
  'close-range-slash', 'projectile', 'projectile-volley', 'moving-front',
  'falling', 'ground-eruption', 'persistent-zone', 'trap', 'target-brand',
  'target-beam', 'shield-orbit',
]);
const requiredLayers = ['telegraph', 'body', 'impact', 'residue'];
const errors = [];

if (!manifestPath) {
  errors.push('usage: node scripts/validate_effect_manifest.mjs <manifest.json>');
} else if (!fs.existsSync(manifestPath)) {
  errors.push(`manifest not found: ${manifestPath}`);
}

let manifest;
if (!errors.length) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    errors.push(`invalid JSON: ${error.message}`);
  }
}

if (manifest) {
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!Array.isArray(manifest.effects) || !manifest.effects.length) {
    errors.push('effects must be a non-empty array');
  } else {
    const keys = new Set();
    manifest.effects.forEach((effect, index) => {
      const label = effect?.key || `effects[${index}]`;
      if (!effect?.key || !/^[a-z0-9_]+$/.test(effect.key)) errors.push(`${label}: invalid key`);
      if (keys.has(effect?.key)) errors.push(`${label}: duplicate key`);
      keys.add(effect?.key);
      if (!archetypes.has(effect?.visualArchetype)) errors.push(`${label}: invalid visualArchetype`);
      if (!(Number(effect?.scale) > 0)) errors.push(`${label}: scale must be positive`);
      requiredLayers.forEach((layerName) => {
        const layer = effect?.layers?.[layerName];
        if (!layer?.file || path.extname(layer.file).toLowerCase() !== '.png') {
          errors.push(`${label}: ${layerName}.file must be a PNG`);
        }
        if (!Number.isInteger(layer?.frames) || layer.frames < 1) {
          errors.push(`${label}: ${layerName}.frames must be a positive integer`);
        }
      });
      if (!Array.isArray(effect?.acceptance) || !effect.acceptance.length) {
        errors.push(`${label}: acceptance must be a non-empty array`);
      }
    });
  }
}

if (errors.length) {
  console.error('Effect manifest validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Effect manifest valid: ${manifest.effects.length} effect(s)`);
}
