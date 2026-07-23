import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as zlib from 'node:zlib';
import puppeteer, { Browser } from 'puppeteer-core';
import { LoggerContext } from '../types/contexts/logger.context.js';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

// Telegram animated stickers are up to 512x512, ≤3s — those are defensive caps against
// pathological/malicious input, not the values we actually encode at. GIF is a heavy
// format (no inter-frame prediction like video codecs), so rendering/encoding at the
// full 512x512 blows both the reply time and Discord's attachment size limits — a single
// busy animated sticker at 512px can be 8-12MB, and a pack preview attaches up to 9 of
// them at once. Keep the framerate as high as the source allows (motion reads as choppy
// otherwise) and rely on resolution alone to control size — 256x256 (half Telegram's max)
// keeps even a busy sticker under ~4MB.
export const MAX_STICKER_DIMENSION = 256;
export const MAX_STICKER_DURATION_MS = 3_000;
export const TARGET_GIF_FPS = 24;

// child_process throws ENOENT when the executable itself can't be found (as opposed
// to e.g. a non-zero exit code from a found-but-failing ffmpeg invocation).
export const isFfmpegUnavailableError = (e: unknown): boolean =>
  e instanceof Error && (e as NodeJS.ErrnoException).code === 'ENOENT';

// puppeteer-core doesn't throw a typed/coded error for a missing browser binary,
// only these specific messages (see BrowserLauncher.js in puppeteer-core).
export const isChromiumUnavailableError = (e: unknown): boolean =>
  e instanceof Error && /executablePath|Could not find|Browser was not found/i.test(e.message);

interface LottieData {
  w?: number;
  h?: number;
  fr?: number;
  ip?: number;
  op?: number;
  [key: string]: unknown;
}

export interface TgsRenderPlan {
  width: number;
  height: number;
  frameCount: number;
}

export const computeTgsRenderPlan = (lottieData: LottieData): TgsRenderPlan => {
  const width = Math.min(lottieData.w && lottieData.w > 0 ? lottieData.w : MAX_STICKER_DIMENSION, MAX_STICKER_DIMENSION);
  const height = Math.min(lottieData.h && lottieData.h > 0 ? lottieData.h : MAX_STICKER_DIMENSION, MAX_STICKER_DIMENSION);
  const sourceFps = lottieData.fr && lottieData.fr > 0 ? lottieData.fr : TARGET_GIF_FPS;
  const totalFrames = Math.max(0, (lottieData.op ?? 0) - (lottieData.ip ?? 0));
  const durationMs = totalFrames > 0 ? (totalFrames / sourceFps) * 1000 : 0;
  const cappedDurationMs = Math.min(durationMs > 0 ? durationMs : MAX_STICKER_DURATION_MS, MAX_STICKER_DURATION_MS);
  const frameCount = Math.max(1, Math.round((cappedDurationMs / 1000) * TARGET_GIF_FPS));

  return { width, height, frameCount };
};

export interface TgsRenderer {
  close: () => Promise<void>;
  browser: Browser;
}

export const launchTgsRenderer = async (): Promise<TgsRenderer> => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  return {
    browser,
    close: () => browser.close(),
  };
};

const lottieWebSourcePath = require.resolve('lottie-web/build/player/lottie.min.js');

