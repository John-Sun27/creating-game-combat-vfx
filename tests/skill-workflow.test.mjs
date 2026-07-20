import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skill = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
const assetProduction = fs.readFileSync(new URL('../references/asset-production.md', import.meta.url), 'utf8');
const previewWorkflow = fs.readFileSync(new URL('../references/preview-workflow.md', import.meta.url), 'utf8');
const highFidelityAgentMode = fs.readFileSync(
  new URL('../references/high-fidelity-agent-mode.md', import.meta.url),
  'utf8',
);
const readmeZh = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const readmeEn = fs.readFileSync(new URL('../README.en.md', import.meta.url), 'utf8');
const previewScreenshot = new URL('../docs/reference-images/vfx_previewer.png', import.meta.url);
const sourceGridValidator = new URL('../scripts/validate_sprite_source_grid.py', import.meta.url);

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

test('asset production blocks clipped source-grid cells before sprite slicing', () => {
  assert.match(skill, /source-grid boundary validator/i);
  assert.match(skill, /source-grid cell has clear safe margin/i);
  assert.match(assetProduction, /safe margins.*mandatory/i);
  assert.match(assetProduction, /12%/);
  assert.match(assetProduction, /validate_sprite_source_grid\.py/);
  assert.match(assetProduction, /regenerate.*source/i);
  assert.equal(fs.existsSync(sourceGridValidator), true);
});

test('reference-driven remasters preserve approved material language', () => {
  const guidance = `${skill}\n${assetProduction}`.toLowerCase();
  for (const phrase of [
    'authoritative visual reference',
    'material master',
    'stage-specific key plates',
    'comparison contact sheet',
  ]) {
    assert.match(guidance, new RegExp(phrase));
  }
  assert.match(assetProduction, /white coverage/i);
  assert.match(assetProduction, /palette contamination/i);
  assert.match(assetProduction, /deterministic interpolation/i);
});

test('semantic layers must pass a composite continuity gate', () => {
  const guidance = `${skill}\n${assetProduction}\n${previewWorkflow}`;
  assert.match(guidance, /composite continuity gate/i);
  assert.match(guidance, /origin.*target.*moving/i);
  assert.match(guidance, /crossfade/i);
  assert.match(guidance, /impact.*must not repaint.*complete body/i);
  assert.match(guidance, /overlap contact sheet/i);
});

test('bilingual repository introduction includes the VFX previewer screenshot', () => {
  assert.equal(fs.existsSync(previewScreenshot), true);
  assert.match(readmeZh, /### 特效预览器/);
  assert.match(readmeZh, /!\[战斗特效预览器界面\]\(docs\/reference-images\/vfx_previewer\.png\)/);
  assert.match(readmeEn, /### VFX previewer/);
  assert.match(readmeEn, /!\[Combat VFX previewer interface\]\(docs\/reference-images\/vfx_previewer\.png\)/);
});

test('English introduction mirrors the Chinese 2D positioning and production goal', () => {
  assert.match(readmeZh, /^# 游戏战斗特效（2D）制作 Skill/m);
  assert.match(readmeZh, /把技能设计转成为可视化效果/);
  assert.match(readmeEn, /^# Creating 2D Game Combat VFX/m);
  assert.match(readmeEn, /turns ability designs into visual concepts/i);
  assert.match(readmeEn, /integrates them into the project/i);
});

test('standard mode remains default and Agent mode requires confirmation', () => {
  assert.match(skill, /standard mode.*default/i);
  assert.match(skill, /recommend.*high-fidelity Agent mode/i);
  assert.match(skill, /detected.*signals.*benefit.*cost/i);
  assert.match(skill, /explicit user confirmation/i);
  assert.match(skill, /declin.*not answer.*standard mode/i);
  assert.match(skill, /does not replace.*seven-stage/i);
});

test('confirmed Agent mode preserves the selected stage scope', () => {
  assert.match(skill, /only.*stages.*user selected/i);
  assert.match(skill, /must not.*broaden.*stage/i);
  assert.match(skill, /independent Agents.*unavailable.*standard mode.*wait/i);
});

test('Agent mode decomposes current mechanics into an event graph', () => {
  for (const phrase of [
    'event graph',
    'mechanical event',
    'ordering',
    'ownership transfer',
    'cancellation',
    'same-update priority',
  ]) assert.match(highFidelityAgentMode, new RegExp(phrase, 'i'));
  assert.match(highFidelityAgentMode, /must not inherit.*named skill/i);
});

test('Agent task packets are bounded and independently reviewed', () => {
  for (const phrase of [
    'visual intent', 'approved references', 'archetype', 'owner', 'anchors',
    'layers', 'lifetime', 'frame contract', 'allowed files', 'invariants',
    'expected evidence', 'verification commands',
  ]) assert.match(highFidelityAgentMode, new RegExp(phrase, 'i'));
  assert.match(highFidelityAgentMode, /production Agent/i);
  assert.match(highFidelityAgentMode, /independent review Agent/i);
  assert.match(highFidelityAgentMode, /Critical.*Important.*Minor/is);
  assert.match(highFidelityAgentMode, /no Critical or Important/i);
});

test('Agent mode composes archetypes without Zhuque-specific defaults', () => {
  assert.match(highFidelityAgentMode, /attached status.*persistent ground zone.*projectile.*falling.*chain/is);
  assert.match(highFidelityAgentMode, /Zhuque Brand.*worked instance/i);
  assert.match(highFidelityAgentMode, /timing.*anchor.*scale.*frame.*damage.*current mechanic contract/is);
});
