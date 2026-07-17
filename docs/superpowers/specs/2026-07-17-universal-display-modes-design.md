# Universal VFX Preview Display Modes

## Goal

Make the local previewer useful across portrait lane, landscape, top-down, and stationary-effect projects while keeping each project's game-like presentation as the default.

The previewer must separate sprite-sheet animation from world-space motion. A sprite can animate in place, travel in any direction, advance as a front, fall, persist on the ground, or orbit. Selecting a motion must never rewrite game data unless the user explicitly exports an override.

## User experience

Add a `Display` section to the playback panel.

1. `Display mode`
   - `Project default` (default): use the selected effect's manifest profile.
   - `Asset in place`: keep every resource at its anchor and inspect frames only.
   - `Projectile`: move a fixed-size body from origin to target.
   - `Moving front`: advance a wave or lane body without stretching it.
   - `Falling`: descend from above to a fixed ground target.
   - `Persistent ground`: keep the body anchored and loop it.
   - `Orbit`: move the body around an owner anchor.
2. `Direction`
   - top to bottom, bottom to top, left to right, right to left, or custom angle.
3. `Travel distance`
   - adjust the origin-to-target distance without changing sprite scale.
4. Existing scale and X/Y controls remain visual-only overrides.
5. `Reset display` restores the manifest profile.

Changing controls updates the current preview immediately and does not edit the selected directory. A future explicit export action may write an override; it is outside this change.

## Architecture

### 1. Normalized preview profile

Each effect resolves to one profile before rendering:

```json
{
  "displayMode": "projectile",
  "directionDeg": 90,
  "distance": 340,
  "durationMs": 680,
  "originAnchor": "caster",
  "targetAnchor": "ground",
  "motion": "out-and-back"
}
```

The resolver combines values in this order:

1. safe built-in defaults;
2. archetype fallback;
3. optional `effect.preview` manifest data;
4. temporary user overrides.

The manifest field is optional so existing manifests continue to load.

### 2. Motion engine

Move world-space calculations from the page runtime into pure preview-core functions. The engine returns position, rotation, and scale for normalized progress. Sprite frame selection remains independent.

Supported motions:

- `static`;
- `travel`;
- `out-and-back`;
- `volley`;
- `front`;
- `fall`;
- `zone`;
- `orbit`.

Direction is a vector derived from `directionDeg`; no motion type contains a hard-coded horizontal or vertical axis. Moving fronts change position, not source-image dimensions.

### 3. Project parity data

The game's VFX build/export pipeline emits `effect.preview` from the same authoritative runtime presets that define life, placement, size, and motion. For this project:

- caster-to-road effects default to top-to-bottom;
- `sword_guiding_vein` uses out-and-back travel;
- `sword_lane_sunder`, fire tornado, and ink tide use a vertical moving front;
- balance array and celestial core use falling;
- close-range sword sheets remain anchored;
- persistent zones, traps, brands, beams, and guards remain target- or owner-anchored.

Optional layer choreography may specify start/end fractions, display size, and anchor per semantic layer. When absent, the previewer uses its existing four-stage lifecycle. This improves project parity without making the universal previewer import project source code.

### 4. Stage coordinate model

The stage exposes logical caster, center, and ground anchors. Project-default mode uses manifest anchors. Manual direction mode rotates the origin-target vector around the stage center and clamps both endpoints inside the visible stage. The DOM renderer continues to use PNG sprite sheets and CSS transforms; no procedural Canvas effect drawing is introduced.

## Data flow

1. Load manifest and PNG headers.
2. Validate optional preview fields independently from required effect fields.
3. Resolve a normalized profile.
4. Populate controls from the resolved profile.
5. Convert timeline progress plus profile into a world-space pose.
6. Sample the sprite frame independently.
7. Render the layer with the combined pose, frame, scale, and offsets.
8. On effect switch, discard temporary overrides and resolve the new effect profile.

## Compatibility and errors

- Old manifests remain valid and receive archetype fallbacks.
- Unknown display modes or invalid numeric values isolate only the affected effect and show a correction message.
- Manual controls never mutate loaded files.
- `Asset in place` is always available as a recovery and inspection mode.
- The previewer communicates that it validates resources and choreography; final pixel-level acceptance remains in the game because DOM and game Canvas compositing can differ.

## Testing

Automated tests must cover:

- vertical, horizontal, reverse, and custom-angle travel;
- moving fronts retaining fixed sprite dimensions;
- out-and-back reaching the target and returning;
- static, falling, persistent, and orbit profiles;
- manifest profile resolution and user-override precedence;
- legacy manifests without `preview`;
- effect switching and reset clearing temporary overrides;
- project manifest defaults for all 18 sword, fire, and water effects;
- page controls and non-Canvas rendering;
- full existing previewer regression suite.

Manual acceptance checks compare representative effects in preview and game: returning edge, guiding vein, lane sunder, ember cast, celestial core, frozen domain, and ink sea tide.

## Out of scope

- Editing gameplay mechanics or damage timing;
- writing overrides back to source files;
- guaranteeing pixel-identical blending across DOM and game Canvas;
- replacing final in-game visual validation.
