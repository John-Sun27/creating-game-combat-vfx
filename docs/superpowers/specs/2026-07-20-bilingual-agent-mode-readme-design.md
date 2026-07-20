# Bilingual Agent Mode README and Git Publish Design

## Goal

Update the Chinese-first repository introduction and its English mirror so both explain the optional high-fidelity Agent workflow introduced by the current Skill, then publish the accumulated Skill and previewer work to GitHub.

## Documentation changes

Add a matching section after the seven-stage workflow in `README.md` and `README.en.md` that states:

- the existing standard seven-stage workflow remains the default;
- complex requests may receive a high-fidelity Agent mode recommendation with concrete complexity signals, benefit, and added review cost;
- Agent mode starts only after explicit user confirmation and never broadens selected stages;
- confirmed Agent work decomposes current mechanics into an event graph and bounded task packets, with a production Agent and independent review Agent;
- Zhuque Brand is an ordinary worked composition rather than a special or universal template.

Add `references/high-fidelity-agent-mode.md` to both repository-structure listings with equivalent Chinese and English descriptions.

## Commit and publish scope

Create separate commits for:

1. the existing previewer moving-anchor correction and its regression tests;
2. the synchronized Chinese and English repository descriptions.

Preserve the current 13 local Skill-design and implementation commits. Push the resulting `main` history to `origin/main`. Do not stage unrelated files or manufacture a README change where the working-tree bytes already match `HEAD`.

## Validation

- Verify both READMEs contain the same Agent-mode guarantees and reference entry.
- Run the complete Node test suite.
- Validate the example effect manifest and Skill structure.
- Confirm the local branch and remote branch point to the pushed commit.
