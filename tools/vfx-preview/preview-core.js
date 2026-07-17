(function exposePreviewCore(globalScope) {
  'use strict';

  const ARCHETYPE_RULES = Object.freeze({
    'close-range-slash': { bodyFrames: 4, motion: 'arc' },
    projectile: { bodyFrames: 6, motion: 'travel' },
    'projectile-volley': { bodyFrames: 6, motion: 'volley' },
    'moving-front': { bodyFrames: 6, motion: 'front' },
    falling: { bodyFrames: 6, motion: 'fall' },
    'ground-eruption': { bodyFrames: 4, motion: 'erupt' },
    'persistent-zone': { bodyFrames: 8, motion: 'zone' },
    trap: { bodyFrames: 4, motion: 'trap' },
    'target-brand': { bodyFrames: 4, motion: 'brand' },
    'target-beam': { bodyFrames: 4, motion: 'beam' },
    'shield-orbit': { bodyFrames: 8, motion: 'orbit' },
  });

  const STAGE_DURATIONS = Object.freeze({
    telegraph: 500,
    body: 900,
    impact: 350,
    residue: 650,
  });
  const REQUIRED_LAYERS = Object.freeze(Object.keys(STAGE_DURATIONS));
  const LOOPING_ARCHETYPES = new Set([
    'persistent-zone',
    'trap',
    'target-brand',
    'target-beam',
    'shield-orbit',
  ]);

  function buildLifecycle(effect) {
    const rule = ARCHETYPE_RULES[effect?.visualArchetype];

    return REQUIRED_LAYERS.map((name) => ({
      name,
      durationMs: effect?.layers?.[name]?.durationMs ?? STAGE_DURATIONS[name],
      loop: name === 'body' && LOOPING_ARCHETYPES.has(effect?.visualArchetype),
      motion: name === 'body' ? (rule?.motion ?? 'static') : name,
    }));
  }

  function inspectEffect(effect) {
    const errors = [];
    const rule = ARCHETYPE_RULES[effect?.visualArchetype];

    if (!rule) errors.push('invalid visualArchetype');
    if (!(Number(effect?.scale) > 0)) errors.push('scale must be positive');

    for (const layerName of REQUIRED_LAYERS) {
      const layer = effect?.layers?.[layerName];
      if (!layer || typeof layer !== 'object') {
        errors.push(`${layerName} layer is required`);
        continue;
      }
      if (!Number.isInteger(layer.frames) || layer.frames < 1) {
        errors.push(`${layerName}.frames must be a positive integer`);
        continue;
      }

      const minimumFrames = layerName === 'body' ? rule?.bodyFrames : 4;
      if (minimumFrames && layer.frames < minimumFrames) {
        errors.push(`${layerName} requires at least ${minimumFrames} frames`);
      }
    }

    return errors;
  }

  function spriteFrameStyle(frameCount, frameIndex) {
    if (!Number.isInteger(frameCount) || frameCount < 1) {
      throw new RangeError('frameCount must be a positive integer');
    }
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= frameCount) {
      throw new RangeError(`frameIndex must be an integer from 0 to ${frameCount - 1}`);
    }

    const position = frameCount === 1 ? 0 : frameIndex / (frameCount - 1) * 100;
    return {
      backgroundSize: `${frameCount * 100}% 100%`,
      backgroundPosition: `${position}% 0%`,
    };
  }

  function parsePngHeader(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.byteLength < 33) {
      throw new Error('Invalid PNG: data is truncated before the IHDR header');
    }

    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((byte, index) => bytes[index] === byte)) {
      throw new Error('Invalid PNG: signature does not match');
    }
    if (bytes[12] !== 73 || bytes[13] !== 72 || bytes[14] !== 68 || bytes[15] !== 82) {
      throw new Error('Invalid PNG: IHDR chunk is missing');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(8) !== 13) {
      throw new Error('Invalid PNG: IHDR chunk length must be 13');
    }

    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (width === 0) throw new Error('Invalid PNG: width must be positive');
    if (height === 0) throw new Error('Invalid PNG: height must be positive');

    const colorType = bytes[25];
    return {
      width,
      height,
      hasAlpha: colorType === 4 || colorType === 6,
    };
  }

  const api = { ARCHETYPE_RULES, buildLifecycle, inspectEffect, parsePngHeader, spriteFrameStyle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalScope.VfxPreviewCore = api;
}(globalThis));
