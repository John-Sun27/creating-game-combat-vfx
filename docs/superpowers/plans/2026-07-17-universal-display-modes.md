# Universal VFX Display Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project-driven and user-overridable display modes so sprite resources preview correctly in portrait, landscape, stationary, falling, persistent, and orbiting games.

**Architecture:** Resolve every effect into a normalized preview profile, then calculate world-space pose independently from sprite-frame sampling. Project manifests supply defaults from runtime presets; temporary UI overrides take precedence without changing files. Existing manifests continue through archetype fallbacks.

**Tech Stack:** Browser-native HTML/CSS/JavaScript, Node.js test runner, Python manifest generator, Pillow asset audit.

## Global Constraints

- Keep PNG effects rendered as DOM sprite layers; do not introduce procedural Canvas drawing.
- Do not mutate selected local files from preview controls.
- Preserve support for manifests without an `effect.preview` object.
- Keep sprite dimensions fixed during travel and moving-front motion.
- Treat final in-game capture as the pixel-level acceptance surface.

---

### Task 1: Normalized profile and direction-independent motion engine

**Files:**
- Modify: `tools/vfx-preview/preview-core.js`
- Test: `tests/preview-core.test.mjs`

**Interfaces:**
- Produces: `resolvePreviewProfile(effect, overrides = {}) -> PreviewProfile`
- Produces: `motionPose(profile, progress, instanceIndex = 0) -> { x, y, rotationDeg, scaleX, scaleY }`
- `PreviewProfile`: `{ displayMode, motion, directionDeg, distance, durationMs, originAnchor, targetAnchor }`

- [ ] **Step 1: Write failing profile-resolution tests**

```js
test('preview profile precedence is defaults then archetype then manifest then user override', () => {
  const configured = {
    ...effect,
    visualArchetype: 'projectile',
    preview: { directionDeg: 90, distance: 300, durationMs: 680 },
  };
  assert.deepEqual(resolvePreviewProfile(configured, { directionDeg: 180 }).directionDeg, 180);
  assert.equal(resolvePreviewProfile(configured).displayMode, 'projectile');
  assert.equal(resolvePreviewProfile(configured).distance, 300);
});

test('legacy effects resolve through archetype fallback', () => {
  assert.equal(resolvePreviewProfile({ ...effect, visualArchetype: 'falling' }).displayMode, 'falling');
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test tests/preview-core.test.mjs`

Expected: FAIL because `resolvePreviewProfile` is not exported.

- [ ] **Step 3: Implement profile resolution**

```js
const ARCHETYPE_PROFILES = {
  'close-range-slash': { displayMode: 'in-place', motion: 'static' },
  projectile: { displayMode: 'projectile', motion: 'travel' },
  'projectile-volley': { displayMode: 'projectile', motion: 'volley' },
  'moving-front': { displayMode: 'moving-front', motion: 'front' },
  falling: { displayMode: 'falling', motion: 'fall' },
  'persistent-zone': { displayMode: 'persistent-ground', motion: 'zone' },
  trap: { displayMode: 'persistent-ground', motion: 'zone' },
  'target-brand': { displayMode: 'persistent-ground', motion: 'static' },
  'target-beam': { displayMode: 'persistent-ground', motion: 'static' },
  'shield-orbit': { displayMode: 'orbit', motion: 'orbit' },
};

function resolvePreviewProfile(effect, overrides = {}) {
  return {
    displayMode: 'in-place', motion: 'static', directionDeg: 0, distance: 340,
    durationMs: 900, originAnchor: 'caster', targetAnchor: 'ground',
    ...(ARCHETYPE_PROFILES[effect?.visualArchetype] || {}),
    ...(effect?.preview || {}),
    ...overrides,
  };
}
```

- [ ] **Step 4: Add failing direction and motion tests**

```js
test('travel follows arbitrary direction without resizing the sprite', () => {
  const start = motionPose({ motion: 'travel', directionDeg: 90, distance: 340 }, 0);
  const end = motionPose({ motion: 'travel', directionDeg: 90, distance: 340 }, 1);
  assert.deepEqual([Math.round(start.x), Math.round(start.y)], [0, -170]);
  assert.deepEqual([Math.round(end.x), Math.round(end.y)], [0, 170]);
  assert.deepEqual([start.scaleX, start.scaleY, end.scaleX, end.scaleY], [1, 1, 1, 1]);
});

test('out-and-back reaches target then returns', () => {
  const profile = { motion: 'out-and-back', directionDeg: 90, distance: 340 };
  assert.equal(Math.round(motionPose(profile, 0).y), -170);
  assert.equal(Math.round(motionPose(profile, .5).y), 170);
  assert.equal(Math.round(motionPose(profile, 1).y), -170);
});
```

- [ ] **Step 5: Implement `motionPose` with vector math**

