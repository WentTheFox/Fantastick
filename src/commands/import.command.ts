import { MessageFlags } from 'discord-api-types/v10';
import { env } from '../env.js';
import { getImportOptions } from '../options/import.options.js';
import { BotChatInputCommand, BotChatInputCommandName } from '../types/bot-interaction.js';
import { ImportCommandOptionName } from '../types/localization.js';
import { QueueType } from '../types/queue.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import { parseTelegramPackName } from '../utils/parse-telegram-pack-name.js';

const activeImportJobStatuses = ['PENDING', 'FETCHING', 'IMPORTING', 'FINALIZING'] as const;

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

    const url = interaction.options.getString(ImportCommandOptionName.URL, true);
    const nsfw = interaction.options.getBoolean(ImportCommandOptionName.NSFW);
    const isPublic = interaction.options.getBoolean(ImportCommandOptionName.PUBLIC);

    const telegramPackName = parseTelegramPackName(url);
    if (!telegramPackName) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.invalidUrl'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const telegramPack = await db.telegramPack.findUnique({
      where: { telegramPackName },
    });
    const userPack = telegramPack ? await db.pack.findFirst({
      where: { telegramPackId: telegramPack.id, createdBy: user.id, deletedAt: null },
    }) : null;
    if (!userPack) {
      if (nsfw === null) {
        await interactionReply(context, interaction, {
          content: t('commands.import.responses.nsfwRequiredForNewPack'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (isPublic === null) {
        await interactionReply(context, interaction, {
          content: t('commands.import.responses.publicRequiredForNewPack'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    const activeImport = await db.importJob.findFirst({
      where: {
        importedBy: user.id,
        status: { in: [...activeImportJobStatuses] },
      },
    });
    if (activeImport) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.importAlreadyRunning'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const activePackImport = await db.importJob.findFirst({
      where: {
        telegramPackName,
        status: { in: [...activeImportJobStatuses] },
      },
    });
    if (activePackImport) {
      await interactionReply(context, interaction, {
        content: t('commands.import.responses.packImportAlreadyRunning'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const packTelegramPack = telegramPack ?? await db.telegramPack.create({
      // The placeholder title is replaced with the real one by the import job
      data: { telegramPackName, title: telegramPackName },
    });
    const pack = userPack ?? await db.pack.create({
      data: {
        name: '',
        nsfw: nsfw === true,
        public: isPublic === true,
        createdBy: user.id,
        telegramPackId: packTelegramPack.id,
      },
    });

    const importJob = await db.importJob.create({
      data: {
        packId: pack.id,
        importedBy: user.id,
        telegramPackName,
        interactionId: interaction.id,
        interactionToken: interaction.token,
      },
    });

    await context.qm.send(QueueType.TelegramImport, { importJobId: importJob.id }, { group: { id: String(user.id) } });

    await interactionReply(context, interaction, {
      content: t('commands.import.responses.importQueued'),
    });
  },
};
