import { AutocompleteInteraction } from 'discord.js';
import { InteractionContext } from '../../types/bot-interaction.js';

export const handlePackNameAutocomplete = async (interaction: AutocompleteInteraction, context: InteractionContext, optionName: string) => {
  const value = interaction.options.getString(optionName)?.trim().toLowerCase() ?? '';
  const { db } = context;
  const userPacks = await db.pack.findMany({
    select: { id: true, name: true },
    where: {
      createdBy: BigInt(interaction.user.id),
    },
  });

  await interaction.respond(userPacks.filter(pack => pack.name.toLowerCase().includes(value)).map(pack => {
    return ({ name: pack.name, value: pack.id });
  }));
};
