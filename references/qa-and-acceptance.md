# QA and acceptance

## Automated checks

Treat combat mechanics as a protected regression surface.

- Validate every resource path and non-empty file.
- Validate sprite dimensions divide by declared frame counts.
- Check syntax for modified runtime modules.
- Test fixed-size travel, parent-attached trails, falling spawn height, locked ground marks, one-shot impact expiry, persistent looping, and source-over compositing.
- Run the complete combat suite and prove damage, collision, targeting, penetration, ticks, buffs, shields, and healing are unchanged.
- Validate configuration export and runtime field consumption.

## Visual capture

Capture each spell at anticipation, early body, mid body, impact, and residue. For persistent effects, also capture the middle of the loop. Disable or separate damage numbers when evaluating silhouette.

## Acceptance checklist

- The gameplay verb is identifiable within the first two body frames.
- The damaging body occupies the intended road or radius.
- Flying and moving effects translate instead of stretch.
- Trails follow the parent and do not remain at an old location.
- Falling effects visibly begin above targets.
- Fixed telegraphs, zones, and impacts use locked-ground snapshots.
- Use a target-foot anchor only when the effect deliberately follows target contact.
- Multi-hit and multi-projectile counts are readable.
- Impact flashes retain element color and do not become solid white.
- One-shot frames disappear instead of freezing.
- Persistent zones animate throughout their mechanical duration.
- Scale and offsets respond to configuration export.
- Health bars and combat units remain readable.

## Test surface

Provide a hidden debug gesture or developer-only route to a panel listing every spell. Activation must reuse the normal cast/runtime path while remaining isolated from the player's formal loadout. Support repeated single-spell playback and pause the battle while selecting an effect.

## Runtime promotion gate

Back up replaced runtime assets before promotion and compare approved-source and runtime hashes. Record hashes for unaffected resources and prove they remain unchanged. Exercise each effect through the GM or developer surface using the normal cast and runtime path. Run automated suites, then inspect representative simulator or device scenarios. Commit promoted assets only after the user accepts the in-game result.

## Completion report

Report changed effects by archetype, asset additions, configuration fields, test commands, pass counts, and remaining device-only visual risks. Do not claim visual completion from unit tests alone; record the device or simulator capture used for the final review.
