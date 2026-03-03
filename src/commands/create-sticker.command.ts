import { time } from '@discordjs/formatters';
import { ComponentType, MessageFlags, TextInputStyle } from 'discord-api-types/v10';
import {
  Attachment,
  TextInputComponentData,
  TimestampStyles,
  userMention,
  WebhookClient,
} from 'discord.js';
import { Readable } from 'node:stream';
import { env } from '../env.js';
import { packNameOptionMeta } from '../options/metadata/pack-name.option-meta.js';
import { stickerAltOptionMeta } from '../options/metadata/sticker-alt.option-meta.js';
import {
  stickerNameInvalidPattern,
  stickerNameOptionMeta,
} from '../options/metadata/sticker-name.option-meta.js';
import { stickerUrlOptionMeta } from '../options/metadata/sticker-url.option-meta.js';
import { BotChatInputCommand, BotModalIds } from '../types/bot-interaction.js';
import { saveStickerFile } from '../utils/filesystem.js';
import { getFormattedPackName } from '../utils/get-formatted-pack-name.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { getPackNsfwEmoji } from '../utils/get-pack-nsfw-emoji.js';
import { getPackVisibilityEmoji } from '../utils/get-pack-visibility-emoji.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { mapStickersToGalleryItems } from '../utils/map-stickers-to-gallery-items.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import { recordStickerMessages } from '../utils/record-sticker-messages.js';

enum ModalCustomIds {
  PACK_INPUT = 'packInput',
  NAME_INPUT = 'nameInput',
  ALT_INPUT = 'altInput',
  FILE_INPUT = 'fileInput',
  URL_INPUT = 'urlInput',
}

const customIdsSet = new Set(Object.values(ModalCustomIds));
const isValidCustomId = (customId: string): customId is ModalCustomIds => customIdsSet.has(customId as never);

