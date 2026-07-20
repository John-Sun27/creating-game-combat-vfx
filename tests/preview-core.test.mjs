import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ARCHETYPE_RULES,
  advanceTimeline,
  buildLifecycle,
  buildPreviewInstances,
  buildPreviewStageInstances,
  buildStageInstances,
  composePreviewPose,
  inspectEffect,
  instanceProgress,
  motionPose,
  parsePngHeader,
  previewStageBounds,
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

test('configured choreography overlaps semantic layers', () => {
  const configured = structuredClone(effect);
  configured.preview = {
    durationMs: 1000,
    layers: {
      telegraph: { start: 0, end: .35, anchor: 'origin', width: 90, height: 60 },
      body: { start: .15, end: .7, anchor: 'moving', width: 54, height: 74 },
      impact: { start: .55, end: .82, anchor: 'target', width: 96, height: 96 },
      residue: { start: .72, end: 1, anchor: 'target', width: 90, height: 56 },
    },
  };
  assert.deepEqual(buildPreviewInstances(configured, 200).map((entry) => entry.layerName), ['telegraph', 'body']);
  const bodyProgress = buildPreviewInstances(configured, 600).find((entry) => entry.layerName === 'body').localProgress;
  assert.ok(Math.abs(bodyProgress - (0.6 - 0.15) / 0.55) < 1e-12);
});

test('layer instances give repeated residue layers independent local clocks', () => {
  const configured = structuredClone(effect);
  configured.preview = {
    durationMs: 2200,
    layerInstances: [
      { id: 'collision-residue', layerName: 'residue', startMs: 980, endMs: 1380, anchor: 'target', fps: 15 },
      { id: 'actor-outro-residue', layerName: 'residue', startMs: 1960, endMs: 2200, anchor: 'origin', fps: 25 },
    ],
  };

  assert.deepEqual(buildPreviewInstances(configured, 979), []);
  const collision = buildPreviewInstances(configured, 1000);
  assert.equal(collision.length, 1);
  assert.deepEqual(
    (({ id, layerName, startMs, endMs, anchor, fps, elapsedMs }) => ({ id, layerName, startMs, endMs, anchor, fps, elapsedMs }))(collision[0]),
    { id: 'collision-residue', layerName: 'residue', startMs: 980, endMs: 1380, anchor: 'target', fps: 15, elapsedMs: 20 },
  );
  assert.deepEqual(buildPreviewInstances(configured, 1381), []);
  const outro = buildPreviewInstances(configured, 2000);
  assert.equal(outro.length, 1);
  assert.deepEqual(
    (({ id, layerName, startMs, endMs, anchor, fps, elapsedMs }) => ({ id, layerName, startMs, endMs, anchor, fps, elapsedMs }))(outro[0]),
    { id: 'actor-outro-residue', layerName: 'residue', startMs: 1960, endMs: 2200, anchor: 'origin', fps: 25, elapsedMs: 40 },
  );
  assert.deepEqual(buildPreviewInstances(configured, 2201), []);
});

test('layer instances use their local loop setting while non-looping support layers clamp', () => {
  const configured = structuredClone(effect);
  configured.layers.body.loop = true;
  configured.layers.impact.loop = false;
  configured.layers.residue.loop = false;
  configured.preview = {
    durationMs: 2000,
    layerInstances: [
      { id: 'body', layer: 'body', startMs: 0, endMs: 1960, anchor: 'moving', fps: 5 },
      { id: 'impact', layer: 'impact', startMs: 0, endMs: 1960, anchor: 'target', fps: 5 },
      { id: 'residue', layer: 'residue', startMs: 0, endMs: 1960, anchor: 'target', fps: 5 },
    ],
  };
  const instances = buildPreviewInstances(configured, 1800);
  const byId = Object.fromEntries(instances.map((instance) => [instance.id, instance]));
  assert.equal(byId.body.loop, true);
  assert.equal(byId.impact.loop, false);
  assert.equal(byId.residue.loop, false);
  assert.equal(sampleSpriteFrame(8, byId.body.elapsedMs, byId.body.fps, byId.body.loop), 1);
  assert.equal(sampleSpriteFrame(4, byId.impact.elapsedMs, byId.impact.fps, byId.impact.loop), 3);
  assert.equal(sampleSpriteFrame(4, byId.residue.elapsedMs, byId.residue.fps, byId.residue.loop), 3);
});

