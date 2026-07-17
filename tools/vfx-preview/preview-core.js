(function exposePreviewCore(globalScope) {
  'use strict';

  const ARCHETYPE_RULES = Object.freeze({
    'close-range-slash': { bodyFrames: 4, motion: 'static' },
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

  const ARCHETYPE_PROFILES = Object.freeze({
    'close-range-slash': { displayMode: 'in-place', motion: 'static' },
    projectile: { displayMode: 'projectile', motion: 'travel' },
    'projectile-volley': { displayMode: 'projectile', motion: 'volley' },
    'moving-front': { displayMode: 'moving-front', motion: 'front' },
    falling: { displayMode: 'falling', motion: 'fall' },
    'ground-eruption': { displayMode: 'persistent-ground', motion: 'erupt' },
    'persistent-zone': { displayMode: 'persistent-ground', motion: 'zone' },
    trap: { displayMode: 'persistent-ground', motion: 'zone' },
    'target-brand': { displayMode: 'persistent-ground', motion: 'static' },
    'target-beam': { displayMode: 'persistent-ground', motion: 'static' },
    'shield-orbit': { displayMode: 'orbit', motion: 'orbit' },
  });

  const DEFAULT_PREVIEW_PROFILE = Object.freeze({
    displayMode: 'in-place',
    motion: 'static',
    directionDeg: 0,
    distance: 340,
    durationMs: 900,
    originAnchor: 'caster',
    targetAnchor: 'ground',
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

  function resolvePreviewProfile(effect, overrides = {}) {
    return {
      ...DEFAULT_PREVIEW_PROFILE,
      ...(ARCHETYPE_PROFILES[effect?.visualArchetype] || {}),
      ...(effect?.preview || {}),
      ...(overrides || {}),
    };
  }

  function motionPose(profile, progress, instanceIndex = 0) {
    const normalized = Math.max(0, Math.min(1, Number(progress) || 0));
    const eased = normalized * normalized * (3 - 2 * normalized);
    const distance = Math.max(0, Number(profile?.distance) || 0);
    const directionDeg = Number.isFinite(Number(profile?.directionDeg))
      ? Number(profile.directionDeg)
      : 0;
    const radians = directionDeg * Math.PI / 180;
    const halfX = Math.cos(radians) * distance / 2;
    const halfY = Math.sin(radians) * distance / 2;
    const base = { x: 0, y: 0, rotationDeg: 0, scaleX: 1, scaleY: 1 };
    const clean = (value) => Math.abs(value) < 1e-9 ? 0 : value;
    const travelPose = (amount) => ({
      ...base,
      x: clean(-halfX + halfX * 2 * amount),
      y: clean(-halfY + halfY * 2 * amount),
      rotationDeg: directionDeg - 90,
    });

    switch (profile?.motion) {
      case 'travel':
      case 'front':
        return travelPose(eased);
      case 'out-and-back': {
        const leg = normalized <= .5 ? normalized * 2 : (1 - normalized) * 2;
        const legEased = leg * leg * (3 - 2 * leg);
        return travelPose(legEased);
      }
      case 'volley': {
        const pose = travelPose(eased);
        const spread = (instanceIndex - 2) * 24;
        return {
          ...pose,
          x: pose.x + Math.cos(radians + Math.PI / 2) * spread,
          y: pose.y + Math.sin(radians + Math.PI / 2) * spread,
        };
      }
      case 'fall':
        return { ...base, y: -distance * (1 - eased), rotationDeg: directionDeg - 90 };
      case 'erupt':
        return { ...base, y: distance * .18 * (1 - eased), scaleY: .5 + .5 * eased };
      case 'zone':
        return { ...base, rotationDeg: normalized * 12, scaleX: .9 + .08 * Math.sin(normalized * Math.PI * 2), scaleY: .9 + .08 * Math.sin(normalized * Math.PI * 2) };
      case 'orbit': {
        const angle = normalized * Math.PI * 2 + instanceIndex * Math.PI * 2 / 3;
        const radius = distance ? Math.min(distance / 2, 72) : 36;
        return { ...base, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      }
      default:
        return base;
    }
  }

  function buildStageInstances(effect, stage) {
    const base = {
      layerName: stage.name,
      motion: stage.motion,
      delayMs: 0,
      offsetX: 0,
      offsetY: 0,
      fixed: false,
    };

    if (stage.name === 'body' && effect?.visualArchetype === 'falling') {
      return [
        { id: 'body-telegraph', ...base, layerName: 'telegraph', motion: 'static', fixed: true },
        { id: 'body-0', ...base },
      ];
    }

    if (stage.name === 'body' && effect?.visualArchetype === 'projectile-volley') {
      return [-48, -24, 0, 24, 48].map((offsetX, index) => ({
        id: `body-${index}`,
        ...base,
        delayMs: index * 90,
        offsetX,
      }));
    }

    return [{ id: `${stage.name}-0`, ...base }];
  }

  function buildPreviewInstances(effect, elapsedMs) {
    const choreography = effect?.preview?.layers;
    if (!choreography || typeof choreography !== 'object') return [];
    const durationMs = Math.max(1, Number(effect.preview.durationMs) || 1);
    const progress = Math.max(0, Math.min(1, Number(elapsedMs) / durationMs));
    return REQUIRED_LAYERS.flatMap((layerName) => {
      const config = choreography[layerName];
      if (!config) return [];
      const start = Math.max(0, Math.min(1, Number(config.start) || 0));
      const end = Math.max(start, Math.min(1, Number(config.end) || 1));
      const count = Math.max(1, Math.floor(Number(config.count)
        || (layerName === 'body' && effect.visualArchetype === 'projectile-volley' ? 5 : 1)));
      const stagger = Math.max(0, Number(config.stagger)
        || (count > 1 ? .08 : 0));
      return Array.from({ length: count }, (_, index) => {
        const instanceStart = start + index * stagger;
        const instanceEnd = end + index * stagger;
        if (progress < instanceStart || progress > instanceEnd) return null;
        const localProgress = (progress - instanceStart) / Math.max(.000001, instanceEnd - instanceStart);
        return {
          id: count > 1 ? `${layerName}-runtime-${index}` : `${layerName}-runtime`,
          layerName,
          motion: config.motion || (layerName === 'body' ? effect.preview.motion : 'static'),
          anchor: config.anchor || (layerName === 'body' ? 'moving' : 'target'),
          width: Number(config.width) || undefined,
          height: Number(config.height) || undefined,
          localProgress,
          elapsedMs: localProgress * (end - start) * durationMs,
          delayMs: 0,
          offsetX: Number(config.offsetX) || 0,
          offsetY: Number(config.offsetY) || 0,
          fixed: layerName !== 'body',
        };
      }).filter(Boolean);
    });
  }

  function composePreviewPose(profile, instance, progress, instanceIndex = 0) {
    const origin = motionPose({ ...profile, motion: 'travel' }, 0);
    const target = motionPose({ ...profile, motion: 'travel' }, 1);
    const anchor = instance?.anchor === 'origin'
      ? origin
      : instance?.anchor === 'target' ? target : { x: 0, y: 0, rotationDeg: 0 };
    const moving = instance?.layerName === 'body';
    const pose = motionPose(
      { ...profile, motion: moving ? profile.motion : 'static' },
      progress,
      instanceIndex,
    );
    return {
      x: anchor.x + pose.x,
      y: anchor.y + pose.y,
      rotationDeg: pose.rotationDeg,
      scaleX: pose.scaleX,
      scaleY: pose.scaleY,
    };
  }

  function instanceProgress(stage, elapsedMs, instance) {
    const activeElapsed = elapsedMs - instance.delayMs;
    const activeDuration = Math.max(1, stage.durationMs - instance.delayMs);
    return {
      visible: activeElapsed >= 0,
      elapsedMs: Math.max(0, activeElapsed),
      progress: Math.max(0, Math.min(1, activeElapsed / activeDuration)),
    };
  }

  function sampleSpriteFrame(frameCount, elapsedMs, fps, loop) {
    if (!Number.isInteger(frameCount) || frameCount < 1) {
      throw new RangeError('frameCount must be a positive integer');
    }
    if (!Number.isFinite(fps) || fps <= 0) {
      throw new RangeError('fps must be a finite positive number');
    }
    const sampled = Math.max(0, Math.floor(Math.max(0, elapsedMs) * fps / 1000));
    return loop ? sampled % frameCount : Math.min(frameCount - 1, sampled);
  }

  function advanceTimeline(timeline, lifecycle, deltaMs, loopEnabled) {
    let stageIndex = timeline.stageIndex;
    let stageElapsed = timeline.stageElapsed + Math.max(0, deltaMs);
    let playing = timeline.playing;

    while (stageElapsed >= lifecycle[stageIndex].durationMs) {
      const stage = lifecycle[stageIndex];
      if (stage.loop && loopEnabled) {
        stageElapsed %= stage.durationMs;
        break;
      }
      stageElapsed -= stage.durationMs;
      stageIndex += 1;
      if (stageIndex < lifecycle.length) continue;
      if (!loopEnabled) {
        stageIndex = lifecycle.length - 1;
        stageElapsed = lifecycle[stageIndex].durationMs;
        playing = false;
        break;
      }
      stageIndex = 0;
      const cycleDuration = lifecycle.reduce((total, entry) => total + entry.durationMs, 0);
      stageElapsed %= cycleDuration;
    }

    return { stageIndex, stageElapsed, playing };
  }

  function stepTimeline(timeline, lifecycle, fps, loopEnabled) {
    if (!Number.isFinite(fps) || fps <= 0) {
      throw new RangeError('fps must be a finite positive number');
    }
    return advanceTimeline({ ...timeline, playing: false }, lifecycle, 1000 / fps, loopEnabled);
  }

  function resetTimeline(_timeline, playing) {
    return { stageIndex: 0, stageElapsed: 0, playing: Boolean(playing) };
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
      if ('durationMs' in layer && (!Number.isFinite(layer.durationMs) || layer.durationMs <= 0)) {
        errors.push(`${layerName}.durationMs must be a finite positive number`);
      }

      const minimumFrames = layerName === 'body' ? rule?.bodyFrames : (layerName === 'impact' ? 4 : 1);
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

  const api = {
    ARCHETYPE_RULES,
    advanceTimeline,
    buildLifecycle,
    buildPreviewInstances,
    buildStageInstances,
    composePreviewPose,
    inspectEffect,
    instanceProgress,
    motionPose,
    parsePngHeader,
    resetTimeline,
    resolvePreviewProfile,
    sampleSpriteFrame,
    spriteFrameStyle,
    stepTimeline,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalScope.VfxPreviewCore = api;
}(globalThis));
