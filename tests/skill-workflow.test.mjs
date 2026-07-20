import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skill = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
const assetProduction = fs.readFileSync(new URL('../references/asset-production.md', import.meta.url), 'utf8');
const qaAndAcceptance = fs.readFileSync(
  new URL('../references/qa-and-acceptance.md', import.meta.url),
  'utf8',
);
const previewWorkflow = fs.readFileSync(new URL('../references/preview-workflow.md', import.meta.url), 'utf8');
const runtimeIntegration = fs.readFileSync(
  new URL('../references/runtime-integration.md', import.meta.url),
  'utf8',
);
const highFidelityAgentMode = fs.readFileSync(
  new URL('../references/high-fidelity-agent-mode.md', import.meta.url),
  'utf8',
);
const readmeZh = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const readmeEn = fs.readFileSync(new URL('../README.en.md', import.meta.url), 'utf8');
const previewScreenshot = new URL('../docs/reference-images/vfx_previewer.png', import.meta.url);
const sourceGridValidator = new URL('../scripts/validate_sprite_source_grid.py', import.meta.url);

function assertSemanticAnchorGuidance(anchors) {
  assert.match(anchors, /attached status and body-centered application art.*target-body center/i);
  assert.match(anchors, /visual intentionally following a target's contact point.*target foot/i);
  assert.match(anchors, /fixed telegraphs, persistent zones, fixed impacts, and death-event ground points.*locked ground snapshot/i);
  assert.match(anchors, /unless the mechanic contract explicitly defines following behavior/i);
  assert.match(anchors, /moving and sky-spawn bodies.*separate from their locked impact point/i);
  const universalFootGuidance = anchors.split(/[.\r\n]+/).filter((statement) => (
    /\b(?:target |visible )?foot(?: anchor)?s?\b/i.test(statement)
    && (
      /\b(?:all|every|always|mandatory|required|universal)\b.*\b(?:hit|impact|projectile|effect)s?\b/i.test(statement)
      || /\b(?:telegraphs?|zones?|domains?|impacts?|projectiles?|effects?)\b.*\buse\b.*\bfoot(?: anchor)?s?\b/i.test(statement)
    )
  ));
  assert.equal(
    universalFootGuidance.length,
    0,
    'anchor guidance must not make foot anchors universal or mandatory for a broad effect class',
  );
}

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

test('complex-request routing responses explicitly state Agent-mode tradeoffs', () => {
  assert.match(skill, /routing response must explicitly state.*signals.*benefit.*cost/i);
});

test('complex partial requests wait for mode confirmation before selected-stage work', () => {
  assert.match(skill, /complex partial request.*wait.*confirmation.*before starting.*selected stages/i);
  assert.match(skill, /confirmation gate.*takes precedence.*direct partial-request entry/i);
});

test('complete-request routing responses preserve every stage choice and status label', () => {
  assert.match(
    skill,
    /complete-request routing response.*before beginning.*execute all.*first N stages.*specific stages.*continue from stage N.*already satisfied.*recommended.*blocked/is,
  );
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

test('runtime integration defines a complete mechanic-visual contract', () => {
  for (const phrase of [
    'Mechanical event', 'Visual owner', 'Visual layers', 'Anchor', 'Lifetime',
    'Frame contract', 'Draw order', 'Exit priority',
  ]) assert.match(runtimeIntegration, new RegExp(phrase, 'i'));
  assert.match(runtimeIntegration, /one visual owner.*complete silhouette/i);
  assert.match(runtimeIntegration, /terminal frame.*lifetime/i);
  assert.match(runtimeIntegration, /same update.*priority/i);
});

test('runtime frame contracts define playback and terminal-frame reachability per layer', () => {
  const mechanicContract = runtimeIntegration.match(
    /## Mechanic-visual event contract[\s\S]*?(?=\n## )/i,
  )?.[0] ?? '';
  assert.match(mechanicContract, /frame count/i);
  assert.match(mechanicContract, /per-layer FPS/i);
  assert.match(mechanicContract, /loop rule/i);
  assert.match(mechanicContract, /hold behavior/i);
  assert.match(mechanicContract, /lifecycle.*reach.*final frame/i);
});

test('runtime anchors are selected semantically rather than universally', () => {
  const anchors = runtimeIntegration.split('## Anchors')[1].split('## Semantic-layer transitions')[0];
  assertSemanticAnchorGuidance(anchors);

  for (const universalFootRule of [
    'Use the target foot for every hit effect.',
    'All hit effects use the visible foot anchor.',
    'Foot anchors are mandatory for all projectiles.',
  ]) {
    assert.throws(() => assertSemanticAnchorGuidance(`${anchors}\n- ${universalFootRule}`));
  }
});

test('QA acceptance and runtime guidance share semantic ground-anchor rules', () => {
  const runtimeAnchors = runtimeIntegration.split('## Anchors')[1].split('## Semantic-layer transitions')[0];
  const qaChecklist = qaAndAcceptance.split('## Acceptance checklist')[1].split('## Test surface')[0];
  const crossReference = `${runtimeAnchors}\n${qaChecklist}`;

  assertSemanticAnchorGuidance(crossReference);
  assert.match(qaChecklist, /fixed telegraphs, zones, and impacts.*locked-ground snapshots/i);
  assert.match(qaChecklist, /target-foot.*only when.*deliberately follows.*target contact/i);
  assert.throws(() => assertSemanticAnchorGuidance(
    `${crossReference}\n- Ground telegraphs, impacts, and domains use foot anchors.`,
  ));
});

test('asset evidence is regenerated from authoritative current inputs', () => {
  assert.match(assetProduction, /audit data.*current source plates/i);
  assert.match(assetProduction, /old assets.*own manifest/i);
  assert.match(assetProduction, /actual project background/i);
  assert.match(assetProduction, /manifest display size.*anchor.*opacity/i);
  assert.match(assetProduction, /telegraph.*body.*body.*impact.*impact.*residue/is);
});

test('asset evidence records reproducible provenance and excludes report-only proof', () => {
  const evidenceProvenance = assetProduction.match(
    /## Evidence provenance[\s\S]*?(?=\n## )/i,
  )?.[0] ?? '';
  assert.match(evidenceProvenance, /recorded tool or command/i);
  assert.match(evidenceProvenance, /audits and contact sheets.*identified or hashed authoritative inputs and manifests/is);
  assert.match(evidenceProvenance, /static hand-authored reports.*supplemental only/is);
  assert.match(evidenceProvenance, /must not be the sole evidence/i);
});

test('runtime promotion protects unaffected resources and waits for acceptance', () => {
  assert.match(qaAndAcceptance, /back up.*replaced runtime assets/i);
  assert.match(qaAndAcceptance, /hash.*unaffected/i);
  assert.match(qaAndAcceptance, /GM.*normal.*runtime path/i);
  assert.match(qaAndAcceptance, /simulator or device/i);
  assert.match(qaAndAcceptance, /commit.*after.*user accepts/i);
});

test('bilingual introductions describe optional high-fidelity Agent mode', () => {
  assert.match(readmeZh, /## 可选的高保真 Agent 模式/);
  assert.match(readmeZh, /标准七阶段工作流.*默认模式/s);
  assert.match(readmeZh, /用户明确确认.*启动/s);
  assert.match(readmeZh, /事件图.*任务包.*制作 Agent.*独立复核 Agent/s);
  assert.match(readmeZh, /朱雀烙印.*普通实例.*不是.*通用.*模板/s);

  assert.match(readmeEn, /## Optional high-fidelity Agent mode/i);
  assert.match(readmeEn, /standard seven-stage workflow.*default mode/is);
  assert.match(readmeEn, /explicit user confirmation.*start/is);
  assert.match(readmeEn, /event graph.*task packets.*production Agent.*independent review Agent/is);
  assert.match(readmeEn, /Zhuque Brand.*ordinary worked instance.*not.*universal.*template/is);
});

test('bilingual repository structures list the Agent mode reference', () => {
  assert.match(readmeZh, /references\/high-fidelity-agent-mode\.md\s+复杂任务的可选 Agent 制作与复核流程/);
  assert.match(readmeEn, /references\/high-fidelity-agent-mode\.md\s+Optional Agent production and review workflow for complex tasks/i);
});
