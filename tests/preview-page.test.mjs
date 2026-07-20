import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../tools/vfx-preview/preview-core.js');

const html = fs.readFileSync(new URL('../tools/vfx-preview/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tools/vfx-preview/preview.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tools/vfx-preview/preview.css', import.meta.url), 'utf8');

class PreviewElement {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.listeners = new Map();
    this.className = '';
    this.hidden = false;
    this.value = '';
    this.checked = false;
    this.clientWidth = id === 'previewStage' ? 640 : 0;
    this.clientHeight = id === 'previewStage' ? 520 : 0;
  }

  get classList() {
    return {
      toggle: (name, enabled) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        if (enabled) classes.add(name);
        else classes.delete(name);
        this.className = [...classes].join(' ');
      },
    };
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, target = this) {
    return this.listeners.get(type)?.({ target });
  }

  append(...nodes) {
    nodes.forEach((node) => { node.parentNode = this; });
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    nodes.forEach((node) => { node.parentNode = this; });
    this.children = nodes;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
    this.parentNode = null;
  }

  querySelectorAll(selector) {
    if (!selector.startsWith('.')) return [];
    const className = selector.slice(1);
    const matches = [];
    const visit = (node) => {
      if (node.className.split(/\s+/).includes(className)) matches.push(node);
      node.children.forEach(visit);
    };
    this.children.forEach(visit);
    return matches;
  }

  querySelector(selector) {
    if (!this.queryResults) this.queryResults = new Map();
    if (!this.queryResults.has(selector)) this.queryResults.set(selector, new PreviewElement());
    return this.queryResults.get(selector);
  }

  setAttribute() {}

  getBoundingClientRect() {
    if (this.id === 'previewStage') {
      const width = Number.parseFloat(this.style.minWidth) || this.clientWidth;
      const height = Number.parseFloat(this.style.minHeight) || this.clientHeight;
      return { left: 0, top: 0, right: width, bottom: height, width, height };
    }
    const stage = this.parentNode;
    if (!stage) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    const stageBounds = stage.getBoundingClientRect();
    const scale = this.style.transform.match(/scale\((-?[\d.]+), (-?[\d.]+)\)/) || [];
    const width = Number.parseFloat(this.style.width) * Math.abs(Number(scale[1]) || 1);
    const height = Number.parseFloat(this.style.height) * Math.abs(Number(scale[2]) || 1);
    const [, offsetX = '0', offsetY = '0'] = this.style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/) || [];
    const centerX = stageBounds.width / 2 + Number(offsetX);
    const centerY = stageBounds.height * .48 + Number(offsetY);
    return {
      left: centerX - width / 2, right: centerX + width / 2,
      top: centerY - height / 2, bottom: centerY + height / 2,
      width, height,
    };
  }
}

