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

export const postStickerToFeed = async (context: InteractionContext, interaction: ChatInputCommandInteraction | ModalSubmitInteraction, sticker: Sticker, userPack: Pack) => {
  if (env.DISCORD_FEED_WEBHOOK_URL === null) {
    return;
  }

  const webhookClient = new WebhookClient({ url: env.DISCORD_FEED_WEBHOOK_URL });
  const { items, files } = mapStickersToGalleryItems([sticker], userPack.nsfw);
  const reply = await webhookClient.send({
    flags: MessageFlags.SuppressNotifications,
    content: [
      '# New sticker created',
      `**Name:** \`${sticker.name}\` (\`${sticker.id}\`)`,
      ...(sticker.description ? [
        '**Description:**',
        `> ${sticker.description?.replace(/\n/g, '\n> ')}`,
      ] : [
        '**Description:** _(empty)_',
      ]),
      `**Created at:** ${time(sticker.createdAt, TimestampStyles.FullDateShortTime)} (${time(sticker.createdAt, TimestampStyles.RelativeTime)})`,
      `**Created by:** ${userMention(interaction.user.id)} (\`${interaction.user.id}\`)`,
      `**Pack:** \`${userPack.name}\` (\`${userPack.id}\`) ${getPackVisibilityEmoji(userPack)}${getPackNsfwEmoji(userPack)}`,
      `**Image:** ${items.filter(item => !item.media.url.startsWith('attachment://')).map(item => userPack.nsfw ? `||${item.media.url}||` : item.media.url).join(' ')}`,
    ].join('\n'),
    files,
  });

  await recordStickerMessages(context, [sticker], reply);
};
