import { AutocompleteInteraction } from 'discord.js';
import { InteractionContext } from '../../types/bot-interaction.js';

export const handleStickerAutocomplete = async (interaction: AutocompleteInteraction, context: InteractionContext, optionName: string, packIdOptionName: string) => {
  const value = interaction.options.getString(optionName)?.trim().toLowerCase() ?? '';
  const packId = packIdOptionName ? interaction.options.getString(packIdOptionName) : null;
  const { db } = context;
  const userStickers = await db.sticker.findMany({
    select: { id: true, name: true },
    where: {
      packId: packId ?? undefined,
      createdBy: BigInt(interaction.user.id),
    },
  });

  await interaction.respond(userStickers.filter(sticker => sticker.name.toLowerCase().includes(value)).slice(0, 25).map(sticker => {
    return ({ name: sticker.name, value: sticker.id });
  }));
};
