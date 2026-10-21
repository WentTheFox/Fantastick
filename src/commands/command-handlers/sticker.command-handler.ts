import { MessageFlags } from 'discord-api-types/v10';
import { CommandHandler } from '../../types/bot-interaction.js';
import { StickerCommandOptionName } from '../../types/command-option-names.js';
import { getAvailablePackWhere } from '../../utils/find-available-sticker-packs.js';
import { findStickers } from '../../utils/find-stickers.js';
import { getNonNsfwStickerFilter } from '../../utils/get-non-nsfw-sticker-filter.js';
import { getStickerMessageContent } from '../../utils/get-sticker-message-content.js';
import { createCommandMention, interactionReply } from '../../utils/interaction-reply.js';
import { isUuidV4 } from '../../utils/is-uuid-v4.js';
import { updateOrCreateUser } from '../../utils/messaging.js';
import { recordStickerMessages } from '../../utils/record-sticker-messages.js';

export const stickerCommandHandler = (nsfw: boolean): CommandHandler => async function handle(interaction, context) {
  const { t, db } = context;
  const stickerQuery = interaction.options.getString(StickerCommandOptionName.NAME, true);
  const preview = interaction.options.getBoolean(StickerCommandOptionName.PREVIEW) ?? false;
  const availablePackWhere = getAvailablePackWhere(interaction.user.id, nsfw);
  if (await db.pack.count({ where: availablePackWhere, take: 1 }) === 0) {
    await interactionReply(context, interaction, {
      content: t('commands.sticker.responses.noPacks', {
        createCommand: createCommandMention('create-pack', context),
      }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const reply = await interaction.deferReply({ flags: preview ? MessageFlags.Ephemeral : undefined });

  // The sticker is picked either by ID (an autocomplete suggestion) or, for free-typed text,
  // as the top result of the exact same search the autocomplete runs (most-used first), so
  // submitting what you typed always sends what autocomplete listed first.
  const stickerId = isUuidV4(stickerQuery)
    ? stickerQuery
    : (await findStickers(context, interaction, { nsfw, query: stickerQuery, limit: 1 }))[0]?.id;

  const stickers = stickerId === undefined ? [] : await db.sticker.findMany({
    where: {
      id: stickerId,
      deletedAt: null,
      ...getNonNsfwStickerFilter(nsfw),
      pack: availablePackWhere,
    },
    include: { telegramSticker: true, pack: true },
    take: 1,
  });
  if (stickers.length === 0) {
    await interactionReply(context, interaction, {
      content: t('commands.sticker.responses.invalidName'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interactionReply(context, interaction, {
    flags: preview ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] : MessageFlags.IsComponentsV2,
    ...getStickerMessageContent({ stickers }),
  });

  if (!preview) {
    const replyMessage = await reply.fetch();
    const user = await updateOrCreateUser(context, interaction);
    await recordStickerMessages({ context, interaction, stickers, replyMessage, userId: user.id });
  }
};
