# Resource preview workflow

Use this workflow after resources exist and before game integration. The previewer is a local acceptance surface, not a replacement for final in-game validation.

## Directory and manifest

Open `tools/vfx-preview/index.html` directly and select the output directory containing PNG resources and an effect manifest. Prefer `effect-manifest.preview.json`, then `effect-manifest.json`, then another compatible JSON file. Resource paths resolve relative to the selected directory.

Reuse the structure from `assets/effect-manifest.example.json`; do not create a second business configuration. Preserve each effect's `visualArchetype`, frames, scale, and offsets so preview and runtime consume the same intent.

## Rendering and motion

Render PNG sprite layers as DOM elements with CSS backgrounds and transforms. Do not draw effects programmatically on Canvas. Play the complete telegraph, body, impact, and residue lifecycle.

Map archetypes to motion as follows:

| Archetype | Preview motion |
|---|---|
| `close-range-slash` | staged arc |
| `projectile` | fixed-size travel with attached trail |
| `projectile-volley` | staggered multi-projectile travel |
| `moving-front` | advancing wave or lane front |
| `falling` | body descends from above while telegraph stays grounded |
| `ground-eruption` | grounded upward burst |
| `persistent-zone` | loop body until exit |
| `trap` | armed ground loop |
| `target-brand` | target-locked loop |
| `target-beam` | target-locked beam loop |
| `shield-orbit` | orbit around the protected actor |

## Controls and resource checks

Verify play, pause, restart, single-frame step, FPS, scale, X/Y offsets, loop behavior, background selection, and effect switching. Check for a missing or invalid manifest, incomplete fields, missing PNGs, insufficient frames for the archetype, sprite-strip width not divisible by frame count, missing alpha, unknown archetypes, and lifecycle failures.

Block only the effect with an error. Keep other valid effects available, and report the resource name, cause, and a suggested correction for every issue.

## Preview decision

Summarize resource checks and visual findings, then pause for one of three choices:

- `adjust assets`: return to stage 3 and preserve the issue list;
- `approve and enter game integration`: continue to stage 5;
- `stop for now`: preserve current stage state for a later continuation.
