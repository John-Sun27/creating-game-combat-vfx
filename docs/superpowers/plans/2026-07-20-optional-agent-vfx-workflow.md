# Optional Agent VFX Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, mechanism-driven Agent production mode for complex combat VFX while preserving the existing seven-stage standard workflow as the unchanged default.

**Architecture:** Keep mode detection and confirmation rules concise in `SKILL.md`, and place the detailed event-graph, task-packet, production, and independent-review protocol in one new reference. Extend existing runtime, asset, and QA references with reusable contracts learned from prior effects. Lock all routing and contract behavior with documentation tests before editing the Skill.

**Tech Stack:** Markdown Skill instructions, Node.js built-in test runner, `node:assert`, Python Skill validator, Git.

## Global Constraints

- Standard mode remains the default and retains the existing selectable seven-stage workflow.
- High-fidelity Agent mode is additive and starts only after explicit user confirmation.
- A recommendation must state detected complexity signals, expected benefit, and added review/evidence cost.
- Declining the recommendation or not answering it leaves execution in standard mode.
- Confirmed Agent mode applies only to the stages already selected by the user.
- If independent Agents are unavailable, offer standard mode or waiting; do not mislabel single-Agent work as high-fidelity Agent mode.
- Build Agent work from the current skill's event graph, never from a named-skill template or inherited timing, anchor, scale, frame, or damage values.
- Keep user-owned changes in `README.md`, `tests/preview-core.test.mjs`, and `tools/vfx-preview/preview-core.js` untouched.
- Use tests first for every Skill behavior change and commit each independently testable task.

---

## File Structure

- Modify `SKILL.md`: add concise mode routing, confirmation behavior, and conditional reference loading.
- Create `references/high-fidelity-agent-mode.md`: own event-graph decomposition, Agent task packets, stage-aware production roles, review loops, findings, and failure handling.
- Modify `references/runtime-integration.md`: own the general mechanic-visual contract, semantic anchor selection, ownership, lifecycle, terminal-frame, and same-update rules.
- Modify `references/asset-production.md`: own reproducible audits and manifest-correct comparison evidence.
- Modify `references/qa-and-acceptance.md`: own backup, hash protection, simulator/device acceptance, and post-acceptance promotion rules.
- Modify `tests/skill-workflow.test.mjs`: lock optional routing and all cross-reference contracts without touching preview implementation tests.
- Create temporarily under `D:/小程序游戏/.codex_tmp/optional-agent-vfx-workflow/`: store uncommitted forward-test prompts and raw outputs; remove them after review.

### Task 1: Preserve Standard Mode and Add Optional Routing

**Files:**
- Modify: `tests/skill-workflow.test.mjs:13-32`
- Modify: `SKILL.md:12-35`
- Modify: `SKILL.md:49-58`

**Interfaces:**
- Consumes: the existing seven-stage selection and approval checkpoints.
- Produces: a mode-routing contract with `standard mode` as default and `high-fidelity Agent mode` as confirmed-only; conditionally routes confirmed work to `references/high-fidelity-agent-mode.md`.

- [ ] **Step 1: Run five fresh-context baseline samples before changing the Skill**

Dispatch five independent Agents without supplying the local Skill file. Give each only this request:

```text
为一个具有施加、周期伤害、自然结束、死亡爆炸和连锁传播的技能制作完整战斗特效。请先说明你会采用的执行模式、是否需要用户确认，以及下一步做什么。
```

Save raw responses outside the repository at `D:/小程序游戏/.codex_tmp/optional-agent-vfx-workflow/baseline-01.md` through `baseline-05.md`. Record whether each response (a) identifies complexity, (b) offers a standard/Agent choice, (c) waits for confirmation, and (d) preserves selectable stages. This is evidence gathering only; do not edit the Skill during this step.

- [ ] **Step 2: Write failing routing tests**

Append to `tests/skill-workflow.test.mjs`:

```js
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
```

- [ ] **Step 3: Run the routing tests and verify RED**

Run:

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test '.\tests\skill-workflow.test.mjs'
```

Expected: FAIL only in the new optional-routing assertions because `SKILL.md` does not yet define either mode.

- [ ] **Step 4: Add the minimal mode-routing section**

Insert after `## Request routing` in `SKILL.md`:

```markdown
## Execution modes

Keep **standard mode** as the default implementation of the selectable seven-stage workflow. For a complex request, recommend optional **high-fidelity Agent mode** by naming the detected complexity signals, expected consistency and verification benefit, and added review and evidence cost. Recommendation is not activation: start Agent mode only after explicit user confirmation. Declining it or not answering leaves the request in standard mode.

Complexity signals include persistent state, multiple mechanical events, mixed anchors, overlapping visual owners, strict per-layer timing, high reference fidelity, or formal promotion and device acceptance. Confirmed Agent mode applies only to the stages the user selected and must not broaden stage scope. It does not replace the seven-stage workflow.

If independent Agents are unavailable after confirmation, report the limitation and offer standard mode or waiting. Do not label single-Agent execution as high-fidelity Agent mode.
```

