# Adaptive Workflow and Local VFX Previewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intelligent stage selection and a reusable zero-install local HTML previewer to the combat VFX Skill.

**Architecture:** Keep routing guidance in `SKILL.md` and a focused preview reference. Share one browser-safe UMD-style pure-logic script between the preview UI, the Node validator, and Node tests; classic scripts keep direct `file://` opening compatible with browser security rules. The HTML page uses local directory selection, PNG sprite sheets, DOM elements, and CSS transforms, and reuses the existing manifest instead of adding a second configuration format.

**Tech Stack:** Markdown, HTML5, CSS, browser ES modules, Node.js built-in test runner, PNG IHDR parsing, Git.

## Global Constraints

- Full requests show a selectable seven-stage plan before work begins.
- Explicit partial requests enter the matching stage directly unless a required input is missing.
- `执行全部` still pauses after visual design and resource preview unless the user explicitly requests uninterrupted execution.
- The previewer opens from `file://`, uses no build step, package manager, server, framework, CDN, network request, or programmatic Canvas rendering.
- The previewer reads the existing effect manifest and local PNG files selected by the user.
- Combat mechanics remain authoritative and are never changed to compensate for visual errors.

---

### Task 1: Add failing tests for preview manifest rules

**Files:**
- Create: `tests/preview-core.test.mjs`
- Test: `tools/vfx-preview/preview-core.js`

**Interfaces:**
- Consumes: the preview-core functions specified in Task 2.
- Produces: deterministic regression coverage for manifest validation, PNG metadata, frame styles, and lifecycle generation.

- [ ] **Step 1: Create the failing preview-core test**

Create `tests/preview-core.test.mjs` loading these exact exports from `tools/vfx-preview/preview-core.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ARCHETYPE_RULES,
  buildLifecycle,
  inspectEffect,
  parsePngHeader,
  spriteFrameStyle,
} = require('../tools/vfx-preview/preview-core.js');

const effect = {
  key: 'sword_lane_sunder',
  visualArchetype: 'moving-front',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  layers: {
    telegraph: { file: 'telegraph.png', frames: 4 },
    body: { file: 'body.png', frames: 8 },
    impact: { file: 'impact.png', frames: 4 },
    residue: { file: 'residue.png', frames: 4 },
  },
};

test('all runtime archetypes have preview rules', () => {
  assert.deepEqual(Object.keys(ARCHETYPE_RULES).sort(), [
    'close-range-slash', 'falling', 'ground-eruption', 'moving-front',
    'persistent-zone', 'projectile', 'projectile-volley', 'shield-orbit',
    'target-beam', 'target-brand', 'trap',
  ]);
});

test('moving lifecycle contains all four semantic stages', () => {
  assert.deepEqual(buildLifecycle(effect).map((stage) => stage.name), [
    'telegraph', 'body', 'impact', 'residue',
  ]);
});

test('frame style uses a horizontal sprite strip', () => {
  assert.deepEqual(spriteFrameStyle(8, 3), {
    backgroundSize: '800% 100%',
    backgroundPosition: `${3 / 7 * 100}% 0%`,
  });
});

test('effect inspection reports insufficient moving-body frames', () => {
  const invalid = structuredClone(effect);
  invalid.layers.body.frames = 1;
  assert.match(inspectEffect(invalid).join('\n'), /body requires at least 6 frames/i);
});

test('PNG parser reads dimensions and alpha from IHDR', () => {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, 512);
  new DataView(bytes.buffer).setUint32(20, 128);
  bytes[24] = 8;
  bytes[25] = 6;
  assert.deepEqual(parsePngHeader(bytes.buffer), { width: 512, height: 128, hasAlpha: true });
});
```

- [ ] **Step 2: Run the preview-core test and verify RED**

Run:

```powershell
& 'C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test '.\tests\preview-core.test.mjs'
```

Expected: FAIL with `MODULE_NOT_FOUND` because `preview-core.js` does not exist.

---

### Task 2: Implement browser-safe preview logic

**Files:**
- Create: `tools/vfx-preview/preview-core.js`
- Modify: `scripts/validate_effect_manifest.mjs`
- Test: `tests/preview-core.test.mjs`
- Test: `assets/effect-manifest.example.json`

**Interfaces:**
- Produces `ARCHETYPE_RULES: Record<string, PreviewRule>`.
- Produces `buildLifecycle(effect): Array<{name, durationMs, loop, motion}>`.
- Produces `inspectEffect(effect): string[]`.
- Produces `parsePngHeader(buffer): {width, height, hasAlpha}`.
- Produces `spriteFrameStyle(frameCount, frameIndex): {backgroundSize, backgroundPosition}`.
- Existing validator continues accepting `node scripts/validate_effect_manifest.mjs <manifest.json>`.

- [ ] **Step 1: Define all archetype rules and minimum frames**

Implement `ARCHETYPE_RULES` with these body minimums and motion names:

```js
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

const api = { ARCHETYPE_RULES, buildLifecycle, inspectEffect, parsePngHeader, spriteFrameStyle };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else globalThis.VfxPreviewCore = api;
```