test('configured choreography preserves global timeline progress for attached support layers', () => {
  const configured = structuredClone(effect);
  configured.preview = {
    durationMs: 1000,
    motion: 'front',
    layers: {
      body: { start: .1, end: .8, anchor: 'moving' },
      residue: { start: .2, end: .9, anchor: 'moving' },
    },
  };
  const instances = buildPreviewInstances(configured, 500);
  assert.deepEqual(instances.map((entry) => entry.timelineProgress), [.5, .5]);
});

test('configured choreography crossfades overlapping semantic layers', () => {
  const configured = structuredClone(effect);
  configured.preview = {
    durationMs: 1000,
    layers: {
      body: { start: .16, end: .72, anchor: 'origin', fadeOut: .1785714286 },
      impact: { start: .62, end: .84, anchor: 'origin', fadeIn: .4545454545 },
    },
  };
  const instances = buildPreviewInstances(configured, 650);
  const body = instances.find((entry) => entry.layerName === 'body');
  const impact = instances.find((entry) => entry.layerName === 'impact');
  assert.ok(body.opacity > 0 && body.opacity < 1);
  assert.ok(impact.opacity > 0 && impact.opacity < 1);
  assert.ok(body.opacity + impact.opacity <= 1.15);
});

test('effect inspection rejects preview layer anchors outside the runtime vocabulary', () => {
  for (const anchor of ['caster', 'ground', 'center']) {
    const invalid = structuredClone(effect);
    invalid.preview = {
      durationMs: 1000,
      layers: { body: { start: .1, end: .8, anchor } },
    };
    assert.match(inspectEffect(invalid).join('\n'), /body\.anchor.*origin.*target.*moving/i);
  }
});

test('effect inspection validates preview fade fractions', () => {
  for (const fadeIn of [-.1, 1.1, Number.NaN]) {
    const invalid = structuredClone(effect);
    invalid.preview = {
      durationMs: 1000,
      layers: { body: { start: .1, end: .8, anchor: 'moving', fadeIn } },
    };
    assert.match(inspectEffect(invalid).join('\n'), /body\.fadeIn.*0.*1/i);
  }
});

test('preview stage bounds sample the full falling, volley, and orbit motion paths', () => {
  for (const motion of ['travel', 'front', 'out-and-back']) {
    const bounds = previewStageBounds(
      { motion, directionDeg: 90, distance: 300 },
      [{ layerName: 'body', anchor: 'moving', width: 20, height: 20 }],
    );
    assert.ok(bounds.minY <= -160, `${motion} includes its origin-side extent`);
    assert.ok(bounds.maxY >= 160, `${motion} includes its target-side extent`);
  }

  const falling = previewStageBounds(
    { motion: 'fall', directionDeg: 90, distance: 600 },
    [{ layerName: 'body', anchor: 'moving', width: 100, height: 100 }],
  );
  assert.ok(falling.minY <= -650);
  assert.ok(falling.maxY >= 50);

  const volley = previewStageBounds(
    { motion: 'volley', directionDeg: 90, distance: 300 },
    Array.from({ length: 5 }, (_, instanceIndex) => ({
      layerName: 'body', anchor: 'moving', width: 40, height: 40, instanceIndex,
    })),
  );
  assert.ok(volley.minX <= -68);
  assert.ok(volley.maxX >= 68);
  assert.ok(volley.minY <= -170);
  assert.ok(volley.maxY >= 170);

  const orbit = previewStageBounds(
    { motion: 'orbit', directionDeg: 0, distance: 300 },
    [{ layerName: 'body', anchor: 'moving', width: 20, height: 20 }],
  );
  assert.ok(orbit.minX <= -82);
  assert.ok(orbit.maxX >= 82);
  assert.ok(orbit.minY <= -82);
  assert.ok(orbit.maxY >= 82);
});

