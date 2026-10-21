import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { Pack, TelegramPack } from '../generated/prisma/client.js';
import { PackWhereInput } from '../generated/prisma/models/Pack.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';

export type AvailableStickerPack = Pick<Pack, 'id' | 'name' | 'public' | 'nsfw' | 'createdBy'> & {
  telegramPack: Pick<TelegramPack, 'title' | 'telegramPackName'> | null;
};

/**
 * The single definition of which packs a user may see: their own, plus public ones, never
 * deleted, and NSFW only when the command allows it. The OpenSearch path mirrors this in its
 * query filter and re-applies it against Postgres before returning anything.
 */
export const getAvailablePackWhere = (userId: string, nsfw: boolean): PackWhereInput => ({
  OR: [
    { createdBy: BigInt(userId) },
    { public: true },
  ],
  nsfw: nsfw ? undefined : false,
  deletedAt: null,
});

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
    where: getAvailablePackWhere(interaction.user.id, nsfw),
  });
};
