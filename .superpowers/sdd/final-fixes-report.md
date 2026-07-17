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

## Follow-up final review correction

The earlier follow-up assertion that prohibited an FPS-derived manual step was incorrect and is superseded by this section. Automatic playback and manual frame stepping have distinct contracts:

- Automatic playback advances with the real `requestAnimationFrame` delta and does not scale lifecycle time by FPS.
- Manual single-frame playback advances exactly `1000 / currentFPS` milliseconds so one click represents one sampling interval.

### Follow-up RED

Command:

```powershell
$node='C:\Users\soult\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test '.\tests\preview-core.test.mjs' '.\tests\preview-page.test.mjs'
```

Observed result: 39 tests, 34 passed, 5 failed. Expected failures showed that `stepTimeline` and `resetTimeline` did not yet exist and `preview.js` did not consume them:

1. `single-frame stepping advances exactly one current-FPS interval`
2. `single-frame stepping crosses a stage boundary without losing elapsed time`
3. `timeline reset supports stopped selection and playing replay semantics`
4. `runtime renders archetype instances and advances the lifecycle with real delta`
5. `effect selection and restart both reset timeline state through the core`

The new state tests for non-looping completion, complete lifecycle looping, persistent-body loop/exit behavior, and large deltas already passed against the existing `advanceTimeline` implementation.

### Follow-up GREEN

The same focused command then passed 39 tests with 0 failures after:

- adding pure `stepTimeline(timeline, lifecycle, fps, loopEnabled)`;
- adding pure `resetTimeline(timeline, playing)`;
- routing the step button through the selected FPS;
- routing effect selection and restart through the shared reset semantics;
- preserving automatic `advance(delta)` with the real animation delta.

### Expanded state coverage

- FPS values `1`, `12`, `24`, and `60` each advance one exact `1000 / fps` sampling interval.
- A single step can cross a lifecycle stage without losing remainder time.
- Non-looping playback clamps at the final residue duration and stops.
- A complete non-persistent lifecycle loops back through telegraph correctly.
- A persistent body loops in place only when looping is enabled, and advances to impact when disabled.
- A delta spanning 1000 complete cycles preserves the correct remainder.
- Stopped selection and playing replay resets both return to stage 0 at 0 milliseconds.
- Static runtime coverage proves both effect switching and restart use the pure reset path.

### Follow-up final verification

- Node test discovery: 47 passed, 0 failed, 0 skipped, 0 todo.
- Example manifest validator, Skill validator, all JavaScript syntax checks, and `git diff --check` are rerun after this report edit and before commit.

### Follow-up concern

Real `file://` visual browser acceptance remains outside this pass; no push is performed.
