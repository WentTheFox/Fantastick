import { ComponentType, MessageFlags } from 'discord-api-types/v10';
import { ChatInputCommandInteraction } from 'discord.js';
import { InteractionHandler } from '../../types/bot-interaction.js';
import { StickerCommandOptionName } from '../../types/localization.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { mapStickersToGalleryItems } from '../../utils/map-stickers-to-gallery-items.js';
import { recordStickerMessages } from '../../utils/record-sticker-messages.js';

export const stickerCommandHandler = (nsfw: boolean): InteractionHandler<ChatInputCommandInteraction> => async function handle(interaction, context) {
  const { t, db } = context;
  const packId = interaction.options.getString(StickerCommandOptionName.PACK) ?? undefined;
  const stickerId = interaction.options.getString(StickerCommandOptionName.NAME, true);
  const userPacks = await db.pack.findMany({
    select: { id: true },
    where: {
      OR: [
        { createdBy: BigInt(interaction.user.id) },
        { public: true },
      ],
      id: packId,
      nsfw: nsfw ? undefined : false,
    },
  });
  if (packId && userPacks.length === 0) {
    await interactionReply(context, interaction, {
      content: t('commands.sticker.responses.invalidPack'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const stickers = await db.sticker.findMany({
    where: {
      OR: [
        { id: stickerId },
        { name: stickerId },
      ],
      packId: {
        in: userPacks.map(pack => pack.id),
      },
    },
  });
  if (!stickers) {
    await interactionReply(context, interaction, {
      content: t('commands.sticker.responses.invalidName'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { files, items } = mapStickersToGalleryItems(stickers);

  const reply = await interactionReply(context, interaction, {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.MediaGallery,
        items,
      },
    ],
    files,
  });

  const replyMessage = await reply.fetch(true);
  await recordStickerMessages(context, stickers, replyMessage);
};
