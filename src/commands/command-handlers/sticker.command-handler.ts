import { MessageFlags } from 'discord-api-types/v10';
import { StickerWhereInput } from '../../generated/prisma/models/Sticker.js';
import { CommandHandler } from '../../types/bot-interaction.js';
import { StickerCommandOptionName } from '../../types/command-option-names.js';
import { findAvailableStickerPacks } from '../../utils/find-available-sticker-packs.js';
import { findRankedStickers } from '../../utils/find-ranked-stickers.js';
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
  const availablePacks = await findAvailableStickerPacks(context, interaction, nsfw);
  if (availablePacks.length === 0) {
    await interactionReply(context, interaction, {
      content: t('commands.sticker.responses.noPacks', {
        createCommand: createCommandMention('create-pack', context),
      }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const reply = await interaction.deferReply({ flags: preview ? MessageFlags.Ephemeral : undefined });

  const searchConditions: StickerWhereInput[] = [
    { name: stickerQuery },
  ];
  if (isUuidV4(stickerQuery)) {
    searchConditions.push({ id: stickerQuery });
  } else {
    // Free-typed input that isn't a sticker ID (i.e. the user didn't pick an autocomplete
    // suggestion) - resolve it the same way autocomplete would rank it, and take the top
    // (most-used) match, so sending doesn't require waiting on autocomplete results.
    const [topMatch] = await findRankedStickers(context, interaction, availablePacks, { nsfw, query: stickerQuery });
    if (topMatch) {
      searchConditions.push({ id: topMatch.id });
    }
  }

  const stickers = await db.sticker.findMany({
    where: {
      deletedAt: null,
      AND: [
        { OR: searchConditions },
        getNonNsfwStickerFilter(nsfw),
      ],
      packId: {
        in: availablePacks.map(pack => pack.id),
      },
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
