import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../tools/vfx-preview/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tools/vfx-preview/preview.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tools/vfx-preview/preview.css', import.meta.url), 'utf8');

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

test('effect selection and restart both reset timeline state through the core', () => {
  assert.equal((js.match(/core\.resetTimeline\(/g) || []).length, 2);
});
