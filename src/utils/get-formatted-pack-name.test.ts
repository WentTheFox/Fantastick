import { describe, expect, it } from 'vitest';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { getFormattedPackName } from './get-formatted-pack-name.js';

describe('getFormattedPackName', () => {
  it('should format regular packs without an import prefix', () => {
    expect(getFormattedPackName({
      name: 'My Pack',
      public: true,
      nsfw: false,
      telegramPackName: null,
    })).toEqual(`${EmojiCharacters.GLOBE} My Pack`);
  });

  it('should prefix imported pack names with the paper plane character', () => {
    expect(getFormattedPackName({
      name: 'Imported Pack',
      public: true,
      nsfw: false,
      telegramPackName: 'imported_pack',
    })).toEqual(`${EmojiCharacters.GLOBE} ${EmojiCharacters.PAPER_PLANE} Imported Pack`);
  });

  it('should keep the NSFW and visibility emoji composition', () => {
    expect(getFormattedPackName({
      name: 'Secret Pack',
      public: false,
      nsfw: true,
      telegramPackName: null,
    })).toEqual(`${EmojiCharacters.LOCKED} Secret Pack ${EmojiCharacters.NO_ONE_UNDER_18}`);
  });

  it('should wrap URLs in pack names in angle brackets', () => {
    expect(getFormattedPackName({
      name: 'Visit https://example.com/pack now',
      public: true,
      nsfw: false,
      telegramPackName: 'url_pack',
    })).toEqual(`${EmojiCharacters.GLOBE} ${EmojiCharacters.PAPER_PLANE} Visit <https://example.com/pack> now`);
  });
});
