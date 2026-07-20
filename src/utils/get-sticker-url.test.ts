import { describe, expect, it } from 'vitest';
import { getStickerUrl } from './get-sticker-url.js';

describe('getStickerUrl', () => {
  it('should use the sticker row url for regular stickers', () => {
    expect(getStickerUrl({ url: 'fs://a.webp', telegramSticker: null })).toEqual('fs://a.webp');
  });

  it('should use the shared Telegram sticker url for imported stickers', () => {
    expect(getStickerUrl({ url: null, telegramSticker: { url: 'fs://shared.webp' } })).toEqual('fs://shared.webp');
  });

  it('should prefer the shared url when both are present', () => {
    expect(getStickerUrl({ url: 'fs://stale.webp', telegramSticker: { url: 'fs://shared.webp' } })).toEqual('fs://shared.webp');
  });
});
