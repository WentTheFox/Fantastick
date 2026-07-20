import { describe, expect, it } from 'vitest';
import { getFormattedStickerName } from './get-formatted-sticker-name.js';

describe('getFormattedStickerName', () => {
  it('should return the name of regular stickers verbatim', () => {
    expect(getFormattedStickerName({
      name: 'party parrot',
      telegramSticker: null,
    })).toEqual('party parrot');
  });

  it('should derive the display name of imported stickers from the emoji and 1-based position', () => {
    expect(getFormattedStickerName({
      name: '',
      telegramSticker: { emoji: '😀', order: 2 },
    })).toEqual('😀#3');
  });

  it('should append the optional user-provided label of imported stickers', () => {
    expect(getFormattedStickerName({
      name: 'my label',
      telegramSticker: { emoji: '😀🎉', order: 0 },
    })).toEqual('😀🎉#1 my label');
  });
});