test('preview stage bounds include effect scale and user offsets', () => {
  const bounds = previewStageBounds(
    { motion: 'travel', directionDeg: 90, distance: 400 },
    [{ layerName: 'body', anchor: 'moving', width: 100, height: 100 }],
    { scale: 2, offsetX: 30, offsetY: -40 },
  );
  assert.ok(bounds.minX <= -70);
  assert.ok(bounds.maxX >= 130);
  assert.ok(bounds.minY <= -340);
  assert.ok(bounds.maxY >= 260);
});

test('preview stage instances include every configured layer instance, not only the current window', () => {
  const configured = structuredClone(effect);
  configured.preview = {
    durationMs: 2200,
    layerInstances: [
      { id: 'body', layer: 'body', startMs: 0, endMs: 1960, anchor: 'moving', fps: 15 },
      { id: 'outro', layer: 'residue', startMs: 1960, endMs: 2200, anchor: 'target', fps: 25 },
    ],
  };
  assert.deepEqual(buildPreviewStageInstances(configured).map((entry) => entry.id), ['body', 'outro']);
});

test('effect inspection isolates incomplete layer instances', () => {
  const invalid = structuredClone(effect);
  invalid.preview = {
    durationMs: 1000,
    layerInstances: [{ id: '', layerName: 'unknown', startMs: 200, endMs: 100, anchor: 'center', fps: 0, loop: 'yes' }],
  };
  const errors = inspectEffect(invalid).join('\n');
  assert.match(errors, /layerInstances\[0\]\.id/i);
  assert.match(errors, /layerInstances\[0\]\.layerName/i);
  assert.match(errors, /layerInstances\[0\]\.startMs.*endMs/i);
  assert.match(errors, /layerInstances\[0\]\.anchor.*origin.*target.*moving/i);
  assert.match(errors, /layerInstances\[0\]\.fps/i);
  assert.match(errors, /layerInstances\[0\]\.loop/i);
});

test('legacy effects report no configured choreography', () => {
  assert.deepEqual(buildPreviewInstances(effect, 0), []);
});

test('target-anchored falling body travels from above to the target', () => {
  const profile = { motion: 'fall', directionDeg: 90, distance: 300 };
  const instance = { layerName: 'body', anchor: 'target' };
  assert.deepEqual(
    [composePreviewPose(profile, instance, 0).y, composePreviewPose(profile, instance, 1).y],
    [-150, 150],
  );
});

test('moving-anchored residue follows the body at global timeline progress', () => {
  const profile = { motion: 'front', directionDeg: 90, distance: 300 };
  const body = { layerName: 'body', anchor: 'moving', timelineProgress: .25 };
  const residue = { layerName: 'residue', anchor: 'moving', timelineProgress: .25 };
  const bodyPose = composePreviewPose(profile, body, .4);
  const residuePose = composePreviewPose(profile, residue, .9);
  assert.equal(residuePose.y, bodyPose.y);
  assert.notEqual(residuePose.y, 0);
});

test('manual profile motion overrides configured body motion', () => {
  const profile = { motion: 'static', directionDeg: 90, distance: 300 };
  const instance = { layerName: 'body', anchor: 'moving', motion: 'travel' };
  assert.equal(composePreviewPose(profile, instance, 1).y, 0);
});

test('configured projectile volley creates five staggered body instances', () => {
  const configured = structuredClone(effect);
  configured.visualArchetype = 'projectile-volley';
  configured.preview = {
    durationMs: 1000,
    motion: 'volley',
    layers: { body: { start: .08, end: .66, anchor: 'moving', count: 5, stagger: .08 } },
  };
  assert.equal(buildPreviewInstances(configured, 450).length, 5);
  assert.deepEqual(
    buildPreviewInstances(configured, 450).map((entry) => entry.id),
    ['body-runtime-0', 'body-runtime-1', 'body-runtime-2', 'body-runtime-3', 'body-runtime-4'],
  );
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