Add to `## Resource routing`:

```markdown
- Read `references/high-fidelity-agent-mode.md` only after the user confirms high-fidelity Agent mode.
```

- [ ] **Step 5: Run the routing tests and verify GREEN**

Run the Task 1 test command again.

Expected: PASS for the complete `skill-workflow.test.mjs` suite.

- [ ] **Step 6: Commit Task 1**

```powershell
git add SKILL.md tests/skill-workflow.test.mjs
git commit -m "feat: add optional Agent VFX routing"
```

### Task 2: Define the Mechanism-Driven Agent Protocol

**Files:**
- Create: `references/high-fidelity-agent-mode.md`
- Modify: `tests/skill-workflow.test.mjs:1-15`
- Modify: `tests/skill-workflow.test.mjs:101-end`

**Interfaces:**
- Consumes: confirmed mode and selected stages from Task 1; mechanic events and approved stage outputs.
- Produces: an event graph, `Agent task packet`, stage-specific production unit, independent review result, and blocking finding loop.

- [ ] **Step 1: Load the new reference in the test and write failing contract tests**

Add near the existing reference imports:

```js
const highFidelityAgentMode = fs.readFileSync(
  new URL('../references/high-fidelity-agent-mode.md', import.meta.url),
  'utf8',
);
```

Append:

```js
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
```

- [ ] **Step 2: Run the tests and verify RED**

Run the Task 1 test command.

Expected: FAIL with `ENOENT` for `references/high-fidelity-agent-mode.md`.

- [ ] **Step 3: Create the detailed Agent protocol reference**

Create `references/high-fidelity-agent-mode.md` with these exact sections and contracts:

```markdown
# High-fidelity Agent mode

## Entry contract

Enter only after explicit user confirmation. Retain the user's selected stages and all normal visual-design, preview, and in-game approval gates.

## Event graph

Translate the current mechanic contract into nodes for its authoritative mechanical events: cast, spawn, travel, collision, tick, refresh, expire, death, counter, and chain when present. Record ordering, ownership transfer, cancellation, and same-update priority on edges. Include only events used by the current skill. The graph must not inherit timing, anchor, scale, frame, damage, or transition values from a named skill.

## Agent task packet

Create one bounded production unit for one event node or one explicit transition. Its packet contains: mechanical event, visual intent, approved references, archetype, owner, anchors, layers, lifetime, frame contract, allowed files, invariants, expected evidence, and verification commands.

## Production and review loop

1. Assign a production Agent for the selected visual-design, asset-production, runtime-integration, or acceptance-correction stage.
2. Assign a different independent review Agent to inspect the packet, artifacts, diffs, tests, visual reports, and scope.
3. Classify findings as Critical, Important, or Minor.
4. Return Critical and Important findings to the same production unit without changing its mechanic contract.
5. Repeat independent review and advance only when no Critical or Important finding remains.

## Archetype composition

Compose only the required attached status, persistent ground zone, projectile or volley, moving front, falling strike, staged ground eruption, trap, shield or orbit, and death-triggered or chain archetypes. Treat Zhuque Brand as a worked instance combining attached status, tick pulse, expiry fade, and death chain. Derive timing, anchor, scale, frame, damage, ownership, and draw order from the current mechanic contract and approved design.

## Evidence and gates

Attach test output, audits, comparison and overlap sheets, runtime diffs, and representative captures required by the selected stage. Preserve standard user approval gates. Do not broaden the selected stage scope.
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run the Task 1 test command.

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```powershell
git add references/high-fidelity-agent-mode.md tests/skill-workflow.test.mjs
git commit -m "feat: define mechanism-driven Agent VFX protocol"
```

### Task 3: Generalize the Mechanic-Visual Runtime Contract

**Files:**
- Modify: `references/runtime-integration.md:19-55`
- Modify: `tests/skill-workflow.test.mjs:1-18`
- Modify: `tests/skill-workflow.test.mjs:end`

**Interfaces:**
- Consumes: event nodes and task packets from Task 2.
- Produces: per-event owner, layers, semantic anchor, lifecycle, frame reachability, draw order, and exit priority contracts for integration Agents.

- [ ] **Step 1: Import the runtime reference and write failing tests**

Add:

```js
const runtimeIntegration = fs.readFileSync(
  new URL('../references/runtime-integration.md', import.meta.url),
  'utf8',
);
```

Append:

```js
test('runtime integration defines a complete mechanic-visual contract', () => {
  for (const phrase of [
    'Mechanical event', 'Visual owner', 'Visual layers', 'Anchor', 'Lifetime',
    'Frame contract', 'Draw order', 'Exit priority',
  ]) assert.match(runtimeIntegration, new RegExp(phrase, 'i'));
  assert.match(runtimeIntegration, /one visual owner.*complete silhouette/i);
  assert.match(runtimeIntegration, /terminal frame.*lifetime/i);
  assert.match(runtimeIntegration, /same update.*priority/i);
});

