import { describe, expect, it } from 'vitest';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { packNameInvalidPattern } from './pack-name.option-meta.js';

describe('packNameInvalidPattern', () => {
  it('should match the paper plane character reserved for imported packs', () => {
    expect(`My ${EmojiCharacters.PAPER_PLANE} Pack`.match(packNameInvalidPattern)).toContain(EmojiCharacters.PAPER_PLANE);
  });

  it('should not match plain printable ASCII names', () => {
    expect('Perfectly Normal Pack 123'.match(packNameInvalidPattern)).toBeNull();
  });
});
