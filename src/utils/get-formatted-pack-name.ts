import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack, TelegramPack } from '../generated/prisma/client.js';
import { getPackNsfwEmoji } from './get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from './get-pack-visibility-emoji.js';
import { wrapUrlsInAngleBrackets } from './wrap-urls-in-angle-brackets.js';

export type PackNameSource = Pick<Pack, 'name'> & {
  telegramPack: Pick<TelegramPack, 'title'> | null;
};

export type FormattablePack = PackNameSource & Pick<Pack, 'public' | 'nsfw'>;

export const getPackDisplayName = (pack: PackNameSource) => pack.telegramPack !== null
  ? pack.telegramPack.title.replace(/(@([a-z_\d]+))/ig, '[$1](https://t.me/$2)')
  : pack.name;

// `escapeUrls` guards against Discord auto-embedding a link when the name is
// posted as raw message text; pass false where that can't happen (autocomplete
// choices, or text already wrapped in a code span) to avoid literal <> showing up.
export const getFormattedPackName = (pack: FormattablePack, escapeUrls = true) => {
  const importedPrefix = pack.telegramPack !== null ? `${EmojiCharacters.PAPER_PLANE} ` : '';
  const displayName = getPackDisplayName(pack);
  return `${getPackVisibilityEmoji(pack)} ${importedPrefix}${escapeUrls ? wrapUrlsInAngleBrackets(displayName) : displayName}${getPackNsfwEmoji(pack)}`;
};