test('runtime anchors are selected semantically rather than universally', () => {
  assert.match(runtimeIntegration, /target body.*target foot.*locked ground.*moving position.*sky spawn/is);
  assert.match(runtimeIntegration, /attached.*body.*center/i);
  assert.match(runtimeIntegration, /ground.*death.*foot/i);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run the Task 1 test command.

Expected: FAIL because the current runtime reference has no complete event contract and applies a universal foot-anchor rule.

- [ ] **Step 3: Add the contract table and semantic rules**

Insert after `## Visual state contract`:

```markdown
## Mechanic-visual event contract

Define each event with Mechanical event, Visual owner, Visual layers, Anchor, Lifetime, Frame contract, Draw order, and Exit priority. Use one visual owner for a complete silhouette at a given time. Give attached bodies, tick pulses, expiry fades, impacts, and death events independent lifecycles when their mechanics differ.

For every non-looping layer, prove its terminal frame is reachable inside its lifetime. At an exact transition boundary, prevent two complete high-opacity silhouettes from coexisting. Define same update priority for hit, expiry, death, refresh, escape, and chain events that can coincide.
```

Replace the universal monster-foot anchor sentence under `## Anchors` with:

```markdown
- Select anchors from event semantics: caster body, target body, target foot, locked ground, moving position, or sky spawn.
- Use target-body center for attached status and body-centered application art. Use target foot or locked ground for ground contact, domains, and death explosions. Keep moving and sky-spawn bodies separate from their locked impact point.
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run the Task 1 test command.

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add references/runtime-integration.md tests/skill-workflow.test.mjs
git commit -m "docs: generalize mechanic visual runtime contracts"
```

### Task 4: Require Reproducible Asset and Release Evidence

**Files:**
- Modify: `references/asset-production.md:20-46`
- Modify: `references/qa-and-acceptance.md:3-44`
- Modify: `tests/skill-workflow.test.mjs:1-20`
- Modify: `tests/skill-workflow.test.mjs:end`

**Interfaces:**
- Consumes: approved references, current source plates, old and new manifests, selected runtime resources.
- Produces: reproducible audits, correct old/new slicing, realistic overlap evidence, protected promotion, and final acceptance gate.

- [ ] **Step 1: Import QA guidance and write failing evidence tests**

Add:

```js
const qaAndAcceptance = fs.readFileSync(
  new URL('../references/qa-and-acceptance.md', import.meta.url),
  'utf8',
);
```

Append:

```js
test('asset evidence is regenerated from authoritative current inputs', () => {
  assert.match(assetProduction, /audit data.*current source plates/i);
  assert.match(assetProduction, /old assets.*own manifest/i);
  assert.match(assetProduction, /actual project background/i);
  assert.match(assetProduction, /manifest display size.*anchor.*opacity/i);
  assert.match(assetProduction, /telegraph.*body.*body.*impact.*impact.*residue/is);
});

test('runtime promotion protects unaffected resources and waits for acceptance', () => {
  assert.match(qaAndAcceptance, /back up.*replaced runtime assets/i);
  assert.match(qaAndAcceptance, /hash.*unaffected/i);
  assert.match(qaAndAcceptance, /GM.*normal.*runtime path/i);
  assert.match(qaAndAcceptance, /simulator or device/i);
  assert.match(qaAndAcceptance, /commit.*after.*user accepts/i);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run the Task 1 test command.

Expected: FAIL in the new evidence and promotion assertions.

- [ ] **Step 3: Add reproducible evidence rules**

Add under `### 3. Audit before expansion` in `references/asset-production.md`:

```markdown
Regenerate audit data from the current source plates for every acceptance run. An audit-only measurement may preserve accepted PNG bytes, but its report must identify the measured input and cannot reuse stale JSON.
```

Add under `### 4. Compare on the project stage`:

```markdown
Slice old assets with their own manifest and new assets with the new manifest; never apply a new frame count to an old sheet. Use the actual project background. Build overlap sheets from manifest display size, anchor, pivot, timing window, and opacity curve for telegraph/body, body/impact, and impact/residue contacts.
```

- [ ] **Step 4: Add protected promotion and user acceptance rules**

Append to `references/qa-and-acceptance.md` before `## Completion report`:

```markdown
## Runtime promotion gate

Back up replaced runtime assets before promotion and compare approved-source and runtime hashes. Record hashes for unaffected resources and prove they remain unchanged. Exercise each effect through the GM or developer surface using the normal cast and runtime path. Run automated suites, then inspect representative simulator or device scenarios. Commit promoted assets only after the user accepts the in-game result.
```

- [ ] **Step 5: Run the tests and verify GREEN**

Run the Task 1 test command.

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```powershell
git add references/asset-production.md references/qa-and-acceptance.md tests/skill-workflow.test.mjs
git commit -m "docs: require reproducible VFX promotion evidence"
```

### Task 5: Forward-Test Routing and Validate the Complete Skill

**Files:**
- Verify: `SKILL.md`
- Verify: `references/high-fidelity-agent-mode.md`
- Verify: `references/runtime-integration.md`
- Verify: `references/asset-production.md`
- Verify: `references/qa-and-acceptance.md`
- Verify: `tests/skill-workflow.test.mjs`
- Temporary only: `D:/小程序游戏/.codex_tmp/optional-agent-vfx-workflow/*`

**Interfaces:**
- Consumes: the complete optional-mode Skill behavior from Tasks 1-4.
- Produces: forward-test evidence that complex, simple, and partial requests route correctly without altering the standard workflow.

- [ ] **Step 1: Run five fresh complex-request samples with the revised Skill**

Dispatch five independent Agents with:

```text
Use $creating-game-combat-vfx at D:/小程序游戏/creating-game-combat-vfx/SKILL.md 为一个具有施加、周期伤害、自然结束、死亡爆炸和连锁传播的技能制作完整战斗特效。请先说明你会采用的执行模式、是否需要用户确认，以及下一步做什么。
```

Save raw outputs as `complex-01.md` through `complex-05.md`. Each must recommend high-fidelity Agent mode with concrete signals, benefit, and cost; wait for confirmation; and retain the seven-stage choices. If any sample starts Agent production immediately, tighten the positive routing recipe in `SKILL.md`, add a regression assertion, and repeat all five samples.

- [ ] **Step 2: Test a simple partial request**

Dispatch one fresh Agent with:

```text
Use $creating-game-combat-vfx at D:/小程序游戏/creating-game-combat-vfx/SKILL.md。已有批准的单次近身剑气资源，只完成第5阶段接入，不修改技能机制。
```

Expected: enter stage 5 in standard mode with only minimum dependencies; do not force or auto-start Agent mode.

- [ ] **Step 3: Test a complex partial request**

Dispatch one fresh Agent with:

```text
Use $creating-game-combat-vfx at D:/小程序游戏/creating-game-combat-vfx/SKILL.md。为一个持续地面领域只完成第3至4阶段，包含循环主体、周期冰刺和结束消散。
```

Expected: recommend high-fidelity Agent mode, wait for confirmation, and keep scope limited to stages 3-4.

- [ ] **Step 4: Run the complete automated suite**

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$py='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$tests=(Get-ChildItem -LiteralPath '.\tests' -Filter '*.test.mjs' -File).FullName
& $node --test $tests
& $node '.\scripts\validate_effect_manifest.mjs' '.\assets\effect-manifest.example.json'
& $py 'C:\Users\soult\.codex\skills\.system\skill-creator\scripts\quick_validate.py' '.'
```

Expected: every Node test passes, the example manifest is valid, and Skill validation reports success.

- [ ] **Step 5: Verify scope and clean temporary forward-test artifacts**

```powershell
git diff --check
git status --short
```

Expected: only planned Skill/reference/test files differ from the task commits; the pre-existing user changes to `README.md`, `tests/preview-core.test.mjs`, and `tools/vfx-preview/preview-core.js` remain untouched. After manually reviewing all raw forward-test outputs, remove only `D:/小程序游戏/.codex_tmp/optional-agent-vfx-workflow/` after resolving its absolute path under `D:/小程序游戏/.codex_tmp`.

```powershell
$tempRoot=[System.IO.Path]::GetFullPath('D:\小程序游戏\.codex_tmp')
$target=[System.IO.Path]::GetFullPath('D:\小程序游戏\.codex_tmp\optional-agent-vfx-workflow')
if(-not $target.StartsWith($tempRoot,[System.StringComparison]::OrdinalIgnoreCase)){ throw "Unsafe temporary target: $target" }
if(Test-Path -LiteralPath $target){ Remove-Item -LiteralPath $target -Recurse -Force }
```

- [ ] **Step 6: Commit any test-driven wording refinements**

If Steps 1-3 required a wording change, commit only its Skill test and associated documentation:

```powershell
git add SKILL.md references/high-fidelity-agent-mode.md tests/skill-workflow.test.mjs
git commit -m "test: harden optional Agent VFX routing"
```

If no wording changed, do not create an empty commit.
