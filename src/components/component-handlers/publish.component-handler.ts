import { MessageFlags } from 'discord-api-types/v10';
import { userMention } from 'discord.js';
import { BotMessageComponentHandler, BotModalId } from '../../types/bot-interaction.js';
import { getEditStickerMetadataModalContent } from '../../utils/get-edit-sticker-metadata-modal-content.js';
import { getFormattedPackName, getPackDisplayName } from '../../utils/get-formatted-pack-name.js';
import {
  getPublishJumpToInvalidContent,
  getPublishStepContent,
  isStickerPublishReady,
} from '../../utils/get-publish-pack-content.js';
import { findOrderedPackStickers } from '../../utils/get-mass-edit-content.js';
import { interactionReply } from '../../utils/interaction-reply.js';
import { updateOrCreateUser } from '../../utils/messaging.js';
import { PackSnapshot, postPackToFeed } from '../../utils/post-pack-to-feed.js';

export const publishOpenComponentHandler: BotMessageComponentHandler = async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

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
    where: { id: resourceId, deletedAt: null, createdBy: user.id },
    include: { pack: { include: { telegramPack: true } }, telegramSticker: true },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.publish-imported-pack.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { title, components } = getEditStickerMetadataModalContent(t, sticker);
  await interaction.showModal({
    customId: `${BotModalId.PUBLISH_EDIT_STICKER}:${sticker.id}`,
    title,
    components,
  });
};

export const publishStepComponentHandler = (direction: 'prev' | 'next'): BotMessageComponentHandler => async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

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
    where: { id: resourceId, deletedAt: null, createdBy: user.id },
    include: { pack: { include: { telegramPack: true } } },
  }) : null;

  if (!sticker) {
    await interactionReply(context, interaction, {
      content: t('commands.publish-imported-pack.responses.stickerNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const nextContent = await getPublishStepContent({
    t,
    db,
    pack: sticker.pack,
    currentStickerId: sticker.id,
    direction,
  });
  await interaction.update({ flags: MessageFlags.IsComponentsV2, ...nextContent });
};

export const publishJumpInvalidComponentHandler: BotMessageComponentHandler = async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const pack = resourceId ? await db.pack.findFirst({
    where: { id: resourceId, deletedAt: null, createdBy: user.id, telegramPackId: { not: null } },
    include: { telegramPack: true },
  }) : null;

  if (!pack) {
    await interactionReply(context, interaction, {
      content: t('commands.publish-imported-pack.responses.packNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const nextContent = await getPublishJumpToInvalidContent({ t, db, pack });
  await interaction.update({ flags: MessageFlags.IsComponentsV2, ...nextContent });
};

export const publishConfirmComponentHandler: BotMessageComponentHandler = async (interaction, context, resourceId) => {
  if (!interaction.isButton()) {
    throw new Error('Button interaction expected');
  }

  const { t, db } = context;
  const user = await updateOrCreateUser(context, interaction);
  if (user.readOnly) {
    await interactionReply(context, interaction, {
      content: t('commands.global.responses.noPermission'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let pack = resourceId ? await db.pack.findFirst({
    where: { id: resourceId, deletedAt: null, createdBy: user.id, telegramPackId: { not: null } },
    include: { telegramPack: true },
  }) : null;

  if (!pack) {
    await interactionReply(context, interaction, {
      content: t('commands.publish-imported-pack.responses.packNotFound'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (pack.public) {
    await interactionReply(context, interaction, {
      content: t('commands.publish-imported-pack.responses.alreadyPublished'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Never trust the disabled-button client state — re-validate every sticker server-side
  const stickers = await findOrderedPackStickers(db, pack);
  if (stickers.length === 0 || !stickers.every(isStickerPublishReady)) {
    await interactionReply(context, interaction, {
      content: t('commands.publish-imported-pack.responses.notReady'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Race safety net; the DB also enforces this with a partial unique index
  const existingPublishedPack = await db.pack.findFirst({
    where: { telegramPackId: pack.telegramPackId, public: true, deletedAt: null },
  });
  if (existingPublishedPack) {
    await interactionReply(context, interaction, {
      content: t('commands.publish-imported-pack.responses.alreadyPublishedElsewhere', {
        user: userMention(String(existingPublishedPack.createdBy)),
      }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const packSnapshot: PackSnapshot = {
    name: getPackDisplayName(pack),
    public: pack.public,
    nsfw: pack.nsfw,
  };
  // The pack's own rating is derived from its stickers: it's only NSFW if every
  // single sticker was explicitly marked NSFW; even one SFW sticker makes it SFW
  const nsfwStickerCount = stickers.filter(sticker => sticker.nsfwOverride === true).length;
  const packNsfw = nsfwStickerCount === stickers.length;
  pack = await db.pack.update({
    where: { id: pack.id },
    data: { public: true, nsfw: packNsfw },
    include: { telegramPack: true },
  });

  const ratingNote = packNsfw
    ? t('commands.publish-imported-pack.responses.publishedRatingAllNsfw')
    : nsfwStickerCount > 0
      ? t('commands.publish-imported-pack.responses.publishedRatingMixed', { count: nsfwStickerCount })
      : t('commands.publish-imported-pack.responses.publishedRatingAllSfw');
  await interactionReply(context, interaction, {
    content: [
      t('commands.publish-imported-pack.responses.published', { name: getFormattedPackName(pack) }),
      ratingNote,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });

  await postPackToFeed({
    context,
    interaction,
    pack,
    action: 'edit',
    snapshot: packSnapshot,
  });
};
