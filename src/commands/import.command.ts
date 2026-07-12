import { MessageFlags } from 'discord-api-types/v10';
import { env } from '../env.js';
import { getImportOptions } from '../options/import.options.js';
import { stickerUrlPrefix } from '../options/metadata/import-url.option-meta.js';
import { BotChatInputCommand, BotChatInputCommandName } from '../types/bot-interaction.js';
import { ImportCommandOptionName } from '../types/localization.js';
import { QueueType } from '../types/queue.js';
import { getPackNameAutocompleteHandler } from '../utils/autocomplete/pack-name.autocomplete.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';

export const importCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.IMPORT,
  registerCondition: () => env.LOCAL,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.import.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.import.name', { lng })),
      options: getImportOptions(t),
    };
  },
  autocomplete: {
    [ImportCommandOptionName.PACK]: getPackNameAutocompleteHandler(true),
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

    const packId = interaction.options.getString(ImportCommandOptionName.PACK, true);
    const url = interaction.options.getString('url', true);

    const appPack = await db.pack.findUnique({ where: { id: packId } });
    if (!appPack) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.packNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let telegramPackName: string | undefined = undefined;
    if (url.startsWith(stickerUrlPrefix)) {
      const packNameFromUrl = decodeURIComponent(url.substring(stickerUrlPrefix.length));
      if (/^[^/()]+$/.test(packNameFromUrl)) {
        telegramPackName = packNameFromUrl;
      }
    }
    if (!telegramPackName) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.invalidUrl'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const importJob = await db.importJob.create({
      data: {
        packId,
        importedBy: user.id,
        telegramPackName,
        interactionId: interaction.id,
        interactionToken: interaction.token,
      },
    });

    await context.qm.send(QueueType.TelegramImport, { importJobId: importJob.id });

    await interactionReply(context, interaction, {
      content: t('commands.import.responses.importQueued'),
    });
  },
};
