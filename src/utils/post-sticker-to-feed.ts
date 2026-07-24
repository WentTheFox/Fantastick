import { time } from '@discordjs/formatters';
import { MessageFlags } from 'discord-api-types/v10';
import {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  TimestampStyles,
  userMention,
  WebhookClient,
} from 'discord.js';
import { env } from '../env.js';
import { Pack, Sticker, TelegramPack, TelegramSticker } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';
import { getFormattedStickerName } from './get-formatted-sticker-name.js';
import { getStickerUrl } from './get-sticker-url.js';
import { getPackNsfwEmoji } from './get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from './get-pack-visibility-emoji.js';
import { mapStickersToGalleryItems } from './map-stickers-to-gallery-items.js';
import { recordStickerMessages } from './record-sticker-messages.js';
import { resolveStickerNsfw } from './resolve-sticker-nsfw.js';
import { wrapUrlsInAngleBrackets } from './wrap-urls-in-angle-brackets.js';

export interface StickerSnapshot {
  name: string;
  description: string | null;
  url: string | null;
  nsfwOverride: boolean | null;
}

const formatRating = (nsfwOverride: boolean | null) => {
  if (nsfwOverride === null) return 'pack default';
  return nsfwOverride ? 'NSFW' : 'SFW';
};

const formatName = (name: string) => name ? `\`${name}\`` : '_(empty)_';

const mapDescription = (description: string | null, prefix: string) => (
  description ? [
    `**${prefix}:**`,
    `> ${description?.replace(/\n/g, '\n> ')}`,
  ] : [
    `**${prefix}:** _(empty)_`,
  ]
);
interface PostStickerToFeedParams {
  context: InteractionContext;
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction;
  sticker: Sticker & { telegramSticker: TelegramSticker | null };
  userPack: Pack & { telegramPack?: TelegramPack | null };
  action: 'create' | 'edit' | 'import' | 'delete';
  snapshot?: StickerSnapshot;
}

export const postStickerToFeed = async ({
  context,
  interaction,
  sticker,
  userPack,
  action,
  snapshot,
}: PostStickerToFeedParams) => {
  if (env.DISCORD_FEED_WEBHOOK_URL === null) {
    return;
  }

  const webhookClient = new WebhookClient({ url: env.DISCORD_FEED_WEBHOOK_URL });
  const urlChanged = snapshot && snapshot.url !== sticker.url;
  const spoiler = resolveStickerNsfw(sticker, userPack);
  const {
    items,
    files,
  } = mapStickersToGalleryItems(urlChanged ? [snapshot, sticker] : [sticker], spoiler);

  const nameChanged = snapshot && snapshot.name !== sticker.name;
  const descriptionChanged = snapshot && snapshot.description !== sticker.description;
  const ratingChanged = snapshot && snapshot.nsfwOverride !== sticker.nsfwOverride;
  const replyMessage = await webhookClient.send({
    flags: MessageFlags.SuppressNotifications,
    content: [
      `# Sticker ${action.replace(/e?$/, 'ed')}`,
      ...(nameChanged ? [`**Old name:** ${formatName(snapshot.name)}`] : []),
      `**${nameChanged ? 'New name' : 'Name'}:** ${formatName(getFormattedStickerName(sticker))} (\`${sticker.id}\`)`,
      ...(descriptionChanged ? mapDescription(snapshot.description, 'Old description') : []),
      ...(mapDescription(sticker.description, descriptionChanged ? 'New description' : 'Description')),
      `**Rating:** \`${formatRating(sticker.nsfwOverride)}\`${ratingChanged ? ` (was \`${formatRating(snapshot.nsfwOverride)}\`)` : ''}`,
      `**Created at:** ${time(sticker.createdAt, TimestampStyles.FullDateShortTime)} (${time(sticker.createdAt, TimestampStyles.RelativeTime)})`,
      ...(sticker.updatedAt ? [`**Updated at:** ${time(sticker.updatedAt, TimestampStyles.FullDateShortTime)} (${time(sticker.updatedAt, TimestampStyles.RelativeTime)})`] : []),
      ...(sticker.deletedAt ? [`**Deleted at:** ${time(sticker.deletedAt, TimestampStyles.FullDateShortTime)} (${time(sticker.deletedAt, TimestampStyles.RelativeTime)})`] : []),
      `**Created by:** ${userMention(interaction.user.id)} (\`${interaction.user.id}\`)`,
      ...(sticker.deletedBy ? [`**Deleted by:** ${userMention(String(sticker.deletedBy))} (\`${sticker.deletedBy}\`)`] : []),
      `**Pack:** \`${wrapUrlsInAngleBrackets(userPack.telegramPack?.title ?? userPack.name)}\` (\`${userPack.id}\`) ${getPackVisibilityEmoji(userPack)}${getPackNsfwEmoji(userPack)}`,
      ...(urlChanged ? [`**Old URL:** ${snapshot.url || '_(none)_'}`, `**New URL:** \`${getStickerUrl(sticker)}\``] : []),
      `**Image:** ${items.filter(item => !item.media.url.startsWith('attachment://')).map(item => item.media.url).join(' ')}`,
    ].join('\n'),
    files,
  });

  await recordStickerMessages({
    context,
    interaction,
    stickers: [sticker],
    replyMessage,
    isFeed: true,
  });
};
