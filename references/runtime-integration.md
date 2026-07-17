# Runtime integration

## Motion archetypes

| Archetype | Presentation behavior |
|---|---|
| `close-range-slash` | Center on the caster or a fixed forward offset; stage arcs rather than move a projectile. |
| `projectile` | Move a fixed-size body from origin to target; attach a short trail. |
| `projectile-volley` | Create independent children with launch delays and shared hit memory when required. |
| `moving-front` | Move a fixed-size wave, tornado, or giant sword; keep residue close behind it. |
| `falling` | Interpolate a visual body from a high spawn point to a locked ground anchor. |
| `ground-eruption` | Lock nodes to the ground and grow animated columns upward with staggered local ages. |
| `persistent-zone` | Lock to the ground, loop body frames, timestamp each tick pulse, dissolve on exit. |
| `trap` | Plant, arm, trigger, impact, then residue; keep these phases ordered. |
| `target-brand` | Form a mark above the target and descend or stamp it onto the ground. |
| `target-beam` | Elevate the source glyph and connect it to a locked ground impact. |
| `shield-orbit` | Follow the owner and launch a separate moving counter actor when consumed. |

## Visual state contract

Expose presentation data without changing mechanical state:

```js
{
  position: { x, y },
  previousPosition: { x, y },
  targetPoint: { x, y },
  children: [{ visualPosition, groundPoint, impactDone }],
  visualImpacts: [{ x, y, bornAtMs, index }]
}
```

Use `groundPoint` for telegraphs, impact art, and persistent zones. Use `visualPosition` for a flying or falling body. Calculate a trail from the current body and prior samples; never from the global road midpoint.

## Impact lifetime

Record an occurrence timestamp with every impact. Compute `ageMs = now - bornAtMs`, stop drawing after the approved duration, and set one-shot sheets to `holdLast: false`. Do not repeatedly draw an accumulated array of plain coordinates.

## Anchors

- Resolve monster hit effects to the visible foot anchor.
- Use `anchorY` near `0.8-1.0` for ground eruptions and falling weapons whose tip meets the ground.
- Keep telegraphs locked even when the target actor animates vertically.
- Treat scale and offset as presentation-only configuration.

## Safe integration order

Add a failing renderer-state test, expose the smallest visual metadata from the combat actor, update the renderer, run visual tests, then run the entire mechanics suite. Never alter damage timing to make a sprite arrive at the desired frame; alter only the visual interpolation.
