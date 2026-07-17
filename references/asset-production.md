# Asset production

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

Check dimensions, frame divisibility, alpha channel, empty frames, pivot drift, color density, final draw size, and source-grid safe margins. Reject sheets whose motion is only one visible frame when the effect is expected to fly, fall, rotate, pulse, or persist. Block a source sheet that fails `validate_sprite_source_grid.py` before it reaches slicing or preview.
