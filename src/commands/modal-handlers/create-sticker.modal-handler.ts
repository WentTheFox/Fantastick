import { MessageFlags } from 'discord-api-types/v10';
import { Readable } from 'node:stream';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { env } from '../../env.js';
import { packNameOptionMeta } from '../../options/metadata/pack-name.option-meta.js';
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
import { postStickerToFeed } from '../../utils/post-sticker-to-feed.js';

export enum CreateStickerModalCustomIds {
  PACK_INPUT = 'packInput',
  NAME_INPUT = 'nameInput',
  ALT_INPUT = 'altInput',
  FILE_INPUT = 'fileInput',
  URL_INPUT = 'urlInput',
}

export const createStickerModalHandler: ModalHandler = async (interaction, context) => {
  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const {
    indexedAttachments,
    data,
  } = collectModalSubmittedData(interaction, CreateStickerModalCustomIds);
  const packName = data[CreateStickerModalCustomIds.PACK_INPUT];
  if (packName.length < packNameOptionMeta.min_length || packName.length > packNameOptionMeta.max_length) {
    context.logger.warn(`Invalid pack name: ${packName}`);
    await interactionReply(context, interaction, {
      content: t('commands.create-sticker.responses.invalidPack'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const userPack = await db.pack.findFirst({
    where: {
      name: packName,
      createdBy: user.id,
    },
  });
  if (!userPack) {
    context.logger.warn(`Could not find pack with name ${packName} for user ${user.id}`);
    await interactionReply(context, interaction, {
      content: t('commands.create-sticker.responses.invalidPack'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const stickerName = data[CreateStickerModalCustomIds.NAME_INPUT];
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
  const packStickersWithSameNameCount = await db.sticker.count({
    where: {
      packId: userPack.id,
      name: stickerName,
      deletedAt: null,
    },
  });
  if (packStickersWithSameNameCount !== 0) {
    await interactionReply(context, interaction, {
      content: t('commands.create-sticker.responses.duplicateName'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let stickerUrl = data[CreateStickerModalCustomIds.URL_INPUT];
  let stickerId: string | undefined = undefined;
  const stickerFileId = data[CreateStickerModalCustomIds.FILE_INPUT];
  const source = stickerUrl ? CreateStickerModalCustomIds.URL_INPUT : (stickerFileId ? CreateStickerModalCustomIds.FILE_INPUT : null);
  switch (source) {
    case CreateStickerModalCustomIds.URL_INPUT: {
      if (!stickerUrl.startsWith('https://')) {
        await interactionReply(context, interaction, {
          content: t('commands.create-sticker.responses.missingFile'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
      break;
    case CreateStickerModalCustomIds.FILE_INPUT: {
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

      ({ stickerFileId: stickerId, stickerUrl } = await saveStickerFile(context, {
        fileId: stickerFileId,
        fileName: stickerFileMeta.name,
        data: Readable.fromWeb(stickerFileData as never),
      }));
    }
      break;
    default: {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.missingSource'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }
  const order = await db.sticker.count({ where: { packId: userPack.id } });
  const description = normalizeStickerDescriptionInput(data[CreateStickerModalCustomIds.ALT_INPUT]);
  const sticker = await db.sticker.create({
    data: {
      id: stickerId,
      name: stickerName,
      packId: userPack.id,
      description,
      url: stickerUrl,
      createdBy: user.id,
      order,
    },
  });

  await interactionReply(context, interaction, {
    content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.create-sticker.responses.created', {
      name: `\`${sticker.name}\``,
    })}`,
    flags: MessageFlags.Ephemeral,
  });

  await postStickerToFeed({
    context,
    interaction,
    sticker,
    userPack,
    action: 'create',
  });
};
