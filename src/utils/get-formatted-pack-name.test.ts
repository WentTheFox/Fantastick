import { describe, expect, it } from 'vitest';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { getFormattedPackName, getPackDisplayName } from './get-formatted-pack-name.js';

describe('getPackDisplayName', () => {
  it('should use the pack name for regular packs', () => {
    expect(getPackDisplayName({ name: 'My Pack', telegramPack: null })).toEqual('My Pack');
  });

  it('should use the Telegram title for imported packs', () => {
    expect(getPackDisplayName({ name: '', telegramPack: { title: 'Telegram Title' } })).toEqual('Telegram Title');
  });
});

describe('getFormattedPackName', () => {
  it('should format regular packs without an import prefix', () => {
    expect(getFormattedPackName({
      name: 'My Pack',
      public: true,
      nsfw: false,
      telegramPack: null,
    })).toEqual(`${EmojiCharacters.GLOBE} My Pack`);
  });

  it('should prefix imported pack names with the paper plane character', () => {
    expect(getFormattedPackName({
      name: '',
      public: true,
      nsfw: false,
      telegramPack: { title: 'Imported Pack' },
    })).toEqual(`${EmojiCharacters.GLOBE} ${EmojiCharacters.PAPER_PLANE} Imported Pack`);
  });

  it('should keep the NSFW and visibility emoji composition', () => {
    expect(getFormattedPackName({
      name: 'Secret Pack',
      public: false,
      nsfw: true,
      telegramPack: null,
    })).toEqual(`${EmojiCharacters.LOCKED} Secret Pack ${EmojiCharacters.NO_ONE_UNDER_18}`);
  });

  it('should wrap URLs in pack names in angle brackets', () => {
    expect(getFormattedPackName({
      name: '',
      public: false,
      nsfw: false,
      telegramPack: { title: 'Visit https://example.com/pack now' },
    })).toEqual(`${EmojiCharacters.LOCKED} ${EmojiCharacters.PAPER_PLANE} Visit <https://example.com/pack> now`);
  });
});
