import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ARCHETYPE_RULES,
  advanceTimeline,
  buildLifecycle,
  buildStageInstances,
  inspectEffect,
  instanceProgress,
  motionPose,
  parsePngHeader,
  resolvePreviewProfile,
  resetTimeline,
  sampleSpriteFrame,
  spriteFrameStyle,
  stepTimeline,
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
    'close-range-slash': 'static',
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

test('close-range slash stays anchored because its arc is already painted into the sprite frames', () => {
  const closeRange = { ...effect, visualArchetype: 'close-range-slash' };
  const body = buildLifecycle(closeRange)[1];
  assert.equal(body.motion, 'static');
  assert.equal(buildStageInstances(closeRange, body)[0].motion, 'static');
});

test('preview profile precedence is defaults then archetype then manifest then user override', () => {
  const configured = {
    ...effect,
    visualArchetype: 'projectile',
    preview: { directionDeg: 90, distance: 300, durationMs: 680 },
  };
  const resolved = resolvePreviewProfile(configured, { directionDeg: 180 });
  assert.equal(resolved.displayMode, 'projectile');
  assert.equal(resolved.motion, 'travel');
  assert.equal(resolved.directionDeg, 180);
  assert.equal(resolved.distance, 300);
  assert.equal(resolved.durationMs, 680);
});

test('legacy effects resolve through archetype fallback', () => {
  assert.equal(resolvePreviewProfile({ ...effect, visualArchetype: 'falling' }).displayMode, 'falling');
  assert.equal(resolvePreviewProfile({ ...effect, visualArchetype: 'close-range-slash' }).motion, 'static');
});

test('travel follows arbitrary direction without resizing the sprite', () => {
  const profile = { motion: 'travel', directionDeg: 90, distance: 340 };
  const start = motionPose(profile, 0);
  const end = motionPose(profile, 1);
  assert.deepEqual([Math.round(start.x), Math.round(start.y)], [0, -170]);
  assert.deepEqual([Math.round(end.x), Math.round(end.y)], [0, 170]);
  assert.deepEqual([start.scaleX, start.scaleY, end.scaleX, end.scaleY], [1, 1, 1, 1]);
});

test('travel supports horizontal and reverse directions', () => {
  assert.deepEqual(
    [motionPose({ motion: 'travel', directionDeg: 0, distance: 200 }, 0).x,
      motionPose({ motion: 'travel', directionDeg: 0, distance: 200 }, 1).x],
    [-100, 100],
  );
  assert.deepEqual(
    [Math.round(motionPose({ motion: 'travel', directionDeg: -90, distance: 200 }, 0).y),
      Math.round(motionPose({ motion: 'travel', directionDeg: -90, distance: 200 }, 1).y)],
    [100, -100],
  );
});

test('out-and-back reaches target then returns', () => {
  const profile = { motion: 'out-and-back', directionDeg: 90, distance: 340 };
  assert.equal(Math.round(motionPose(profile, 0).y), -170);
  assert.equal(Math.round(motionPose(profile, .5).y), 170);
  assert.equal(Math.round(motionPose(profile, 1).y), -170);
});

