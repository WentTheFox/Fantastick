import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { getFormattedStickerName } from '../get-formatted-sticker-name.js';
import { getPackDisplayName } from '../get-formatted-pack-name.js';
import { truncateToMaximumLength } from '../messaging.js';

interface PackScopedStickerAutocompleteOptions {
  // Restricts results to stickers that are (or aren't) backed by a Telegram import
  imported?: boolean;
}

// Lists the stickers of an already-selected pack option, for commands with a
// pack-then-sticker option pair (the pack option's value must be a pack id).
// If the pack option is optional and left unset, results are pulled from
// every pack the user owns that matches the `imported` constraint instead,
// with the source pack name appended to each result to disambiguate.
export const getPackScopedStickerAutocompleteHandler = (packOptionName: string, { imported }: PackScopedStickerAutocompleteOptions = {}): AutocompleteHandler => async (interaction, context, optionName) => {
  const value = interaction.options.getString(optionName, true).trim().toLowerCase();
  const { db } = context;

  const packId = interaction.options.getString(packOptionName);

  const packs = await db.pack.findMany({
    select: { id: true, name: true, telegramPack: { select: { title: true } } },
    where: {
      deletedAt: null,
      createdBy: BigInt(interaction.user.id),
      ...(packId ? { id: packId } : { telegramPackId: imported ? { not: null } : null }),
    },
  });
  if (packs.length === 0) {
    await interaction.respond([]);
    return;
  }
  const packNameIndex = packs.reduce((acc, pack) => ({
    ...acc,
    [pack.id]: getPackDisplayName(pack),
  }), {} as Record<string, string>);

  const stickers = await db.sticker.findMany({
    select: { id: true, name: true, packId: true, telegramSticker: { select: { emoji: true, order: true } } },
    where: {
      deletedAt: null,
      packId: { in: packs.map(pack => pack.id) },
      ...(imported === undefined ? {} : { telegramStickerId: imported ? { not: null } : null }),
    },
    orderBy: imported
      ? [{ packId: 'asc' }, { telegramSticker: { order: 'asc' } }]
      : [{ packId: 'asc' }, { order: 'asc' }],
  });

  await interaction.respond(stickers
    .map(sticker => ({ id: sticker.id, packId: sticker.packId, displayName: getFormattedStickerName(sticker) }))
    .filter(sticker => sticker.displayName.toLowerCase().includes(value))
    .slice(0, 25)
    .map(sticker => ({
      name: truncateToMaximumLength(
        packId ? sticker.displayName : `${sticker.displayName} (${packNameIndex[sticker.packId]})`,
        100,
      ),
      value: sticker.id,
    })));
};
