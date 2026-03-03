import { ComponentType, MessageFlags } from 'discord-api-types/v10';
import { AttachmentBuilder } from 'discord.js';
import { getStickerOptions } from '../options/sticker.options.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { getStickerFilePathFromUrl } from '../utils/filesystem.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';

export const stickerCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.sticker.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.sticker.name', { lng })),
    options: getStickerOptions(t),
  }),
  async handle(interaction, context) {
    const { t, db } = context;
    const pack = interaction.options.getString('pack') ?? undefined;
    const name = interaction.options.getString('name', true);
    const userPacks = await db.pack.findMany({
      select: { id: true },
      where: {
        createdBy: BigInt(interaction.user.id),
        name: pack,
      },
    });
    if (pack && userPacks.length === 0) {
      await interactionReply(context, interaction, {
        content: t('commands.sticker.responses.invalidPack'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const stickers = await db.sticker.findMany({
      where: {
        name,
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
  },
};
