# Final Fixes Report

## Scope

This pass addresses every final review item for duration validation and isolation, archetype instance scenes, FPS/lifecycle separation, automatic test discovery, classic script order, and verification reporting.

## TDD evidence

### RED: core validation, instance scenes, lifecycle timing, and loader isolation

Command:

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test '.\tests\preview-core.test.mjs' '.\tests\preview-loader.test.mjs' '.\tests\preview-page.test.mjs'
```

Observed result: 35 tests, 29 passed, 6 failed. The expected failures were:

1. `effect inspection rejects non-finite and non-positive optional layer durations`
2. `falling body scene retains a fixed telegraph beneath the moving body`
3. `projectile volley body scene creates five staggered horizontally offset bodies`
4. `sprite FPS changes frame sampling without changing real-time lifecycle progress`
5. `timeline crosses lifecycle stages using unscaled real milliseconds`
6. `invalid duration blocks only its effect record within a directory`

The failures were caused by missing validation/API behavior, not test setup errors.

### GREEN: core and directory isolation

Command:

```powershell
& $node --test '.\tests\preview-core.test.mjs' '.\tests\preview-loader.test.mjs'
```

Observed result: 32 tests passed, 0 failed.

### RED: browser runtime wiring

Command:

```powershell
& $node --test '.\tests\preview-page.test.mjs'
```

Observed result: 4 tests, 3 passed, 1 failed. The expected failure was `runtime renders archetype instances and advances the lifecycle with real delta`, because `preview.js` had not yet consumed the new pure APIs.

A follow-up RED run of the same page test produced 4 tests, 3 passed, 1 failed after the test prohibited FPS-derived manual timeline steps. It exposed `advance(1000 / Number(refs.fpsInput.value))` and was made GREEN with an FPS-independent fixed manual step.

### GREEN: runtime wiring and syntax

Command:

```powershell
& $node --test '.\tests\preview-core.test.mjs' '.\tests\preview-loader.test.mjs' '.\tests\preview-page.test.mjs'
& $node --check '.\tools\vfx-preview\preview-core.js'
& $node --check '.\tools\vfx-preview\preview-loader.js'
& $node --check '.\tools\vfx-preview\preview.js'
```

Observed result: 36 tests passed, 0 failed; all three syntax checks exited 0.

## Implementation summary

- `inspectEffect` validates an explicitly supplied layer `durationMs` as a finite positive number.
- `createEffectRecords` continues converting inspection results into per-effect configuration errors, so one invalid duration does not clear other directory entries.
- `buildStageInstances` describes falling and projectile-volley scenes as plain data.
- `instanceProgress`, `sampleSpriteFrame`, and `advanceTimeline` keep instance timing, frame sampling, and lifecycle advancement testable in Node.
- `preview.js` creates and updates DOM sprite nodes per instance.
- Animation ticks pass the real browser delta to the timeline. FPS is used only for sprite sampling; the manual step is FPS-independent.
- The page remains classic-script, DOM-sprite, `file://` compatible, with no modules, Canvas, network, framework, or server.

## Final verification

The final verification command and exact results are recorded after all report edits below.

- Node test discovery: 39 passed, 0 failed, 0 skipped, 0 todo.
- Example manifest validator: `Effect manifest valid: 1 effect(s)`.
- Skill validator: `Skill is valid!`.
- JavaScript syntax checks: all exited 0.
- `git diff --check`: exited 0.

## Commit

Commit subject: `Fix adaptive VFX preview timing and instances`.

The final commit hash is emitted in the handoff after Git creates the commit. A Git commit cannot contain its own content hash because the hash is derived from the report content itself.

## Concerns

- Real `file://` visual browser acceptance was not rerun in this pass, per controller direction. Automated logic, page-contract, validation, and syntax gates pass, but a release environment should still visually confirm falling telegraph retention and five-projectile volley spacing.
- No push was performed.
