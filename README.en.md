# Creating Game Combat VFX

[简体中文](README.md) | [English](README.en.md)

A reusable Codex Skill for taking game combat effects from visual direction to production-ready integration and acceptance. It captures a complete workflow proven on sword, fire, and water spell families: visual design, sprite-sheet production, semantic playback, configuration export, hidden GM testing, regression tests, and device-level visual review.

## Why this project exists

Combat VFX often fail after otherwise-correct assets are connected to gameplay: projectiles are stretched instead of moved, trails detach from their parent, falling effects appear inside enemies, impacts freeze on their last frame, and bright textures become white blowouts. This Skill treats combat mechanics and presentation as separate systems so those problems can be fixed without changing damage, targeting, collision, penetration, buffs, or timing.

## What this skill covers

- Project-specific visual direction and four-stage storyboards
- Transparent PNG sprite-sheet requirements and exposure control
- Semantic playback archetypes for slashes, projectiles, volleys, moving fronts, falling objects, eruptions, persistent zones, traps, brands, beams, and orbiting shields
- Separate moving body, locked ground anchor, local trail, and timestamped impact state
- Spreadsheet-driven scale, offset, width, radius, and export verification
- Hidden GM/debug access for isolated spell playback
- Automated renderer and combat-mechanics regression tests
- Simulator or device frame capture and final acceptance criteria

## Core workflow

1. Audit the battle camera, anchors, renderer, configuration source, exporter, and test surface.
2. Translate every spell description into gameplay semantics and a visual motion archetype.
3. Design anticipation, travel/build, impact, and residue keyframes over the actual battlefield.
4. Approve one representative effect, then produce the complete family consistently.
5. Export authored sprite sheets with stable pivots, sufficient frames, and controlled alpha.
6. Integrate presentation actors without changing combat mechanics.
7. Expose visual tuning in the authoritative configuration table and verify export results.
8. Replay every spell independently through a hidden GM/debug panel.
9. Run automated regression tests and device-level visual acceptance.

## Repository structure

```text
SKILL.md                              Core agent workflow and completion gate
agents/openai.yaml                    Codex UI metadata and default invocation
references/visual-design.md           Art direction and storyboard rules
references/asset-production.md        Sprite-sheet, alpha, and export standards
references/runtime-integration.md     Motion archetypes and visual-state contracts
references/config-and-export.md       Configuration and table export workflow
references/qa-and-acceptance.md       Automated and visual acceptance criteria
assets/effect-manifest.example.json   Reusable effect manifest template
scripts/validate_effect_manifest.mjs  Deterministic manifest validator
```

## Usage

Install or link this folder in your Codex skills directory, then invoke:

```text
Use $creating-game-combat-vfx to design and integrate this spell effect set.
```

For a new effect set, copy `assets/effect-manifest.example.json`, fill in the effect definitions, and validate it:

```bash
node scripts/validate_effect_manifest.mjs path/to/effect-manifest.json
```

Read the reference file named by `SKILL.md` before performing each production stage. Do not declare completion until automated mechanics tests and final gameplay-scale visual captures both pass.

## Design principle

Keep combat authoritative and presentation replaceable:

- combat actors own targets, collision, damage, penetration, ticks, buffs, and healing;
- visual actors own position, ground anchors, trails, spawn height, scale, and offsets;
- visual events own timestamped impacts, pulses, shatters, and one-shot lifetimes.

This separation is the foundation for effects that look correct without destabilizing gameplay.
