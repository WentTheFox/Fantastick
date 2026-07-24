import { APIMessage } from 'discord-api-types/v9';
import {
  ChatInputCommandInteraction,
  Message,
  ModalSubmitInteraction,
} from 'discord.js';
import { Sticker } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';

type MessageType =
  | Pick<Message, 'id' | 'channelId' | 'guildId'>
  | Pick<APIMessage, 'id' | 'channel_id'>;

interface RecordStickerMessagesParams {
  context: Pick<InteractionContext, 'db'>;
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction;
  stickers: Sticker[];
  replyMessage: MessageType;
  isFeed?: boolean;
  userId?: bigint | null;
}

/**
 * Store sticker ID for app replies (for "update" context menu command later)
 */
export const recordStickerMessages = ({
  context,
  interaction,
  stickers,
  replyMessage,
  isFeed = false,
  userId = null,
}: RecordStickerMessagesParams) => {
  const { db } = context;
  const messageChannelId = 'channelId' in replyMessage ? replyMessage.channelId : replyMessage.channel_id;
  const messageGuildId = 'guildId' in replyMessage ? replyMessage.guildId : null;
  return db.$transaction(stickers.map(sticker => db.stickerMessage.create({
    data: {
      messageId: BigInt(replyMessage.id),
      serverId: messageGuildId ? BigInt(messageGuildId) : null,
      channelId: messageChannelId ? BigInt(messageChannelId) : null,
      interactionToken: interaction.token,
      interactionId: interaction.id,
      stickerId: sticker.id,
      isFeed,
      userId,
    },
  })));
};
