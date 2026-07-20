# High-fidelity Agent mode

## Entry contract

Enter only after explicit user confirmation. Retain the user's selected stages and all normal visual-design, preview, and in-game approval gates.

## Event graph

Translate the current mechanic contract into nodes for its authoritative mechanical events: cast, spawn, travel, collision, tick, refresh, expire, death, counter, and chain when present. Record ordering, ownership transfer, cancellation, and same-update priority on edges. Include only events used by the current skill. The graph must not inherit timing, anchor, scale, frame, damage, or transition values from a named skill.

## Agent task packet

Create one bounded production unit for one event node or one explicit transition. Its packet contains: mechanical event, visual intent, approved references, archetype, owner, anchors, layers, lifetime, frame contract, allowed files, invariants, expected evidence, and verification commands.

## Production and review loop

1. Assign a production Agent for the selected visual-design, asset-production, runtime-integration, or acceptance-correction stage.
2. Assign a different independent review Agent to inspect the packet, artifacts, diffs, tests, visual reports, and scope.
3. Classify findings as Critical, Important, or Minor.
4. Return Critical and Important findings to the same production unit without changing its mechanic contract.
5. Repeat independent review and advance only when no Critical or Important finding remains.

## Archetype composition

Compose only the required attached status, persistent ground zone, projectile or volley, moving front, falling strike, staged ground eruption, trap, shield or orbit, and death-triggered or chain archetypes. Treat Zhuque Brand as a worked instance combining attached status, tick pulse, expiry fade, and death chain. Derive timing, anchor, scale, frame, damage, ownership, and draw order from the current mechanic contract and approved design.

## Evidence and gates

Attach test output, audits, comparison and overlap sheets, runtime diffs, and representative captures required by the selected stage. Preserve standard user approval gates. Do not broaden the selected stage scope.
