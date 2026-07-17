# Simplified Skill Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public usage flow a single natural-language invocation while the Skill creates and validates any effect manifest internally.

**Architecture:** Keep the existing manifest template and validator as deterministic internal resources. Change the Skill contract so the agent owns manifest creation and validation, then reshape both README usage sections around one invocation and one end-to-end example.

**Tech Stack:** Markdown, JSON, Node.js manifest validator, Python documentation assertions, Git.

## Global Constraints

- Ordinary users perform no file-copying or command-line operations.
- The Skill creates, fills, and validates a manifest automatically when structured tracking is useful.
- Both README languages contain one invocation and one complete usage example.
- The existing manifest schema and validator behavior remain unchanged.

---

### Task 1: Simplify the Skill contract and public usage

**Files:**
- Create for test only: `D:/小程序游戏/.codex_tmp/validate_simple_skill_usage.py`
- Modify: `SKILL.md`
- Modify: `README.md`
- Modify: `README.en.md`

**Interfaces:**
- Consumes: `assets/effect-manifest.example.json` and `scripts/validate_effect_manifest.mjs` as internal resources.
- Produces: a one-sentence public invocation, a bilingual end-to-end example, and an internal automatic manifest workflow.

- [ ] **Step 1: Write the failing documentation test**

Create `D:/小程序游戏/.codex_tmp/validate_simple_skill_usage.py` with these assertions:

```python
from pathlib import Path

root = Path(r"D:/小程序游戏/creating-game-combat-vfx")
skill = (root / "SKILL.md").read_text(encoding="utf-8")
zh = (root / "README.md").read_text(encoding="utf-8")
en = (root / "README.en.md").read_text(encoding="utf-8")

assert "复制 `assets/effect-manifest.example.json`" not in zh
assert "copy `assets/effect-manifest.example.json`" not in en
assert "## 使用示例" in zh
assert "## Usage example" in en
assert "create an effect manifest automatically" in skill
assert "Do not ask the user to copy" in skill
assert "用户只需提供" in zh and "Skill 自动完成" in zh
assert "The user provides" in en and "The Skill handles" in en
print("Simplified Skill usage verified")
```

- [ ] **Step 2: Run the test and verify the existing documentation fails**

Run:

```powershell
& 'C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'D:\小程序游戏\.codex_tmp\validate_simple_skill_usage.py'
```

Expected: `AssertionError` because the README still instructs users to copy the manifest and no complete example exists.

- [ ] **Step 3: Update the Skill's internal resource contract**

Replace the manual manifest bullet in `SKILL.md` with instructions equivalent to:

```markdown
- When structured tracking is useful, create an effect manifest automatically from `assets/effect-manifest.example.json`, fill it from the approved design, and run `node scripts/validate_effect_manifest.mjs <manifest>`. Fix recoverable validation errors before continuing. Do not ask the user to copy, fill, or validate the manifest.
```

- [ ] **Step 4: Replace the Chinese manual workflow with a one-line entry and example**

Keep the existing invocation, remove the copy-and-command paragraph, and add:

```markdown
## 使用示例

用户只需提供目标与范围：

> 使用 `$creating-game-combat-vfx` 为剑、火、水三组技能设计完整战斗特效。先完成视觉设计，再制作非程序化序列帧资源并接入游戏；保留现有伤害机制，增加可调大小与偏移，并通过隐藏 GM 面板逐个验收。

Skill 自动完成：

- 分析战斗语义并选择正确的运动模型；
- 设计关键帧并制作所需资源；
- 在需要时自动创建、填写和校验内部特效清单；
- 接入配置、测试入口与运行时表现；
- 验证战斗机制、资源播放和真机视觉效果。
```

Update the repository structure labels so the example manifest and validator are described as internal resources.

- [ ] **Step 5: Apply the equivalent English usage example**

Keep the existing invocation, remove the copy-and-command paragraph, and add:

```markdown
## Usage example

The user provides only the goal and scope:

> Use `$creating-game-combat-vfx` to design complete combat VFX for sword, fire, and water ability sets. Approve the visual direction first, then produce authored sprite assets and integrate them without changing existing damage mechanics. Expose scale and offsets for tuning, and verify every ability through the hidden GM panel.

The Skill handles:

- translating combat semantics into the correct motion archetypes;
- designing keyframes and producing the required assets;
- automatically creating, filling, and validating an internal effect manifest when useful;
- integrating configuration, test access, and runtime presentation;
- validating mechanics, playback, and device-scale visual quality.
```

Update the repository structure labels so the example manifest and validator are described as internal resources.

- [ ] **Step 6: Run the documentation test and verify it passes**

Run the command from Step 2.

Expected: `Simplified Skill usage verified`.

- [ ] **Step 7: Run repository validation**

Run:

```powershell
$py='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$env:PYTHONPATH=(Resolve-Path 'D:\小程序游戏\.codex_tmp\skill_pydeps').Path
& $py 'C:\Users\soult\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'D:\小程序游戏\creating-game-combat-vfx'
& 'C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\小程序游戏\creating-game-combat-vfx\scripts\validate_effect_manifest.mjs' 'D:\小程序游戏\creating-game-combat-vfx\assets\effect-manifest.example.json'
```

Expected: `Skill is valid!` and `Effect manifest valid: 1 effect(s)`.

- [ ] **Step 8: Commit and push**

```powershell
git add SKILL.md README.md README.en.md docs/superpowers/plans/2026-07-17-simple-skill-usage.md
git commit -m "Simplify combat VFX Skill usage"
git push origin main
```

Expected: local `main` and `origin/main` resolve to the same commit and the worktree is clean.
