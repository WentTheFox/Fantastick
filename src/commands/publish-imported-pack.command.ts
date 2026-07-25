import { MessageFlags } from 'discord-api-types/v10';
import { userMention } from 'discord.js';
import { BotChatInputCommand, BotModalId } from '../types/bot-interaction.js';
import { PublishImportedPackCommandOptionName } from '../types/command-option-names.js';
import { getPackNameAutocompleteHandler } from '../utils/autocomplete/pack-name.autocomplete.js';
import {
  getPublishStickerContent,
  isStickerPublishReady,
} from '../utils/get-publish-pack-content.js';
import { findOrderedPackStickers } from '../utils/get-mass-edit-content.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import {
  publishEditStickerModalHandler,
} from './modal-handlers/publish-edit-sticker.modal-handler.js';

export const publishImportedPackCommand: BotChatInputCommand<'publish-imported-pack'> = {
  name: 'publish-imported-pack',
  autocomplete: {
    [PublishImportedPackCommandOptionName.PACK]: getPackNameAutocompleteHandler({
      nsfw: true,
      ownedOnly: true,
      importedOnly: true,
    }),
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

    const packId = interaction.options.getString(PublishImportedPackCommandOptionName.PACK, true);
    const pack = await db.pack.findFirst({
      where: { id: packId, deletedAt: null, createdBy: user.id, telegramPackId: { not: null } },
      include: { telegramPack: true },
    });

    if (!pack) {
      await interactionReply(context, interaction, {
        content: t('commands.publish-imported-pack.responses.packNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (pack.public) {
      await interactionReply(context, interaction, {
        content: t('commands.publish-imported-pack.responses.alreadyPublished'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existingPublishedPack = await db.pack.findFirst({
      where: { telegramPackId: pack.telegramPackId, public: true, deletedAt: null },
      include: { creator: true },
    });
    if (existingPublishedPack) {
      await interactionReply(context, interaction, {
        content: t('commands.publish-imported-pack.responses.alreadyPublishedElsewhere', {
          user: userMention(String(existingPublishedPack.createdBy)),
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const stickers = await findOrderedPackStickers(db, pack);
    if (stickers.length === 0) {
      await interactionReply(context, interaction, {
        content: t('commands.publish-imported-pack.responses.emptyPack'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const allReady = stickers.every(isStickerPublishReady);
    const { components, files } = getPublishStickerContent({
      t,
      pack,
      sticker: stickers[0],
      index: 0,
      total: stickers.length,
      allReady,
    });
    await interactionReply(context, interaction, {
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components,
      files,
    });
  },
  modal: {
    [BotModalId.PUBLISH_EDIT_STICKER]: publishEditStickerModalHandler,
  },
};
