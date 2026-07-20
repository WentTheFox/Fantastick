import { MessageFlags } from 'discord-api-types/v10';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import {
  packNameInvalidPattern,
  packNameOptionMeta,
} from '../../options/metadata/pack-name.option-meta.js';
import { ModalHandler } from '../../types/bot-interaction.js';
import { getPackDisplayName } from '../../utils/get-formatted-pack-name.js';
import { getPackVisibilityEmoji } from '../../utils/get-pack-visibility-emoji.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { collectModalSubmittedData, updateOrCreateUser } from '../../utils/messaging.js';
import { PackSnapshot, postPackToFeed } from '../../utils/post-pack-to-feed.js';

export enum EditPackModalCustomIds {
  NAME_INPUT = 'nameInput',
  PUBLIC_INPUT = 'publicInput',
  NSFW_INPUT = 'nsfwInput',
}

export enum EditPackModalBooleanOption {
  TRUE = 'true',
  FALSE = 'false',
}

export const editPackModalHandler: ModalHandler = async (interaction, context, resourceId) => {
  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let pack = resourceId ? await db.pack.findUnique({
    where: { id: resourceId, deletedAt: null, createdBy: user.id },
    include: { telegramPack: true },
  }) : null;

  if (!pack) {
    await interactionReply(context, interaction, {
      content: t('commands.edit-pack.responses.packNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const packSnapshot: PackSnapshot = {
    name: getPackDisplayName(pack),
    public: pack.public,
    nsfw: pack.nsfw,
  };

  const { data } = collectModalSubmittedData(interaction, EditPackModalCustomIds);

  // Imported pack names come from Telegram and cannot be edited; the modal omits the name input
  const isImportedPack = pack.telegramPackId !== null;
  const packName = data[EditPackModalCustomIds.NAME_INPUT];
  if (!isImportedPack && packName !== pack.name) {
    if (packName === null || packName.length < packNameOptionMeta.min_length) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-pack.responses.nameTooShort'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (packName.length > packNameOptionMeta.max_length) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-pack.responses.nameTooLong'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // The paper plane marks imported packs and must never appear in user-provided names
    if (packName.includes(EmojiCharacters.PAPER_PLANE)) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-pack.responses.invalidName', {
          chars: '```\n' + EmojiCharacters.PAPER_PLANE + '\n```',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const invalidChars = new Set(packName.match(packNameInvalidPattern));
    if (invalidChars.size > 0) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-pack.responses.invalidName', {
          chars: '```\n' + Array.from(invalidChars).join('') + '\n```',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const otherPacksWithSameNameCount = await db.pack.count({
      where: {
        AND: [
          { name: packName, deletedAt: null, telegramPackId: null },
          { NOT: { id: pack.id } },
        ],
      },
    });
    if (otherPacksWithSameNameCount !== 0) {
      await interactionReply(context, interaction, {
        content: t('commands.edit-pack.responses.duplicateName'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  pack = await db.pack.update({
    where: { id: pack.id },
    data: {
      ...(!isImportedPack && packName !== null ? { name: packName } : undefined),
      public: data[EditPackModalCustomIds.PUBLIC_INPUT] === EditPackModalBooleanOption.TRUE,
      nsfw: data[EditPackModalCustomIds.NSFW_INPUT] === EditPackModalBooleanOption.TRUE,
    },
    include: { telegramPack: true },
  });

  await interactionReply(context, interaction, {
    content: [
      EmojiCharacters.GREEN_CHECK,
      getPackVisibilityEmoji(pack),
      t('commands.edit-pack.responses.updated', { name: `\`${getPackDisplayName(pack)}\`` }),
    ].join(' '),
    flags: MessageFlags.Ephemeral,
  });

  await postPackToFeed({
    context,
    interaction,
    pack,
    action: 'edit',
    snapshot: packSnapshot,
  });
};
