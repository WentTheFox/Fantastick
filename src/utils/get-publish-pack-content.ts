import { APIButtonComponent, ButtonStyle, ComponentType } from 'discord-api-types/v10';
import { APIMessageTopLevelComponent } from 'discord.js';
import { TFunction } from 'i18next';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { Pack, PrismaClient, Sticker, TelegramSticker } from '../generated/prisma/client.js';
import {
  stickerNameInvalidPattern,
  stickerNameOptionMeta,
} from '../options/metadata/sticker-name.option-meta.js';
import { BotMessageComponentCustomId } from '../types/bot-interaction.js';
import { findOrderedPackStickers } from './get-mass-edit-content.js';
import { FormattablePack, getFormattedPackName } from './get-formatted-pack-name.js';
import { mapStickersToGalleryItems } from './map-stickers-to-gallery-items.js';

export type PublishPack = Pick<Pack, 'id' | 'telegramPackId' | 'nsfw'> & FormattablePack;

export const isStickerNamePublishReady = (name: string) => (
  name.length >= stickerNameOptionMeta.min_length
  && name.length <= stickerNameOptionMeta.max_length
  && !name.match(stickerNameInvalidPattern)
  && !name.includes(EmojiCharacters.PAPER_PLANE)
);

export const isStickerRatingPublishReady = (sticker: Pick<Sticker, 'nsfwOverride'>) => sticker.nsfwOverride !== null;

// A sticker is ready to publish once it has a real, valid name and an explicit
// (non-"pack default") content rating
export const isStickerPublishReady = (sticker: Pick<Sticker, 'name' | 'nsfwOverride'>) => (
  isStickerNamePublishReady(sticker.name) && isStickerRatingPublishReady(sticker)
);

const formatRating = (t: TFunction, nsfwOverride: boolean | null) => {
  if (nsfwOverride === null) return t('commands.publish-imported-pack.components.ratingUnset');
  return nsfwOverride
    ? t('commands.publish-imported-pack.components.ratingNsfwLabel')
    : t('commands.publish-imported-pack.components.ratingSfwLabel');
};

const getPublishActionRow = (t: TFunction, pack: PublishPack, allReady: boolean): APIMessageTopLevelComponent => {
  const components: APIButtonComponent[] = [
    {
      type: ComponentType.Button,
      custom_id: `${BotMessageComponentCustomId.PUBLISH_CONFIRM}:${pack.id}`,
      label: t('commands.publish-imported-pack.components.publishButton'),
      style: ButtonStyle.Success,
      emoji: { name: EmojiCharacters.ROCKET },
      disabled: !allReady,
    },
  ];
  // Lets the publisher jump straight to the sticker blocking publish instead of
  // stepping through every sticker one by one to find it
  if (!allReady) {
    components.push({
      type: ComponentType.Button,
      custom_id: `${BotMessageComponentCustomId.PUBLISH_JUMP_INVALID}:${pack.id}`,
      label: t('commands.publish-imported-pack.components.jumpToInvalidButton'),
      style: ButtonStyle.Secondary,
    });
  }
  return { type: ComponentType.ActionRow, components };
};

interface GetPublishStickerContentOptions {
  t: TFunction;
  pack: PublishPack;
  sticker: Sticker & { telegramSticker: TelegramSticker | null };
  index: number;
  total: number;
  allReady: boolean;
}

