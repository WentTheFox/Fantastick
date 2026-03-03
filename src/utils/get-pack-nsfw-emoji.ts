import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack } from '../generated/prisma/client.js';

export const getPackNsfwEmoji = (pack: Pick<Pack, 'nsfw'>) => pack.nsfw ? ` ${EmojiCharacters.NO_ONE_UNDER_18}` : '';
