(function exposePreviewLoader(globalScope) {
  'use strict';

  function normalizePath(filePath) {
    return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/');
  }

  function buildFileIndex(files) {
    const entries = Array.from(files || []).map((file) => {
      const path = normalizePath(file.webkitRelativePath || file.name);
      return { file, path, parts: path.split('/').filter(Boolean) };
    });
    const rootName = entries.length && entries.every((entry) => entry.parts.length > 1 && entry.parts[0] === entries[0].parts[0])
      ? entries[0].parts[0]
      : '';
    const byPath = new Map();
    const byBasename = new Map();

    entries.forEach((entry) => {
      const relativePath = rootName ? entry.parts.slice(1).join('/') : entry.parts.join('/');
      const pathKey = relativePath.toLowerCase();
      const name = entry.parts[entry.parts.length - 1] || entry.file.name;
      const basenameKey = name.toLowerCase();
      byPath.set(pathKey, { file: entry.file, relativePath });
      const basenameEntries = byBasename.get(basenameKey) || [];
      basenameEntries.push({ file: entry.file, relativePath });
      byBasename.set(basenameKey, basenameEntries);
    });

    return { rootName, byPath, byBasename };
  }

  function resolveIndexedFile(index, requestedPath) {
    const normalized = normalizePath(requestedPath);
    const exact = index.byPath.get(normalized.toLowerCase());
    if (exact) return { file: exact.file, relativePath: exact.relativePath };

    const name = normalized.split('/').pop().toLowerCase();
    const candidates = index.byBasename.get(name) || [];
    if (candidates.length === 1) {
      return { file: candidates[0].file, relativePath: candidates[0].relativePath };
    }
    if (candidates.length > 1) {
      return {
        file: null,
        reason: 'ambiguous-basename',
        candidates: candidates.map((candidate) => candidate.relativePath).sort(),
      };
    }
    return { file: null, reason: 'missing', candidates: [] };
  }

  async function readJson(file) {
    return JSON.parse(await file.text());
  }

  async function chooseManifest(files) {
    const jsonFiles = Array.from(files || []).filter((file) => /\.json$/i.test(file.name));
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
        // Ignore unrelated or malformed JSON while searching for a compatible manifest.
      }
    }
    throw new Error('未找到 effect-manifest.preview.json、effect-manifest.json 或兼容的特效清单。');
  }

  function createEffectRecords(effects, inspectEffect) {
    return Array.from(effects || []).map((source, index) => {
      const isObject = source !== null && typeof source === 'object' && !Array.isArray(source);
      const effect = isObject ? source : {};
      const hasKey = typeof effect.key === 'string' && effect.key.trim().length > 0;
      const configErrors = [];
      if (!isObject) configErrors.push('effect must be an object');
      if (isObject && !hasKey) configErrors.push('key is required');
      try {
        inspectEffect(effect).forEach((message) => configErrors.push(message));
      } catch (error) {
        configErrors.push(`effect inspection failed: ${error.message}`);
      }
      return {
        id: `effect-${index}`,
        index,
        effect,
        label: hasKey ? effect.key : `effects[${index}]`,
        configErrors,
      };
    });
  }

  const api = { buildFileIndex, chooseManifest, createEffectRecords, resolveIndexedFile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalScope.VfxPreviewLoader = api;
}(globalThis));
