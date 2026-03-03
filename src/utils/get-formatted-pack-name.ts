import { Pack } from '../generated/prisma/client.js';
import { getPackNsfwEmoji } from './get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from './get-pack-visibility-emoji.js';

export const getFormattedPackName = (pack: Pick<Pack, 'name' | 'public' | 'nsfw'>) => `${getPackVisibilityEmoji(pack)} ${pack.name}${getPackNsfwEmoji(pack)}`;
