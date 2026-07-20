import { AutocompleteHandler } from '../../types/bot-interaction.js';
import { findAvailableStickerPacks } from '../find-available-sticker-packs.js';
import { getFormattedPackName } from '../get-formatted-pack-name.js';
import { truncateToMaximumLength } from '../messaging.js';

interface PackNameAutocompleteOptions {
  nsfw?: boolean;
  ownedOnly?: boolean;
}

export const getPackNameAutocompleteHandler = ({ nsfw = false, ownedOnly = false }: PackNameAutocompleteOptions = {}): AutocompleteHandler => async (interaction, context, optionName) => {
  const value = interaction.options.getString(optionName, true).trim().toLowerCase();
  const availablePacks = await findAvailableStickerPacks(context, interaction, nsfw);
  const packs = ownedOnly
    ? availablePacks.filter(pack => !pack.public || pack.createdBy === BigInt(interaction.user.id))
    : availablePacks;
  if (packs.length === 0) {
    await interaction.respond([]);
    return;
  }

  await interaction.respond(packs
    .filter(pack => pack.name.toLowerCase().includes(value) || pack.telegramPackName?.toLowerCase().includes(value))
    .slice(0, 25)
    .map(pack => ({
      name: truncateToMaximumLength(getFormattedPackName(pack), 100),
      value: pack.id,
    })));
};
