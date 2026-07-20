import { MessageFlags } from 'discord-api-types/v10';
import { getReorderStickerOptions } from '../options/reorder-sticker.options.js';
import { BotChatInputCommand, BotChatInputCommandName } from '../types/bot-interaction.js';
import { ReorderStickerCommandOptionName } from '../types/localization.js';
import {
  getStickerNameAutocompleteHandler,
} from '../utils/autocomplete/sticker-name.autocomplete.js';
import {
  getReorderStickerTargetAutocompleteHandler,
} from '../utils/autocomplete/reorder-sticker-target.autocomplete.js';
import { getFormattedPackName } from '../utils/get-formatted-pack-name.js';
import { getLocalizedObject } from '../utils/get-localized-object.js';
import { interactionReply } from '../utils/interaction-reply.js';
import { updateOrCreateUser } from '../utils/messaging.js';

class ReorderConflictError extends Error {}

export const reorderStickerCommand: BotChatInputCommand = {
  name: BotChatInputCommandName.REORDER_STICKER,
  getDefinition: (t) => {
    if (!t) throw new Error('Missing translation function');
    return {
      ...getLocalizedObject('description', (lng) => t('commands.reorder-sticker.description', { lng })),
      ...getLocalizedObject('name', (lng) => t('commands.reorder-sticker.name', { lng })),
      options: getReorderStickerOptions(t),
    };
  },
  autocomplete: {
    [ReorderStickerCommandOptionName.STICKER]: getStickerNameAutocompleteHandler(true),
    [ReorderStickerCommandOptionName.BEFORE]: getReorderStickerTargetAutocompleteHandler(),
    [ReorderStickerCommandOptionName.AFTER]: getReorderStickerTargetAutocompleteHandler(),
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

    const beforeId = interaction.options.getString(ReorderStickerCommandOptionName.BEFORE);
    const afterId = interaction.options.getString(ReorderStickerCommandOptionName.AFTER);
    if (beforeId && afterId) {
      await interactionReply(context, interaction, {
        content: t('commands.reorder-sticker.responses.bothProvided'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!beforeId && !afterId) {
      await interactionReply(context, interaction, {
        content: t('commands.reorder-sticker.responses.noneProvided'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const moveBefore = Boolean(beforeId);
    const targetId = (beforeId ?? afterId) as string;

    const id = interaction.options.getString(ReorderStickerCommandOptionName.STICKER, true);
    const sticker = await db.sticker.findUnique({
      where: { id, deletedAt: null, createdBy: user.id },
      include: { pack: true },
    });
    if (!sticker) {
      await interactionReply(context, interaction, {
        content: t('commands.reorder-sticker.responses.stickerNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const target = await db.sticker.findUnique({
      where: { id: targetId, deletedAt: null, createdBy: user.id, packId: sticker.packId },
    });
    if (!target || target.id === sticker.id) {
      await interactionReply(context, interaction, {
        content: t('commands.reorder-sticker.responses.targetNotFound'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await db.$transaction(async (tx) => {
        const siblings = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "Sticker"
          WHERE "packId" = ${sticker.packId}::uuid AND "deletedAt" IS NULL
          ORDER BY "order" ASC
          FOR UPDATE
        `;

        const ids = siblings.map(sibling => sibling.id);
        if (!ids.includes(sticker.id) || !ids.includes(target.id)) {
          throw new ReorderConflictError();
        }

        const reordered = ids.filter(siblingId => siblingId !== sticker.id);
        const targetIndex = reordered.indexOf(target.id);
        reordered.splice(moveBefore ? targetIndex : targetIndex + 1, 0, sticker.id);

        await Promise.all(reordered.map((siblingId, index) => tx.sticker.update({
          where: { id: siblingId },
          data: { order: index },
        })));
      });
    } catch (error) {
      if (error instanceof ReorderConflictError) {
        await interactionReply(context, interaction, {
          content: t('commands.reorder-sticker.responses.conflict'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      throw error;
    }

    await interactionReply(context, interaction, {
      content: t(moveBefore ? 'commands.reorder-sticker.responses.movedBefore' : 'commands.reorder-sticker.responses.movedAfter', {
        name: `\`${sticker.name}\``,
        pack: getFormattedPackName(sticker.pack),
        target: `\`${target.name}\``,
      }),
      flags: MessageFlags.Ephemeral,
    });
  },
};
