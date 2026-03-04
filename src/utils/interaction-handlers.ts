import { ApplicationCommandType, MessageFlags } from 'discord-api-types/v10';
import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  ComponentType,
  ContextMenuCommandInteraction,
  DiscordjsError,
  DiscordjsErrorCodes,
  InteractionType,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { TFunction } from 'i18next';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { DEFAULT_LANGUAGE } from '../constants/locales.js';
import {
  AutocompleteHandler,
  BotModalId,
  InteractionHandlerContext,
  UserInteractionContext,
} from '../types/bot-interaction.js';
import { interactionReply } from './interaction-reply.js';
import {
  chatInputCommandMap,
  isKnownChatInputCommandInteraction,
} from './interactions/chat-input-commands.js';
import { isKnownModalSubmitInteraction, modalSubmitMap } from './interactions/modal-submits.js';
import {
  getModalCustomIdSegments,
  getUserIdentifier,
  stringifyChannelName,
  stringifyGuildName,
  stringifyOptionsData,
} from './messaging.js';

const ellipsis = '…';

const processingErrorMessageFactory = (t: TFunction): string => `${EmojiCharacters.OCTAGONAL_SIGN} ${t('commands.global.responses.unexpectedError')}`;

const handleInteractionError = async (interaction: ChatInputCommandInteraction | ButtonInteraction | AutocompleteInteraction | ContextMenuCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction, context: UserInteractionContext) => {
  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    await interaction.respond([
      {
        value: '',
        name: processingErrorMessageFactory(context.t),
      },
    ]);
    return;
  }

  let alreadyReplied = interaction.replied;
  if (!alreadyReplied) {
    try {
      await interactionReply(context, interaction, {
        content: processingErrorMessageFactory(context.t),
        flags: MessageFlags.Ephemeral,
      });
    } catch (e) {
      if (e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionAlreadyReplied) {
        alreadyReplied = true;
      } else {
        throw e;
      }
    }
  }
  if (!alreadyReplied) {
    return;
  }
  // If we already replied, we need to do some editing on the existing message to include the error
  const oldReply = await interaction.fetchReply();
  const flags = oldReply.flags.bitfield;
  const processingErrorMessage = processingErrorMessageFactory(context.t);
  const oldReplyComponents = oldReply.components;
  if (oldReply.flags.has(MessageFlags.IsComponentsV2)) {
    await interaction.editReply({
      flags,
      components: [...oldReplyComponents, {
        type: ComponentType.TextDisplay,
        content: processingErrorMessage,
      }],
    });
    return;
  }
  const oldReplyContent = oldReply.content;
  const messageSuffix = `\n\n${processingErrorMessage}`;
  let newContent = oldReplyContent + messageSuffix;
  const maximumMessageLength = 2000;
  if (newContent.length > maximumMessageLength) {
    newContent = oldReplyContent.substring(0, maximumMessageLength - messageSuffix.length - ellipsis.length) + ellipsis + messageSuffix;
  }
  await interaction.editReply({
    flags,
    content: newContent,
  });
};

const isChatInputCommandInteraction = (interaction: CommandInteraction): interaction is ChatInputCommandInteraction => {
  return interaction.commandType === ApplicationCommandType.ChatInput;
};

interface CreateTFunctionOptions {
  i18next: InteractionHandlerContext['i18next'];
  ephemeral: boolean | null;
  locale: string;
  guild: { preferredLocale?: string } | undefined | null;
}

export const createTFunction = ({ i18next, ephemeral, locale, guild }: CreateTFunctionOptions) => {
  return i18next.getFixedT(
    // Always use user's locale for ephemeral responses, otherwise use server's preferred locale when available
    ephemeral
      ? [locale, DEFAULT_LANGUAGE] :
      (
        guild?.preferredLocale
          ? [guild.preferredLocale, DEFAULT_LANGUAGE]
          : DEFAULT_LANGUAGE
      ),
  );
};

export const handleCommandInteraction = async (interaction: CommandInteraction, context: InteractionHandlerContext): Promise<void> => {
  const t = createTFunction({
    i18next: context.i18next,
    ephemeral: true,
    locale: interaction.locale,
    guild: interaction.guild,
  });
  const { i18next, ...restContext } = context;
  const logger = context.logger.nest(`Interaction#${interaction.id}`);
  const userInteractionContext: UserInteractionContext = {
    ...restContext,
    logger,
    t,
  };
  if (!isChatInputCommandInteraction(interaction)) {
    await interactionReply(userInteractionContext, interaction, {
      content: `Unsupported command type ${interaction.commandType} when running ${interaction.commandName}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  userInteractionContext.t = createTFunction({
    i18next,
    ephemeral: false,
    locale: interaction.locale,
    guild: interaction.guild,
  });

  if (!isKnownChatInputCommandInteraction(interaction)) {
    await interactionReply(userInteractionContext, interaction, { content: `Unknown command ${interaction.commandName}` });
    return;
  }

  const { commandName, user, options, channel, channelId, guild, guildId } = interaction;
  const command = chatInputCommandMap[commandName];

  const optionsString = options.data.length > 0
    ? ` ${stringifyOptionsData(interaction.options.data)}`
    : '';
  logger.log(`${getUserIdentifier(user)} ran /${commandName}${optionsString} in ${stringifyChannelName(channelId, channel)} of ${stringifyGuildName(guildId, guild)}`);

  try {
    await command.handle(interaction, userInteractionContext);
  } catch (e) {
    logger.error(`Error while responding to command interaction (commandName=${commandName})`, e);
    await handleInteractionError(interaction, userInteractionContext);
  }
};

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
