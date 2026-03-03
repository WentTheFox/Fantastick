import { AutocompleteInteraction } from 'discord.js';
import { InteractionContext } from '../../types/bot-interaction.js';

interface HandleStickerAutocompleteParams {
  interaction: AutocompleteInteraction;
  context: InteractionContext;
  optionName: string;
  packIdOptionName: string;
  nsfw?: boolean;
}

export const handleStickerAutocomplete = async ({
  interaction,
  context,
  optionName,
  packIdOptionName,
  nsfw = false,
}: HandleStickerAutocompleteParams) => {
  const value = interaction.options.getString(optionName)?.trim().toLowerCase() ?? '';
  const packId = (packIdOptionName && interaction.options.getString(packIdOptionName)) || undefined;
  const { db } = context;
  const userPacks = await db.pack.findMany({
    select: { id: true },
    where: {
      createdBy: BigInt(interaction.user.id),
      id: packId,
      nsfw: nsfw ? undefined : false,
    },
  });
  const userStickers = await db.sticker.findMany({
    select: { id: true, name: true },
    where: {
      packId: {
        in: userPacks.map(pack => pack.id),
      },
    },
  });

  await interaction.respond(userStickers.filter(sticker => sticker.name.toLowerCase().includes(value)).slice(0, 25).map(sticker => {
    return ({ name: sticker.name, value: sticker.id });
  }));
};
