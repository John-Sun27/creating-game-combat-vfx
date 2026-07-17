(function startVfxPreview() {
  'use strict';

  const core = window.VfxPreviewCore;
  if (!core) throw new Error('VfxPreviewCore must load before preview.js');

  const layerNames = ['telegraph', 'body', 'impact', 'residue'];
  const refs = Object.fromEntries([
    'folderInput', 'effectList', 'effectCount', 'emptyHint', 'previewStage', 'stageHint',
    'stageName', 'frameName', 'playButton', 'pauseButton', 'restartButton', 'stepButton',
    'fpsInput', 'fpsValue', 'scaleInput', 'scaleValue', 'offsetXInput', 'offsetXValue',
    'offsetYInput', 'offsetYValue', 'backgroundSelect', 'loopInput', 'issueList', 'issueSummary',
  ].map((id) => [id, document.getElementById(id)]));

  const state = {
    effects: [],
    current: null,
    resources: new Map(),
    urls: [],
    lifecycle: [],
    stageIndex: 0,
    stageElapsed: 0,
    playing: false,
    lastTick: 0,
    loadToken: 0,
  };

  function basename(filePath) {
    return filePath.replace(/\\/g, '/').split('/').pop();
  }

  function makeFileMap(files) {
    const map = new Map();
    files.forEach((file) => {
      const relative = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
      map.set(relative, file);
      map.set(relative.toLowerCase(), file);
      if (!map.has(file.name)) map.set(file.name, file);
      if (!map.has(file.name.toLowerCase())) map.set(file.name.toLowerCase(), file);
    });
    return map;
  }

  function resolveFile(fileMap, filePath) {
    const normalized = String(filePath || '').replace(/^\.\//, '').replace(/\\/g, '/');
    return fileMap.get(normalized) || fileMap.get(normalized.toLowerCase()) ||
      fileMap.get(basename(normalized)) || fileMap.get(basename(normalized).toLowerCase());
  }

  async function readJson(file) {
    return JSON.parse(await file.text());
  }

  async function chooseManifest(files) {
    const jsonFiles = files.filter((file) => /\.json$/i.test(file.name));
    for (const preferredName of ['effect-manifest.preview.json', 'effect-manifest.json']) {
      const file = jsonFiles.find((candidate) => candidate.name.toLowerCase() === preferredName);
      if (file) return { file, manifest: await readJson(file) };
    }
    for (const file of jsonFiles) {
      try {
        const manifest = await readJson(file);
        if (manifest && 'schemaVersion' in manifest && Array.isArray(manifest.effects)) {
          return { file, manifest };
        }
      } catch (_) {
        // An unrelated JSON file must not prevent discovery of a later manifest.
      }
    }
    throw new Error('未找到 effect-manifest.preview.json、effect-manifest.json 或兼容的特效清单。');
  }

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

  async function inspectResource(file, layer, effect, layerName, token) {
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
      return { file, url, width: png.width, height: png.height, hasAlpha: png.hasAlpha, frames: layer.frames, effect, layerName };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async function validateEffect(effect, fileMap, token) {
    const issues = [];
    const resources = {};
    core.inspectEffect(effect).forEach((message) => {
      addIssue(issues, 'error', '配置', message, '修正清单字段后重新载入目录。');
    });

    await Promise.all(layerNames.map(async (layerName) => {
      const layer = effect && effect.layers && effect.layers[layerName];
      if (!layer || !layer.file) return;
      const file = resolveFile(fileMap, layer.file);
      if (!file) {
        addIssue(issues, 'error', layer.file, `${layerName} 图层文件缺失`, '补齐文件或修正清单中的文件名。');
        return;
      }
      try {
        const resource = await inspectResource(file, layer, effect, layerName, token);
        resources[layerName] = resource;
        state.resources.set(`${effect.key}:${layerName}`, resource);
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

    return { effect, issues, resources, valid: !issues.some((issue) => issue.severity === 'error') };
  }

  function revokeUrls() {
    state.urls.forEach((url) => URL.revokeObjectURL(url));
    state.urls = [];
    state.resources.clear();
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
      const { manifest } = await chooseManifest(selectedFiles);
      if (token !== state.loadToken) return;
      if (manifest.schemaVersion === undefined || !Array.isArray(manifest.effects)) {
        throw new Error('清单必须包含 schemaVersion 和 effects 数组。');
      }
      const fileMap = makeFileMap(selectedFiles);
      state.effects = await Promise.all(manifest.effects.map((effect) => validateEffect(effect, fileMap, token)));
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
      button.dataset.effectKey = entry.effect.key;
      button.innerHTML = `<strong></strong><span class="effect-meta"><span></span><span class="effect-state"></span></span>`;
      button.querySelector('strong').textContent = entry.effect.key || '未命名特效';
      button.querySelector('.effect-meta > span').textContent = entry.effect.visualArchetype || 'unknown';
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

  function selectEffect(entry) {
    state.current = entry;
    state.playing = false;
    state.stageIndex = 0;
    state.stageElapsed = 0;
    state.lifecycle = entry.valid ? core.buildLifecycle(entry.effect) : [];
    refs.effectList.querySelectorAll('.effect-item').forEach((button) => {
      button.classList.toggle('active', button.dataset.effectKey === entry.effect.key);
    });
    renderIssues(entry);
    clearStage();
    if (entry.valid) {
      layerNames.forEach((layerName) => createLayer(entry, layerName));
      refs.stageHint.hidden = true;
      renderFrame();
    } else {
      refs.stageHint.textContent = '此特效存在阻断错误；可选择其他有效特效继续预览。';
      refs.stageName.textContent = '无法播放';
    }
    updateButtons();
  }

  function createLayer(entry, layerName) {
    const resource = entry.resources[layerName];
    if (!resource) return;
    const layer = document.createElement('div');
    layer.className = `sprite-layer layer-${layerName}`;
    layer.dataset.layer = layerName;
    layer.setAttribute('role', 'img');
    layer.setAttribute('aria-label', `${entry.effect.key} ${layerName}`);
    layer.style.backgroundImage = `url("${resource.url}")`;
    const frameWidth = resource.width / resource.frames;
    const maxWidth = 250;
    const maxHeight = 340;
    const fit = Math.min(maxWidth / frameWidth, maxHeight / resource.height, 1);
    layer.style.width = `${frameWidth * fit}px`;
    layer.style.height = `${resource.height * fit}px`;
    refs.previewStage.append(layer);
  }

  function motionTransform(motion, progress) {
    const eased = progress * progress * (3 - 2 * progress);
    switch (motion) {
      case 'travel': return `translateX(${(-170 + 340 * eased).toFixed(1)}px)`;
      case 'volley': return `translate(${(-170 + 340 * eased).toFixed(1)}px, ${(-18 * Math.sin(progress * Math.PI * 3)).toFixed(1)}px)`;
      case 'front': return `translateX(${(-150 + 300 * eased).toFixed(1)}px) scaleX(${(0.9 + progress * 0.2).toFixed(3)})`;
      case 'fall': return `translateY(${(-190 + 250 * eased).toFixed(1)}px) rotate(${(-12 + 18 * progress).toFixed(1)}deg)`;
      case 'arc': return `translate(${(-80 + 160 * eased).toFixed(1)}px, ${(-70 * Math.sin(progress * Math.PI)).toFixed(1)}px) rotate(${(-70 + 140 * progress).toFixed(1)}deg)`;
      case 'erupt': return `translateY(${(60 - 60 * eased).toFixed(1)}px) scaleY(${(0.5 + 0.5 * eased).toFixed(3)})`;
      case 'zone': return `scale(${(0.9 + 0.08 * Math.sin(progress * Math.PI * 2)).toFixed(3)}) rotate(${(progress * 12).toFixed(1)}deg)`;
      case 'trap': return `scale(${(0.85 + 0.15 * eased).toFixed(3)})`;
      case 'brand': return `translateY(${(-12 * Math.sin(progress * Math.PI)).toFixed(1)}px) scale(${(0.9 + 0.1 * eased).toFixed(3)})`;
      case 'beam': return `scaleY(${(0.6 + 0.4 * eased).toFixed(3)})`;
      case 'orbit': return `rotate(${(progress * 360).toFixed(1)}deg) translateX(28px) rotate(${(-progress * 360).toFixed(1)}deg)`;
      case 'telegraph': return `scale(${(0.72 + 0.28 * eased).toFixed(3)})`;
      case 'impact': return `scale(${(0.65 + 0.55 * Math.sin(progress * Math.PI)).toFixed(3)})`;
      case 'residue': return `scale(${(1 + 0.08 * progress).toFixed(3)})`;
      default: return '';
    }
  }

  function renderFrame() {
    if (!state.current || !state.current.valid || !state.lifecycle.length) return;
    const stage = state.lifecycle[state.stageIndex];
    const progress = Math.min(1, state.stageElapsed / stage.durationMs);
    const effect = state.current.effect;
    const userScale = Number(refs.scaleInput.value);
    const offsetX = Number(effect.offsetX || 0) + Number(refs.offsetXInput.value);
    const offsetY = Number(effect.offsetY || 0) + Number(refs.offsetYInput.value);
    const layer = effect.layers[stage.name];
    const frameCount = layer.frames;
    const frameIndex = Math.min(frameCount - 1, Math.floor(progress * frameCount));
    const style = core.spriteFrameStyle(frameCount, frameIndex);

    refs.previewStage.querySelectorAll('.sprite-layer').forEach((node) => {
      const active = node.dataset.layer === stage.name;
      node.hidden = !active;
      if (!active) return;
      node.style.backgroundSize = style.backgroundSize;
      node.style.backgroundPosition = style.backgroundPosition;
      node.style.opacity = stage.name === 'residue' ? String(1 - progress * .7) : '1';
      node.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) ${motionTransform(stage.motion, progress)} scale(${Number(effect.scale) * userScale})`;
    });
    refs.stageName.textContent = `${stage.name} · ${stage.motion}`;
    refs.frameName.textContent = `${frameIndex + 1} / ${frameCount}`;
  }

  function advance(deltaMs) {
    if (!state.current || !state.current.valid) return;
    state.stageElapsed += deltaMs;
    let guard = 0;
    while (guard++ < 20) {
      const stage = state.lifecycle[state.stageIndex];
      if (state.stageElapsed < stage.durationMs) break;
      state.stageElapsed -= stage.durationMs;
      if (stage.loop && refs.loopInput.checked) continue;
      state.stageIndex += 1;
      if (state.stageIndex < state.lifecycle.length) continue;
      if (refs.loopInput.checked) state.stageIndex = 0;
      else {
        state.stageIndex = state.lifecycle.length - 1;
        state.stageElapsed = state.lifecycle[state.stageIndex].durationMs;
        state.playing = false;
        break;
      }
    }
    renderFrame();
    updateButtons();
  }

  function restart(playAfter) {
    if (!state.current || !state.current.valid) return;
    state.stageIndex = 0;
    state.stageElapsed = 0;
    state.playing = Boolean(playAfter);
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
      const delta = state.lastTick ? Math.min(timestamp - state.lastTick, 100) : 0;
      state.lastTick = timestamp;
      advance(delta * Number(refs.fpsInput.value) / 24);
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
    state.playing = false;
    const stage = state.lifecycle[state.stageIndex];
    const frames = state.current.effect.layers[stage.name].frames;
    advance(stage.durationMs / frames);
  });
  refs.fpsInput.addEventListener('input', () => { refs.fpsValue.textContent = refs.fpsInput.value; });
  refs.scaleInput.addEventListener('input', () => { refs.scaleValue.textContent = `${Number(refs.scaleInput.value).toFixed(2)}×`; renderFrame(); });
  refs.offsetXInput.addEventListener('input', () => { refs.offsetXValue.textContent = refs.offsetXInput.value; renderFrame(); });
  refs.offsetYInput.addEventListener('input', () => { refs.offsetYValue.textContent = refs.offsetYInput.value; renderFrame(); });
  refs.backgroundSelect.addEventListener('change', () => {
    refs.previewStage.className = `preview-stage background-${refs.backgroundSelect.value}`;
  });
  refs.loopInput.addEventListener('change', renderFrame);

  updateButtons();
  requestAnimationFrame(animationTick);
}());