export const createStickerCommand: BotChatInputCommand = {
  getDefinition: (t) => ({
    ...getLocalizedObject('description', (lng) => t('commands.create-sticker.description', { lng })),
    ...getLocalizedObject('name', (lng) => t('commands.create-sticker.name', { lng })),
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

    const userPacks = await db.pack.findMany({
      where: {
        createdBy: user.id,
      },
    });

    if (userPacks.length === 0) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.noPacks'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal({
      customId: BotModalIds.CREATE_STICKER,
      title: t('commands.create-sticker.components.createStickerModalTitle'),
      components: [
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.packLabel'),
          description: t('commands.create-sticker.components.packDescription'),
          component: {
            type: ComponentType.StringSelect,
            customId: ModalCustomIds.PACK_INPUT,
            required: true,
            minValues: 1,
            maxValues: 1,
            options: userPacks.map(pack => ({
              label: getFormattedPackName(pack),
              value: pack.name,
            })),
          },
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.nameLabel'),
          description: t('commands.create-sticker.components.nameDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: ModalCustomIds.NAME_INPUT,
            style: TextInputStyle.Short,
            minLength: stickerNameOptionMeta.min_length,
            maxLength: stickerNameOptionMeta.max_length,
            required: true,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.altLabel'),
          description: t('commands.create-sticker.components.altDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: ModalCustomIds.ALT_INPUT,
            style: TextInputStyle.Paragraph,
            minLength: stickerAltOptionMeta.min_length,
            maxLength: stickerAltOptionMeta.max_length,
            required: false,
          } as TextInputComponentData,
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.fileLabel'),
          description: t('commands.create-sticker.components.fileDescription'),
          component: {
            type: ComponentType.FileUpload,
            customId: ModalCustomIds.FILE_INPUT,
            minValues: 1,
            maxValues: 1,
            required: false,
          },
        },
        {
          type: ComponentType.Label,
          label: t('commands.create-sticker.components.urlLabel'),
          description: t('commands.create-sticker.components.urlDescription'),
          component: {
            type: ComponentType.TextInput,
            customId: ModalCustomIds.URL_INPUT,
            style: TextInputStyle.Short,
            minLength: stickerUrlOptionMeta.min_length,
            maxLength: stickerUrlOptionMeta.max_length,
            required: false,
            placeholder: t('commands.create-sticker.components.urlPlaceholder'),
          } as TextInputComponentData,
        },
      ],
    });
  },
  async modal(interaction, context) {
    const { t, db } = context;
    const user = await updateOrCreateUser(context, interaction);
    if (user.readOnly) {
      await interactionReply(context, interaction, {
        content: t('commands.global.responses.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const indexedAttachments: Record<string, Attachment> = {};
    const data = interaction.components.reduce((acc, component) => {
      switch (component.type) {
        case ComponentType.Label: {
          const customId = component.component.customId;

          if (isValidCustomId(customId)) {
            switch (component.component.type) {
              case ComponentType.TextInput:
                acc[customId] = component.component.value;
                break;
              case ComponentType.StringSelect:
                acc[customId] = component.component.values[0];
                break;
              case ComponentType.FileUpload:
                acc[customId] = component.component.values[0];
                component.component.attachments?.forEach(attachment => {
                  indexedAttachments[attachment.id] = attachment;
                });
                break;
            }
          }
        }
          break;
      }
      return acc;
    }, {} as Record<ModalCustomIds, string>);
    const packName = data[ModalCustomIds.PACK_INPUT];
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
    const stickerName = data[ModalCustomIds.NAME_INPUT];
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
      },
    });
    if (packStickersWithSameNameCount !== 0) {
      await interactionReply(context, interaction, {
        content: t('commands.create-sticker.responses.duplicateName'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let stickerUrl = data[ModalCustomIds.URL_INPUT];
    let stickerId: string | undefined = undefined;
    const stickerFileId = data[ModalCustomIds.FILE_INPUT];
    const source = stickerUrl ? ModalCustomIds.URL_INPUT : (stickerFileId ? ModalCustomIds.FILE_INPUT : null);
    switch (source) {
      case ModalCustomIds.URL_INPUT: {
        if (!stickerUrl.startsWith('https://')) {
          await interactionReply(context, interaction, {
            content: t('commands.create-sticker.responses.missingFile'),
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
        break;
      case ModalCustomIds.FILE_INPUT: {
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

        ({ stickerId, stickerUrl } = await saveStickerFile(context, {
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
    let description: string | null = (data[ModalCustomIds.ALT_INPUT] ?? '').trim();
    if (description.length === 0) {
      description = null;
    }
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
      content: t('commands.create-sticker.responses.created', {
        name: sticker.name,
      }),
      flags: MessageFlags.Ephemeral,
    });

    if (env.DISCORD_FEED_WEBHOOK_URL !== null) {
      const webhookClient = new WebhookClient({ url: env.DISCORD_FEED_WEBHOOK_URL });
      const { items, files } = mapStickersToGalleryItems([sticker], userPack.nsfw);
      const reply = await webhookClient.send({
        flags: MessageFlags.SuppressNotifications,
        content: [
          '# New sticker created',
          `**Name:** \`${sticker.name}\` (\`${sticker.id}\`)`,
          ...(sticker.description ? [
            '**Description:**',
            `> ${sticker.description?.replace(/\n/g, '\n> ')}`,
          ] : [
            '**Description:** _(empty)_',
          ]),
          `**Created at:** ${time(sticker.createdAt, TimestampStyles.FullDateShortTime)} (${time(sticker.createdAt, TimestampStyles.RelativeTime)})`,
          `**Created by:** ${userMention(interaction.user.id)} (\`${interaction.user.id}\`)`,
          `**Pack:** \`${userPack.name}\` (\`${userPack.id}\`) ${getPackVisibilityEmoji(userPack)}${getPackNsfwEmoji(userPack)}`,
          `**Image:** ${items.filter(item => !item.media.url.startsWith('attachment://')).map(item => userPack.nsfw ? `||${item.media.url}||` : item.media.url).join(' ')}`,
        ].join('\n'),
        files,
      });

      await recordStickerMessages(context, [sticker], reply);
    }
  },
};
