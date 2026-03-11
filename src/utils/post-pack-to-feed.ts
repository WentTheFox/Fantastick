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
import { Pack } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/bot-interaction.js';

export interface PackSnapshot {
  name: string;
  public: boolean;
  nsfw: boolean;
}

interface PostPackToFeedParams {
  context: InteractionContext;
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction;
  pack: Pack;
  action: 'create' | 'edit' | 'delete';
  snapshot?: PackSnapshot;
}

export const postPackToFeed = async ({
  interaction,
  pack,
  action,
  snapshot,
}: PostPackToFeedParams) => {
  if (env.DISCORD_FEED_WEBHOOK_URL === null) {
    return;
  }

  const webhookClient = new WebhookClient({ url: env.DISCORD_FEED_WEBHOOK_URL });

  const nameChanged = snapshot && snapshot.name !== pack.name;
  const nsfwChanged = snapshot && snapshot.nsfw !== pack.nsfw;
  const publicChanged = snapshot && snapshot.public !== pack.public;
  await webhookClient.send({
    flags: MessageFlags.SuppressNotifications,
    content: [
      `# Pack ${action.replace(/e?$/, 'ed')}`,
      ...(nameChanged ? [`**Old name:** \`${snapshot.name}\``] : []),
      `**${nameChanged ? 'New name' : 'Name'}:** \`${pack.name}\` (\`${pack.id}\`)`,
      `**Public:** \`${pack.public}\`${publicChanged ? ` (was \`${snapshot.public}\`)` : ''}`,
      `**NSFW:** \`${pack.nsfw}\`${nsfwChanged ? ` (was \`${snapshot.nsfw}\`)` : ''}`,
      `**Created at:** ${time(pack.createdAt, TimestampStyles.FullDateShortTime)} (${time(pack.createdAt, TimestampStyles.RelativeTime)})`,
      ...(pack.updatedAt ? [`**Updated at:** ${time(pack.updatedAt, TimestampStyles.FullDateShortTime)} (${time(pack.updatedAt, TimestampStyles.RelativeTime)})`] : []),
      ...(pack.deletedAt ? [`**Deleted at:** ${time(pack.deletedAt, TimestampStyles.FullDateShortTime)} (${time(pack.deletedAt, TimestampStyles.RelativeTime)})`] : []),
      `**Created by:** ${userMention(interaction.user.id)} (\`${interaction.user.id}\`)`,
      ...(pack.deletedBy ? [`**Deleted by:** ${userMention(String(pack.deletedBy))} (\`${pack.deletedBy}\`)`] : []),
    ].join('\n'),
  });
};
