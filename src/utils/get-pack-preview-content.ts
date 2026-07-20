import { ButtonStyle, ComponentType, MessageFlags } from 'discord-api-types/v10';
import { APIMessageTopLevelComponent } from 'discord.js';
import { TFunction } from 'i18next';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack, Sticker } from '../generated/prisma/client.js';
import { BotMessageComponentCustomId } from '../types/bot-interaction.js';
import { FormattablePack, getFormattedPackName } from './get-formatted-pack-name.js';
import { StickerUrlSource } from './get-sticker-url.js';
import { mapStickersToGalleryItems } from './map-stickers-to-gallery-items.js';

export const packItemsPerPage = 9;

interface GetPackPreviewContentOptions {
  t: TFunction;
  pack: Pick<Pack, 'id'> & FormattablePack;
  stickers: (Pick<Sticker, 'description'> & StickerUrlSource)[];
  page: number;
  totalPages: number;
}

export const getPackPreviewContent = ({ t, pack, stickers, page, totalPages }: GetPackPreviewContentOptions) => {
  const { files, items } = mapStickersToGalleryItems(stickers);

  const components: APIMessageTopLevelComponent[] = [
    {
      type: ComponentType.TextDisplay,
      content: [
        `# ${getFormattedPackName(pack)}`,
        items.length === 0
          ? t('commands.pack.components.emptyPack')
          : t('commands.pack.components.packPreview'),
      ].join('\n'),
    },
  ];

  if (items.length > 0) {
    components.push({
      type: ComponentType.MediaGallery,
      items,
    });
  }

  if (totalPages > 1) {
    components.push({
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.PACK_PAGE_FIRST}:${pack.id}:${page}`,
          label: t('commands.pack.components.firstPageButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.SKIP_BACK },
          disabled: page <= 0,
        },
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.PACK_PAGE_PREV}:${pack.id}:${page}`,
          label: t('commands.pack.components.previousPageButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.ARROW_LEFT },
          disabled: page <= 0,
        },
        {
          type: ComponentType.Button,
          custom_id: 'pack-page-indicator',
          label: t('commands.pack.components.pageIndicator', { page: page + 1, totalPages }),
          style: ButtonStyle.Secondary,
          disabled: true,
        },
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.PACK_PAGE_NEXT}:${pack.id}:${page}`,
          label: t('commands.pack.components.nextPageButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.ARROW_RIGHT },
          disabled: page >= totalPages - 1,
        },
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.PACK_PAGE_LAST}:${pack.id}:${page}`,
          label: t('commands.pack.components.lastPageButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.SKIP_FORWARD },
          disabled: page >= totalPages - 1,
        },
      ],
    });
  }

  return {
    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] as const,
    components,
    files,
  };
};