function pngHeader(width = 160, height = 80) {
  const bytes = new Uint8Array(33);
  const view = new DataView(bytes.buffer);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  view.setUint32(8, 13);
  bytes.set([73, 72, 68, 82], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes.buffer;
}

async function runPageWithEffect(effect, {
  imageWidth = 160, imageHeight = 80, steps = 1, fps = 1, userScale = 1, userOffsetX = 0, userOffsetY = 0,
} = {}) {
  const ids = [
    'folderInput', 'effectList', 'effectCount', 'emptyHint', 'previewStage', 'stageHint',
    'stageName', 'frameName', 'playButton', 'pauseButton', 'restartButton', 'stepButton',
    'fpsInput', 'fpsValue', 'scaleInput', 'scaleValue', 'offsetXInput', 'offsetXValue',
    'offsetYInput', 'offsetYValue', 'backgroundSelect', 'loopInput', 'issueList', 'issueSummary',
    'displayModeSelect', 'directionSelect', 'angleInput', 'angleValue', 'distanceInput',
    'distanceValue', 'resetDisplayButton',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new PreviewElement(id)]));
  Object.assign(elements.fpsInput, { value: String(fps) });
  Object.assign(elements.scaleInput, { value: String(userScale) });
  Object.assign(elements.offsetXInput, { value: String(userOffsetX) });
  Object.assign(elements.offsetYInput, { value: String(userOffsetY) });
  Object.assign(elements.displayModeSelect, { value: 'project-default' });
  Object.assign(elements.directionSelect, { value: '90' });
  Object.assign(elements.angleInput, { value: '90' });
  Object.assign(elements.distanceInput, { value: '340' });
  Object.assign(elements.backgroundSelect, { value: 'dark' });
  elements.loopInput.checked = true;

  const pngFile = { type: 'image/png', arrayBuffer: async () => pngHeader(imageWidth, imageHeight) };
  const loader = {
    chooseManifest: async () => ({ manifest: { schemaVersion: 1, effects: [effect] } }),
    buildFileIndex: () => ({}),
    createEffectRecords: (effects, inspectEffect) => effects.map((entry, index) => ({
      id: `effect-${index}`, label: entry.key, effect: entry, configErrors: inspectEffect(entry),
    })),
    resolveIndexedFile: () => ({ file: pngFile }),
  };
  class PreviewImage {
    set src(_value) {
      this.naturalWidth = imageWidth;
      this.naturalHeight = imageHeight;
      this.onload();
    }
  }
  const window = { VfxPreviewCore: core, VfxPreviewLoader: loader };
  vm.runInNewContext(js, {
    window,
    document: { getElementById: (id) => elements[id], createElement: () => new PreviewElement() },
    Image: PreviewImage,
    Blob: class Blob {},
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    performance: { now: () => 0 },
    requestAnimationFrame: () => {},
  });
  elements.folderInput.dispatch('change', { files: [pngFile] });
  await new Promise((resolve) => setImmediate(resolve));
  Array.from({ length: steps }, () => elements.stepButton.dispatch('click'));
  return elements;
}

