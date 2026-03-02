import { MessageFlags } from 'discord-api-types/v10';
import { getCreatePackOptions } from '../options/create-pack.options.js';
import { packNameOptionMeta } from '../options/metadata/pack-name.option-meta.js';
import { BotChatInputCommand } from '../types/bot-interaction.js';
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
    const name = interaction.options.getString('name', true);
    const nsfw = interaction.options.getBoolean('nsfw', true);

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

    const invalidChars = new Set(name.match(/\W/g));
    if (invalidChars.size > 0) {
      await interactionReply(context, interaction, {
        content: t('commands.create-pack.responses.invalidChars', {
          chars: '```\n' + Array.from(invalidChars).join('') + '\n```',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existingPack = await db.pack.findFirst({
      where: {
        name,
      },
    });

    if (existingPack) {
      await interactionReply(context, interaction, {
        content: t('commands.create-pack.responses.duplicateName'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = await updateOrCreateUser(context, interaction);

    const pack = await db.pack.create({
      data: {
        name,
        nsfw,
        createdBy: user.id,
      },
    });

    await interactionReply(context, interaction, {
      content: t('commands.create-pack.responses.created', { name: '`'+name+'`'  }),
      flags: MessageFlags.Ephemeral,
    });
  },
};
