(function startVfxPreview() {
  'use strict';

  const core = window.VfxPreviewCore;
  if (!core) throw new Error('VfxPreviewCore must load before preview.js');
  const loader = window.VfxPreviewLoader;
  if (!loader) throw new Error('VfxPreviewLoader must load before preview.js');

  const layerNames = ['telegraph', 'body', 'impact', 'residue'];
  const refs = Object.fromEntries([
    'folderInput', 'effectList', 'effectCount', 'emptyHint', 'previewStage', 'stageHint',
    'stageName', 'frameName', 'playButton', 'pauseButton', 'restartButton', 'stepButton',
    'fpsInput', 'fpsValue', 'scaleInput', 'scaleValue', 'offsetXInput', 'offsetXValue',
    'offsetYInput', 'offsetYValue', 'backgroundSelect', 'loopInput', 'issueList', 'issueSummary',
    'displayModeSelect', 'directionSelect', 'angleInput', 'angleValue', 'distanceInput',
    'distanceValue', 'resetDisplayButton',
  ].map((id) => [id, document.getElementById(id)]));

  const state = {
    effects: [],
    current: null,
    urls: [],
    lifecycle: [],
    stageIndex: 0,
    stageElapsed: 0,
    playing: false,
    lastTick: 0,
    loadToken: 0,
    previewOverrides: {},
  };

  const DISPLAY_MOTIONS = {
    'in-place': 'static',
    projectile: 'travel',
    'moving-front': 'front',
    falling: 'fall',
    'persistent-ground': 'zone',
    orbit: 'orbit',
  };

  function imageDimensions(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('浏览器无法解码此 PNG'));
      image.src = url;
    });
  }

  function addIssue(issues, severity, resource, message, suggestion) {
    issues.push({ severity, resource, message, suggestion });
  }

  async function inspectResource(file, layer, token) {
    const buffer = await file.arrayBuffer();
    const png = core.parsePngHeader(buffer);
    const url = URL.createObjectURL(new Blob([buffer], { type: file.type || 'image/png' }));
    try {
      const decoded = await imageDimensions(url);
      if (token !== state.loadToken) {
        throw new Error('目录载入已被新的选择取代');
      }
      if (decoded.width !== png.width || decoded.height !== png.height) {
        throw new Error('PNG 标头尺寸与浏览器解码尺寸不一致');
      }
      state.urls.push(url);
      return { file, url, width: png.width, height: png.height, hasAlpha: png.hasAlpha, frames: layer.frames };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async function validateEffect(record, fileIndex, token) {
    const issues = [];
    const resources = {};
    const effect = record.effect;
    record.configErrors.forEach((message) => {
      addIssue(issues, 'error', '配置', message, '修正清单字段后重新载入目录。');
    });

    await Promise.all(layerNames.map(async (layerName) => {
      const layer = effect && effect.layers && effect.layers[layerName];
      if (!layer || !layer.file) return;
      const resolution = loader.resolveIndexedFile(fileIndex, layer.file);
      if (!resolution.file) {
        if (resolution.reason === 'ambiguous-basename') {
          addIssue(issues, 'error', layer.file, `${layerName} 文件名存在冲突：${resolution.candidates.join('、')}`, '在清单中填写相对于所选目录的完整路径。');
          return;
        }
        addIssue(issues, 'error', layer.file, `${layerName} 图层文件缺失`, '补齐文件或修正清单中的文件名。');
        return;
      }
      try {
        const resource = await inspectResource(resolution.file, layer, token);
        resources[layerName] = resource;
        if (resource.width % layer.frames !== 0) {
          addIssue(issues, 'error', layer.file, `宽度 ${resource.width} 不能被 ${layer.frames} 帧整除`, '调整序列帧数量或重新导出等宽横向序列帧。');
        }
        if (!resource.hasAlpha) {
          addIssue(issues, 'warning', layer.file, 'PNG 不含透明通道', '如需叠加显示，请导出带 Alpha 的 PNG。');
        }
      } catch (error) {
        addIssue(issues, 'error', layer.file, `PNG 无效：${error.message}`, '重新导出有效的 PNG 文件。');
      }
    }));

    return { ...record, issues, resources, valid: !issues.some((issue) => issue.severity === 'error') };
  }

  function revokeUrls() {
    state.urls.forEach((url) => URL.revokeObjectURL(url));
    state.urls = [];
  }

  function showGlobalIssue(message) {
    state.effects = [];
    state.current = null;
    refs.effectList.replaceChildren();
    refs.effectCount.textContent = '0';
    refs.emptyHint.hidden = false;
    refs.issueSummary.textContent = '载入失败';
    refs.issueSummary.className = 'badge error';
    refs.issueList.replaceChildren(issueItem({ severity: 'error', resource: '目录', message, suggestion: '确认所选目录包含有效清单。' }));
    clearStage();
    updateButtons();
  }

  async function loadDirectory(files) {
    const token = ++state.loadToken;
    state.playing = false;
    revokeUrls();
    clearStage();
    refs.emptyHint.textContent = '正在检查目录…';
    refs.emptyHint.hidden = false;
    refs.effectList.replaceChildren();
    try {
      const selectedFiles = Array.from(files);
      const { manifest } = await loader.chooseManifest(selectedFiles);
      if (token !== state.loadToken) return;
      if (manifest.schemaVersion === undefined || !Array.isArray(manifest.effects)) {
        throw new Error('清单必须包含 schemaVersion 和 effects 数组。');
      }
      const fileIndex = loader.buildFileIndex(selectedFiles);
      const records = loader.createEffectRecords(manifest.effects, core.inspectEffect);
      state.effects = await Promise.all(records.map(async (record) => {
        try {
          return await validateEffect(record, fileIndex, token);
        } catch (error) {
          return {
            ...record,
            resources: {},
            valid: false,
            issues: [{ severity: 'error', resource: record.label, message: `验证失败：${error.message}`, suggestion: '修正此特效后重新载入目录。' }],
          };
        }
      }));
      if (token !== state.loadToken) return;
      renderEffectList();
      const firstValid = state.effects.find((entry) => entry.valid) || state.effects[0];
      if (firstValid) selectEffect(firstValid);
      else showGlobalIssue('清单中没有可预览的特效。');
    } catch (error) {
      if (token === state.loadToken) showGlobalIssue(error.message);
    }
  }

  function renderEffectList() {
    refs.effectList.replaceChildren();
    refs.effectCount.textContent = String(state.effects.length);
    refs.emptyHint.hidden = state.effects.length > 0;
    state.effects.forEach((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `effect-item${entry.valid ? '' : ' invalid'}`;
      button.dataset.effectId = entry.id;
      button.innerHTML = `<strong></strong><span class="effect-meta"><span></span><span class="effect-state"></span></span>`;
      button.querySelector('strong').textContent = entry.label;
      button.querySelector('.effect-meta > span').textContent = typeof entry.effect.visualArchetype === 'string' ? entry.effect.visualArchetype : 'unknown';
      button.querySelector('.effect-state').textContent = entry.valid ? '可播放' : '有错误';
      button.addEventListener('click', () => selectEffect(entry));
      refs.effectList.append(button);
    });
  }

  function issueItem(issue) {
    const item = document.createElement('li');
    item.className = issue.severity;
    item.textContent = `[${issue.resource}] ${issue.message}；${issue.suggestion}`;
    return item;
  }

  function renderIssues(entry) {
    refs.issueList.replaceChildren();
    const errors = entry.issues.filter((issue) => issue.severity === 'error').length;
    const warnings = entry.issues.filter((issue) => issue.severity === 'warning').length;
    if (!entry.issues.length) {
      const item = document.createElement('li');
      item.className = 'ok';
      item.textContent = '资源与序列帧几何检查通过。';
      refs.issueList.append(item);
    } else {
      entry.issues.forEach((issue) => refs.issueList.append(issueItem(issue)));
    }
    refs.issueSummary.textContent = errors ? `${errors} 错误 · ${warnings} 警告` : warnings ? `${warnings} 警告` : '检查通过';
    refs.issueSummary.className = `badge${errors ? ' error' : warnings ? '' : ' neutral'}`;
  }

  function clearStage() {
    refs.previewStage.querySelectorAll('.sprite-layer').forEach((node) => node.remove());
    refs.stageHint.hidden = false;
    refs.stageName.textContent = '等待载入';
    refs.frameName.textContent = '—';
  }

  function syncDisplayControls() {
    if (!state.current?.effect) return;
    const profile = core.resolvePreviewProfile(state.current.effect);
    refs.displayModeSelect.value = 'project-default';
    const direction = ['90', '-90', '0', '180'].includes(String(profile.directionDeg))
      ? String(profile.directionDeg)
      : 'custom';
    refs.directionSelect.value = direction;
    refs.angleInput.value = String(profile.directionDeg);
    refs.angleValue.textContent = `${profile.directionDeg}°`;
    refs.distanceInput.value = String(profile.distance);
    refs.distanceValue.textContent = String(profile.distance);
    refs.angleInput.disabled = direction !== 'custom';
  }

  function resetDisplayOverrides(render = true) {
    state.previewOverrides = {};
    syncDisplayControls();
    if (render && state.current?.valid) renderFrame();
  }

  function updateDisplayOverrides() {
    const displayMode = refs.displayModeSelect.value;
    const directionDeg = refs.directionSelect.value === 'custom'
      ? Number(refs.angleInput.value)
      : Number(refs.directionSelect.value);
    state.previewOverrides = {
      ...(displayMode === 'project-default' ? {} : {
        displayMode,
        motion: DISPLAY_MOTIONS[displayMode],
      }),
      directionDeg,
      distance: Number(refs.distanceInput.value),
    };
    refs.angleValue.textContent = `${directionDeg}°`;
    refs.distanceValue.textContent = refs.distanceInput.value;
    refs.angleInput.disabled = refs.directionSelect.value !== 'custom';
    renderFrame();
  }

  function selectEffect(entry) {
    state.current = entry;
    resetDisplayOverrides(false);
    const timeline = core.resetTimeline(state, false);
    state.playing = timeline.playing;
    state.stageIndex = timeline.stageIndex;
    state.stageElapsed = timeline.stageElapsed;
    state.lifecycle = entry.valid
      ? (entry.effect.preview?.layers
        ? [{ name: 'runtime', durationMs: entry.effect.preview.durationMs, loop: false, motion: 'runtime' }]
        : core.buildLifecycle(entry.effect))
      : [];
    refs.effectList.querySelectorAll('.effect-item').forEach((button) => {
      button.classList.toggle('active', button.dataset.effectId === entry.id);
    });
    renderIssues(entry);
    clearStage();
    if (entry.valid) {
      refs.stageHint.hidden = true;
      renderFrame();
    } else {
      refs.stageHint.textContent = '此特效存在阻断错误；可选择其他有效特效继续预览。';
      refs.stageName.textContent = '无法播放';
    }
    updateButtons();
  }

  function createInstanceNode(entry, instance) {
    const resource = entry.resources[instance.layerName];
    if (!resource) return;
    const layer = document.createElement('div');
    layer.className = `sprite-layer layer-${instance.layerName}`;
    layer.dataset.instanceId = instance.id;
    layer.dataset.layer = instance.layerName;
    layer.setAttribute('role', 'img');
    layer.setAttribute('aria-label', `${entry.effect.key} ${instance.layerName}`);
    layer.style.backgroundImage = `url("${resource.url}")`;
    const frameWidth = resource.width / resource.frames;
    const maxWidth = 250;
    const maxHeight = 340;
    const fit = Math.min(maxWidth / frameWidth, maxHeight / resource.height, 1);
    layer.style.width = `${instance.width || frameWidth * fit}px`;
    layer.style.height = `${instance.height || resource.height * fit}px`;
    refs.previewStage.append(layer);
  }

  function syncInstanceNodes(entry, instances) {
    const wanted = new Set(instances.map((instance) => instance.id));
    const nodes = new Map();
    refs.previewStage.querySelectorAll('.sprite-layer').forEach((node) => {
      if (!wanted.has(node.dataset.instanceId)) node.remove();
      else nodes.set(node.dataset.instanceId, node);
    });
    instances.forEach((instance) => {
      if (!nodes.has(instance.id)) createInstanceNode(entry, instance);
    });
  }

  function renderFrame() {
    if (!state.current || !state.current.valid || !state.lifecycle.length) return;
    const stage = state.lifecycle[state.stageIndex];
    const effect = state.current.effect;
    const previewProfile = core.resolvePreviewProfile(effect, state.previewOverrides);
    const userScale = Number(refs.scaleInput.value);
    const offsetX = Number(effect.offsetX || 0) + Number(refs.offsetXInput.value);
    const offsetY = Number(effect.offsetY || 0) + Number(refs.offsetYInput.value);
    const configuredInstances = stage.name === 'runtime'
      ? core.buildPreviewInstances(effect, state.stageElapsed)
      : [];
    const instances = configuredInstances.length
      ? configuredInstances
      : core.buildStageInstances(effect, stage);
    syncInstanceNodes(state.current, instances);
    const frameLabels = [];

    instances.forEach((instance) => {
      const node = Array.from(refs.previewStage.querySelectorAll('.sprite-layer'))
        .find((candidate) => candidate.dataset.instanceId === instance.id);
      if (!node) return;
      const instanceState = stage.name === 'runtime'
        ? { visible: true, elapsedMs: instance.elapsedMs, progress: instance.localProgress }
        : core.instanceProgress(stage, state.stageElapsed, instance);
      const frameCount = effect.layers[instance.layerName].frames;
      const frameIndex = core.sampleSpriteFrame(
        frameCount,
        instanceState.elapsedMs,
        Number(refs.fpsInput.value),
        ((stage.loop || previewProfile.displayMode === 'persistent-ground') && refs.loopInput.checked),
      );
      const style = core.spriteFrameStyle(frameCount, frameIndex);
      node.hidden = !instanceState.visible;
      if (!instanceState.visible) return;
      node.style.backgroundSize = style.backgroundSize;
      node.style.backgroundPosition = style.backgroundPosition;
      node.style.opacity = stage.name === 'residue' ? String(1 - instanceState.progress * .7) : '1';
      const instanceIndex = Number(instance.id.split('-').pop()) || 0;
      const pose = core.composePreviewPose(previewProfile, instance, instanceState.progress, instanceIndex);
      const scale = Number(effect.scale) * userScale;
      node.style.transform = `translate(-50%, -50%) translate(${offsetX + instance.offsetX + pose.x}px, ${offsetY + instance.offsetY + pose.y}px) rotate(${pose.rotationDeg}deg) scale(${pose.scaleX * scale}, ${pose.scaleY * scale})`;
      frameLabels.push(`${frameIndex + 1} / ${frameCount}`);
    });
    refs.stageName.textContent = `${stage.name} · ${stage.name === 'runtime' || stage.name === 'body' ? previewProfile.motion : stage.motion}`;
    refs.frameName.textContent = frameLabels.length > 1
      ? `${frameLabels[0]} · ${frameLabels.length} instances`
      : (frameLabels[0] || '—');
  }

  function advance(deltaMs) {
    if (!state.current || !state.current.valid) return;
    const timeline = core.advanceTimeline(state, state.lifecycle, deltaMs, refs.loopInput.checked);
    state.stageIndex = timeline.stageIndex;
    state.stageElapsed = timeline.stageElapsed;
    state.playing = timeline.playing;
    renderFrame();
    updateButtons();
  }

  function restart(playAfter) {
    if (!state.current || !state.current.valid) return;
    const timeline = core.resetTimeline(state, playAfter);
    state.stageIndex = timeline.stageIndex;
    state.stageElapsed = timeline.stageElapsed;
    state.playing = timeline.playing;
    state.lastTick = performance.now();
    renderFrame();
    updateButtons();
  }

  function updateButtons() {
    const disabled = !state.current || !state.current.valid;
    refs.playButton.disabled = disabled || state.playing;
    refs.pauseButton.disabled = disabled || !state.playing;
    refs.restartButton.disabled = disabled;
    refs.stepButton.disabled = disabled;
  }

  function animationTick(timestamp) {
    if (state.playing) {
      const delta = state.lastTick ? Math.max(0, timestamp - state.lastTick) : 0;
      state.lastTick = timestamp;
      advance(delta);
    } else {
      state.lastTick = timestamp;
    }
    requestAnimationFrame(animationTick);
  }

  refs.folderInput.addEventListener('change', (event) => loadDirectory(event.target.files));
  refs.playButton.addEventListener('click', () => {
    if (state.stageIndex === state.lifecycle.length - 1 && state.stageElapsed >= state.lifecycle[state.stageIndex].durationMs) restart(false);
    state.playing = true;
    state.lastTick = performance.now();
    updateButtons();
  });
  refs.pauseButton.addEventListener('click', () => { state.playing = false; updateButtons(); });
  refs.restartButton.addEventListener('click', () => restart(true));
  refs.stepButton.addEventListener('click', () => {
    const timeline = core.stepTimeline(
      state,
      state.lifecycle,
      Number(refs.fpsInput.value),
      refs.loopInput.checked,
    );
    state.stageIndex = timeline.stageIndex;
    state.stageElapsed = timeline.stageElapsed;
    state.playing = timeline.playing;
    renderFrame();
    updateButtons();
  });
  refs.fpsInput.addEventListener('input', () => { refs.fpsValue.textContent = refs.fpsInput.value; renderFrame(); });
  refs.scaleInput.addEventListener('input', () => { refs.scaleValue.textContent = `${Number(refs.scaleInput.value).toFixed(2)}×`; renderFrame(); });
  refs.offsetXInput.addEventListener('input', () => { refs.offsetXValue.textContent = refs.offsetXInput.value; renderFrame(); });
  refs.offsetYInput.addEventListener('input', () => { refs.offsetYValue.textContent = refs.offsetYInput.value; renderFrame(); });
  refs.displayModeSelect.addEventListener('change', updateDisplayOverrides);
  refs.directionSelect.addEventListener('change', updateDisplayOverrides);
  refs.angleInput.addEventListener('input', updateDisplayOverrides);
  refs.distanceInput.addEventListener('input', updateDisplayOverrides);
  refs.resetDisplayButton.addEventListener('click', resetDisplayOverrides);
  refs.backgroundSelect.addEventListener('change', () => {
    refs.previewStage.className = `preview-stage background-${refs.backgroundSelect.value}`;
  });
  refs.loopInput.addEventListener('change', renderFrame);

  updateButtons();
  requestAnimationFrame(animationTick);
}());