export const getPublishStickerContent = ({ t, pack, sticker, index, total, allReady }: GetPublishStickerContentOptions) => {
  // The publisher is reviewing and rating these images themselves, so never spoiler
  // them here regardless of the sticker's resolved rating
  const { files, items } = mapStickersToGalleryItems([sticker], false);

  const nameReady = isStickerNamePublishReady(sticker.name);
  const ratingReady = isStickerRatingPublishReady(sticker);

  const stickerIdentifier = sticker.telegramSticker !== null
    ? `: \`${sticker.telegramSticker.emoji}#${sticker.telegramSticker.order + 1}\``
    : '';

  const components: APIMessageTopLevelComponent[] = [
    {
      type: ComponentType.TextDisplay,
      content: [
        t('commands.publish-imported-pack.components.reviewingText', {
          pack: getFormattedPackName(pack),
          position: index + 1,
          total,
          identifier: stickerIdentifier,
        }),
        t('commands.publish-imported-pack.components.currentNameText', {
          name: sticker.name ? `\`${sticker.name}\`` : t('commands.publish-imported-pack.components.ratingUnset'),
        }),
        t('commands.publish-imported-pack.components.currentRatingText', {
          rating: formatRating(t, sticker.nsfwOverride),
        }),
        `${nameReady ? EmojiCharacters.GREEN_CHECK : EmojiCharacters.CROSS_MARK} ${t('commands.publish-imported-pack.components.criteriaNameLabel')}`,
        `${ratingReady ? EmojiCharacters.GREEN_CHECK : EmojiCharacters.CROSS_MARK} ${t('commands.publish-imported-pack.components.criteriaRatingLabel')}`,
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
          custom_id: `${BotMessageComponentCustomId.PUBLISH_PREV}:${sticker.id}`,
          label: t('commands.publish-imported-pack.components.previousButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.ARROW_LEFT },
          disabled: index <= 0,
        },
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.PUBLISH_OPEN}:${sticker.id}`,
          label: t('commands.publish-imported-pack.components.editButton'),
          style: ButtonStyle.Primary,
          emoji: { name: EmojiCharacters.PENCIL },
        },
        {
          type: ComponentType.Button,
          custom_id: `${BotMessageComponentCustomId.PUBLISH_NEXT}:${sticker.id}`,
          label: t('commands.publish-imported-pack.components.nextButton'),
          style: ButtonStyle.Secondary,
          emoji: { name: EmojiCharacters.ARROW_RIGHT },
        },
      ],
    },
    getPublishActionRow(t, pack, allReady),
  ];

  return { components, files };
};

export const getPublishDoneContent = (t: TFunction, pack: PublishPack, allReady: boolean) => ({
  components: [
    {
      type: ComponentType.TextDisplay,
      content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.publish-imported-pack.components.allDoneText', {
        pack: getFormattedPackName(pack),
      })}`,
    },
    getPublishActionRow(t, pack, allReady),
  ] as APIMessageTopLevelComponent[],
  files: [],
});

interface GetPublishStepContentOptions {
  t: TFunction;
  db: PrismaClient;
  pack: PublishPack;
  currentStickerId: string;
  direction: 'prev' | 'next';
}

// Builds the message content for the sticker before/after the current one, or the
// completion text once the end of the pack is reached
export const getPublishStepContent = async ({ t, db, pack, currentStickerId, direction }: GetPublishStepContentOptions) => {
  const stickers = await findOrderedPackStickers(db, pack);
  const allReady = stickers.every(isStickerPublishReady);
  const currentIndex = stickers.findIndex(sticker => sticker.id === currentStickerId);
  const targetIndex = direction === 'prev' ? Math.max(0, currentIndex - 1) : currentIndex + 1;
  if (currentIndex === -1 || targetIndex >= stickers.length) {
    return getPublishDoneContent(t, pack, allReady);
  }

  return getPublishStickerContent({
    t,
    pack,
    sticker: stickers[targetIndex],
    index: targetIndex,
    total: stickers.length,
    allReady,
  });
};

interface GetPublishJumpToInvalidContentOptions {
  t: TFunction;
  db: PrismaClient;
  pack: PublishPack;
}

// Jumps straight to the first sticker that's still blocking publish, or the
// completion text if everything already passes (e.g. a race with another edit)
export const getPublishJumpToInvalidContent = async ({ t, db, pack }: GetPublishJumpToInvalidContentOptions) => {
  const stickers = await findOrderedPackStickers(db, pack);
  const targetIndex = stickers.findIndex(sticker => !isStickerPublishReady(sticker));
  const allReady = targetIndex === -1;
  if (allReady) {
    return getPublishDoneContent(t, pack, allReady);
  }

  return getPublishStickerContent({
    t,
    pack,
    sticker: stickers[targetIndex],
    index: targetIndex,
    total: stickers.length,
    allReady,
  });
};
