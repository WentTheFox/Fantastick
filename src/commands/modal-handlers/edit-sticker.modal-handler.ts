import { MessageFlags } from 'discord-api-types/v10';
import { Readable } from 'node:stream';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { env } from '../../env.js';
import {
  stickerNameInvalidPattern,
  stickerNameOptionMeta,
} from '../../options/metadata/sticker-name.option-meta.js';
import { ModalHandler } from '../../types/bot-interaction.js';
import { saveStickerFile } from '../../utils/filesystem.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { collectModalSubmittedData, updateOrCreateUser } from '../../utils/messaging.js';
import {
  normalizeStickerDescriptionInput,
} from '../../utils/normalize-sticker-description-input.js';
import { postStickerToFeed, StickerSnapshot } from '../../utils/post-sticker-to-feed.js';

export enum EditStickerModalCustomIds {
  NEW_NAME_INPUT = 'newNameInput',
  NEW_ALT_INPUT = 'newAltInput',
  NEW_FILE_INPUT = 'newFileInput',
  NEW_URL_INPUT = 'newUrlInput',
}

export const editStickerModalHandler: ModalHandler = async (interaction, context, resourceId) => {
  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let sticker = resourceId ? await db.sticker.findUnique({
    where: { id: resourceId, createdBy: user.id },
    include: { pack: true },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.edit-sticker.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const stickerSnapshot: StickerSnapshot = {
    name: sticker.name,
    description: sticker.description,
    url: sticker.url,
  };

  const {
    indexedAttachments,
    data,
  } = collectModalSubmittedData(interaction, EditStickerModalCustomIds);

  const stickerName = data[EditStickerModalCustomIds.NEW_NAME_INPUT];
  if (stickerName.length < stickerNameOptionMeta.min_length) {
    await interactionReply(context, interaction, {
      content: t('commands.create-sticker.responses.nameTooShot'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (stickerName.length > stickerNameOptionMeta.max_length) {
    await interactionReply(context, interaction, {
      content: t('commands.create-sticker.responses.nameTooLong'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const invalidChars = new Set(stickerName.match(stickerNameInvalidPattern));
  if (invalidChars.size > 0) {
    await interactionReply(context, interaction, {
      content: t('commands.create-sticker.responses.invalidName', {
        chars: '```\n' + Array.from(invalidChars).join('') + '\n```',
      }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const otherStickersWithSameNameInPackCount = await db.sticker.count({
    where: {
      AND: [
        { packId: sticker.packId, name: stickerName },
        { NOT: { id: sticker.id } },
      ],
    },
  });
  if (otherStickersWithSameNameInPackCount !== 0) {
    await interactionReply(context, interaction, {
      content: t('commands.create-sticker.responses.duplicateName'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let stickerUrl = data[EditStickerModalCustomIds.NEW_URL_INPUT];
  const stickerFileId = data[EditStickerModalCustomIds.NEW_FILE_INPUT];
  const source = stickerUrl ? EditStickerModalCustomIds.NEW_URL_INPUT : (stickerFileId ? EditStickerModalCustomIds.NEW_FILE_INPUT : null);
  switch (source) {
    case EditStickerModalCustomIds.NEW_URL_INPUT: {
      if (!stickerUrl.startsWith('https://')) {
        await interactionReply(context, interaction, {
          content: t('commands.create-sticker.responses.missingFile'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
      break;
    case EditStickerModalCustomIds.NEW_FILE_INPUT: {
      const stickerFileMeta = indexedAttachments[stickerFileId];
      if (!stickerFileMeta) {
        context.logger.warn(`Could not find attachment with id ${stickerFileId}`);
        await interactionReply(context, interaction, {
          content: t('commands.create-sticker.responses.missingFile'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      let stickerFileData: ReadableStream<Uint8Array<ArrayBuffer>> | null = null;
      try {
        stickerFileData = await fetch(stickerFileMeta.url, {
          headers: {
            'User-Agent': env.UA_STRING,
          },
        }).then(r => r.body);
      } catch (e) {
        context.logger.error(`Failed to fetch ${stickerFileMeta.url}`, e);
      }
      if (!stickerFileData) {
        context.logger.warn(`Could not read attachment url ${stickerFileMeta.url}`);
        await interactionReply(context, interaction, {
          content: t('commands.create-sticker.responses.missingFile'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      ({ stickerUrl } = await saveStickerFile(context, {
        stickerId: sticker.id,
        fileId: stickerFileId,
        fileName: stickerFileMeta.name,
        data: Readable.fromWeb(stickerFileData as never),
      }));
    }
      break;
    default: {
      stickerUrl = sticker.url;
      break;
    }
  }
  const description = normalizeStickerDescriptionInput(data[EditStickerModalCustomIds.NEW_ALT_INPUT]);
  sticker = await db.sticker.update({
    where: { id: sticker.id },
    data: {
      name: stickerName,
      description,
      url: stickerUrl,
    },
    include: { pack: true },
  });

  await interactionReply(context, interaction, {
    content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.edit-sticker.responses.updated', {
      name: sticker.name,
    })}`,
    flags: MessageFlags.Ephemeral,
  });

  await postStickerToFeed({
    context,
    interaction,
    sticker,
    userPack: sticker.pack,
    action: 'edit',
    snapshot: stickerSnapshot,
  });
};
