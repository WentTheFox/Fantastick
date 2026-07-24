import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import { APIMessageTopLevelComponent } from 'discord.js';
import { TFunction } from 'i18next';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack, PrismaClient, Sticker, TelegramSticker } from '../generated/prisma/client.js';
import { BotMessageComponentCustomId } from '../types/bot-interaction.js';
import { FormattablePack, getFormattedPackName } from './get-formatted-pack-name.js';
import { mapStickersToGalleryItems } from './map-stickers-to-gallery-items.js';
import { resolveStickerNsfw } from './resolve-sticker-nsfw.js';

export type MassEditPack = Pick<Pack, 'id' | 'telegramPackId' | 'nsfw'> & FormattablePack;

export const findOrderedPackStickers = (db: PrismaClient, pack: Pick<Pack, 'id' | 'telegramPackId'>) => db.sticker.findMany({
  where: { deletedAt: null, packId: pack.id },
  include: { telegramSticker: true },
  // Imported sticker order lives on the shared TelegramSticker row
  orderBy: pack.telegramPackId !== null ? { telegramSticker: { order: 'asc' } } : { order: 'asc' },
});

interface GetMassEditStickerContentOptions {
  t: TFunction;
  pack: MassEditPack;
  sticker: Sticker & { telegramSticker: TelegramSticker | null };
  index: number;
  total: number;
}

export const getMassEditStickerContent = ({ t, pack, sticker, index, total }: GetMassEditStickerContentOptions) => {
  const { files, items } = mapStickersToGalleryItems([sticker], resolveStickerNsfw(sticker, pack));

  // Imported stickers are identified by their emoji and position on the position line;
  // the current name (if any) gets its own line for both sticker types
  const stickerIdentifier = sticker.telegramSticker !== null
    ? `: \`${sticker.telegramSticker.emoji}#${sticker.telegramSticker.order + 1}\``
    : '';
  const components: APIMessageTopLevelComponent[] = [
    {
      type: ComponentType.TextDisplay,
      content: [
        t('commands.mass-edit-stickers.components.reviewingText', {
          pack: getFormattedPackName(pack),
          position: index + 1,
          total,
          identifier: stickerIdentifier,
        }),
        ...(sticker.name ? [t('commands.mass-edit-stickers.components.currentNameText', {
          name: `\`${sticker.name}\``,
        })] : []),
      ].join('\n'),
    },
    {
      type: ComponentType.MediaGallery,
      items,
    },
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.MASS_EDIT_PREV}:${sticker.id}`,
          label: t('commands.mass-edit-stickers.components.previousButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.ARROW_LEFT },
          disabled: index <= 0,
        },
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.MASS_EDIT_OPEN}:${sticker.id}`,
          label: t('commands.mass-edit-stickers.components.editButton'),
          style: ButtonStyle.Primary,
          emoji: { name: EmojiCharacters.PENCIL },
        },
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.MASS_EDIT_NEXT}:${sticker.id}`,
          label: t('commands.mass-edit-stickers.components.nextButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.ARROW_RIGHT },
        },
      ],
    },
  ];

  return { components, files };
};

export const getMassEditDoneContent = (t: TFunction, pack: MassEditPack) => ({
  components: [
    {
      type: ComponentType.TextDisplay,
      content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.mass-edit-stickers.components.allDoneText', {
        pack: getFormattedPackName(pack),
      })}`,
    },
  ] as APIMessageTopLevelComponent[],
  files: [],
});

interface GetMassEditStepContentOptions {
  t: TFunction;
  db: PrismaClient;
  pack: MassEditPack;
  currentStickerId: string;
  direction: 'prev' | 'next';
}

// Builds the message content for the sticker before/after the current one, or the
// completion text once the end of the pack is reached
export const getMassEditStepContent = async ({ t, db, pack, currentStickerId, direction }: GetMassEditStepContentOptions) => {
  const stickers = await findOrderedPackStickers(db, pack);
  const currentIndex = stickers.findIndex(sticker => sticker.id === currentStickerId);
  const targetIndex = direction === 'prev' ? Math.max(0, currentIndex - 1) : currentIndex + 1;
  if (currentIndex === -1 || targetIndex >= stickers.length) {
    return getMassEditDoneContent(t, pack);
  }

  return getMassEditStickerContent({
    t,
    pack,
    sticker: stickers[targetIndex],
    index: targetIndex,
    total: stickers.length,
  });
};