Convert `directionDeg` to radians, calculate the centered origin/target vector, apply smoothstep progress, and keep `scaleX`/`scaleY` equal to `1` for `travel`, `out-and-back`, `volley`, and `front`. Implement `fall`, `zone`, and `orbit` as pose changes without changing source dimensions.

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test tests/preview-core.test.mjs`

Expected: all preview-core tests PASS.

Commit: `git commit -am "Add configurable VFX preview motion profiles"`

### Task 2: Display-mode controls and portrait-aware stage

**Files:**
- Modify: `tools/vfx-preview/index.html`
- Modify: `tools/vfx-preview/preview.css`
- Modify: `tools/vfx-preview/preview.js`
- Test: `tests/preview-page.test.mjs`

**Interfaces:**
- Consumes: `resolvePreviewProfile`, `motionPose`
- Produces DOM controls: `displayModeSelect`, `directionSelect`, `angleInput`, `distanceInput`, `resetDisplayButton`

- [ ] **Step 1: Write failing page-contract tests**

```js
test('page exposes project default and manual display controls', () => {
  for (const id of ['displayModeSelect', 'directionSelect', 'angleInput', 'distanceInput', 'resetDisplayButton']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(js, /resolvePreviewProfile/);
  assert.match(js, /motionPose/);
});
```

- [ ] **Step 2: Run the page test and observe RED**

Run: `node --test tests/preview-page.test.mjs`

Expected: FAIL because the controls do not exist.

- [ ] **Step 3: Add controls and state mapping**

Add `Project default`, `Asset in place`, `Projectile`, `Moving front`, `Falling`, `Persistent ground`, and `Orbit` options. Add direction presets for 90, -90, 0, and 180 degrees plus custom angle. Keep overrides in `state.previewOverrides`; clear them on effect switch and reset.

- [ ] **Step 4: Replace hard-coded `motionTransform` calls**

In `renderFrame`, resolve the profile, call `motionPose`, and compose CSS from `{x, y, rotationDeg, scaleX, scaleY}`. Do not use hard-coded `translateX` or `translateY` branches.

- [ ] **Step 5: Make the stage direction-neutral**

Keep the responsive stage rectangular, add logical caster and ground anchor markers, and ensure the full configured distance fits through clamping rather than forcing a horizontal layout.

- [ ] **Step 6: Run page and core tests and commit**

Run: `node --test tests/preview-page.test.mjs tests/preview-core.test.mjs`

Expected: all tests PASS.

Commit: `git commit -am "Add manual VFX preview display controls"`

### Task 3: Project runtime preview profiles

**Files:**
- Modify: `../project/tools/build_spell_vfx_sheets.py`
- Test: `../project/tools/test_spell_vfx_sheets.py`
- Generate: `../project/packages/battle/assets/battle/effects/effect-manifest.preview.json`

**Interfaces:**
- Produces optional `effect.preview` objects consumed by Task 1.

- [ ] **Step 1: Write failing manifest-profile tests**

```python
self.assertEqual(effects['sword_guiding_vein']['preview']['motion'], 'out-and-back')
self.assertEqual(effects['sword_guiding_vein']['preview']['directionDeg'], 90)
self.assertEqual(effects['sword_guiding_vein']['preview']['durationMs'], 680)
self.assertEqual(effects['sword_lane_sunder']['preview']['displayMode'], 'moving-front')
self.assertEqual(effects['sword_lane_sunder']['preview']['directionDeg'], 90)
self.assertEqual(effects['water_frozen_domain']['preview']['displayMode'], 'persistent-ground')
```

- [ ] **Step 2: Run the Python test and observe RED**

Run: `python -m unittest test_spell_vfx_sheets.py`

Expected: FAIL because `preview` is absent.

- [ ] **Step 3: Add authoritative profile tables**

Add `durationMs`, `displayMode`, `motion`, `directionDeg`, and `distance` beside the existing mappings. Encode these exact sword values:

```python
SWORD_PREVIEW_PROFILES = {
    'sword_returning_edge': ('in-place', 'static', 90, 0, 380),
    'sword_double_sever': ('in-place', 'static', 90, 0, 520),
    'sword_guard_aegis': ('orbit', 'orbit', 90, 72, 560),
    'sword_guiding_vein': ('projectile', 'out-and-back', 90, 340, 680),
    'sword_balance_array': ('falling', 'fall', 90, 300, 820),
    'sword_lane_sunder': ('moving-front', 'front', 90, 340, 900),
}
```

Encode the twelve elemental durations already declared in `elementalSpriteEffects.js`: 620, 620, 1400, 720, 1800, 900, 520, 760, 620, 3000, 680, and 1500 ms in definition order. Map projectile and path effects to 90 degrees and target-anchored effects to zero distance.

- [ ] **Step 4: Regenerate and validate the manifest**

Run: `python project/tools/build_spell_vfx_sheets.py --manifest-only`

Run: `node creating-game-combat-vfx/scripts/validate_effect_manifest.mjs project/packages/battle/assets/battle/effects/effect-manifest.preview.json`

Expected: 18 valid effects and no missing resources.

- [ ] **Step 5: Run project tests**

Run: `python -m unittest discover -s project/tools -p "test_*.py"`

Expected: all project tool tests PASS.

### Task 4: Optional layer choreography and runtime-parity fallback

**Files:**
- Modify: `tools/vfx-preview/preview-core.js`
- Modify: `tools/vfx-preview/preview.js`
- Modify: `../project/tools/build_spell_vfx_sheets.py`
- Test: `tests/preview-core.test.mjs`
- Test: `../project/tools/test_spell_vfx_sheets.py`

**Interfaces:**
- Extends `effect.preview.layers[layerName]` with `{ start, end, anchor, width, height }`.
- Produces `buildPreviewInstances(effect, elapsedMs, overrides) -> PreviewInstance[]`.

- [ ] **Step 1: Write failing overlap and legacy-fallback tests**

```js
test('configured choreography overlaps semantic layers', () => {
  const configured = structuredClone(effect);
  configured.preview = {
    durationMs: 1000,
    layers: {
      telegraph: { start: 0, end: .35, anchor: 'origin', width: 90, height: 60 },
      body: { start: .15, end: .7, anchor: 'moving', width: 54, height: 74 },
      impact: { start: .55, end: .82, anchor: 'target', width: 96, height: 96 },
      residue: { start: .72, end: 1, anchor: 'target', width: 90, height: 56 },
    },
  };
  assert.deepEqual(buildPreviewInstances(configured, 200).map((entry) => entry.layerName), ['telegraph', 'body']);
});

test('legacy effects keep the four-stage lifecycle', () => {
  assert.deepEqual(buildPreviewInstances(effect, 0), []);
  assert.deepEqual(buildLifecycle(effect).map((stage) => stage.name), ['telegraph', 'body', 'impact', 'residue']);
});
```

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/preview-core.test.mjs`

Expected: FAIL because `buildPreviewInstances` is absent.

- [ ] **Step 3: Implement optional choreography**

Normalize elapsed time by `durationMs`, filter layers by inclusive `start`/`end`, calculate local progress, and return anchor and display-size metadata. Use the existing lifecycle when `preview.layers` is absent.

- [ ] **Step 4: Emit representative project choreography**

Emit layer windows from the runtime functions. Use projectile windows `0-.30`, `.08-.66`, `.56-.82`, `.74-1`; path windows `0-.30`, `.12-.70`, `.42-.76`, `.68-1`; and point windows `0-.32`, `.16-.64`, `.48-.78`, `.70-1`. Encode sword-specific windows from `drawReturningEdge`, `drawDoubleSever`, `drawGuidingVein`, `drawBalanceArray`, and `drawLaneSunder` rather than substituting the generic windows.

- [ ] **Step 5: Run Node and Python tests and commit the SKILL changes**

Run: `node --test tests/*.test.mjs`

Run: `python -m unittest discover -s project/tools -p "test_*.py"`

Expected: all tests PASS.

Commit SKILL repository: `git commit -am "Align VFX preview choreography with runtime profiles"`

### Task 5: Documentation, validation, and delivery

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `references/preview-workflow.md`
- Test: `tests/skill-workflow.test.mjs`

**Interfaces:**
- Documents project-default and manual-override behavior without exposing manifest work to end users.

- [ ] **Step 1: Add failing bilingual documentation tests**

```js
test('bilingual docs explain project defaults and non-mutating manual overrides', () => {
  assert.match(readmeZh, /项目默认/);
  assert.match(readmeZh, /手动覆盖/);
  assert.match(readmeZh, /不会修改.*文件/);
  assert.match(readmeEn, /project default/i);
  assert.match(readmeEn, /manual override/i);
  assert.match(readmeEn, /does not modify.*files/i);
  assert.match(previewWorkflow, /manifest.*user overrides/i);
  assert.match(previewWorkflow, /final.*in-game validation/i);
});
```

- [ ] **Step 2: Run tests and observe RED**

Run: `node --test tests/skill-workflow.test.mjs`

Expected: FAIL until documentation is updated.

- [ ] **Step 3: Update concise bilingual guidance**

Describe opening a directory, accepting the project default, temporarily selecting a different mode/direction/distance, resetting, and validating final appearance in game.

- [ ] **Step 4: Run full verification**

Run: `node --test tests/*.test.mjs`

Run: `python -m unittest discover -s project/tools -p "test_*.py"`

Run: `python project/tools/audit_spell_vfx_assets.py`

Run: `python <skill-creator>/scripts/quick_validate.py creating-game-combat-vfx`

Expected: zero failures, 47 animated layers audited, 18 manifest effects valid, and `Skill is valid!`.

- [ ] **Step 5: Commit and push**

Commit: `git commit -am "Document universal VFX preview modes"`

Push the clean `main` branch and confirm local `HEAD` equals `origin/main`.