export const convertTgsToGif = async (context: LoggerContext, renderer: TgsRenderer, tgsBuffer: Buffer): Promise<Buffer> => {
  const lottieJson = zlib.gunzipSync(tgsBuffer).toString('utf-8');
  const lottieData = JSON.parse(lottieJson) as LottieData;
  const { width, height, frameCount } = computeTgsRenderPlan(lottieData);

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tgs-'));
  const page = await renderer.browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
      <div id="c" style="width:${width}px;height:${height}px"></div>
    </body></html>`);
    const lottieWebSource = await fs.promises.readFile(lottieWebSourcePath, 'utf-8');
    await page.addScriptTag({ content: lottieWebSource });

    await page.evaluate((data: LottieData) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lottie = (window as any).lottie;
      lottie.loadAnimation({
        container: document.getElementById('c'),
        renderer: 'canvas',
        loop: false,
        autoplay: false,
        animationData: data,
        rendererSettings: { clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' },
      });
    }, lottieData);

    const totalSourceFrames = Math.max(0, (lottieData.op ?? 0) - (lottieData.ip ?? 0));
    const framePaths: string[] = [];
    for (let i = 0; i < frameCount; i++) {
      const sourceFrame = totalSourceFrames > 0 ? (i / frameCount) * totalSourceFrames : 0;
      await page.evaluate((frame: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).lottie.goToAndStop(frame, true);
      }, sourceFrame);
      const framePath = path.join(tmpDir, `frame-${String(i).padStart(4, '0')}.png`);
      await page.screenshot({ path: framePath as `${string}.png`, omitBackground: true });
      framePaths.push(framePath);
    }

    context.logger.info(`[convertTgsToGif] rendered ${framePaths.length} frames at ${width}x${height}`);
    return await encodeFramesToGif(tmpDir, TARGET_GIF_FPS);
  } finally {
    await page.close().catch(() => undefined);
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
};

const encodeFramesToGif = async (framesDir: string, fps: number): Promise<Buffer> => {
  const palettePath = path.join(framesDir, 'palette.png');
  const outPath = path.join(framesDir, 'out.gif');
  const inputPattern = path.join(framesDir, 'frame-%04d.png');

  await execFileAsync('ffmpeg', [
    '-y', '-framerate', String(fps), '-i', inputPattern,
    '-vf', 'format=rgba,palettegen=reserve_transparent=1:transparency_color=ffffff',
    palettePath,
  ]);
  await execFileAsync('ffmpeg', [
    '-y', '-framerate', String(fps), '-i', inputPattern, '-i', palettePath,
    '-lavfi', 'format=rgba,paletteuse=alpha_threshold=128',
    '-gifflags', '-offsetting',
    outPath,
  ]);
  return fs.promises.readFile(outPath);
};

export interface ConvertedStickerImage {
  buffer: Buffer;
  extension: 'gif' | 'png';
}

// ffmpeg's default/native vp9 decoder silently drops the WebM alpha channel (decodes as
// yuv420p, fully opaque); only the libvpx-wrapped decoder honors it.
const vp9DecoderArgs = ['-c:v', 'libvpx-vp9'];

const getWebmFrameCount = async (inPath: string): Promise<number> => {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-count_frames', '-show_entries', 'stream=nb_read_frames',
    '-of', 'csv=p=0', inPath,
  ]);
  return parseInt(stdout.trim(), 10) || 0;
};

export const convertWebmToGif = async (context: LoggerContext, webmBuffer: Buffer): Promise<ConvertedStickerImage> => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'webm-'));
  try {
    const inPath = path.join(tmpDir, 'in.webm');
    await fs.promises.writeFile(inPath, webmBuffer);

    // Some Telegram "video" stickers are a single frame lasting only a few ms (effectively
    // static). Extract those as a PNG instead of forcing them through GIF's lossy 256-color/
    // 1-bit-alpha palette — smaller, higher quality, and sidesteps the fact that a source
    // shorter than one output frame period makes ffmpeg's `fps` filter emit zero frames.
    const frameCount = await getWebmFrameCount(inPath);
    if (frameCount <= 1) {
      const pngPath = path.join(tmpDir, 'out.png');
      await execFileAsync('ffmpeg', [
        '-y', ...vp9DecoderArgs, '-i', inPath,
        '-vf', `format=rgba,scale=${MAX_STICKER_DIMENSION}:${MAX_STICKER_DIMENSION}:force_original_aspect_ratio=decrease`,
        '-frames:v', '1',
        pngPath,
      ]);
      context.logger.info('[convertWebmToGif] single-frame webm, extracted as PNG');
      return { buffer: await fs.promises.readFile(pngPath), extension: 'png' };
    }

    const palettePath = path.join(tmpDir, 'palette.png');
    const outPath = path.join(tmpDir, 'out.gif');
    const durationSeconds = String(MAX_STICKER_DURATION_MS / 1000);
    const scaleFilter = `format=yuva420p,fps=${TARGET_GIF_FPS},scale=${MAX_STICKER_DIMENSION}:${MAX_STICKER_DIMENSION}:force_original_aspect_ratio=decrease`;

    await execFileAsync('ffmpeg', [
      '-y', ...vp9DecoderArgs, '-t', durationSeconds, '-i', inPath,
      '-vf', `${scaleFilter},palettegen=reserve_transparent=1:transparency_color=ffffff`,
      palettePath,
    ]);
    await execFileAsync('ffmpeg', [
      '-y', ...vp9DecoderArgs, '-t', durationSeconds, '-i', inPath, '-i', palettePath,
      '-lavfi', `${scaleFilter}[x];[x][1:v]paletteuse=alpha_threshold=128`,
      '-gifflags', '-offsetting',
      outPath,
    ]);

    context.logger.info(`[convertWebmToGif] encoded ${webmBuffer.length} byte webm to gif`);
    return { buffer: await fs.promises.readFile(outPath), extension: 'gif' };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
};
