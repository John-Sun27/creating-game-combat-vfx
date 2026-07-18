# Resource preview workflow

Use this workflow after resources exist and before game integration. The previewer is a local acceptance surface, not a replacement for final in-game validation.

## Directory and manifest

Open `tools/vfx-preview/index.html` directly and select the output directory containing PNG resources and an effect manifest. Prefer `effect-manifest.preview.json`, then `effect-manifest.json`, then another compatible JSON file. Resource paths resolve relative to the selected directory.

Make the project's build or export pipeline emit `effect-manifest.preview.json` beside the runtime PNG resources. Generate it from the same authoritative effect definitions used by the runtime; never require the user to copy or maintain a second configuration manually.

Reuse the structure from `assets/effect-manifest.example.json`. Preserve each effect's `visualArchetype`, frames, scale, and offsets so preview and runtime consume the same intent. Single-frame telegraph and residue support layers are valid; body animation must satisfy its archetype minimum and impact must contain at least four frames.

Treat the manifest preview profile as the project default. Resolve display settings in this order: generic fallback, archetype profile, manifest profile, then temporary user overrides. A user override changes only browser state and must never write back to the manifest or PNG resources.

## Rendering and motion

Render PNG sprite layers as DOM elements with CSS backgrounds and transforms. Do not draw effects programmatically on Canvas. Play the complete telegraph, body, impact, and residue lifecycle.

Map archetypes to motion as follows:

| Archetype | Preview motion |
|---|---|
| `close-range-slash` | anchored slash sequence; the arc is already painted into the sprite frames |
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

When `preview.layers` exists, use its normalized start/end windows, anchors, optional display sizes, and opacity curves so telegraph, body, impact, and residue can overlap like the runtime. The layer anchor vocabulary is exactly `origin`, `target`, and `moving`; reject aliases such as `caster` or `ground` instead of silently centering them. Express transition opacity with normalized `fadeIn` and `fadeOut` fractions. Adjacent overlapping windows must crossfade rather than remain at full opacity together. When configured choreography is absent, retain the compatible four-stage lifecycle. The display-mode, direction, custom-angle, and distance controls are temporary inspection tools; reset them when switching effects or when the user selects the project default.

Run the **composite continuity gate** in runtime mode. For each overlap, capture an overlap contact sheet at its start, midpoint, and end on the project background. Confirm that active plates share the intended pivot and contact point, and that body-to-impact reads as one action without a duplicate inner blade, cross flash, detached ripple, or abrupt scale jump. Display the active layer names and effective opacity while diagnosing an overlap.

## Controls and resource checks

Verify play, pause, restart, single-frame step, FPS, scale, X/Y offsets, loop behavior, background selection, and effect switching. Check for a missing or invalid manifest, incomplete fields, missing PNGs, insufficient frames for the archetype, sprite-strip width not divisible by frame count, missing alpha, unknown archetypes, and lifecycle failures.

Block only the effect with an error. Keep other valid effects available, and report the resource name, cause, and a suggested correction for every issue.

## Preview decision

Summarize resource checks and visual findings, then remind the user that final acceptance requires in-game validation and pause for one of three choices:

- `adjust assets`: return to stage 3 and preserve the issue list;
- `approve and enter game integration`: continue to stage 5;
- `stop for now`: preserve current stage state for a later continuation.
