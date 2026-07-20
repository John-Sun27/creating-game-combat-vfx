# High-Fidelity Agent Mode Design

## Goal

Extend `creating-game-combat-vfx` with an optional high-fidelity workflow for complex combat effects. The Skill recommends this mode when complexity signals are present, explains the trade-off, and starts it only after the user confirms.

The existing seven selectable stages remain authoritative. The new mode changes execution and review rigor, not the user's ability to run all stages, the first N stages, selected stages, or continue from a later stage.

## Mode selection

### Standard mode

Use for simple one-shot effects, single-layer replacements, established project archetypes, and low-risk tuning where independent review would add little value.

### High-fidelity Agent mode

Recommend when one or more strong complexity signals exist:

- persistent Buff, zone, trap, orbit, or other long-lived state;
- multiple mechanical events such as apply, tick, expire, kill, counter, chain, or penetration;
- different body, target-center, foot, ground, moving, or sky anchors;
- overlapping semantic layers or more than one visual owner;
- per-layer frame timing, crossfades, or strict reference matching;
- formal runtime promotion, rollback, or device acceptance requirements.

Weak signals may be combined, but the Skill must state why the task is considered complex. Recommendation is not activation. Wait for explicit user confirmation before dispatching the high-fidelity workflow.

The recommendation must name the detected signals, the expected benefit (higher mechanic-to-visual consistency and independent verification), and the cost (more review cycles and evidence artifacts). It must then offer a direct choice between standard mode and high-fidelity Agent mode without changing the stages already selected by the user.

## Agent review loop

High-fidelity mode applies to whichever stages the user selected.

First convert the selected skill mechanics into an event graph. Each node is an authoritative mechanical event such as cast, spawn, travel, collision, tick, refresh, expire, death, counter, or chain. Each edge records ordering, ownership transfer, cancellation, or same-update priority. Build production units from event nodes and their required visual layers instead of copying a previous skill's timeline.

For each production unit:

1. Create an Agent task packet containing the mechanical event, visual intent, approved references, archetype, owner, anchors, layers, lifetime, frame contract, allowed files, invariants, expected evidence, and verification commands.
2. Assign a production Agent for the selected stage: visual design, asset production, runtime integration, or acceptance correction.
3. Assign an independent review Agent to inspect the task packet, artifacts, diffs, tests, visual reports, and scope.
4. Classify findings as Critical, Important, or Minor.
5. Return Critical and Important findings to the same production unit for correction, then repeat independent review using the unchanged mechanic contract.
6. Advance only when no Critical or Important finding remains.

The review loop must preserve user approval gates after visual design, resource preview, and final in-game acceptance. It must not silently broaden the selected stages.

Agent roles are reusable capabilities, not fixed team members. A simple selected stage may need one production Agent and one review Agent. A multi-event skill may create several bounded production units, but each unit must remain traceable to one event-graph node or one explicit transition between nodes.

## General mechanic-visual contract

Before production or integration, describe every relevant event with:

| Field | Meaning |
|---|---|
| Mechanical event | apply, travel, collision, tick, expire, death, counter, or another authoritative event |
| Visual owner | cast actor, moving child, Buff, world event, or attached state |
| Visual layers | telegraph, body, impact, residue, pulse, fade, or project-specific layers |
| Anchor | caster body, target body, target foot, locked ground point, moving position, or sky spawn |
| Lifetime | start, end, loop rule, fade rule, and one-shot expiry |
| Frame contract | frames, per-layer FPS, terminal-frame reachability, and hold behavior |
| Draw order | below units, attached to unit, above unit, or below health/UI layers |
| Exit priority | behavior when expiry, hit, death, refresh, or escape occur in the same update |

Use one visual owner for each complete silhouette at a given time. Treat attached bodies, tick pulses, expiry fades, and death events as independent visual lifecycles when their mechanical lifetimes differ.

Validate that each non-looping layer reaches its intended final frame inside its approved lifetime. Validate semantic handoffs at the exact boundary so two complete high-opacity silhouettes do not overlap.

## Reusable archetype templates

Apply only the templates required by the effect:

- attached status;
- persistent ground zone;
- projectile or penetrating volley;
- moving front;
- falling or sky strike;
- staged ground eruption;
- trap;
- shield or orbit;
- death-triggered or chained event.

Templates define questions and invariants, not fixed timings, anchors, frame counts, or art.

## Mechanism-driven composition example

Compose a complex effect from reusable event and archetype contracts. For example, a persistent mark that deals periodic damage and explodes on death becomes:

1. an apply event using an attached-status archetype;
2. a tick event using a short pulse lifecycle;
3. a natural-expiry event using an attached fade lifecycle;
4. a death event using a ground or target-centered one-shot archetype;
5. an optional chain event owned by a separate world event.

This decomposition is the reusable Agent production scheme. The production and review Agents derive anchors, timing, frame counts, draw order, and transitions from the current mechanic contract and approved visual design. They do not inherit those values from the example.

Zhuque Brand may be documented as one successful instance of this composition, but it has no special workflow. Its monster-center application, body attachment, foot-centered death explosion, timings, frame counts, and damage rules remain project-specific evidence rather than defaults.

## Reproducible asset and preview evidence

High-fidelity stage 3 and 4 work must generate evidence from authoritative tools:

- source and derived-frame safe-margin, alpha, exposure, palette, distinctness, and pivot audits;
- comparison sheets using actual project backgrounds and normalized visible bounds;
- overlap sheets using manifest display sizes, anchors, timing windows, and opacity curves;
- old assets sliced from their own manifest rather than the new frame contract;
- audit data regenerated or measured from current source plates without silently rewriting accepted art.

Static hand-authored reports may supplement inspection but cannot be the only acceptance evidence.

## Runtime and release gates

- Add a failing behavior or renderer test before each runtime correction.
- Keep mechanics authoritative; repair presentation metadata and interpolation for visual defects.
- Prove unaffected effects and resources remain unchanged.
- Back up replaced runtime assets before promotion and verify approved/runtime hashes.
- Exercise the normal runtime path through the GM or developer test surface.
- Run automated suites, then inspect representative simulator or device scenarios.
- Commit the promoted release only after the user accepts the in-game result.

## Skill file changes

- Update `SKILL.md` with mode routing, complexity detection, user confirmation, and reference routing.
- Add `references/high-fidelity-agent-mode.md` with event-graph decomposition, reusable Agent task packets, the production/review loop, and the evidence contract.
- Update `references/runtime-integration.md` with the general mechanic-visual contract and timing/anchor rules.
- Update `references/asset-production.md` with reproducible report and manifest-specific comparison rules.
- Update `references/qa-and-acceptance.md` with rollback, hash protection, device scenarios, and post-acceptance commit gate.
- Extend `tests/skill-workflow.test.mjs` to lock the new behavior without changing unrelated preview behavior.

## Acceptance criteria

- Complex requests cause a recommendation with reasons, costs, and benefits.
- High-fidelity mode never starts before user confirmation.
- Simple or explicitly partial requests remain lightweight.
- Confirmed mode can execute only selected stages.
- Critical and Important review findings block advancement until re-reviewed.
- The Agent workflow starts from the current skill's event graph rather than a named skill template.
- Persistent marks, projectiles, ground zones, falling attacks, shields, and chain events can use the same task-packet and review structure.
- Zhuque remains an ordinary worked instance of mechanism-driven composition, not a special workflow or a universal source of values.
- General contracts cover anchors, visual ownership, independent lifecycles, per-layer FPS, same-update priority, reproducible evidence, rollback, and final device acceptance.
- Existing repository changes outside this design remain untouched.
