---
name: creating-game-combat-vfx
description: Use when a game needs combat spell or skill VFX designed, produced as sprite assets, integrated with runtime motion, exposed through configuration, debugged for visual mismatch, or validated against combat mechanics and art direction.
---

# Creating Game Combat VFX

## Overview

Build readable, distinctive combat effects from visual brief through production integration. Keep gameplay mechanics authoritative and treat animation, anchors, trails, opacity, and impact timing as a separate presentation system.

## Core workflow

1. **Audit context.** Inspect camera angle, battlefield scale, character and enemy anchors, existing effect renderer, configuration source, export tool, tests, and debug entry points. Preserve user changes.
2. **Define spell semantics.** For every effect, record cast origin, target rule, damage shape, motion, impact point, persistence, and gameplay timing. Choose one motion archetype from `references/runtime-integration.md`.
3. **Create a visual design sheet.** Produce a four-stage storyboard: anticipation, travel/build, impact, residue. Establish element palette, value hierarchy, silhouette, scale, and exposure limits. Read `references/visual-design.md`.
4. **Approve the direction once.** Present representative keyframes and acceptance criteria. After approval, produce the complete set without repeated micro-confirmations.
5. **Produce assets.** Use transparent sprite sheets or authored particle textures; do not substitute stretched static art for travel. Follow `references/asset-production.md`.
6. **Integrate presentation actors.** Keep damage, targeting, penetration, and ticks unchanged. Attach trails to moving bodies, separate falling bodies from locked ground anchors, timestamp impact events, and loop persistent ground effects. Read `references/runtime-integration.md` completely before editing runtime code.
7. **Expose tuning.** Add scale and visual offsets to the authoritative configuration source, then export and verify the runtime output. Follow `references/config-and-export.md`.
8. **Add a test surface.** Prefer a hidden GM/debug panel that activates one spell without altering formal loadouts. Make every spell independently replayable.
9. **Validate.** Run syntax, asset, renderer, configuration, export, and combat-mechanics tests. Capture representative frames and apply `references/qa-and-acceptance.md`.

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

- Read `references/visual-design.md` before concept or storyboard work.
- Read `references/asset-production.md` before generating, slicing, or exporting sprite assets.
- Read `references/runtime-integration.md` before changing effect playback code.
- Read `references/config-and-export.md` when spreadsheets, generated tables, or export tools are in scope.
- Read `references/qa-and-acceptance.md` before claiming completion.
- Copy `assets/effect-manifest.example.json` when defining a new effect set, then run `node scripts/validate_effect_manifest.mjs <manifest>`.

## Completion gate

Do not call the effect complete until:

- the intended action is readable without damage numbers;
- moving art is not stretched to represent travel;
- trails remain attached to their moving parent;
- falling bodies visibly enter from above while telegraphs stay on the ground;
- impacts occur at the configured foot/ground anchor and expire once;
- persistent zones animate for their full duration;
- core color remains legible without additive white blowout;
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
