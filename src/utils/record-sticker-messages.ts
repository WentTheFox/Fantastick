import { APIMessage } from 'discord-api-types/v9';
import { Message } from 'discord.js';
import { Sticker } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/bot-interaction.js';

type MessageType =
  | Pick<Message, 'id' | 'channelId' | 'guildId'>
  | Pick<APIMessage, 'id' | 'channel_id'>;

/**
 * Store sticker ID for app replies (for "update" context menu command later)
 */
export const recordStickerMessages = ({ db }: Pick<InteractionContext, 'db'>, stickers: Sticker[], replyMessage: MessageType) => {
  const messageChannelId = 'channelId' in replyMessage ? replyMessage.channelId : replyMessage.channel_id;
  const messageGuildId = 'guildId' in replyMessage ? replyMessage.guildId : null;
  return db.$transaction(stickers.map(sticker => db.stickerMessage.create({
    data: {
      messageId: BigInt(replyMessage.id),
      serverId: messageGuildId ? BigInt(messageGuildId) : null,
      channelId: messageChannelId ? BigInt(messageChannelId) : null,
      stickerId: sticker.id,
    },
  })));
};
