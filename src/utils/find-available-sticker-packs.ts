import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { Pack } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/bot-interaction.js';

export const findAvailableStickerPacks = async (context: Pick<InteractionContext, 'db'>, interaction: CommandInteraction | AutocompleteInteraction, nsfw: boolean): Promise<Pick<Pack, 'id' | 'name'>[]> => {
  const { db } = context;
  return db.pack.findMany({
    select: { id: true, name: true },
    where: {
      OR: [
        { createdBy: BigInt(interaction.user.id) },
        { public: true },
      ],
      nsfw: nsfw ? undefined : false,
    },
  });
};
