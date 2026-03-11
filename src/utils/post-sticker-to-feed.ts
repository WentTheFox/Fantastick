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
import { Pack, Sticker } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/bot-interaction.js';
import { getPackNsfwEmoji } from './get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from './get-pack-visibility-emoji.js';
import { mapStickersToGalleryItems } from './map-stickers-to-gallery-items.js';
import { recordStickerMessages } from './record-sticker-messages.js';

export interface StickerSnapshot {
  name: string;
  description: string | null;
  url: string;
}

const mapDescription = (description: string | null, prefix: string) => (
  description ? [
    `**${prefix}:**`,
    `> ${description?.replace(/\n/g, '\n> ')}`,
  ] : [
    `**${prefix}:** _(empty)_`,
  ]
);
const wrapUrlInSpoiler = (userPack: Pick<Pack, 'nsfw'>, url: string) => {
  return userPack.nsfw ? `||${url}||` : url;
};

interface PostStickerToFeedParams {
  context: InteractionContext;
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction;
  sticker: Sticker;
  userPack: Pack;
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
  const { items, files } = mapStickersToGalleryItems(urlChanged ? [snapshot, sticker] : [sticker], userPack.nsfw);

  const nameChanged = snapshot && snapshot.name !== sticker.name;
  const descriptionChanged = snapshot && snapshot.description !== sticker.description;
  const reply = await webhookClient.send({
    flags: MessageFlags.SuppressNotifications,
    content: [
      `# Sticker ${action.replace(/e?$/, 'ed')}`,
      ...(nameChanged ? [`**Old name:** \`${snapshot.name}\``] : []),
      `**${nameChanged ? 'New name' : 'Name'}:** \`${sticker.name}\` (\`${sticker.id}\`)`,
      ...(descriptionChanged ? mapDescription(snapshot.description, 'Old description') : []),
      ...(mapDescription(sticker.description, descriptionChanged ? 'New description' : 'Description')),
      `**Created at:** ${time(sticker.createdAt, TimestampStyles.FullDateShortTime)} (${time(sticker.createdAt, TimestampStyles.RelativeTime)})`,
      ...(sticker.updatedAt ? [`**Updated at:** ${time(sticker.updatedAt, TimestampStyles.FullDateShortTime)} (${time(sticker.updatedAt, TimestampStyles.RelativeTime)})`] : []),
      ...(sticker.deletedAt ? [`**Deleted at:** ${time(sticker.deletedAt, TimestampStyles.FullDateShortTime)} (${time(sticker.deletedAt, TimestampStyles.RelativeTime)})`] : []),
      `**Created by:** ${userMention(interaction.user.id)} (\`${interaction.user.id}\`)`,
      ...(sticker.deletedBy ? [`**Deleted by:** ${userMention(String(sticker.deletedBy))} (\`${sticker.deletedBy}\`)`] : []),
      `**Pack:** \`${userPack.name}\` (\`${userPack.id}\`) ${getPackVisibilityEmoji(userPack)}${getPackNsfwEmoji(userPack)}`,
      ...(urlChanged ? [`**Old URL:** ${wrapUrlInSpoiler(userPack, snapshot.url)}`, `**New URL:** \`${sticker.url}\``] : []),
      `**Image:** ${items.filter(item => !item.media.url.startsWith('attachment://')).map(item => wrapUrlInSpoiler(userPack, item.media.url)).join(' ')}`,
    ].join('\n'),
    files,
  });

  await recordStickerMessages(context, [sticker], reply);
};