- [ ] **Step 2: Implement lifecycle, effect inspection, frame style, and PNG parsing**

Use four stages with default durations `telegraph=500`, `body=900`, `impact=350`, `residue=650`. Set `body.loop=true` only for `persistent-zone`, `trap`, `target-brand`, `target-beam`, and `shield-orbit`. Validate required layers, positive scale, known archetype, four-frame minimums for telegraph/impact/residue, and the rule-specific body minimum. Parse PNG signature, IHDR width/height, and alpha-capable color types `4` and `6`; throw a descriptive error for invalid or truncated PNG data.

- [ ] **Step 3: Share effect validation with the Node validator**

Load the CommonJS-compatible core in `scripts/validate_effect_manifest.mjs` with:

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ARCHETYPE_RULES, inspectEffect } = require('../tools/vfx-preview/preview-core.js');
```

Keep schema, key, duplicate-key, file-extension, acceptance-array, and exit-code checks in the script; replace duplicated archetype/body-frame checks with the shared functions. Prefix shared errors with the effect key.

- [ ] **Step 4: Run tests and validators**

Run:

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test '.\tests\preview-core.test.mjs'
& $node '.\scripts\validate_effect_manifest.mjs' '.\assets\effect-manifest.example.json'
```

Expected: all five preview-core tests pass and the example reports `Effect manifest valid: 1 effect(s)`.

- [ ] **Step 5: Commit Task 2**

```powershell
git add tests/preview-core.test.mjs tools/vfx-preview/preview-core.js scripts/validate_effect_manifest.mjs
git commit -m "Add reusable VFX preview logic"
```

---

### Task 3: Build the zero-install local HTML previewer

**Files:**
- Create: `tools/vfx-preview/index.html`
- Create: `tools/vfx-preview/preview.css`
- Create: `tools/vfx-preview/preview.js`
- Create: `tests/preview-page.test.mjs`
- Create: `tests/fixtures/preview/effect-manifest.preview.json`
- Test: `tools/vfx-preview/preview-core.js`

**Interfaces:**
- Consumes local files through `<input id="folderInput" type="file" webkitdirectory multiple>`.
- Reads the Task 2 exports from `window.VfxPreviewCore`, loaded first by a classic script tag.
- Renders layers into `#previewStage` using `.sprite-layer` DOM nodes and CSS transforms.
- Reports validation in `#issueList` without blocking valid effects.

- [ ] **Step 1: Write the failing static page test**

Create `tests/preview-page.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the page test and verify RED**

Run:

```powershell
& 'C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test '.\tests\preview-page.test.mjs'
```

Expected: FAIL because the preview page files do not exist.

- [ ] **Step 3: Build the semantic HTML and responsive styling**

Create a three-column desktop layout with effect navigation, a centered `#previewStage`, controls, and an issue panel; collapse to one column below 900px. Load `preview-core.js` before `preview.js` using classic script tags so the page works directly from `file://`. Use only local CSS. Include Chinese labels with concise English subtitles. Provide dark, light, checkerboard, and transparent-background choices.

- [ ] **Step 4: Implement local directory loading**

In `preview.js`, map selected files by both `webkitRelativePath` and basename. Prefer `effect-manifest.preview.json`, then `effect-manifest.json`, then the first JSON whose parsed value has `schemaVersion` and `effects`. Resolve each layer file from that map. Use `File.arrayBuffer()`, Blob URLs, and `Image` dimensions. Revoke Blob URLs when another directory loads.

- [ ] **Step 5: Implement layered playback and controls**

Use `requestAnimationFrame` and `buildLifecycle()` to advance semantic stages. Create one DOM layer per semantic resource. Apply `spriteFrameStyle()`, manifest scale/offsets, and motion transforms from the current archetype. Implement play, pause, restart, single-frame stepping, FPS, scale, offsets, background, effect switching, and loop toggling.

- [ ] **Step 6: Implement isolated validation feedback**

Combine `inspectEffect()`, `parsePngHeader()`, file existence, and `width % frames === 0`. Missing alpha is a warning; missing files and invalid frame geometry block only the affected effect. Mark invalid effects in the list and render resource-specific messages in `#issueList`. Keep valid effects playable when another effect is invalid.

- [ ] **Step 7: Add a repository-root browser fixture**

Create `tests/fixtures/preview/effect-manifest.preview.json` with `projectile`, `falling`, and `persistent-zone` effects that reference the three existing files in `docs/reference-images/` by basename. Use frame counts that divide their widths and add one fourth effect whose body points to `missing_body.png` to verify error isolation. Selecting the repository root must make the three valid effects playable and the fourth visibly invalid.

