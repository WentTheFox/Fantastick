import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { ReorderStickerCommandOptionName } from '../../types/command-option-names.js';
import { getFormattedStickerName } from '../get-formatted-sticker-name.js';
import { truncateToMaximumLength } from '../messaging.js';

export const getReorderStickerTargetAutocompleteHandler = (): AutocompleteHandler => async (interaction, context, optionName) => {
  const value = interaction.options.getString(optionName, true).trim().toLowerCase();
  const { db } = context;

  const stickerId = interaction.options.getString(ReorderStickerCommandOptionName.STICKER);
  if (!stickerId) {
    await interaction.respond([]);
    return;
  }

  const sticker = await db.sticker.findUnique({
    where: { id: stickerId, deletedAt: null, createdBy: BigInt(interaction.user.id) },
    select: { id: true, packId: true },
  }).catch(() => null);
  if (!sticker) {
    await interaction.respond([]);
    return;
  }

  const siblings = await db.sticker.findMany({
    select: { id: true, name: true, telegramSticker: { select: { emoji: true, order: true } } },
    where: {
      deletedAt: null,
      packId: sticker.packId,
      id: { not: sticker.id },
    },
    orderBy: { order: 'asc' },
  });

  await interaction.respond(siblings
    .map(sibling => ({ id: sibling.id, displayName: getFormattedStickerName(sibling) }))
    .filter(sibling => sibling.displayName.toLowerCase().includes(value))
    .slice(0, 25)
    .map(sibling => ({
      name: truncateToMaximumLength(sibling.displayName, 100),
      value: sibling.id,
    })));
};
