import { MessageFlags } from 'discord-api-types/v10';
import { CommandHandler } from '../../types/bot-interaction.js';
import { PackCommandOptionName } from '../../types/localization.js';
import { getPackPreviewContent, packItemsPerPage } from '../../utils/get-pack-preview-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';

export const packCommandHandler = (nsfw: boolean): CommandHandler => async function handle(interaction, context) {
  const { t, db } = context;
  const packId = interaction.options.getString(PackCommandOptionName.NAME) ?? undefined;
  const pack = await db.pack.findFirst({
    where: {
      AND: [
        { OR: [{ id: packId }, { name: packId }] },
        { OR: [{ public: true }, { createdBy: BigInt(interaction.user.id) }] },
      ],
      nsfw: nsfw ? undefined : false,
      deletedAt: null,
    },
  });
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
  const stickers = await db.sticker.findMany({
    where: {
      deletedAt: null,
      packId: pack.id,
    },
    take: packItemsPerPage,
    orderBy: { order: 'asc' },
  });

  const { flags, components, files } = getPackPreviewContent({ t, pack, stickers, page: 0, totalPages });

  await interactionReply(context, interaction, { flags, components, files });
};
