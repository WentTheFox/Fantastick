import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { Pack } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';

export const findAvailableStickerPacks = async (context: Pick<InteractionContext, 'db'>, interaction: CommandInteraction | AutocompleteInteraction, nsfw: boolean): Promise<Pick<Pack, 'id' | 'name' | 'public' | 'nsfw' | 'createdBy' | 'telegramPackName'>[]> => {
  const { db } = context;
  return db.pack.findMany({
    select: { id: true, name: true, public: true, nsfw: true, createdBy: true, telegramPackName: true },
    where: {
      OR: [
        { createdBy: BigInt(interaction.user.id) },
        { public: true },
      ],
      nsfw: nsfw ? undefined : false,
      deletedAt: null,
    },
  });
};
