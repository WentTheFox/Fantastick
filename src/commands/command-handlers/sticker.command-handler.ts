import { MessageFlags } from 'discord-api-types/v10';
import { ChatInputCommandInteraction } from 'discord.js';
import { StickerWhereInput } from '../../generated/prisma/models/Sticker.js';
import { BotChatInputCommandName, InteractionHandler } from '../../types/bot-interaction.js';
import { StickerCommandOptionName } from '../../types/localization.js';
import { findAvailableStickerPacks } from '../../utils/find-available-sticker-packs.js';
import { getStickerMessageContent } from '../../utils/get-sticker-message-content.js';
import { createCommandMention, interactionReply } from '../../utils/interaction-reply.js';
import { isUuidV4 } from '../../utils/is-uuid-v4.js';
import { recordStickerMessages } from '../../utils/record-sticker-messages.js';

export const stickerCommandHandler = (nsfw: boolean): InteractionHandler<ChatInputCommandInteraction> => async function handle(interaction, context) {
  const { t, db } = context;
  const stickerQuery = interaction.options.getString(StickerCommandOptionName.NAME, true);
  const preview = interaction.options.getBoolean(StickerCommandOptionName.PREVIEW) ?? false;
  const availablePacks = await findAvailableStickerPacks(context, interaction, nsfw);
  if (availablePacks.length === 0) {
    await interactionReply(context, interaction, {
      content: t('commands.sticker.responses.noPacks', {
        createCommand: createCommandMention(BotChatInputCommandName.CREATE_PACK, context),
      }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const reply = await interaction.deferReply();

  const searchConditions: StickerWhereInput[] = [
    { name: stickerQuery },
  ];
  if (isUuidV4(stickerQuery)) {
    searchConditions.push({ id: stickerQuery });
  }

  const stickers = await db.sticker.findMany({
    where: {
      deletedAt: null,
      OR: searchConditions,
      packId: {
        in: availablePacks.map(pack => pack.id),
      },
    },
    take: 1,
  });
  if (!stickers) {
    await interactionReply(context, interaction, {
      content: t('commands.sticker.responses.invalidName'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interactionReply(context, interaction, {
    flags: preview ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] : MessageFlags.IsComponentsV2,
    ...getStickerMessageContent({ context, stickers, preview }),
  });

  if (!preview) {
    const replyMessage = await reply.fetch();
    await recordStickerMessages({ context, interaction, stickers, replyMessage });
  }
};
