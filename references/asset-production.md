# Asset production

## Reference-driven production

Use this path whenever an approved concept sheet, style frame, screenshot, or prior visual target exists.

### 1. Lock the reference contract

- Assign one **authoritative visual reference** to each effect and identify its dominant material, silhouette, palette hierarchy, edge treatment, brightest allowed area, and gameplay-scale detail density.
- Treat a previous effect only as a quality bar. Never use one shared material master to manufacture visually different spells by recoloring, warping, or adding generic glow.

### 2. Author raster source plates

- Create one full-resolution **material master** per effect with the complete peak silhouette and generous clean padding.
- Create **stage-specific key plates** for anticipation, body variation, impact, and residue from that effect's reference plus its accepted master.
- Keep source plates as authored raster content. Deterministic interpolation may blend accepted plates, reveal alpha, dissolve pixels, resize whole content, stabilize pivots, and assemble strips. It must not procedurally draw the effect body, invent a generic substitute, or stretch one frame to represent motion.
- Preserve chroma originals and normalized RGBA plates so regeneration remains auditable.

### 3. Audit before expansion

Regenerate audit data from the current source plates for every acceptance run. An audit-only measurement may preserve accepted PNG bytes, but its report must identify the measured input and cannot reuse stale JSON.

Measure each plate and derived frame, using project-specific thresholds when available:

- alpha and non-empty visible bounds;
- safe margin along both axes;
- palette contamination outside the approved color family;
- near-white or white coverage, with a stricter body limit than impact;
- minimum dominant-material and colored-midtone coverage;
- distinct frame bytes and stable visible pivot.

Reject the source rather than hiding a failure with reduced opacity, bloom, runtime scale, atlas padding, or extra cropping.

## Evidence provenance

Generate every acceptance artifact with a recorded tool or command so another reviewer can reproduce it. For audits and contact sheets, record identified or hashed authoritative inputs and manifests alongside the generated output. Static hand-authored reports are supplemental only and must not be the sole evidence for acceptance.

### 4. Compare on the project stage

Slice old assets with their own manifest and new assets with the new manifest; never apply a new frame count to an old sheet. Use the actual project background. Build overlap sheets from manifest display size, anchor, pivot, timing window, and opacity curve for telegraph/body, body/impact, and impact/residue contacts.

Create a **comparison contact sheet** with columns for the approved design, previous runtime asset when available, and the new asset. Use the same actual project background and normalize by visible alpha bounds so transparent canvas size cannot make one version appear artificially smaller. Compare material, color hierarchy, silhouette, edge cleanliness, detail density, and exposure before preview approval.

### 5. Pass the composite continuity gate

Create an **overlap contact sheet** for every adjacent pair that shares runtime time: telegraph/body, body/impact, and impact/residue. Sample the start, midpoint, and end of each overlap using the actual display size, anchor, pivot, opacity curve, and project background.

- Co-register plates that describe one continuous action. Their visible pivot, direction, scale, and contact point must agree before blending.
- Crossfade overlapping semantic layers. Do not render two complete silhouettes at full opacity through the same transition.
- Make impact add contact, debris, compression, or a restrained glint; impact must not repaint the complete body while the body is still visible.
- Reject a transition that produces a second blade, inner crescent, cross flash, detached ripple, or sudden scale jump even when every isolated strip looks correct.
- Repair timing, anchor, registration, and opacity before repainting accepted raster plates. Re-author only the duplicated local plate if the artifact remains after the composite contract is correct.

## Sprite sheet contract

- Export transparent PNG sprite sheets with consistent cell dimensions.
- Use 4 or more frames for intros and impacts, 6 or more for moving bodies, and 8 or more for persistent loops.
- Keep the visual pivot stable across frames.
- Remove excess transparent bounds; record the intended anchor separately.
- Order frames left to right unless the runtime explicitly supports another layout.
- Name files `<effect>_<layer>.png` with layers such as `telegraph`, `body`, `impact`, and `residue`.

## Source-grid safe margins (mandatory)

Treat each source-grid cell as its own finished frame before slicing. Keep every meaningful pixel inside that cell: core, glow, trail, smoke, debris, and motion blur all count as visible content.

- Reserve a clean chroma or transparent margin of at least **12%** on every side of every cell.
- Reserve **18% along the travel axis** for long slashes, beams, projectile bodies, or falling bodies that can extend rapidly toward a cell edge.
- Do not let one frame borrow empty space from a neighboring cell. Remove visible grid lines and do not rely on later crop insets, atlas padding, runtime scaling, or opacity to conceal a clipped source.
- Run the boundary audit on every source sheet, including single-frame layers (`--columns 1 --frames 1`):

```bash
python scripts/validate_sprite_source_grid.py --input path/to/source-grid.png --frames 8 --columns 4 --rows 2
```

The validator rejects continuous foreground that enters the declared margin while tolerating an isolated speck. If it fails, regenerate the source grid or expand the individual cell and run it again. Do not slice, preview, export, or integrate a failed source sheet.

## Alpha and exposure

- Store colored information in the texture; do not rely on additive blending to create color.
- Keep the core readable with normal source-over compositing.
- Restrict additive blending to small glints when the project renderer supports it safely.
- Inspect textures over light, midtone, and dark backgrounds.
- Avoid broad near-white areas because mobile compositing turns them into overexposed blocks.

## Motion requirements

- A flying object needs multiple internal frames or a stable body plus an animated trail.
- Never create travel by increasing a sprite's height each frame.
- A falling object needs a readable silhouette, downward orientation, fixed ground marker, and impact transition.
- A persistent ground zone needs a seamless loop and a non-static outro.
- A moving front such as tide or tornado needs a body plus a short follower trail, not a full-road residue strip.

## Export inspection

Check dimensions, frame divisibility, alpha channel, empty frames, pivot drift, color density, final draw size, source-grid safe margins, and the overlap contact sheet. Reject sheets whose motion is only one visible frame when the effect is expected to fly, fall, rotate, pulse, or persist. Block a source sheet that fails `validate_sprite_source_grid.py` or the composite continuity gate before it reaches integration.
