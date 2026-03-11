import { MessageFlags } from 'discord-api-types/v10';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import {
  packNameInvalidPattern,
  packNameOptionMeta,
} from '../../options/metadata/pack-name.option-meta.js';
import { ModalHandler } from '../../types/bot-interaction.js';
import { getPackVisibilityEmoji } from '../../utils/get-pack-visibility-emoji.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { collectModalSubmittedData, updateOrCreateUser } from '../../utils/messaging.js';
import { postPackToFeed } from '../../utils/post-pack-to-feed.js';

export enum CreatePackModalCustomIds {
  NAME_INPUT = 'nameInput',
  PUBLIC_INPUT = 'publicInput',
  NSFW_INPUT = 'nsfwInput',
}

export enum CreatePackModalBooleanOption {
  TRUE = 'true',
  FALSE = 'false',
}

export const createPackModalHandler: ModalHandler = async (interaction, context) => {
  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { data } = collectModalSubmittedData(interaction, CreatePackModalCustomIds);
  const packName = data[CreatePackModalCustomIds.NAME_INPUT];
  if (packName.length < packNameOptionMeta.min_length) {
    await interactionReply(context, interaction, {
      content: t('commands.create-pack.responses.nameTooShot'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (packName.length > packNameOptionMeta.max_length) {
    await interactionReply(context, interaction, {
      content: t('commands.create-pack.responses.nameTooLong'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const invalidChars = new Set(packName.match(packNameInvalidPattern));
  if (invalidChars.size > 0) {
    await interactionReply(context, interaction, {
      content: t('commands.create-pack.responses.invalidName', {
        chars: '```\n' + Array.from(invalidChars).join('') + '\n```',
      }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const packPacksWithSameNameCount = await db.pack.count({
    where: {
      name: packName,
      deletedAt: null,
    },
  });
  if (packPacksWithSameNameCount !== 0) {
    await interactionReply(context, interaction, {
      content: t('commands.create-pack.responses.duplicateName'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const pack = await db.pack.create({
    data: {
      name: packName,
      nsfw: data[CreatePackModalCustomIds.NSFW_INPUT] === CreatePackModalBooleanOption.TRUE,
      public: data[CreatePackModalCustomIds.PUBLIC_INPUT] === CreatePackModalBooleanOption.TRUE,
      createdBy: user.id,
    },
  });

  const codeSpanPackName = '`' + pack.name + '`';
  await interactionReply(context, interaction, {
    content: [
      EmojiCharacters.GREEN_CHECK,
      getPackVisibilityEmoji(pack),
      pack.public
        ? t('commands.create-pack.responses.createdPublic', { name: codeSpanPackName })
        : t('commands.create-pack.responses.createdPrivate', { name: codeSpanPackName }),
    ].join(' '),
    flags: MessageFlags.Ephemeral,
  });

  await postPackToFeed({
    context,
    interaction,
    pack,
    action: 'create',
  });
};
