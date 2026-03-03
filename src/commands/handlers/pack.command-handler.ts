import { ComponentType, MessageFlags } from 'discord-api-types/v10';
import { ChatInputCommandInteraction } from 'discord.js';
import { InteractionHandler } from '../../types/bot-interaction.js';
import { PackCommandOptionName } from '../../types/localization.js';
import { getFormattedPackName } from '../../utils/get-formatted-pack-name.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { mapStickersToGalleryItems } from '../../utils/map-stickers-to-gallery-items.js';
import { recordStickerMessages } from '../../utils/record-sticker-messages.js';

const itemsPerPage = 9;

export const packCommandHandler = (nsfw: boolean): InteractionHandler<ChatInputCommandInteraction> => async function handle(interaction, context) {
  const { t, db } = context;
  const packId = interaction.options.getString(PackCommandOptionName.NAME) ?? undefined;
  const pack = await db.pack.findFirst({
    where: {
      OR: [
        { id: packId },
        { name: packId },
      ],
      nsfw: nsfw ? undefined : false,
    },
  });
  if (!pack) {
    await interactionReply(context, interaction, {
      content: t('commands.pack.responses.invalidPack'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const stickers = await db.sticker.findMany({
    where: {
      packId: pack.id,
    },
    take: itemsPerPage,
    orderBy: { order: 'asc' },
  });
  if (!stickers) {
    await interactionReply(context, interaction, {
      content: t('commands.pack.responses.emptyPack'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { files, items } = mapStickersToGalleryItems(stickers, pack.nsfw);

  const reply = await interactionReply(context, interaction, {
    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          `# ${getFormattedPackName(pack)}`,
          t('commands.pack.components.packPreview'),
        ].join('\n'),
      },
      {
        type: ComponentType.MediaGallery,
        items,
      },
      // TODO Paging buttons
    ],
    files,
  });

  const replyMessage = await reply.fetch(true);
  await recordStickerMessages(context, stickers, replyMessage);
};
