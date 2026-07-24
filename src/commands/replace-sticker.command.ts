import { MessageFlags } from 'discord-api-types/v10';
import { BotChatInputCommand, BotChatInputCommandName, BotModalId } from '../types/bot-interaction.js';
import { ReplaceStickerCommandOptionName } from '../types/localization.js';
import {
  getStickerNameAutocompleteHandler,
} from '../utils/autocomplete/sticker-name.autocomplete.js';
import { getReplaceStickerModalContent } from '../utils/get-replace-sticker-modal-content.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';
import { replaceStickerModalHandler } from './modal-handlers/replace-sticker.modal-handler.js';

export const replaceStickerCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.REPLACE_STICKER,
  autocomplete: {
    // Imported stickers' images are managed by the Telegram import, so they're excluded
    // here rather than offered and then rejected in `handle`
    [ReplaceStickerCommandOptionName.NAME]: getStickerNameAutocompleteHandler({ nsfw: true, excludeImported: true }),
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

    const id = interaction.options.getString(ReplaceStickerCommandOptionName.NAME, true);
    const sticker = await db.sticker.findUnique({
      where: { id, deletedAt: null },
      include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
    });

    if (!sticker) {
      await interactionReply(context, interaction, {
        content: t('commands.replace-sticker.responses.stickerNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Defensive re-check: a stale autocomplete selection could still submit an imported
    // sticker's id even though the autocomplete itself excludes them
    if (sticker.telegramStickerId !== null) {
      await interactionReply(context, interaction, {
        content: t('commands.replace-sticker.responses.importedSticker'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { title, components } = getReplaceStickerModalContent(t, sticker);
    await interaction.showModal({
      customId: `${BotModalId.REPLACE_STICKER}:${sticker.id}`,
      title,
      components,
    });
  },
  modal: {
    [BotModalId.REPLACE_STICKER]: replaceStickerModalHandler,
  },
};
