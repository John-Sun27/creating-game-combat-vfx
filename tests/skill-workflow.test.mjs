import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skill = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
const previewWorkflow = fs.readFileSync(new URL('../references/preview-workflow.md', import.meta.url), 'utf8');
const readmeZh = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const readmeEn = fs.readFileSync(new URL('../README.en.md', import.meta.url), 'utf8');

test('full requests present a selectable seven-stage workflow', () => {
  for (const phrase of ['seven stages', 'execute all', 'first N stages', 'specific stages', 'continue from stage']) {
    assert.match(skill.toLowerCase(), new RegExp(phrase.toLowerCase()));
  }
});

test('partial requests enter the matching stage directly', () => {
  assert.match(skill, /explicit partial request/i);
  assert.match(skill, /minimum required dependencies/i);
});

test('visual design and preview are approval checkpoints', () => {
  assert.match(skill, /visual design.*pause/i);
  assert.match(skill, /resource preview.*pause/i);
  assert.match(skill, /uninterrupted execution/i);
});

test('resource production emits preview metadata beside runtime assets automatically', () => {
  assert.match(previewWorkflow, /build or export pipeline.*effect-manifest\.preview\.json/i);
  assert.match(previewWorkflow, /single-frame telegraph and residue/i);
  assert.match(readmeZh, /构建或导出流程.*effect-manifest\.preview\.json/);
  assert.match(readmeEn, /build or export pipeline.*effect-manifest\.preview\.json/i);
});
