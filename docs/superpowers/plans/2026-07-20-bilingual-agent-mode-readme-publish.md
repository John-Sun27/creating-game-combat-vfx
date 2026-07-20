# Bilingual Agent Mode README Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the optional Agent workflow in the Chinese and English repository introductions, commit the existing previewer fix independently, validate the repository, and push `main` to GitHub.

**Architecture:** Keep previewer behavior and bilingual documentation in separate commits. Lock the README contract with the existing Node documentation test before editing either README. Publish only after the complete test, manifest, and Skill validation gates pass.

**Tech Stack:** Markdown, JavaScript, Node.js built-in test runner, Python Skill validator, Git.

## Global Constraints

- `README.md` remains the default Chinese repository homepage and `README.en.md` remains its English mirror.
- Both READMEs describe standard mode as the default and high-fidelity Agent mode as optional and confirmation-only.
- Agent mode never broadens the stages selected by the user.
- The current mechanic is decomposed into an event graph and bounded task packets reviewed by separate production and review Agents.
- Zhuque Brand is an ordinary worked instance, not a special workflow or universal value template.
- The previewer moving-anchor fix and bilingual documentation are separate commits.
- Do not stage unrelated files or manufacture a README change when its bytes already match `HEAD`.
- Push the validated final `main` branch to `origin/main`.

---

### Task 1: Commit the Existing Previewer Moving-Anchor Fix

**Files:**
- Modify: `tools/vfx-preview/preview-core.js:189-213`
- Test: `tests/preview-core.test.mjs:175-256`

**Interfaces:**
- Consumes: configured preview-layer `anchor`, global lifecycle `progress`, and existing motion profiles.
- Produces: `timelineProgress` on preview instances and moving-anchor poses derived from that global progress.

- [ ] **Step 1: Verify the existing regression tests fail without the previewer change**

Save the current two-file diff, temporarily evaluate the two new tests against `HEAD` versions in an isolated temporary checkout, and run:

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test '.\tests\preview-core.test.mjs'
```

Expected: the attached-support-layer and moving-residue tests fail against the pre-fix `preview-core.js`. Restore the current working files immediately after recording RED evidence.

- [ ] **Step 2: Run focused GREEN verification on the current fix**

Run the same command against the restored working files.

Expected: all `preview-core.test.mjs` tests pass, including:

```text
configured choreography preserves global timeline progress for attached support layers
moving-anchored residue follows the body at global timeline progress
```

- [ ] **Step 3: Commit only the previewer fix and tests**

```powershell
git add -- tools/vfx-preview/preview-core.js tests/preview-core.test.mjs
git diff --cached --check
git commit -m "fix: keep moving support layers attached"
```

### Task 2: Add and Test the Bilingual Agent Mode Overview

**Files:**
- Modify: `tests/skill-workflow.test.mjs:end`
- Modify: `README.md` after `## 七阶段工作流`
- Modify: `README.en.md` after `## Seven-stage workflow`

**Interfaces:**
- Consumes: the optional Agent-mode contract in `SKILL.md` and `references/high-fidelity-agent-mode.md`.
- Produces: equivalent Chinese and English public descriptions and repository-structure entries.

- [ ] **Step 1: Write failing bilingual README contract tests**

Append to `tests/skill-workflow.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test '.\tests\skill-workflow.test.mjs'
```

Expected: only the two new bilingual introduction tests fail.

- [ ] **Step 3: Add the Chinese section and structure entry**

Add after the Chinese seven-stage list:

```markdown
## 可选的高保真 Agent 模式

标准七阶段工作流始终是默认模式。遇到持续状态、多机械事件、混合锚点、重叠视觉层或严格时序等复杂任务时，Skill 会说明检测到的复杂度信号、预期收益和额外审查成本，并推荐可选的高保真 Agent 模式。只有用户明确确认后才会启动；拒绝或未确认时继续使用标准模式，且 Agent 模式不会扩大用户已选择的阶段范围。

启用后，Skill 会把当前技能机制拆成事件图和边界清晰的任务包，由制作 Agent 完成所选阶段，再由独立复核 Agent 检查资源、代码、测试和验收证据。朱雀烙印只是“附着状态、周期触发、自然结束和死亡连锁”的一个普通实例，不是特殊流程，也不会成为其他技能的通用参数模板。
```

Add to the Chinese repository tree:

```text
references/high-fidelity-agent-mode.md  复杂任务的可选 Agent 制作与复核流程
```

- [ ] **Step 4: Add the matching English section and structure entry**

Add after the English seven-stage list:

```markdown
## Optional high-fidelity Agent mode

The standard seven-stage workflow always remains the default mode. For complex tasks involving persistent state, multiple mechanical events, mixed anchors, overlapping visual layers, or strict timing, the Skill explains the detected complexity signals, expected benefit, and added review cost before recommending optional high-fidelity Agent mode. It starts only after explicit user confirmation; refusal or no confirmation keeps standard mode, and Agent mode never broadens the stages selected by the user.

Once confirmed, the Skill decomposes the current mechanics into an event graph and bounded task packets. A production Agent completes the selected stage, then an independent review Agent checks the assets, code, tests, and acceptance evidence. Zhuque Brand is an ordinary worked instance combining attached state, periodic events, natural expiry, and a death chain—not a special workflow or a universal value template for other abilities.
```

Add to the English repository tree:

```text
references/high-fidelity-agent-mode.md  Optional Agent production and review workflow for complex tasks
```

- [ ] **Step 5: Run focused GREEN verification**

Run the Task 2 focused test command again.

Expected: every `skill-workflow.test.mjs` test passes.

- [ ] **Step 6: Commit synchronized documentation and its test**

```powershell
git add -- README.md README.en.md tests/skill-workflow.test.mjs
git diff --cached --check
git commit -m "docs: explain optional Agent VFX workflow"
```

### Task 3: Validate and Push Main

**Files:**
- Verify: all tracked repository files
- Publish: local `main` to `origin/main`

**Interfaces:**
- Consumes: committed previewer and bilingual documentation changes.
- Produces: a validated remote `main` matching the local final commit.

- [ ] **Step 1: Run complete validation**

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$py='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$env:PYTHON=$py
$env:PYTHONPATH='D:\小程序游戏\.codex_tmp\skill-validator-deps'
$tests=(Get-ChildItem -LiteralPath '.\tests' -Filter '*.test.mjs' -File).FullName
& $node --test $tests
& $node '.\scripts\validate_effect_manifest.mjs' '.\assets\effect-manifest.example.json'
& $py 'C:\Users\soult\.codex\skills\.system\skill-creator\scripts\quick_validate.py' '.'
git diff --check
git status --short
```

Expected: all Node tests pass, the example manifest is valid, the Skill is valid, and the working tree contains no uncommitted content changes.

- [ ] **Step 2: Push the approved main history**

```powershell
git push origin main
```

Expected: push succeeds without force.

- [ ] **Step 3: Verify local and remote commit identity**

```powershell
$local=(git rev-parse main).Trim()
$remote=(git ls-remote origin refs/heads/main).Split("`t")[0]
if($local -ne $remote){ throw "Remote main mismatch: local=$local remote=$remote" }
```

Expected: local and remote hashes are identical.
