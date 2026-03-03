import { AutocompleteInteraction } from 'discord.js';
import { InteractionContext } from '../../types/bot-interaction.js';
import { findAvailableStickerPacks } from '../find-available-sticker-packs.js';
import { truncateToMaximumLength } from '../messaging.js';

interface HandleStickerAutocompleteParams {
  interaction: AutocompleteInteraction;
  context: InteractionContext;
  optionName: string;
  nsfw?: boolean;
}

export const handleStickerAutocomplete = async ({
  interaction,
  context,
  optionName,
  nsfw = false,
}: HandleStickerAutocompleteParams) => {
  const value = interaction.options.getString(optionName, true).trim().toLowerCase();
  const { db } = context;
  const availablePacks = await findAvailableStickerPacks(context, interaction, nsfw);
  if (availablePacks.length === 0) {
    await interaction.respond([]);
    return;
  }

  const packNameIndex = availablePacks.reduce((acc, pack) => ({
    ...acc,
    [pack.id]: pack.name,
  }), {} as Record<string, string>);
  const userStickers = await db.sticker.findMany({
    select: { id: true, name: true, packId: true },
    where: {
      packId: {
        in: availablePacks.map(pack => pack.id),
      },
    },
  });

  await interaction.respond(userStickers.filter(sticker => sticker.name.toLowerCase().includes(value)).slice(0, 25).map(sticker => {
    const name = truncateToMaximumLength(`${sticker.name} (${packNameIndex[sticker.packId]})`, 100);
    return ({ name, value: sticker.id });
  }));
};
