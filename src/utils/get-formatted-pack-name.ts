import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack } from '../generated/prisma/client.js';
import { getPackNsfwEmoji } from './get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from './get-pack-visibility-emoji.js';
import { wrapUrlsInAngleBrackets } from './wrap-urls-in-angle-brackets.js';

export const getFormattedPackName = (pack: Pick<Pack, 'name' | 'public' | 'nsfw' | 'telegramPackName'>) => {
  const importedPrefix = pack.telegramPackName !== null ? `${EmojiCharacters.PAPER_PLANE} ` : '';
  return `${getPackVisibilityEmoji(pack)} ${importedPrefix}${wrapUrlsInAngleBrackets(pack.name)}${getPackNsfwEmoji(pack)}`;
};
