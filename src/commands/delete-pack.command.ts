import { ComponentType, MessageFlags } from 'discord-api-types/v10';
import { deletePackOptions } from '../options/delete-pack.options.js';
import { BotChatInputCommand, BotChatInputCommandName, BotModalId } from '../types/bot-interaction.js';
import { DeletePackCommandOptionName } from '../types/localization.js';
import { getPackNameAutocompleteHandler } from '../utils/autocomplete/pack-name.autocomplete.js';
import { getFormattedPackName, getPackDisplayName } from '../utils/get-formatted-pack-name.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import { deletePackModalHandler } from './modal-handlers/delete-pack.modal-handler.js';

export const deletePackCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.DELETE_PACK,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.delete-pack.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.delete-pack.name', { lng })),
      options: deletePackOptions(t),
    };
  },
  autocomplete: {
    [DeletePackCommandOptionName.NAME]: getPackNameAutocompleteHandler({ nsfw: true, ownedOnly: true }),
  },
  async handle(interaction, context) {
    const { t, db } = context;
    const user = await updateOrCreateUser(context, interaction);
    if (user.readOnly) {
      await interactionReply(context, interaction, {
        content: t('commands.global.responses.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const id = interaction.options.getString(DeletePackCommandOptionName.NAME, true);
    const pack = await db.pack.findUnique({
      where: { id, deletedAt: null, createdBy: user.id },
      include: { telegramPack: true },
    });

    if (!pack) {
      await interactionReply(context, interaction, {
        content: t('commands.delete-pack.responses.packNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const stickerCount = await db.sticker.count({
      where: { packId: pack.id, deletedAt: null },
    });

    await interaction.showModal({
      customId: `${BotModalId.DELETE_PACK}:${pack.id}`,
      title: t('commands.delete-pack.components.deletePackModalTitle', { name: getPackDisplayName(pack) }),
      components: [
        {
          type: ComponentType.TextDisplay,
          content: t('commands.delete-pack.components.deletingText', {
            name: getFormattedPackName(pack),
            count: stickerCount,
          }),
        },
      ],
    });
  },
  modal: {
    [BotModalId.DELETE_PACK]: deletePackModalHandler,
  },
};
