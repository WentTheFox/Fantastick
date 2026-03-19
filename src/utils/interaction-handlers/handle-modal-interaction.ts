import { MessageFlags } from 'discord-api-types/v10';
import { ModalSubmitInteraction } from 'discord.js';
import {
  BotModalId,
} from '../../types/bot-interaction.js';

import { InteractionHandlerContext } from '../../types/contexts/interaction-handler.context.js';
import { UserInteractionContext } from '../../types/contexts/user-interaction.context.js';
import { createTFunction } from '../create-t-function.js';
import { handleInteractionError } from './handle-interaction-error.js';
import { interactionReply } from '../interaction-reply.js';
import { isKnownModalSubmitInteraction, modalSubmitMap } from '../interactions/modal-submits.js';
import {
  getModalCustomIdSegments,
  getUserIdentifier,
  stringifyChannelName,
  stringifyGuildName,
} from '../messaging.js';

export const handleModalInteraction = async (interaction: ModalSubmitInteraction, context: InteractionHandlerContext): Promise<void> => {
  const t = createTFunction({
    i18next: context.i18next,
    ephemeral: true,
    locale: interaction.locale,
    guild: interaction.guild,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { i18next, ...restContext } = context;
  const logger = context.logger.nest(`Interaction#${interaction.id}`);
  const userInteractionContext: UserInteractionContext = {
    ...restContext,
    logger,
    t,
  };

  if (!isKnownModalSubmitInteraction(interaction)) {
    await interactionReply(userInteractionContext, interaction, {
      content: `Unknown modal ID ${interaction.customId}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { user, channel, channelId, guild, guildId, customId } = interaction;
  const { modalId, resourceId } = getModalCustomIdSegments(customId);
  const command = modalSubmitMap[modalId as BotModalId];

  logger.log(`${getUserIdentifier(user)} interacted with modal ${modalId} in ${stringifyChannelName(channelId, channel)} of ${stringifyGuildName(guildId, guild)}`);
  if (!command || !command.modal) {
    // noinspection ExceptionCaughtLocallyJS
    logger.error(`Modal ${modalId} has no handler`);
    await handleInteractionError(interaction, userInteractionContext);
    return;
  }

  try {
    await command.modal[modalId](interaction, userInteractionContext, resourceId);
  } catch (e) {
    logger.error(`Error while responding to modal submit interaction (customId=${customId})`, e);
    await handleInteractionError(interaction, userInteractionContext);
  }
};
