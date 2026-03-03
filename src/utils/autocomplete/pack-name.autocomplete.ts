import { AutocompleteInteraction } from 'discord.js';
import { InteractionContext } from '../../types/bot-interaction.js';

interface HandlePackNameAutocompleteParams {
  interaction: AutocompleteInteraction;
  context: InteractionContext;
  optionName: string;
  nsfw?: boolean;
}

export const handlePackNameAutocomplete = async ({
  interaction,
  context,
  optionName,
  nsfw = false,
}: HandlePackNameAutocompleteParams) => {
  const value = interaction.options.getString(optionName)?.trim().toLowerCase() ?? '';
  const { db } = context;
  const userPacks = await db.pack.findMany({
    select: { id: true, name: true },
    where: {
      createdBy: BigInt(interaction.user.id),
      nsfw: nsfw ? undefined : false,
    },
  });

  await interaction.respond(userPacks.filter(pack => pack.name.toLowerCase().includes(value)).map(pack => {
    return ({ name: pack.name, value: pack.id });
  }));
};
