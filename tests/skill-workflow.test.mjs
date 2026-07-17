import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skill = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');

test('full requests present a selectable seven-stage workflow', () => {
  for (const phrase of ['seven stages', 'execute all', 'first N stages', 'specific stages', 'continue from stage']) {
    assert.match(skill.toLowerCase(), new RegExp(phrase.toLowerCase()));
  }
});

test('partial requests enter the matching stage directly', () => {
  assert.match(skill, /explicit partial request/i);
  assert.match(skill, /minimum required dependencies/i);
});

test('visual design and preview are approval checkpoints', () => {
  assert.match(skill, /visual design.*pause/i);
  assert.match(skill, /resource preview.*pause/i);
  assert.match(skill, /uninterrupted execution/i);
});
