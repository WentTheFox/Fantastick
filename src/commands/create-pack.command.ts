import { MessageFlags } from 'discord-api-types/v10';
import { getCreatePackOptions } from '../options/create-pack.options.js';
import {
  packNameInvalidPattern,
  packNameOptionMeta,
} from '../options/metadata/pack-name.option-meta.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
import { CreatePackCommandOptionName } from '../types/localization.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';

export const createPackCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.create-pack.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.create-pack.name', { lng })),
    options: getCreatePackOptions(t),
  }),
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

    const name = interaction.options.getString(CreatePackCommandOptionName.NAME, true);
    const nsfw = interaction.options.getBoolean(CreatePackCommandOptionName.NSFW) ?? false;
    const isPublic = interaction.options.getBoolean(CreatePackCommandOptionName.PUBLIC) ?? false;

    if (name.length < packNameOptionMeta.min_length) {
      await interactionReply(context, interaction, {
        content: t('commands.create-pack.responses.nameTooShort', {
          min: packNameOptionMeta.min_length,
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (name.length > packNameOptionMeta.max_length) {
      await interactionReply(context, interaction, {
        content: t('commands.create-pack.responses.nameTooLong', {
          max: packNameOptionMeta.max_length,
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const invalidChars = new Set(name.match(packNameInvalidPattern));
    if (invalidChars.size > 0) {
      await interactionReply(context, interaction, {
        content: t('commands.create-pack.responses.invalidName', {
          chars: '```\n' + Array.from(invalidChars).join('') + '\n```',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const packsWithSameNameCount = await db.pack.count({
      where: {
        name,
      },
    });
    if (packsWithSameNameCount !== 0) {
      await interactionReply(context, interaction, {
        content: t('commands.create-pack.responses.duplicateName'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const pack = await db.pack.create({
      data: {
        name,
        nsfw,
        'public': isPublic,
        createdBy: user.id,
      },
    });

    const codeSpanPackName = '`' + pack.name + '`';
    await interactionReply(context, interaction, {
      content: isPublic
        ? t('commands.create-pack.responses.createdPublic', { name: codeSpanPackName })
        : t('commands.create-pack.responses.createdPrivate', { name: codeSpanPackName }),
      flags: MessageFlags.Ephemeral,
    });
  },
};
