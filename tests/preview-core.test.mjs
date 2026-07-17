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

function pngHeader({
  chunkLength = 13,
  chunkType = 'IHDR',
  width = 512,
  height = 128,
  colorType = 6,
} = {}) {
  const bytes = new Uint8Array(33);
  const view = new DataView(bytes.buffer);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  view.setUint32(8, chunkLength);
  bytes.set([...chunkType].map((character) => character.charCodeAt(0)), 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = colorType;
  return bytes;
}

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

test('lifecycle uses default durations and archetype body motion', () => {
  assert.deepEqual(buildLifecycle(effect), [
    { name: 'telegraph', durationMs: 500, loop: false, motion: 'telegraph' },
    { name: 'body', durationMs: 900, loop: false, motion: 'front' },
    { name: 'impact', durationMs: 350, loop: false, motion: 'impact' },
    { name: 'residue', durationMs: 650, loop: false, motion: 'residue' },
  ]);
});

test('lifecycle maps every archetype to its body motion', () => {
  const motions = Object.fromEntries(Object.keys(ARCHETYPE_RULES).map((visualArchetype) => {
    const body = buildLifecycle({ ...effect, visualArchetype })[1];
    return [visualArchetype, body.motion];
  }));
  assert.deepEqual(motions, {
    'close-range-slash': 'arc',
    projectile: 'travel',
    'projectile-volley': 'volley',
    'moving-front': 'front',
    falling: 'fall',
    'ground-eruption': 'erupt',
    'persistent-zone': 'zone',
    trap: 'trap',
    'target-brand': 'brand',
    'target-beam': 'beam',
    'shield-orbit': 'orbit',
  });
});

test('only persistent body archetypes loop by default', () => {
  const looping = ['persistent-zone', 'trap', 'target-brand', 'target-beam', 'shield-orbit'];
  for (const visualArchetype of looping) {
    const lifecycle = buildLifecycle({ ...effect, visualArchetype });
    assert.deepEqual(lifecycle.map((stage) => stage.loop), [false, true, false, false]);
  }
  assert.equal(buildLifecycle(effect)[1].loop, false);
});

test('frame style uses a horizontal sprite strip', () => {
  assert.deepEqual(spriteFrameStyle(8, 3), {
    backgroundSize: '800% 100%',
    backgroundPosition: `${3 / 7 * 100}% 0%`,
  });
});

test('frame style rejects invalid frame counts', () => {
  for (const frameCount of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => spriteFrameStyle(frameCount, 0), /frameCount must be a positive integer/i);
  }
});

test('frame style rejects frame indexes outside the strip', () => {
  for (const frameIndex of [-1, 8, 1.5, Number.NaN]) {
    assert.throws(() => spriteFrameStyle(8, frameIndex), /frameIndex must be an integer.*0.*7/i);
  }
});

test('effect inspection reports insufficient moving-body frames', () => {
  const invalid = structuredClone(effect);
  invalid.layers.body.frames = 1;
  assert.match(inspectEffect(invalid).join('\n'), /body requires at least 6 frames/i);
});

test('effect inspection accepts a complete valid effect', () => {
  assert.deepEqual(inspectEffect(effect), []);
});

test('effect inspection validates archetype and positive scale', () => {
  const invalid = structuredClone(effect);
  invalid.visualArchetype = 'unknown';
  invalid.scale = 0;
  assert.match(inspectEffect(invalid).join('\n'), /invalid visualArchetype/i);
  assert.match(inspectEffect(invalid).join('\n'), /scale must be positive/i);
});

test('effect inspection requires every semantic layer', () => {
  const invalid = structuredClone(effect);
  delete invalid.layers.telegraph;
  delete invalid.layers.residue;
  const errors = inspectEffect(invalid).join('\n');
  assert.match(errors, /telegraph layer is required/i);
  assert.match(errors, /residue layer is required/i);
});

test('effect inspection enforces semantic layer minimum frames', () => {
  const invalid = structuredClone(effect);
  invalid.layers.telegraph.frames = 3;
  invalid.layers.impact.frames = 3;
  invalid.layers.residue.frames = 3;
  const errors = inspectEffect(invalid).join('\n');
  assert.match(errors, /telegraph requires at least 4 frames/i);
  assert.match(errors, /impact requires at least 4 frames/i);
  assert.match(errors, /residue requires at least 4 frames/i);
});

test('effect inspection enforces each archetype body minimum', () => {
  for (const [visualArchetype, rule] of Object.entries(ARCHETYPE_RULES)) {
    const invalid = structuredClone(effect);
    invalid.visualArchetype = visualArchetype;
    invalid.layers.body.frames = rule.bodyFrames - 1;
    assert.match(
      inspectEffect(invalid).join('\n'),
      new RegExp(`body requires at least ${rule.bodyFrames} frames`, 'i'),
    );
  }
});

test('PNG parser reads dimensions and alpha from IHDR', () => {
  const bytes = pngHeader();
  assert.deepEqual(parsePngHeader(bytes.buffer), { width: 512, height: 128, hasAlpha: true });
});

test('PNG parser recognizes alpha-capable color types 4 and 6 only', () => {
  for (const colorType of [4, 6]) {
    assert.equal(parsePngHeader(pngHeader({ colorType })).hasAlpha, true);
  }
  for (const colorType of [0, 2, 3]) {
    assert.equal(parsePngHeader(pngHeader({ colorType })).hasAlpha, false);
  }
});

test('PNG parser rejects truncated data', () => {
  assert.throws(() => parsePngHeader(new ArrayBuffer(32)), /PNG.*truncated/i);
});

test('PNG parser rejects an invalid signature', () => {
  const bytes = pngHeader();
  bytes[0] = 0;
  assert.throws(() => parsePngHeader(bytes), /PNG.*signature/i);
});

test('PNG parser rejects a missing or incorrect IHDR chunk', () => {
  assert.throws(() => parsePngHeader(pngHeader({ chunkType: 'IDAT' })), /PNG.*IHDR/i);
});

test('PNG parser rejects an IHDR chunk length other than 13', () => {
  assert.throws(() => parsePngHeader(pngHeader({ chunkLength: 12 })), /IHDR.*length.*13/i);
});

test('PNG parser rejects zero width or height', () => {
  assert.throws(() => parsePngHeader(pngHeader({ width: 0 })), /PNG.*width.*positive/i);
  assert.throws(() => parsePngHeader(pngHeader({ height: 0 })), /PNG.*height.*positive/i);
});
