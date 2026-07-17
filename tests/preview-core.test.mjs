import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ARCHETYPE_RULES,
  buildLifecycle,
  inspectEffect,
  parsePngHeader,
  spriteFrameStyle,
} = require('../tools/vfx-preview/preview-core.js');

const effect = {
  key: 'sword_lane_sunder',
  visualArchetype: 'moving-front',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  layers: {
    telegraph: { file: 'telegraph.png', frames: 4 },
    body: { file: 'body.png', frames: 8 },
    impact: { file: 'impact.png', frames: 4 },
    residue: { file: 'residue.png', frames: 4 },
  },
};

test('all runtime archetypes have preview rules', () => {
  assert.deepEqual(Object.keys(ARCHETYPE_RULES).sort(), [
    'close-range-slash', 'falling', 'ground-eruption', 'moving-front',
    'persistent-zone', 'projectile', 'projectile-volley', 'shield-orbit',
    'target-beam', 'target-brand', 'trap',
  ]);
});

test('moving lifecycle contains all four semantic stages', () => {
  assert.deepEqual(buildLifecycle(effect).map((stage) => stage.name), [
    'telegraph', 'body', 'impact', 'residue',
  ]);
});

test('frame style uses a horizontal sprite strip', () => {
  assert.deepEqual(spriteFrameStyle(8, 3), {
    backgroundSize: '800% 100%',
    backgroundPosition: `${3 / 7 * 100}% 0%`,
  });
});

test('effect inspection reports insufficient moving-body frames', () => {
  const invalid = structuredClone(effect);
  invalid.layers.body.frames = 1;
  assert.match(inspectEffect(invalid).join('\n'), /body requires at least 6 frames/i);
});

test('PNG parser reads dimensions and alpha from IHDR', () => {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, 512);
  new DataView(bytes.buffer).setUint32(20, 128);
  bytes[24] = 8;
  bytes[25] = 6;
  assert.deepEqual(parsePngHeader(bytes.buffer), { width: 512, height: 128, hasAlpha: true });
});
