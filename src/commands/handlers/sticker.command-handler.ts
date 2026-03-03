import { ComponentType, MessageFlags } from 'discord-api-types/v10';
import { AttachmentBuilder, ChatInputCommandInteraction } from 'discord.js';
import { InteractionHandler } from '../../types/bot-interaction.js';
import { StickerCommandOptionName } from '../../types/localization.js';
import { getStickerFilePathFromUrl } from '../../utils/filesystem.js';
import { interactionReply } from '../../utils/interaction-reply.js';

export const stickerCommandHandler = (nsfw: boolean): InteractionHandler<ChatInputCommandInteraction> => async function handle(interaction, context) {
  const { t, db } = context;
  const packId = interaction.options.getString(StickerCommandOptionName.PACK) ?? undefined;
  const stickerId = interaction.options.getString(StickerCommandOptionName.NAME, true);
  const userPacks = await db.pack.findMany({
    select: { id: true },
    where: {
      createdBy: BigInt(interaction.user.id),
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

  const files = stickers.reduce((files, sticker) => {
    const paths = getStickerFilePathFromUrl(sticker.url);
    if (paths === null) {
      return files;
    }

    sticker.url = `attachment://${paths.stickerFileName}`;
    return [
      ...files,
      new AttachmentBuilder(paths.filePath, {
        name: paths.stickerFileName,
      }),
    ];
  }, [] as AttachmentBuilder[]);

  await interactionReply(context, interaction, {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.MediaGallery,
        items: stickers.map(sticker => ({
          media: { url: sticker.url },
          description: sticker.description ? sticker.description : undefined,
        })),
      },
    ],
    files,
  });
};
