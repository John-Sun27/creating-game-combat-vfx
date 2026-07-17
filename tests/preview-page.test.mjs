import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../tools/vfx-preview/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tools/vfx-preview/preview.js', import.meta.url), 'utf8');

test('page exposes local folder loading and playback controls', () => {
  for (const id of ['folderInput', 'effectList', 'previewStage', 'playButton', 'pauseButton', 'restartButton', 'stepButton', 'fpsInput', 'scaleInput', 'offsetXInput', 'offsetYInput', 'backgroundSelect', 'issueList']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
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
});

test('effect selection and restart both reset timeline state through the core', () => {
  assert.equal((js.match(/core\.resetTimeline\(/g) || []).length, 2);
});