test('moving front changes position without resizing the sprite', () => {
  const start = motionPose({ motion: 'front', directionDeg: 90, distance: 300 }, 0);
  const end = motionPose({ motion: 'front', directionDeg: 90, distance: 300 }, 1);
  assert.deepEqual([start.scaleX, start.scaleY, end.scaleX, end.scaleY], [1, 1, 1, 1]);
  assert.deepEqual([Math.round(start.y), Math.round(end.y)], [-150, 150]);
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

test('effect inspection accepts static telegraph and residue support layers', () => {
  const staticSupport = structuredClone(effect);
  staticSupport.layers.telegraph.frames = 1;
  staticSupport.layers.residue.frames = 1;
  assert.deepEqual(inspectEffect(staticSupport), []);
});

test('effect inspection rejects non-finite and non-positive optional layer durations', () => {
  for (const durationMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, '500']) {
    const invalid = structuredClone(effect);
    invalid.layers.body.durationMs = durationMs;
    assert.match(
      inspectEffect(invalid).join('\n'),
      /body\.durationMs must be a finite positive number/i,
    );
  }
});

test('effect inspection accepts finite positive optional layer durations', () => {
  const custom = structuredClone(effect);
  custom.layers.telegraph.durationMs = 0.5;
  custom.layers.body.durationMs = 1200;
  assert.deepEqual(inspectEffect(custom), []);
  assert.equal(buildLifecycle(custom)[0].durationMs, 0.5);
  assert.equal(buildLifecycle(custom)[1].durationMs, 1200);
});

test('falling body scene retains a fixed telegraph beneath the moving body', () => {
  const falling = { ...effect, visualArchetype: 'falling' };
  const stage = buildLifecycle(falling)[1];
  assert.deepEqual(buildStageInstances(falling, stage), [
    { id: 'body-telegraph', layerName: 'telegraph', motion: 'static', delayMs: 0, offsetX: 0, offsetY: 0, fixed: true },
    { id: 'body-0', layerName: 'body', motion: 'fall', delayMs: 0, offsetX: 0, offsetY: 0, fixed: false },
  ]);
});

test('projectile volley body scene creates five staggered horizontally offset bodies', () => {
  const volley = { ...effect, visualArchetype: 'projectile-volley' };
  const stage = buildLifecycle(volley)[1];
  const instances = buildStageInstances(volley, stage);
  assert.equal(instances.length, 5);
  assert.deepEqual(instances.map(({ layerName }) => layerName), Array(5).fill('body'));
  assert.deepEqual(instances.map(({ delayMs }) => delayMs), [0, 90, 180, 270, 360]);
  assert.deepEqual(instances.map(({ offsetX }) => offsetX), [-48, -24, 0, 24, 48]);
  assert.equal(instanceProgress(stage, 100, instances[2]).visible, false);
  assert.equal(instanceProgress(stage, 180, instances[2]).visible, true);
});

test('sprite FPS changes frame sampling without changing real-time lifecycle progress', () => {
  const lifecycle = buildLifecycle(effect);
  const initial = { stageIndex: 0, stageElapsed: 0, playing: true };
  const at12Fps = advanceTimeline(initial, lifecycle, 250, false);
  const at48Fps = advanceTimeline(initial, lifecycle, 250, false);

  assert.deepEqual(at12Fps, at48Fps);
  assert.deepEqual(at12Fps, { stageIndex: 0, stageElapsed: 250, playing: true });
  assert.notEqual(sampleSpriteFrame(8, 250, 12, false), sampleSpriteFrame(8, 250, 48, false));
});

test('timeline crosses lifecycle stages using unscaled real milliseconds', () => {
  const lifecycle = buildLifecycle(effect);
  assert.deepEqual(
    advanceTimeline({ stageIndex: 0, stageElapsed: 450, playing: true }, lifecycle, 100, false),
    { stageIndex: 1, stageElapsed: 50, playing: true },
  );
});

test('single-frame stepping advances exactly one current-FPS interval', () => {
  const lifecycle = buildLifecycle(effect);
  const initial = { stageIndex: 0, stageElapsed: 0, playing: false };
  const expected = new Map([
    [1, { stageIndex: 1, stageElapsed: 500, playing: false }],
    [12, { stageIndex: 0, stageElapsed: 1000 / 12, playing: false }],
    [24, { stageIndex: 0, stageElapsed: 1000 / 24, playing: false }],
    [60, { stageIndex: 0, stageElapsed: 1000 / 60, playing: false }],
  ]);

  for (const [fps, state] of expected) {
    assert.deepEqual(stepTimeline(initial, lifecycle, fps, false), state);
  }
});

test('single-frame stepping crosses a stage boundary without losing elapsed time', () => {
  const lifecycle = buildLifecycle(effect);
  const interval = 1000 / 60;
  const stepped = stepTimeline({
    stageIndex: 0,
    stageElapsed: lifecycle[0].durationMs - interval,
    playing: false,
  }, lifecycle, 60, false);

  assert.equal(stepped.stageIndex, 1);
  assert.ok(Math.abs(stepped.stageElapsed) < 1e-9);
  assert.equal(stepped.playing, false);
});

test('non-looping timeline clamps at the lifecycle end and stops', () => {
  const lifecycle = buildLifecycle(effect);
  assert.deepEqual(
    advanceTimeline({ stageIndex: 3, stageElapsed: 600, playing: true }, lifecycle, 100, false),
    { stageIndex: 3, stageElapsed: 650, playing: false },
  );
});

test('complete moving lifecycle loops back through telegraph into body', () => {
  const lifecycle = buildLifecycle(effect);
  assert.deepEqual(
    advanceTimeline({ stageIndex: 3, stageElapsed: 600, playing: true }, lifecycle, 100, true),
    { stageIndex: 0, stageElapsed: 50, playing: true },
  );
});

test('persistent body loops in place only while lifecycle looping is enabled', () => {
  const persistent = { ...effect, visualArchetype: 'persistent-zone' };
  const lifecycle = buildLifecycle(persistent);
  const body = { stageIndex: 1, stageElapsed: 850, playing: true };

  assert.deepEqual(advanceTimeline(body, lifecycle, 100, true), {
    stageIndex: 1, stageElapsed: 50, playing: true,
  });
  assert.deepEqual(advanceTimeline(body, lifecycle, 100, false), {
    stageIndex: 2, stageElapsed: 50, playing: true,
  });
});

test('large real delta preserves its remainder across repeated lifecycle loops', () => {
  const lifecycle = buildLifecycle(effect);
  const cycleMs = lifecycle.reduce((total, stage) => total + stage.durationMs, 0);
  assert.deepEqual(
    advanceTimeline({ stageIndex: 0, stageElapsed: 0, playing: true }, lifecycle, cycleMs * 1000 + 550, true),
    { stageIndex: 1, stageElapsed: 50, playing: true },
  );
});

test('timeline reset supports stopped selection and playing replay semantics', () => {
  const ended = { stageIndex: 3, stageElapsed: 650, playing: false };
  assert.deepEqual(resetTimeline(ended, false), { stageIndex: 0, stageElapsed: 0, playing: false });
  assert.deepEqual(resetTimeline(ended, true), { stageIndex: 0, stageElapsed: 0, playing: true });
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

test('effect inspection enforces the impact semantic layer minimum frames', () => {
  const invalid = structuredClone(effect);
  invalid.layers.impact.frames = 3;
  const errors = inspectEffect(invalid).join('\n');
  assert.match(errors, /impact requires at least 4 frames/i);
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
