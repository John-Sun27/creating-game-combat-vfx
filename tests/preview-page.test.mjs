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

test('page loads browser-safe loader helpers before the preview runtime', () => {
  assert.match(html, /<script src=["']preview-loader\.js["']><\/script>\s*<script src=["']preview\.js["']><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
});
