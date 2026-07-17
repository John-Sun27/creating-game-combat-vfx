# Asset production

## Sprite sheet contract

- Export transparent PNG sprite sheets with consistent cell dimensions.
- Use 4 or more frames for intros and impacts, 6 or more for moving bodies, and 8 or more for persistent loops.
- Keep the visual pivot stable across frames.
- Remove excess transparent bounds; record the intended anchor separately.
- Order frames left to right unless the runtime explicitly supports another layout.
- Name files `<effect>_<layer>.png` with layers such as `telegraph`, `body`, `impact`, and `residue`.

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

Check dimensions, frame divisibility, alpha channel, empty frames, pivot drift, color density, and final draw size. Reject sheets whose motion is only one visible frame when the effect is expected to fly, fall, rotate, pulse, or persist.
