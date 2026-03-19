import { MessageFlags } from 'discord-api-types/v10';
import { MessageComponentInteraction } from 'discord.js';

import { InteractionHandlerContext } from '../../types/contexts/interaction-handler.context.js';
import { UserInteractionContext } from '../../types/contexts/user-interaction.context.js';
import { createTFunction } from '../create-t-function.js';
import { handleInteractionError } from './handle-interaction-error.js';
import { interactionReply } from '../interaction-reply.js';
import {
  isKnownMessageComponentInteraction,
  messageComponentMap,
} from '../interactions/message-components.js';
import { getUserIdentifier, stringifyChannelName, stringifyGuildName } from '../messaging.js';

export const handleComponentInteraction = async (interaction: MessageComponentInteraction, {
  i18next,
  ...context
}: InteractionHandlerContext): Promise<void> => {
  const logger = context.logger.nest(`Interaction#${interaction.id}`);
  const t = createTFunction({
    i18next,
    ephemeral: true,
    locale: interaction.locale,
    guild: interaction.guild,
  });
  const userInteractionContext: UserInteractionContext = {
    ...context,
    logger,
    t,
  };
  if (!isKnownMessageComponentInteraction(interaction)) {
    await interactionReply(userInteractionContext, interaction, {
      content: `Unsupported component interaction with customId ${interaction.customId}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { customId, user, channel, channelId, guild, guildId } = interaction;
  const command = messageComponentMap[customId];

  logger.log(`${getUserIdentifier(user)} interacted with component "${customId}" in ${stringifyChannelName(channelId, channel)} of ${stringifyGuildName(guildId, guild)}`);

  try {
    await command.handle(interaction, userInteractionContext);
  } catch (e) {
    logger.error(`Error while responding to component interaction (customId=${customId})`, e);
    await handleInteractionError(interaction, userInteractionContext);
  }
};