- [ ] **Step 8: Run static and logic tests**

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test '.\tests\preview-core.test.mjs' '.\tests\preview-page.test.mjs'
```

Expected: all tests pass with zero failures.

- [ ] **Step 9: Perform browser acceptance**

Open `tools/vfx-preview/index.html` in a real browser and select the repository root. The loader must prefer `tests/fixtures/preview/effect-manifest.preview.json`. Verify effect selection, play/pause/restart/step, FPS/scale/offset changes, all backgrounds, and motion for `projectile`, `falling`, and `persistent-zone`. Verify that the fourth effect reports its missing body while the three valid effects remain playable.

- [ ] **Step 10: Commit Task 3**

```powershell
git add tools/vfx-preview/index.html tools/vfx-preview/preview.css tools/vfx-preview/preview.js tests/preview-page.test.mjs tests/fixtures/preview/effect-manifest.preview.json
git commit -m "Add local combat VFX previewer"
```

---

### Task 4: Add adaptive routing and preview guidance to the Skill

**Files:**
- Modify: `SKILL.md`
- Create: `references/preview-workflow.md`
- Modify: `agents/openai.yaml`
- Test: `tests/skill-workflow.test.mjs`

**Interfaces:**
- Consumes the seven-stage contract and previewer from Tasks 2–3.
- Produces consistent routing, dependency checks, pause rules, and completion responses for future Skill users.

- [ ] **Step 1: Create the failing Skill workflow test**

Create `tests/skill-workflow.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skill = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');

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
```

- [ ] **Step 2: Run the routing test and verify RED**

Run:

```powershell
& 'C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test '.\tests\skill-workflow.test.mjs'
```

Expected: FAIL because the current Skill has no selectable seven-stage routing contract.

- [ ] **Step 3: Add the routing contract to SKILL.md**

Add concise sections named `Request routing`, `Selectable stages`, and `Stage completion response`. Use the exact seven stages from the design. State the choice forms `execute all`, `first N stages`, `specific stages`, and `continue from stage`. Require the visual-design and resource-preview pauses, with an explicit uninterrupted-execution override.

- [ ] **Step 4: Add focused preview instructions**

Create `references/preview-workflow.md` covering directory layout, manifest reuse, DOM/CSS rendering, archetype-to-motion mapping, controls, resource checks, isolated errors, and the three post-preview choices. Link it directly from the resource-routing section of `SKILL.md` and require it before preview work.

- [ ] **Step 5: Update agent metadata**

Change `agents/openai.yaml` to:

```yaml
interface:
  display_name: "战斗特效制作"
  short_description: "按需规划视觉设计、资源制作、预览、接入与验收"
  default_prompt: "Use $creating-game-combat-vfx to assess my request, propose the relevant stages, and help me complete the combat VFX work I choose."
```

- [ ] **Step 6: Run the routing test and Skill validator**

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$py='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $node --test '.\tests\skill-workflow.test.mjs'
$env:PYTHONPATH=(Resolve-Path '..\.codex_tmp\skill_pydeps').Path
& $py 'C:\Users\soult\.codex\skills\.system\skill-creator\scripts\quick_validate.py' '.'
```

Expected: all routing tests pass and validation prints `Skill is valid!`.

- [ ] **Step 7: Commit Task 4**

```powershell
git add SKILL.md references/preview-workflow.md agents/openai.yaml tests/skill-workflow.test.mjs
git commit -m "Add adaptive VFX workflow routing"
```

---

### Task 5: Update bilingual usage documentation and complete verification

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: repository structure blocks in both README files
- Test: all files changed in Tasks 1–4

**Interfaces:**
- Produces matching Chinese and English explanations for full requests, partial requests, stage selections, checkpoints, and preview startup.

- [ ] **Step 1: Update the Chinese README**

Replace the current “Skill 自动完成” framing with intelligent routing. Include a full-request example whose first response lists seven stages, plus reply examples `执行全部`, `先完成前 3 步`, `只做第 2、4 步`, and `从第 5 步继续`. Add a partial-request example for `只预览现有特效资源`. Document opening `tools/vfx-preview/index.html` and selecting the resource directory.

- [ ] **Step 2: Mirror the same semantics in English**

Use `run all stages`, `complete the first three stages`, `only stages 2 and 4`, and `continue from stage 5`. Keep the same stage numbering, two checkpoints, partial preview request, and local-page instructions.

- [ ] **Step 3: Run complete automated verification**

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$py='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $node --test '.\tests\skill-workflow.test.mjs' '.\tests\preview-core.test.mjs' '.\tests\preview-page.test.mjs'
& $node '.\scripts\validate_effect_manifest.mjs' '.\assets\effect-manifest.example.json'
$env:PYTHONPATH=(Resolve-Path '..\.codex_tmp\skill_pydeps').Path
& $py 'C:\Users\soult\.codex\skills\.system\skill-creator\scripts\quick_validate.py' '.'
git diff --check
```

Expected: all Node tests pass, the example manifest is valid, the Skill is valid, and `git diff --check` emits no errors.

- [ ] **Step 4: Repeat browser acceptance after documentation changes**

Open the local page and repeat the valid-resource and missing-resource checks. Capture one screenshot each for a moving projectile, a falling effect, and a persistent zone to verify the three representative motion families.

- [ ] **Step 5: Commit and push**

```powershell
git add README.md README.en.md docs/superpowers/plans/2026-07-17-adaptive-workflow-preview.md
git commit -m "Document adaptive VFX workflow and preview"
git push origin main
```

Expected: the worktree is clean and local `main` matches `origin/main`.
