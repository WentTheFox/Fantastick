import { MessageFlags } from 'discord-api-types/v10';
import { BotMessageComponentHandler } from '../../types/bot-interaction.js';
import { getPackPreviewContent, packItemsPerPage } from '../../utils/get-pack-preview-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';

export const packPageComponentHandler = (direction: 'first' | 'prev' | 'next' | 'last'): BotMessageComponentHandler => async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

  const { t, db } = context;
  const separatorIndex = resourceId?.lastIndexOf(':') ?? -1;
  const packId = separatorIndex === -1 ? undefined : resourceId?.substring(0, separatorIndex);
  const currentPage = separatorIndex === -1 ? NaN : Number(resourceId?.substring(separatorIndex + 1));

  const pack = typeof packId === 'string' && !Number.isNaN(currentPage)
    ? await db.pack.findUnique({ where: { id: packId, deletedAt: null } })
    : null;

  if (!pack) {
    await interactionReply(context, interaction, {
      content: t('commands.pack.responses.invalidPack'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const stickerCount = await db.sticker.count({
    where: { deletedAt: null, packId: pack.id },
  });
  const totalPages = Math.max(1, Math.ceil(stickerCount / packItemsPerPage));
  const requestedPage = {
    first: 0,
    prev: currentPage - 1,
    next: currentPage + 1,
    last: totalPages - 1,
  }[direction];
  const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);

  const stickers = await db.sticker.findMany({
    where: { deletedAt: null, packId: pack.id },
    take: packItemsPerPage,
    skip: page * packItemsPerPage,
    orderBy: { order: 'asc' },
  });

  const { components, files } = getPackPreviewContent({ t, pack, stickers, page, totalPages });

  await interaction.update({ flags: MessageFlags.IsComponentsV2, components, files });
};
