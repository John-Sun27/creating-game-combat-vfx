import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildFileIndex,
  chooseManifest,
  createEffectRecords,
  resolveIndexedFile,
} = require('../tools/vfx-preview/preview-loader.js');
const { inspectEffect } = require('../tools/vfx-preview/preview-core.js');

function fakeFile(name, webkitRelativePath, json) {
  return {
    name,
    webkitRelativePath,
    text: async () => JSON.stringify(json),
  };
}

function validEffect(key = 'valid_effect') {
  return {
    key,
    visualArchetype: 'projectile',
    scale: 1,
    layers: {
      telegraph: { file: 'telegraph.png', frames: 4 },
      body: { file: 'body.png', frames: 8 },
      impact: { file: 'impact.png', frames: 4 },
      residue: { file: 'residue.png', frames: 4 },
    },
  };
}

test('manifest selection prefers preview then standard then compatible JSON', async () => {
  const compatible = fakeFile('other.json', 'output/config/other.json', { schemaVersion: 1, effects: [{ key: 'compatible' }] });
  const standard = fakeFile('effect-manifest.json', 'output/effect-manifest.json', { schemaVersion: 1, effects: [{ key: 'standard' }] });
  const preview = fakeFile('effect-manifest.preview.json', 'output/tests/effect-manifest.preview.json', { schemaVersion: 1, effects: [{ key: 'preview' }] });

  assert.equal((await chooseManifest([compatible, standard, preview])).file, preview);
  assert.equal((await chooseManifest([compatible, standard])).file, standard);
  assert.equal((await chooseManifest([compatible])).file, compatible);
});

test('file index strips the selected directory top level from relative paths', () => {
  const fire = fakeFile('fire.png', 'output/sprites/fire.png');
  const manifest = fakeFile('effect-manifest.json', 'output/effect-manifest.json');
  const index = buildFileIndex([fire, manifest]);

  assert.equal(index.rootName, 'output');
  assert.equal(resolveIndexedFile(index, 'sprites/fire.png').file, fire);
});

test('basename fallback works only when the basename is unique', () => {
  const fireA = fakeFile('fire.png', 'output/a/fire.png');
  const fireB = fakeFile('fire.png', 'output/b/fire.png');
  const unique = fakeFile('impact.png', 'output/b/impact.png');
  const index = buildFileIndex([fireA, fireB, unique]);

  assert.equal(resolveIndexedFile(index, 'a/fire.png').file, fireA);
  assert.equal(resolveIndexedFile(index, 'impact.png').file, unique);
  assert.deepEqual(resolveIndexedFile(index, 'fire.png'), {
    file: null,
    reason: 'ambiguous-basename',
    candidates: ['a/fire.png', 'b/fire.png'],
  });
});

test('malformed effects become isolated records with safe labels', () => {
  const effects = [
    validEffect(),
    null,
    { ...validEffect(), key: '' },
    { key: 'broken_layers', visualArchetype: 'projectile', scale: 1, layers: null },
  ];

  const records = createEffectRecords(effects, inspectEffect);

  assert.equal(records.length, 4);
  assert.equal(records[0].label, 'valid_effect');
  assert.deepEqual(records[0].configErrors, []);
  assert.equal(records[1].label, 'effects[1]');
  assert.match(records[1].configErrors.join('\n'), /effect must be an object/i);
  assert.equal(records[2].label, 'effects[2]');
  assert.match(records[2].configErrors.join('\n'), /key is required/i);
  assert.equal(records[3].label, 'broken_layers');
  assert.match(records[3].configErrors.join('\n'), /layer is required/i);
});
