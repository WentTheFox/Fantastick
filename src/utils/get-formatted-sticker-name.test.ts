import { describe, expect, it } from 'vitest';
import { getFormattedStickerName } from './get-formatted-sticker-name.js';

describe('getFormattedStickerName', () => {
  it('should return the name of regular stickers verbatim', () => {
    expect(getFormattedStickerName({
      name: 'party parrot',
      emoji: null,
      order: 4,
      telegramFileUniqueId: null,
    })).toEqual('party parrot');
  });

  it('should derive the display name of imported stickers from the emoji and 1-based position', () => {
    expect(getFormattedStickerName({
      name: '',
      emoji: '😀',
      order: 2,
      telegramFileUniqueId: 'AgADBQAD',
    })).toEqual('😀#3');
  });

  it('should append the optional user-provided label of imported stickers', () => {
    expect(getFormattedStickerName({
      name: 'my label',
      emoji: '😀🎉',
      order: 0,
      telegramFileUniqueId: 'AgADBQAD',
    })).toEqual('😀🎉#1 my label');
  });

  it('should handle imported stickers without an emoji', () => {
    expect(getFormattedStickerName({
      name: '',
      emoji: null,
      order: 0,
      telegramFileUniqueId: 'AgADBQAD',
    })).toEqual('#1');
  });
});
