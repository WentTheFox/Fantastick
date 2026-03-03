import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack } from '../generated/prisma/client.js';

export const getPackVisibilityEmoji = (pack: Pick<Pack, 'public'>) => pack.public ? EmojiCharacters.GLOBE : EmojiCharacters.LOCKED;
