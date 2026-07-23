import { describe, expect, it } from 'vitest';
import {
  computeTgsRenderPlan,
  isChromiumUnavailableError,
  isFfmpegUnavailableError,
  MAX_STICKER_DIMENSION,
  TARGET_GIF_FPS,
} from './convert-sticker-to-gif.js';

describe('computeTgsRenderPlan', () => {
  it('should use the animation dimensions and derive a frame count from fr/ip/op', () => {
    expect(computeTgsRenderPlan({ w: 150, h: 150, fr: 60, ip: 0, op: 60 })).toEqual({
      width: 150,
      height: 150,
      frameCount: TARGET_GIF_FPS,
    });
  });

  it('should fall back to the max dimension when w/h are missing or invalid', () => {
    const plan = computeTgsRenderPlan({ fr: 30, ip: 0, op: 30 });
    expect(plan.width).toEqual(MAX_STICKER_DIMENSION);
    expect(plan.height).toEqual(MAX_STICKER_DIMENSION);
  });

  it('should cap oversized dimensions at the max sticker dimension', () => {
    const plan = computeTgsRenderPlan({ w: 4000, h: 4000, fr: 30, ip: 0, op: 30 });
    expect(plan.width).toEqual(MAX_STICKER_DIMENSION);
    expect(plan.height).toEqual(MAX_STICKER_DIMENSION);
  });

  it('should cap a pathologically long duration at MAX_STICKER_DURATION_MS worth of frames', () => {
    const plan = computeTgsRenderPlan({ w: 512, h: 512, fr: 30, ip: 0, op: 30 * 3600 });
    expect(plan.frameCount).toEqual(3 * TARGET_GIF_FPS);
  });

  it('should default to a full-length render plan when fr/ip/op are missing', () => {
    const plan = computeTgsRenderPlan({});
    expect(plan.frameCount).toEqual(3 * TARGET_GIF_FPS);
  });

  it('should always produce at least one frame', () => {
    const plan = computeTgsRenderPlan({ fr: 30, ip: 0, op: 0 });
    expect(plan.frameCount).toBeGreaterThanOrEqual(1);
  });
});

describe('isFfmpegUnavailableError', () => {
  it('should recognize an ENOENT error from a missing ffmpeg binary', () => {
    const error = Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' });
    expect(isFfmpegUnavailableError(error)).toBe(true);
  });

  it('should not treat a non-ENOENT error as ffmpeg being unavailable', () => {
    const error = Object.assign(new Error('ffmpeg exited with code 1'), { code: 1 });
    expect(isFfmpegUnavailableError(error)).toBe(false);
  });

  it('should not treat non-Error values as ffmpeg being unavailable', () => {
    expect(isFfmpegUnavailableError('some string')).toBe(false);
  });
});

describe('isChromiumUnavailableError', () => {
  it('should recognize a missing-executablePath error', () => {
    expect(isChromiumUnavailableError(new Error('Browser was not found at the configured executablePath (/nonexistent/chromium)'))).toBe(true);
  });

  it('should recognize an unspecified executablePath/channel error', () => {
    expect(isChromiumUnavailableError(new Error('An `executablePath` or `channel` must be specified for `puppeteer-core`'))).toBe(true);
  });

  it('should not treat an unrelated puppeteer error as chromium being unavailable', () => {
    expect(isChromiumUnavailableError(new Error('Navigation timeout of 30000 ms exceeded'))).toBe(false);
  });
});
