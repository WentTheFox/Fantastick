import { MessageFlags } from 'discord-api-types/v10';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { ModalHandler } from '../../types/bot-interaction.js';
import { applyStickerFileReplace } from '../../utils/apply-sticker-file-replace.js';
import { getFormattedStickerName } from '../../utils/get-formatted-sticker-name.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { updateOrCreateUser } from '../../utils/messaging.js';
import { postStickerToFeed } from '../../utils/post-sticker-to-feed.js';

export const replaceStickerModalHandler: ModalHandler = async (interaction, context, resourceId) => {
  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sticker = resourceId ? await db.sticker.findUnique({
    where: { id: resourceId, deletedAt: null, createdBy: user.id, telegramStickerId: null },
    include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.replace-sticker.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const result = await applyStickerFileReplace(interaction, context, sticker);
  if (!result) return;

  await interactionReply(context, interaction, {
    content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.replace-sticker.responses.updated', {
      name: `\`${getFormattedStickerName(result.sticker)}\``,
    })}`,
    flags: MessageFlags.Ephemeral,
  });

  await postStickerToFeed({
    context,
    interaction,
    sticker: result.sticker,
    userPack: result.sticker.pack,
    action: 'edit',
    snapshot: result.snapshot,
  });
};
