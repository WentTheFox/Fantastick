import { MessageFlags } from 'discord-api-types/v10';
import { getMassEditStickersOptions } from '../options/mass-edit-stickers.options.js';
import { BotChatInputCommand, BotChatInputCommandName, BotModalId } from '../types/bot-interaction.js';
import { MassEditStickersCommandOptionName } from '../types/localization.js';
import { getPackNameAutocompleteHandler } from '../utils/autocomplete/pack-name.autocomplete.js';
import { findOrderedPackStickers, getMassEditStickerContent } from '../utils/get-mass-edit-content.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import {
  massEditStickerMetadataModalHandler,
} from './modal-handlers/mass-edit-sticker-metadata.modal-handler.js';
import {
  massEditReplaceStickerModalHandler,
} from './modal-handlers/mass-edit-replace-sticker.modal-handler.js';

export const massEditStickersCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.MASS_EDIT_STICKERS,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.mass-edit-stickers.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.mass-edit-stickers.name', { lng })),
      options: getMassEditStickersOptions(t),
    };
  },
  autocomplete: {
    [MassEditStickersCommandOptionName.PACK]: getPackNameAutocompleteHandler({ nsfw: true, ownedOnly: true }),
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

    const packId = interaction.options.getString(MassEditStickersCommandOptionName.PACK, true);
    const pack = await db.pack.findFirst({
      where: { id: packId, deletedAt: null, createdBy: user.id },
      include: { telegramPack: true },
    });

    if (!pack) {
      await interactionReply(context, interaction, {
        content: t('commands.mass-edit-stickers.responses.packNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const stickers = await findOrderedPackStickers(db, pack);
    if (stickers.length === 0) {
      await interactionReply(context, interaction, {
        content: t('commands.mass-edit-stickers.responses.emptyPack'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // The user-facing start position is 1-based, matching the position shown in the message
    const start = interaction.options.getInteger(MassEditStickersCommandOptionName.START) ?? 1;
    const startIndex = Math.min(start - 1, stickers.length - 1);
    const { components, files } = getMassEditStickerContent({
      t,
      pack,
      sticker: stickers[startIndex],
      index: startIndex,
      total: stickers.length,
    });
    await interactionReply(context, interaction, {
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components,
      files,
    });
  },
  modal: {
    [BotModalId.MASS_EDIT_STICKER_METADATA]: massEditStickerMetadataModalHandler,
    [BotModalId.MASS_EDIT_REPLACE_STICKER]: massEditReplaceStickerModalHandler,
  },
};
