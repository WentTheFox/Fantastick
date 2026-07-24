import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { getFormattedStickerName } from '../get-formatted-sticker-name.js';
import { truncateToMaximumLength } from '../messaging.js';

interface PackScopedStickerAutocompleteOptions {
  // Restricts results to stickers that are (or aren't) backed by a Telegram import
  imported?: boolean;
}

// Lists the stickers of an already-selected pack option, for commands with a
// pack-then-sticker option pair (the pack option's value must be a pack id)
export const getPackScopedStickerAutocompleteHandler = (packOptionName: string, { imported }: PackScopedStickerAutocompleteOptions = {}): AutocompleteHandler => async (interaction, context, optionName) => {
  const value = interaction.options.getString(optionName, true).trim().toLowerCase();
  const { db } = context;

  const packId = interaction.options.getString(packOptionName);
  if (!packId) {
    await interaction.respond([]);
    return;
  }

  const pack = await db.pack.findFirst({
    where: { id: packId, deletedAt: null, createdBy: BigInt(interaction.user.id) },
    select: { id: true },
  }).catch(() => null);
  if (!pack) {
    await interaction.respond([]);
    return;
  }

  const stickers = await db.sticker.findMany({
    select: { id: true, name: true, telegramSticker: { select: { emoji: true, order: true } } },
    where: {
      deletedAt: null,
      packId: pack.id,
      ...(imported === undefined ? {} : { telegramStickerId: imported ? { not: null } : null }),
    },
    orderBy: { order: 'asc' },
  });

  await interaction.respond(stickers
    .map(sticker => ({ id: sticker.id, displayName: getFormattedStickerName(sticker) }))
    .filter(sticker => sticker.displayName.toLowerCase().includes(value))
    .slice(0, 25)
    .map(sticker => ({
      name: truncateToMaximumLength(sticker.displayName, 100),
      value: sticker.id,
    })));
};
