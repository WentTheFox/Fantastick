import { MessageFlags } from 'discord-api-types/v10';
import { BotMessageComponentHandler } from '../../types/bot-interaction.js';
import { getNonNsfwStickerFilter } from '../../utils/get-non-nsfw-sticker-filter.js';
import { getPackPreviewContent, packItemsPerPage } from '../../utils/get-pack-preview-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';

export const packPageComponentHandler = (direction: 'first' | 'prev' | 'next' | 'last'): BotMessageComponentHandler => async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

  const { t, db } = context;
  // Custom IDs are `<prefix>:<packId>:<page>:<nsfw>`; the pack ID is a UUID so it never
  // contains a colon itself, making a plain split safe
  const [packId, currentPageRaw, nsfwFlagRaw] = (resourceId ?? '').split(':');
  const currentPage = currentPageRaw === undefined ? NaN : Number(currentPageRaw);
  const nsfw = nsfwFlagRaw === '1';

  const pack = typeof packId === 'string' && packId.length > 0 && !Number.isNaN(currentPage)
    ? await db.pack.findFirst({
      where: {
        id: packId,
        deletedAt: null,
        OR: [{ public: true }, { createdBy: BigInt(interaction.user.id) }],
      },
      include: { telegramPack: true },
    })
    : null;

  if (!pack) {
    await interactionReply(context, interaction, {
      content: t('commands.pack.responses.invalidPack'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const stickerWhere = {
    deletedAt: null,
    packId: pack.id,
    ...getNonNsfwStickerFilter(nsfw),
  };
  const stickerCount = await db.sticker.count({ where: stickerWhere });
  const totalPages = Math.max(1, Math.ceil(stickerCount / packItemsPerPage));
  const requestedPage = {
    first: 0,
    prev: currentPage - 1,
    next: currentPage + 1,
    last: totalPages - 1,
  }[direction];
  const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);

  const stickers = await db.sticker.findMany({
    where: stickerWhere,
    include: { telegramSticker: true },
    take: packItemsPerPage,
    skip: page * packItemsPerPage,
    // Imported sticker order lives on the shared TelegramSticker row
    orderBy: pack.telegramPackId !== null ? { telegramSticker: { order: 'asc' } } : { order: 'asc' },
  });

  const { components, files } = getPackPreviewContent({ t, pack, stickers, page, totalPages, nsfw });

  await interaction.update({ flags: MessageFlags.IsComponentsV2, components, files });
};
