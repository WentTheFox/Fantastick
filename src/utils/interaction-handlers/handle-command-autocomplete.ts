import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteHandler } from '../../types/bot-interaction.js';

import { InteractionHandlerContext } from '../../types/contexts/interaction-handler.context.js';
import { UserInteractionContext } from '../../types/contexts/user-interaction.context.js';
import { createTFunction } from '../create-t-function.js';
import {
  chatInputCommandMap,
  isKnownChatInputCommandInteraction,
} from '../interactions/chat-input-commands.js';
import { handleInteractionError } from './handle-interaction-error.js';

export const handleCommandAutocomplete = async (interaction: AutocompleteInteraction, {
  i18next,
  ...context
}: InteractionHandlerContext): Promise<void> => {
  const logger = context.logger.nest(`Interaction#${interaction.id}`);
  if (!isKnownChatInputCommandInteraction(interaction)) {
    return;
  }

  const { commandName, locale, guild } = interaction;
  const command = chatInputCommandMap[commandName];
  const t = createTFunction({
    i18next,
    ephemeral: null,
    locale,
    guild,
  });
  const userInteractionContext: UserInteractionContext = {
    ...context,
    logger,
    t,
  };

  try {
    const focusedOption = interaction.options.getFocused(true);
    let handler: AutocompleteHandler | undefined = undefined;
    if (command.autocomplete && (focusedOption.name in command.autocomplete) && typeof command.autocomplete[focusedOption.name] === 'function') {
      handler = command.autocomplete[focusedOption.name];
    }
    if (!handler) {
      throw new Error(`Unknown autocomplete option ${focusedOption.name}`);
    }
    await handler(interaction, userInteractionContext, focusedOption.name);
  } catch (e) {
    logger.error(`Error while responding to command autocomplete (commandName=${commandName})`, e);
    await handleInteractionError(interaction, userInteractionContext);
  }
};
