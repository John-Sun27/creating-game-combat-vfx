# Configuration and export

## Authoritative fields

Store presentation tuning in the authoritative effect table rather than hard-coded call sites. Recommended fields:

| Field | Meaning |
|---|---|
| `EffectAssetKey` | Stable runtime key |
| `Scale` | Uniform visual scale |
| `OffsetX`, `OffsetY` | Presentation-only offset |
| `Width`, `Radius` | Draw coverage, separate from damage radius when needed |
| `VisualArchetype` | Runtime playback model |
| `SpawnHeight` | Visual-only falling height |
| `TrailLength` | Local follower distance |

Keep gameplay radius, duration, damage, target count, and penetration in their existing mechanical tables.

## Export workflow

1. Identify the workbook and exact sheet that the exporter reads.
2. Save the workbook and close processes that may hold stale content.
3. Export to a temporary representation first.
4. Compare normalized table content with the current runtime output.
5. Replace the runtime file only after parsing and validation succeed.
6. Print `[UPDATED] <TableName>` for changed successful exports and `[NO CHANGE] <TableName>` otherwise.
7. Print row counts and the exact output path.
8. Fail with a non-zero exit code when parsing, schema validation, or output verification fails.

## Debugging stale values

Trace the full chain: workbook path → sheet name → header mapping → exporter input → generated runtime table → effect preset lookup → renderer field consumption. An `[UPDATED]` message proves only that output changed; a runtime assertion must prove the changed field is actually consumed.
