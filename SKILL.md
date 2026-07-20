---
name: creating-game-combat-vfx
description: Use when a game needs combat spell or skill VFX designed, produced as sprite assets, integrated with runtime motion, exposed through configuration, debugged for visual mismatch, or validated against combat mechanics and art direction.
---

# Creating Game Combat VFX

## Overview

Build readable, distinctive combat effects from visual brief through production integration. Keep gameplay mechanics authoritative and treat animation, anchors, trails, opacity, and impact timing as a separate presentation system.

## Request routing

## Execution modes

Keep **standard mode** as the default implementation of the selectable seven-stage workflow. For a complex request, recommend optional **high-fidelity Agent mode** by naming the detected complexity signals, expected consistency and verification benefit, and added review and evidence cost. Recommendation is not activation: start Agent mode only after explicit user confirmation. Declining it or not answering leaves the request in standard mode.

The routing response must explicitly state all three tradeoff items: detected complexity signals, the expected consistency and verification benefit, and the added review and evidence cost. Do not leave the cost implicit in later evidence steps.

Complexity signals include persistent state, multiple mechanical events, mixed anchors, overlapping visual owners, strict per-layer timing, high reference fidelity, or formal promotion and device acceptance. Confirmed Agent mode applies only to the stages the user selected and must not broaden stage scope. It does not replace the seven-stage workflow.

If independent Agents are unavailable after confirmation, report the limitation and offer standard mode or waiting. Do not label single-Agent execution as high-fidelity Agent mode.

For a complete request, assess the project and present the selectable seven stages before beginning work. Mark each stage as already satisfied, recommended, or blocked by a missing dependency; give its one-line output and recommend a selection with a reason.

For a complex partial request, recommend high-fidelity Agent mode and wait for explicit confirmation before starting the selected stages. This confirmation gate takes precedence over direct partial-request entry; keep the recommendation and any confirmed work limited to the requested stages.

For an explicit partial request, enter the matching stage directly. Add only the minimum required dependencies when an input is missing, explain why they are required, and accept an existing design or resource after checking it instead of repeating completed work.

## Selectable stages

1. **Requirements analysis.** Record skill semantics, target scope, project constraints, existing assets, renderer, configuration, tests, and debug entry points.
2. **Visual design.** Define art direction, a four-stage storyboard, and acceptance criteria. Visual design must pause for approval by default.
3. **Asset production.** Produce transparent sprite sequences and layered resources from the approved design, run the source-grid boundary validator before slicing, and create the effect manifest.
4. **Resource preview.** Load the resources through the local previewer, report issues, and record adjustment decisions. Resource preview must pause for approval by default.
5. **Game integration.** Connect approved assets to motion models, anchors, lifecycle events, and authoritative tuning without changing combat mechanics.
6. **Test tooling.** Add independent GM/debug playback and verify configuration export.
7. **Acceptance optimization.** Run visual acceptance and combat regression checks, fix issues, and deliver the final report.

Offer these choice forms: `execute all`, `first N stages`, `specific stages`, and `continue from stage N`. `execute all` still pauses after visual design and resource preview. Skip both approval checkpoints only when the user explicitly requests uninterrupted execution.

Stage 3 requires an approved stage 2 design; stage 4 requires readable resources; stage 5 requires resources that passed preview or were explicitly accepted. Reuse checked prior outputs when continuing from a later stage.

## Stage completion response

After each stage, report the delivered outputs, issues and adjustments, currently available next stages, and direct choices such as revise, approve and continue, or stop. Keep the response centered on decisions rather than internal commands or manifest mechanics.

## Required separation

Maintain these independent layers:

| Layer | Owns |
|---|---|
| Combat actor | targets, collision, damage, penetration, ticks, buffs |
| Visual actor | body position, ground anchor, trail samples, visual spawn height |
| Visual event | timestamped impact, heal, shatter, pulse |
| Configuration | scale, offset, width, radius, resource key |

Never change combat mechanics to compensate for a visual positioning error.

## Resource routing

- Read `references/high-fidelity-agent-mode.md` only after the user confirms high-fidelity Agent mode.
- Read `references/visual-design.md` before concept or storyboard work.
- Read `references/asset-production.md` before generating, slicing, or exporting sprite assets. Run its source-grid boundary validator on every source sheet before slicing.
- Read `references/preview-workflow.md` completely before any resource preview work.
- Read `references/runtime-integration.md` before changing effect playback code.
- Read `references/config-and-export.md` when spreadsheets, generated tables, or export tools are in scope.
- Read `references/qa-and-acceptance.md` before claiming completion.
- When structured tracking is useful, create an effect manifest automatically from `assets/effect-manifest.example.json`, fill it from the approved design, and run `node scripts/validate_effect_manifest.mjs <manifest>`. Fix recoverable validation errors before continuing. Do not ask the user to copy, fill, or validate the manifest.

## Reference-driven production gate

When an approved design, style frame, or target screenshot exists, treat it as the **authoritative visual reference** for stage 3. For every distinct effect:

1. Author an independent full-resolution **material master** from that effect's reference. Do not reshape or recolor another effect's generic master.
2. Author **stage-specific key plates** for anticipation, body variation, impact, and residue using the same reference and accepted material master.
3. Expand animation only from accepted raster plates. Deterministic interpolation may blend, reveal, dissolve, resize, normalize, or assemble those plates; it must not procedurally draw the effect body.
4. Audit alpha, safe margins, palette contamination, white coverage, frame distinctness, and dominant material coverage before export.
5. Produce a **comparison contact sheet** showing design, previous asset when available, and new asset over the same real project background at normalized visible size.

If the reference, master, or comparison fails, keep that effect in stage 3. Do not lower opacity, add bloom, crop the source, or adjust runtime scale to conceal a material or boundary mismatch.

## Completion gate

Do not call the effect complete until:

- the intended action is readable without damage numbers;
- moving art is not stretched to represent travel;
- trails remain attached to their moving parent;
- falling bodies visibly enter from above while telegraphs stay on the ground;
- impacts occur at the configured foot/ground anchor and expire once;
- persistent zones animate for their full duration;
- every source-grid cell has clear safe margin and passes the source-grid boundary validator before slicing;
- core color remains legible without additive white blowout;
- reference-driven assets retain the approved material, palette hierarchy, silhouette, and detail density in the comparison contact sheet;
- every overlapping semantic-layer transition passes the composite continuity gate: registered pivots, valid `origin`/`target`/`moving` anchors, and a crossfade without a second full-opacity silhouette;
- configuration export reports changed tables and runtime values match the source;
- combat regression tests prove mechanics did not change;
- every spell can be replayed independently through the test surface.

## Common mistakes

| Symptom | Correction |
|---|---|
| Side wisps remain in the road | Derive trail position from current body position or recent path samples. |
| Falling sword appears inside a monster | Use separate `visualPosition` and locked `groundPoint`; raise visual spawn height. |
| White ring remains after a hit | Timestamp the impact and render with `holdLast: false`. |
| Different spells feel identical | Replace the generic point timeline with semantic archetypes. |
| Workbook changes do not appear | Confirm the authoritative sheet, exported table, runtime consumer, and `[UPDATED]` result. |
| Effect looks pale | Keep the core near opaque; reserve transparency for smoke, edge glow, and residue. |
| Frame is cut at both sides after slicing | Regenerate the source-grid cell with clean safety margins; never hide a clipped source with runtime scale or atlas padding. |
| A second blade, cross flash, or ripple appears during a transition | Inspect the overlap composite, co-register both plates, crossfade their windows, and ensure impact adds hit information instead of repainting the complete body. |
