import { MessageFlags } from 'discord-api-types/v10';
import { EmojiCharacters } from '../../constants/emoji-characters.js';
import { ModalHandler } from '../../types/bot-interaction.js';
import { getPackDisplayName } from '../../utils/get-formatted-pack-name.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { updateOrCreateUser } from '../../utils/messaging.js';

export const deletePackModalHandler: ModalHandler = async (interaction, context, resourceId) => {
  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const pack = resourceId ? await db.pack.findUnique({
    where: { id: resourceId, deletedAt: null, createdBy: user.id },
    include: { telegramPack: true },
  }) : null;

  if (!pack) {
    await interactionReply(context, interaction, {
      content: t('commands.delete-pack.responses.packNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const now = new Date();
    await db.$transaction([
      db.sticker.updateMany({
        where: { packId: pack.id, deletedAt: null },
        data: { deletedBy: user.id, deletedAt: now },
      }),
      db.pack.update({
        where: { id: pack.id },
        data: { deletedBy: user.id, deletedAt: now },
      }),
    ]);
  } catch (e) {
    context.logger.error('Failed to delete pack', e);
    await interactionReply(context, interaction, {
      content: t('commands.delete-pack.responses.deleteFailed'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interactionReply(context, interaction, {
    content: `${EmojiCharacters.GREEN_CHECK} ${t('commands.delete-pack.responses.deleted', {
      name: `\`${getPackDisplayName(pack)}\``,
    })}`,
    flags: MessageFlags.Ephemeral,
  });
};
