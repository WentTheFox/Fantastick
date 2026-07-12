import { MessageFlags } from 'discord-api-types/v10';
import { Interaction } from 'discord.js';
import {
  dispatchAutocomplete,
  dispatchChatInputCommand,
  dispatchComponent,
  dispatchContextMenu,
  dispatchModal,
  handleInteractionError,
  parseCustomIdSegments,
} from '@wentthefox-org/discord-bot-framework/interactions';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { InteractionHandlerContext } from '../types/contexts/interaction-handler.context.js';
import { UserInteractionContext } from '../types/contexts/user-interaction.context.js';
import { createTFunction } from './create-t-function.js';
import { interactionReply } from './interaction-reply.js';
import {
  chatInputCommandRegistry,
  componentRegistry,
  contextMenuCommandRegistry,
  modalRegistry,
} from './interactions.js';
import { getUserIdentifier, stringifyChannelName, stringifyGuildName, stringifyOptionsData } from './messaging.js';

const buildUserInteractionContext = (
  { i18next, ...context }: InteractionHandlerContext,
  interaction: Interaction,
  ephemeral: boolean | null,
): UserInteractionContext => ({
  ...context,
  logger: context.logger.nest(`Interaction#${interaction.id}`),
  t: createTFunction({ i18next, ephemeral, locale: interaction.locale, guild: interaction.guild }),
});

const onDispatchError = (interaction: unknown, context: UserInteractionContext) =>
  handleInteractionError(interaction as Parameters<typeof handleInteractionError>[0], context, {
    buildMessage: () => `${EmojiCharacters.OCTAGONAL_SIGN} ${context.t('commands.global.responses.unexpectedError')}`,
    reply: (i, options) => interactionReply(context, i as never, options),
  });

export const handleInteraction = async (interaction: Interaction, baseContext: InteractionHandlerContext): Promise<void> => {
  if (interaction.isChatInputCommand()) {
    const known = chatInputCommandRegistry.isKnown(interaction.commandName);
    const context = buildUserInteractionContext(baseContext, interaction, !known);
    if (!known) {
      await interactionReply(context, interaction, {
        content: `Unknown command ${interaction.commandName}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { commandName, user, options, channel, channelId, guild, guildId } = interaction;
    const optionsString = options.data.length > 0 ? ` ${stringifyOptionsData(options.data)}` : '';
    context.logger.log(`${getUserIdentifier(user)} ran /${commandName}${optionsString} in ${stringifyChannelName(channelId, channel)} of ${stringifyGuildName(guildId, guild)}`);

    await dispatchChatInputCommand(interaction, context, {
      commands: chatInputCommandRegistry.byName,
      onError: onDispatchError,
    });
    return;
  }

  if (interaction.isAutocomplete()) {
    if (!chatInputCommandRegistry.isKnown(interaction.commandName)) {
      return;
    }
    const context = buildUserInteractionContext(baseContext, interaction, false);
    await dispatchAutocomplete(interaction, context, {
      commands: chatInputCommandRegistry.byName,
      onError: onDispatchError,
    });
    return;
  }

  if (interaction.isMessageComponent()) {
    const context = buildUserInteractionContext(baseContext, interaction, true);
    if (!componentRegistry.isKnown(interaction.customId)) {
      await interactionReply(context, interaction, {
        content: `Unsupported component interaction with customId ${interaction.customId}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { customId, user, channel, channelId, guild, guildId } = interaction;
    context.logger.log(`${getUserIdentifier(user)} interacted with component "${customId}" in ${stringifyChannelName(channelId, channel)} of ${stringifyGuildName(guildId, guild)}`);

    await dispatchComponent(interaction, context, {
      components: componentRegistry.byName,
      onError: onDispatchError,
    });
    return;
  }

  if (interaction.isModalSubmit()) {
    const context = buildUserInteractionContext(baseContext, interaction, true);
    const { id: modalId } = parseCustomIdSegments(interaction.customId);
    if (!modalRegistry.isKnown(modalId)) {
      await interactionReply(context, interaction, {
        content: `Unknown modal ID ${interaction.customId}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { user, channel, channelId, guild, guildId } = interaction;
    context.logger.log(`${getUserIdentifier(user)} interacted with modal ${modalId} in ${stringifyChannelName(channelId, channel)} of ${stringifyGuildName(guildId, guild)}`);

    await dispatchModal(interaction, context, {
      modals: modalRegistry.byName,
      onError: onDispatchError,
    });
    return;
  }

  if (interaction.isMessageContextMenuCommand()) {
    const known = contextMenuCommandRegistry.isKnown(interaction.commandName);
    const context = buildUserInteractionContext(baseContext, interaction, true);
    if (!known) {
      await interactionReply(context, interaction, {
        content: `Unsupported command type ${interaction.commandType} when running ${interaction.commandName}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { commandName, user, channel, channelId, guild, guildId } = interaction;
    context.logger.log(`${getUserIdentifier(user)} ran "${commandName}" in ${stringifyChannelName(channelId, channel)} of ${stringifyGuildName(guildId, guild)}`);

    await dispatchContextMenu(interaction, context, {
      contextMenuCommands: contextMenuCommandRegistry.byName,
      onError: onDispatchError,
    });
    return;
  }

  throw new Error(`Unhandled interaction of type ${interaction.type}`);
};
