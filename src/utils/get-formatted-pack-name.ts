import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack, TelegramPack } from '../generated/prisma/client.js';
import { getPackNsfwEmoji } from './get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from './get-pack-visibility-emoji.js';
import { wrapUrlsInAngleBrackets } from './wrap-urls-in-angle-brackets.js';

export type PackNameSource = Pick<Pack, 'name'> & {
  telegramPack: Pick<TelegramPack, 'title'> | null;
};

export type FormattablePack = PackNameSource & Pick<Pack, 'public' | 'nsfw'>;

export const getPackDisplayName = (pack: PackNameSource) => pack.telegramPack !== null ? pack.telegramPack.title : pack.name;

export const getFormattedPackName = (pack: FormattablePack) => {
  const importedPrefix = pack.telegramPack !== null ? `${EmojiCharacters.PAPER_PLANE} ` : '';
  return `${getPackVisibilityEmoji(pack)} ${importedPrefix}${wrapUrlsInAngleBrackets(getPackDisplayName(pack))}${getPackNsfwEmoji(pack)}`;
};
