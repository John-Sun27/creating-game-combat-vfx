import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const python = process.env.PYTHON;
const validator = fileURLToPath(new URL('../scripts/validate_sprite_source_grid.py', import.meta.url));

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writeRgbaPng(file, width, height, paint) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y);
      const pixel = row + 1 + x * 4;
      raw[pixel] = r;
      raw[pixel + 1] = g;
      raw[pixel + 2] = b;
      raw[pixel + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

function runValidator(file) {
  assert.ok(python, 'Set PYTHON to the approved Python runtime before running this test.');
  return spawnSync(python, [validator, '--input', file, '--frames', '2', '--columns', '2'], {
    encoding: 'utf8',
  });
}

function makeGrid(paint) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vfx-safe-margin-'));
  const file = path.join(directory, 'grid.png');
  writeRgbaPng(file, 200, 100, paint);
  return { directory, file };
}

test('accepts a two-frame source grid whose visible pixels remain inside the safe margin', () => {
  const { directory, file } = makeGrid((x, y) => {
    const localX = x % 100;
    const visible = localX >= 20 && localX <= 79 && y >= 20 && y <= 79;
    return visible ? [89, 228, 240, 255] : [255, 0, 255, 255];
  });
  try {
    const result = runValidator(file);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /PASS.*2 frame/i);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects a frame whose continuous sword body enters the left safe margin', () => {
  const { directory, file } = makeGrid((x, y) => {
    const localX = x % 100;
    const firstFrameBody = x < 100 && localX <= 50 && y >= 35 && y <= 60;
    const secondFrameBody = x >= 100 && localX >= 20 && localX <= 79 && y >= 20 && y <= 79;
    return firstFrameBody || secondFrameBody ? [89, 228, 240, 255] : [255, 0, 255, 255];
  });
  try {
    const result = runValidator(file);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /frame 0.*left/i);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('ignores a single margin particle while enforcing the main body margin', () => {
  const { directory, file } = makeGrid((x, y) => {
    const localX = x % 100;
    const body = localX >= 20 && localX <= 79 && y >= 20 && y <= 79;
    const isolatedParticle = x === 4 && y === 6;
    return body || isolatedParticle ? [89, 228, 240, 255] : [255, 0, 255, 255];
  });
  try {
    const result = runValidator(file);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('ignores an image-generation dark-violet layout card at the cell edge', () => {
  const { directory, file } = makeGrid((x, y) => {
    const localX = x % 100;
    const body = localX >= 20 && localX <= 79 && y >= 20 && y <= 79;
    const layoutCard = x < 100 && localX <= 11 && y >= 10 && y <= 75;
    return body ? [89, 228, 240, 255] : layoutCard ? [60, 10, 58, 255] : [255, 0, 255, 255];
  });
  try {
    const result = runValidator(file);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
