import {
  ChatInputCommandInteraction,
  CommandInteraction,
  ComponentType,
  ContextMenuCommandInteraction,
  InteractionReplyOptions,
  MessageComponentInteraction,
  MessageFlags,
} from 'discord.js';
import { InteractionContext, UserInteractionContext } from '../types/bot-interaction.js';

type InteractionReplyOptionsWithComponents = InteractionReplyOptions & {
  components: Required<InteractionReplyOptions>['components']
};

const isInteractionReplyOptionsWithComponents = (options: InteractionReplyOptions): options is InteractionReplyOptionsWithComponents => Boolean(options.components);

const upgradeToComponentsV2 = (options: InteractionReplyOptions, context: Pick<InteractionContext, 't' | 'commandIdMap'>): InteractionReplyOptionsWithComponents => {
  if (isInteractionReplyOptionsWithComponents(options)) {
    return options;
  }

  const { content, flags, ...rest } = options;
  return {
    ...rest,
    flags: (typeof flags === 'number' ? flags : 0) | MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: reformatCommandNamesInContent(content, context),
      },
    ],
  };
};

export const reformatCommandNamesInContent = <T extends string | undefined>(content: T, context: Pick<InteractionContext, 't' | 'commandIdMap'>): T extends string ? string : undefined =>
  content?.replace(/`\/(\S+)`/g, (_, commandName) => createCommandMention(commandName, context)) as never;

export const createCommandMention = (commandName: string, {
  t,
  commandIdMap,
}: Pick<InteractionContext, 't' | 'commandIdMap'>) => {
  if (typeof commandIdMap[commandName] !== 'undefined') {
    return `</${commandName}:${commandIdMap[commandName]}>`;
  }
  const tKey = `commands.${commandName}.name`;
  const translatedCommandName = t(tKey);
  return `\`/${translatedCommandName === tKey ? commandName : translatedCommandName}\``;
};

export const interactionReply = (context: Pick<UserInteractionContext, 't' | 'commandIdMap'>, interaction: CommandInteraction | ChatInputCommandInteraction | ContextMenuCommandInteraction | MessageComponentInteraction, options: InteractionReplyOptions) => {
  const upgradedOptions = upgradeToComponentsV2(options, context);
  return interaction.reply(upgradedOptions);
};
