import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { findAvailableStickerPacks } from '../find-available-sticker-packs.js';
import { getFormattedPackName, getPackDisplayName } from '../get-formatted-pack-name.js';
import { truncateToMaximumLength } from '../messaging.js';

interface PackNameAutocompleteOptions {
  nsfw?: boolean;
  ownedOnly?: boolean;
  importedOnly?: boolean;
  excludeImported?: boolean;
}

export const getPackNameAutocompleteHandler = ({ nsfw = false, ownedOnly = false, importedOnly = false, excludeImported = false }: PackNameAutocompleteOptions = {}): AutocompleteHandler => async (interaction, context, optionName) => {
  const value = interaction.options.getString(optionName, true).trim().toLowerCase();
  const availablePacks = await findAvailableStickerPacks(context, interaction, nsfw);
  const scopedPacks = ownedOnly
    ? availablePacks.filter(pack => !pack.public || pack.createdBy === BigInt(interaction.user.id))
    : availablePacks;
  const packs = importedOnly
    ? scopedPacks.filter(pack => pack.telegramPack !== null)
    : excludeImported
      ? scopedPacks.filter(pack => pack.telegramPack === null)
      : scopedPacks;
  if (packs.length === 0) {
    await interaction.respond([]);
    return;
  }

  await interaction.respond(packs
    .filter(pack => getPackDisplayName(pack).toLowerCase().includes(value) || pack.telegramPack?.telegramPackName.toLowerCase().includes(value))
    .slice(0, 25)
    .map(pack => ({
      name: truncateToMaximumLength(getFormattedPackName(pack, false), 100),
      value: pack.id,
    })));
};
