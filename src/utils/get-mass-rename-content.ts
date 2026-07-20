import { ButtonStyle, ComponentType } from 'discord-api-types/v10';
import { APIMessageTopLevelComponent } from 'discord.js';
import { TFunction } from 'i18next';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack, PrismaClient, Sticker, TelegramSticker } from '../generated/prisma/client.js';
import { BotMessageComponentCustomId } from '../types/bot-interaction.js';
import { FormattablePack, getFormattedPackName } from './get-formatted-pack-name.js';
import { getFormattedStickerName } from './get-formatted-sticker-name.js';
import { mapStickersToGalleryItems } from './map-stickers-to-gallery-items.js';

export type MassRenamePack = Pick<Pack, 'id' | 'telegramPackId'> & FormattablePack;

export const findOrderedPackStickers = (db: PrismaClient, pack: Pick<Pack, 'id' | 'telegramPackId'>) => db.sticker.findMany({
  where: { deletedAt: null, packId: pack.id },
  include: { telegramSticker: true },
  // Imported sticker order lives on the shared TelegramSticker row
  orderBy: pack.telegramPackId !== null ? { telegramSticker: { order: 'asc' } } : { order: 'asc' },
});

interface GetMassRenameStickerContentOptions {
  t: TFunction;
  pack: MassRenamePack;
  sticker: Sticker & { telegramSticker: TelegramSticker | null };
  index: number;
  total: number;
}

export const getMassRenameStickerContent = ({ t, pack, sticker, index, total }: GetMassRenameStickerContentOptions) => {
  const { files, items } = mapStickersToGalleryItems([sticker], pack.nsfw);

  const components: APIMessageTopLevelComponent[] = [
    {
      type: ComponentType.TextDisplay,
      content: t('commands.mass-rename-stickers.components.renamingText', {
        pack: getFormattedPackName(pack),
        position: index + 1,
        total,
        name: `\`${getFormattedStickerName(sticker)}\``,
      }),
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
          custom_id: `${BotMessageComponentCustomId.MASS_RENAME_OPEN}:${sticker.id}`,
          label: t('commands.mass-rename-stickers.components.renameButton'),
          style: ButtonStyle.Primary,
          emoji: { name: EmojiCharacters.PENCIL },
        },
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.MASS_RENAME_SKIP}:${sticker.id}`,
          label: t('commands.mass-rename-stickers.components.skipButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.SKIP_FORWARD },
        },
      ],
    },
  ];

  return { components, files };
};

export const getMassRenameDoneContent = (t: TFunction, pack: MassRenamePack) => ({
  components: [
    {
      type: ComponentType.TextDisplay,
      content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.mass-rename-stickers.components.allDoneText', {
        pack: getFormattedPackName(pack),
      })}`,
    },
  ] as APIMessageTopLevelComponent[],
  files: [],
});

interface GetMassRenameNextContentOptions {
  t: TFunction;
  db: PrismaClient;
  pack: MassRenamePack;
  currentStickerId: string;
}

// Builds the message content for the sticker following the current one, or the
// completion text once the end of the pack is reached
export const getMassRenameNextContent = async ({ t, db, pack, currentStickerId }: GetMassRenameNextContentOptions) => {
  const stickers = await findOrderedPackStickers(db, pack);
  const currentIndex = stickers.findIndex(sticker => sticker.id === currentStickerId);
  const nextIndex = currentIndex + 1;
  if (currentIndex === -1 || nextIndex >= stickers.length) {
    return getMassRenameDoneContent(t, pack);
  }

  return getMassRenameStickerContent({
    t,
    pack,
    sticker: stickers[nextIndex],
    index: nextIndex,
    total: stickers.length,
  });
};
