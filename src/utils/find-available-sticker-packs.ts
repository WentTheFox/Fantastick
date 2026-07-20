import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { Pack, TelegramPack } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';

export type AvailableStickerPack = Pick<Pack, 'id' | 'name' | 'public' | 'nsfw' | 'createdBy'> & {
  telegramPack: Pick<TelegramPack, 'title' | 'telegramPackName'> | null;
};

export const findAvailableStickerPacks = async (context: Pick<InteractionContext, 'db'>, interaction: CommandInteraction | AutocompleteInteraction, nsfw: boolean): Promise<AvailableStickerPack[]> => {
  const { db } = context;
  return db.pack.findMany({
    select: {
      id: true,
      name: true,
      public: true,
      nsfw: true,
      createdBy: true,
      telegramPack: { select: { title: true, telegramPackName: true } },
    },
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
