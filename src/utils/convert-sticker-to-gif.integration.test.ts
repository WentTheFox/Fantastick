import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as zlib from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { convertTgsToGif, convertWebmToGif, launchTgsRenderer, MAX_STICKER_DIMENSION, TgsRenderer } from './convert-sticker-to-gif.js';

// Requires real ffmpeg + Chromium binaries (see README.md's bare-metal prerequisites),
// so this is opt-in and not part of the default `pnpm run test` / CI run.
const RUN = process.env.RUN_INTEGRATION_TESTS === 'true';

const execFileAsync = promisify(execFile);
const logger = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined } as never;

// A GIF's per-pixel transparency is binary (no partial alpha), so any threshold works.
const decodeImageFrames = async (image: Buffer, extension: string, width: number, height: number): Promise<Buffer[]> => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'image-decode-'));
  try {
    const imagePath = path.join(tmpDir, `in.${extension}`);
    const rawPath = path.join(tmpDir, 'out.rgba');
    await fs.promises.writeFile(imagePath, image);
    await execFileAsync('ffmpeg', ['-y', '-i', imagePath, '-vsync', '0', '-pix_fmt', 'rgba', '-f', 'rawvideo', rawPath]);
    const raw = await fs.promises.readFile(rawPath);
    const frameSize = width * height * 4;
    const frames: Buffer[] = [];
    for (let offset = 0; offset + frameSize <= raw.length; offset += frameSize) {
      frames.push(raw.subarray(offset, offset + frameSize));
    }
    return frames;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
};

const pixelAt = (frame: Buffer, width: number, x: number, y: number) => {
  const i = (y * width + x) * 4;
  return { r: frame[i], g: frame[i + 1], b: frame[i + 2], a: frame[i + 3] };
};

describe.skipIf(!RUN)('convertWebmToGif (integration)', () => {
  it('should preserve real per-pixel transparency from a VP9 alpha webm', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'webm-fixture-'));
    try {
      const webmPath = path.join(tmpDir, 'in.webm');
      // A red square whose left half is opaque and right half is fully transparent.
      await execFileAsync('ffmpeg', [
        '-y', '-f', 'lavfi',
        '-i', "color=c=red:s=64x64:d=1,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(X,32),0,255)'",
        '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-metadata:s:v:0', 'alpha_mode=1', '-auto-alt-ref', '0',
        webmPath,
      ]);
      const webmBuffer = await fs.promises.readFile(webmPath);

      const converted = await convertWebmToGif({ logger }, webmBuffer);
      expect(converted.extension).toEqual('gif');
      const size = MAX_STICKER_DIMENSION;
      const frames = await decodeImageFrames(converted.buffer, 'gif', size, size);
      expect(frames.length).toBeGreaterThan(0);

      const opaqueSide = pixelAt(frames[0], size, Math.round(size * 0.2), Math.round(size / 2));
      const transparentSide = pixelAt(frames[0], size, Math.round(size * 0.9), Math.round(size / 2));
      expect(opaqueSide.a).toBeGreaterThan(200);
      expect(transparentSide.a).toBeLessThan(50);
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 30_000);

  it('should extract a single-frame (near-static) webm as a PNG instead of failing', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'webm-fixture-'));
    try {
      const webmPath = path.join(tmpDir, 'in.webm');
      // Telegram sends some "video" stickers as a single ~33ms frame. At our target fps
      // (see TARGET_GIF_FPS), a clip this short spans less than one output frame period,
      // so it must take the single-frame PNG-extraction path instead of the GIF path.
      await execFileAsync('ffmpeg', [
        '-y', '-f', 'lavfi',
        '-i', "color=c=red:s=64x64:d=0.033,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(X,32),0,255)'",
        '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-metadata:s:v:0', 'alpha_mode=1', '-auto-alt-ref', '0',
        '-frames:v', '1',
        webmPath,
      ]);
      const webmBuffer = await fs.promises.readFile(webmPath);

      const converted = await convertWebmToGif({ logger }, webmBuffer);
      expect(converted.extension).toEqual('png');
      const size = MAX_STICKER_DIMENSION;
      const frames = await decodeImageFrames(converted.buffer, 'png', size, size);
      expect(frames.length).toEqual(1);

      const opaqueSide = pixelAt(frames[0], size, Math.round(size * 0.2), Math.round(size / 2));
      const transparentSide = pixelAt(frames[0], size, Math.round(size * 0.9), Math.round(size / 2));
      expect(opaqueSide.a).toBeGreaterThan(200);
      expect(transparentSide.a).toBeLessThan(50);
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 30_000);
});

describe.skipIf(!RUN)('convertTgsToGif (integration)', () => {
  let renderer: TgsRenderer;

  beforeAll(async () => {
    renderer = await launchTgsRenderer();
  });

  afterAll(async () => {
    await renderer?.close();
  });

  it('should preserve real per-pixel transparency from a rendered Lottie animation', async () => {
    const lottieData = {
      v: '5.5.2', fr: 24, ip: 0, op: 24, w: 64, h: 64, nm: 'test', ddd: 0,
      assets: [],
      layers: [{
        ddd: 0, ind: 1, ty: 4, nm: 'shape', sr: 1,
        ks: {
          o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [32, 32, 0] },
          a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [{
          ty: 'gr',
          it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [40, 40] } },
            { ty: 'fl', c: { a: 0, k: [1, 0, 0, 1] }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        }],
        ip: 0, op: 24, st: 0, bm: 0,
      }],
    };
    const tgsBuffer = zlib.gzipSync(Buffer.from(JSON.stringify(lottieData)));

    const gif = await convertTgsToGif({ logger }, renderer, tgsBuffer);
    const frames = await decodeImageFrames(gif, 'gif', 64, 64);
    expect(frames.length).toBeGreaterThan(0);

    const corner = pixelAt(frames[0], 64, 0, 0);
    const center = pixelAt(frames[0], 64, 32, 32);
    expect(corner.a).toBeLessThan(50);
    expect(center.a).toBeGreaterThan(200);
  }, 30_000);
});
