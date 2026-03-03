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
    select: { id: true, name: true },
    where: {
      OR: [
        { createdBy: BigInt(interaction.user.id) },
        { public: true },
      ],
      id: packId,
      nsfw: nsfw ? undefined : false,
    },
  });
  const packNameIndex = userPacks.reduce((acc, pack) => ({
    ...acc,
    [pack.id]: pack.name,
  }), {} as Record<string, string>);
  const userStickers = await db.sticker.findMany({
    select: { id: true, name: true, packId: true },
    where: {
      packId: {
        in: userPacks.map(pack => pack.id),
      },
    },
  });

  await interaction.respond(userStickers.filter(sticker => sticker.name.toLowerCase().includes(value)).slice(0, 25).map(sticker => {
    let name = sticker.name;
    if (!packId) {
      name += ` (${packNameIndex[sticker.packId]})`.replace(/^(.{99}).+$/, '$1…');
    }
    return ({ name, value: sticker.id });
  }));
};
