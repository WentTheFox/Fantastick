import { ComponentType, MessageFlags } from 'discord-api-types/v10';
import { AttachmentBuilder } from 'discord.js';
import { getStickerOptions } from '../options/sticker.options.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { StickerCommandOptionName } from '../types/localization.js';
import { handlePackNameAutocomplete } from '../utils/autocomplete/pack-name.autocomplete.js';
import { handleStickerAutocomplete } from '../utils/autocomplete/sticker-name.autocomplete.js';
import { getStickerFilePathFromUrl } from '../utils/filesystem.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';

export const stickerCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.sticker.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.sticker.name', { lng })),
    options: getStickerOptions(t),
  }),
  async autocomplete(interaction, context) {
    const focusedOption = interaction.options.getFocused(true);

    switch (focusedOption.name) {
      case StickerCommandOptionName.PACK:
        await handlePackNameAutocomplete(interaction, context, focusedOption.name);
        break;
      case StickerCommandOptionName.NAME:
        await handleStickerAutocomplete(interaction, context, focusedOption.name, StickerCommandOptionName.PACK);
        break;
      default:
        throw new Error(`Unknown autocomplete option ${focusedOption.name}`);
    }
  },
  async handle(interaction, context) {
    const { t, db } = context;
    const packId = interaction.options.getString(StickerCommandOptionName.PACK) ?? undefined;
    const stickerId = interaction.options.getString(StickerCommandOptionName.NAME, true);
    const userPacks = await db.pack.findMany({
      select: { id: true },
      where: {
        createdBy: BigInt(interaction.user.id),
        id: packId,
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
        packId: packId ? {
          in: userPacks.map(pack => pack.id),
        } : undefined,
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