test('page exposes local folder loading and playback controls', () => {
  for (const id of ['folderInput', 'effectList', 'previewStage', 'playButton', 'pauseButton', 'restartButton', 'stepButton', 'fpsInput', 'scaleInput', 'offsetXInput', 'offsetYInput', 'backgroundSelect', 'issueList']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('effect list is a bounded vertical scroll region', () => {
  assert.match(css, /\.effects-panel\s*\{[^}]*max-height:\s*calc\(/s);
  assert.match(css, /\.effect-list\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.effect-list\s*\{[^}]*min-height:\s*0/s);
});

test('page exposes project default and manual display controls', () => {
  for (const id of ['displayModeSelect', 'directionSelect', 'angleInput', 'distanceInput', 'resetDisplayButton']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(js, /core\.resolvePreviewProfile/);
  assert.match(js, /core\.buildPreviewInstances/);
  assert.match(js, /core\.composePreviewPose/);
});

test('manual display overrides reset when switching effects or pressing reset', () => {
  assert.match(js, /previewOverrides/);
  assert.match(js, /function resetDisplayOverrides/);
  assert.match(js, /resetDisplayButton\.addEventListener/);
});

test('preview uses DOM sprites and no canvas', () => {
  assert.doesNotMatch(html, /<canvas/i);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(js, /getContext\s*\(/);
  assert.match(js, /requestAnimationFrame/);
  assert.match(js, /sprite-layer/);
});

test('page loads the complete classic script chain in core, loader, runtime order', () => {
  assert.match(html, /<script src=["']preview-core\.js["']><\/script>\s*<script src=["']preview-loader\.js["']><\/script>\s*<script src=["']preview\.js["']><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
});

test('runtime renders archetype instances and advances the lifecycle with real delta', () => {
  assert.match(js, /core\.buildStageInstances\(/);
  assert.match(js, /core\.instanceProgress\(/);
  assert.match(js, /core\.sampleSpriteFrame\(/);
  assert.match(js, /core\.advanceTimeline\(/);
  assert.match(js, /core\.stepTimeline\([^;]*Number\(refs\.fpsInput\.value\)/s);
  assert.match(js, /advance\(delta\)/);
  assert.doesNotMatch(js, /advance\(delta\s*\*\s*Number\(refs\.fpsInput\.value\)/);
  assert.doesNotMatch(js, /case ['"]travel['"]:\s*return `translateX/);
});

test('runtime renders every active configured layer instance using its own FPS', () => {
  assert.match(js, /const hasLayerInstances = Array\.isArray\(effect\.preview\?\.layerInstances\)/);
  assert.match(js, /stage\.name === 'runtime' && hasLayerInstances\s*\? configuredInstances/s);
  assert.match(js, /Number\(instance\.fps\)/);
});

test('layerInstances-only effects execute a runtime lifecycle and render every active instance', async () => {
  const effect = {
    key: 'multi-instance-runtime', visualArchetype: 'moving-front', scale: 1, offsetX: 0, offsetY: 0,
    layers: {
      telegraph: { file: 'effect.png', frames: 4 }, body: { file: 'effect.png', frames: 8 },
      impact: { file: 'effect.png', frames: 4 }, residue: { file: 'effect.png', frames: 4 },
    },
    preview: {
      durationMs: 2200,
      layerInstances: [
        { id: 'body', layer: 'body', startMs: 0, endMs: 2200, anchor: 'moving', fps: 15 },
        { id: 'impact', layer: 'impact', startMs: 900, endMs: 1150, anchor: 'target', fps: 24 },
        { id: 'residue', layer: 'residue', startMs: 980, endMs: 1380, anchor: 'target', fps: 15 },
      ],
    },
  };
  const elements = await runPageWithEffect(effect);
  const sprites = elements.previewStage.querySelectorAll('.sprite-layer');
  assert.equal(elements.stageName.textContent.startsWith('runtime'), true);
  assert.deepEqual(sprites.map((node) => node.dataset.instanceId).sort(), ['body', 'impact', 'residue']);
});

test('runtime stage expands for a long vertical travel so target residue stays inside the bounds', async () => {
  const effect = {
    key: 'long-vertical-runtime', visualArchetype: 'moving-front', scale: 1, offsetX: 0, offsetY: 0,
    layers: {
      telegraph: { file: 'effect.png', frames: 4 }, body: { file: 'effect.png', frames: 8 },
      impact: { file: 'effect.png', frames: 4 }, residue: { file: 'effect.png', frames: 4 },
    },
    preview: {
      durationMs: 2200, motion: 'front', directionDeg: 90, distance: 760,
      layerInstances: [
        { id: 'moving-body', layer: 'body', startMs: 0, endMs: 1960, anchor: 'moving', fps: 15 },
        { id: 'actor-outro-residue', layer: 'residue', startMs: 1960, endMs: 2200, anchor: 'target', fps: 25 },
      ],
    },
  };
  const elements = await runPageWithEffect(effect, { imageWidth: 160, imageHeight: 160, steps: 2 });
  const stageBounds = elements.previewStage.getBoundingClientRect();
  const residue = elements.previewStage.querySelectorAll('.sprite-layer')
    .find((node) => node.dataset.instanceId === 'actor-outro-residue');
  const residueBounds = residue.getBoundingClientRect();
  assert.ok(stageBounds.height >= 1025);
  assert.ok(residueBounds.top >= stageBounds.top);
  assert.ok(residueBounds.bottom <= stageBounds.bottom);
});

test('stage bounds remain stable across body and residue windows and include scale plus offsets', async () => {
  const effect = {
    key: 'stable-viewport-runtime', visualArchetype: 'moving-front', scale: 1.5, offsetX: 20, offsetY: 40,
    layers: {
      telegraph: { file: 'effect.png', frames: 4 }, body: { file: 'effect.png', frames: 8 },
      impact: { file: 'effect.png', frames: 4 }, residue: { file: 'effect.png', frames: 4 },
    },
    preview: {
      durationMs: 2200, motion: 'front', directionDeg: 90, distance: 760,
      layerInstances: [
        { id: 'moving-body', layer: 'body', startMs: 0, endMs: 1960, anchor: 'moving', fps: 15, width: 140, height: 340 },
        { id: 'actor-outro-residue', layer: 'residue', startMs: 1960, endMs: 2200, anchor: 'target', fps: 25, width: 160, height: 160 },
      ],
    },
  };
  const options = { imageWidth: 160, imageHeight: 160, userScale: 1.25, userOffsetX: 30, userOffsetY: 50 };
  const bodyElements = await runPageWithEffect(effect, { ...options, steps: 1 });
  const residueElements = await runPageWithEffect(effect, { ...options, steps: 2 });
  const bodyStage = bodyElements.previewStage.getBoundingClientRect();
  const residueStage = residueElements.previewStage.getBoundingClientRect();
  const residue = residueElements.previewStage.querySelectorAll('.sprite-layer')
    .find((node) => node.dataset.instanceId === 'actor-outro-residue');
  const residueBounds = residue.getBoundingClientRect();
  assert.equal(bodyStage.height, residueStage.height);
  assert.equal(bodyStage.width, residueStage.width);
  assert.ok(residueBounds.top >= residueStage.top);
  assert.ok(residueBounds.bottom <= residueStage.bottom);
  assert.ok(residueBounds.left >= residueStage.left);
  assert.ok(residueBounds.right <= residueStage.right);
});

test('runtime page loops a layerInstances body without looping impact or residue frames', async () => {
  const effect = {
    key: 'local-frame-loop', visualArchetype: 'moving-front', scale: 1, offsetX: 0, offsetY: 0,
    layers: {
      telegraph: { file: 'effect.png', frames: 4 }, body: { file: 'effect.png', frames: 8, loop: true },
      impact: { file: 'effect.png', frames: 4, loop: false }, residue: { file: 'effect.png', frames: 4, loop: false },
    },
    preview: {
      durationMs: 2000, motion: 'front', directionDeg: 90, distance: 300,
      layerInstances: [
        { id: 'body', layer: 'body', startMs: 0, endMs: 1960, anchor: 'moving', fps: 5 },
        { id: 'impact', layer: 'impact', startMs: 0, endMs: 1960, anchor: 'target', fps: 5 },
        { id: 'residue', layer: 'residue', startMs: 0, endMs: 1960, anchor: 'target', fps: 5 },
      ],
    },
  };
  const elements = await runPageWithEffect(effect, { fps: 5, steps: 9 });
  const nodes = Object.fromEntries(elements.previewStage.querySelectorAll('.sprite-layer')
    .map((node) => [node.dataset.instanceId, node]));
  assert.equal(nodes.body.style.backgroundPosition, `${1 / 7 * 100}% 0%`);
  assert.equal(nodes.impact.style.backgroundPosition, '100% 0%');
  assert.equal(nodes.residue.style.backgroundPosition, '100% 0%');
});

test('an explicit layerInstances loop false overrides persistent timeline frame looping', async () => {
  const effect = {
    key: 'local-loop-override', visualArchetype: 'persistent-zone', scale: 1, offsetX: 0, offsetY: 0,
    layers: {
      telegraph: { file: 'effect.png', frames: 4 }, body: { file: 'effect.png', frames: 8, loop: true },
      impact: { file: 'effect.png', frames: 4, loop: false }, residue: { file: 'effect.png', frames: 4, loop: false },
    },
    preview: {
      durationMs: 2000, directionDeg: 90, distance: 300,
      layerInstances: [
        { id: 'body', layer: 'body', startMs: 0, endMs: 1960, anchor: 'moving', fps: 5, loop: false },
        { id: 'impact', layer: 'impact', startMs: 0, endMs: 1960, anchor: 'target', fps: 5, loop: false },
        { id: 'residue', layer: 'residue', startMs: 0, endMs: 1960, anchor: 'target', fps: 5, loop: false },
      ],
    },
  };
  const elements = await runPageWithEffect(effect, { fps: 5, steps: 9 });
  const nodes = elements.previewStage.querySelectorAll('.sprite-layer');
  assert.deepEqual(nodes.map((node) => node.style.backgroundPosition), ['100% 0%', '100% 0%', '100% 0%']);
});

test('effect selection and restart both reset timeline state through the core', () => {
  assert.equal((js.match(/core\.resetTimeline\(/g) || []).length, 2);
});
