import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skill = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
const previewWorkflow = fs.readFileSync(new URL('../references/preview-workflow.md', import.meta.url), 'utf8');
const readmeZh = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const readmeEn = fs.readFileSync(new URL('../README.en.md', import.meta.url), 'utf8');
const previewScreenshot = new URL('../docs/reference-images/vfx_previewer.png', import.meta.url);

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

test('preview guidance keeps close-range sprite-sheet slashes anchored', () => {
  assert.match(previewWorkflow, /close-range-slash.*anchored slash sequence/i);
});

test('bilingual docs explain project defaults and non-mutating manual overrides', () => {
  assert.match(readmeZh, /项目默认/);
  assert.match(readmeZh, /手动覆盖/);
  assert.match(readmeZh, /不会修改.*文件/);
  assert.match(readmeEn, /project default/i);
  assert.match(readmeEn, /manual override/i);
  assert.match(readmeEn, /does not modify.*files/i);
  assert.match(previewWorkflow, /manifest.*user overrides/i);
  assert.match(previewWorkflow, /final.*in-game validation/i);
});

test('bilingual repository introduction includes the VFX previewer screenshot', () => {
  assert.equal(fs.existsSync(previewScreenshot), true);
  assert.match(readmeZh, /### 特效预览器/);
  assert.match(readmeZh, /!\[战斗特效预览器界面\]\(docs\/reference-images\/vfx_previewer\.png\)/);
  assert.match(readmeEn, /### VFX previewer/);
  assert.match(readmeEn, /!\[Combat VFX previewer interface\]\(docs\/reference-images\/vfx_previewer\.png\)/);
});
