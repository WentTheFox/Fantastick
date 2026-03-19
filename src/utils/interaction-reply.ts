import {
  ChatInputCommandInteraction,
  CommandInteraction,
  ComponentType,
  ContextMenuCommandInteraction,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessageComponentInteraction,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js';

import { InteractionContext } from '../types/contexts/interaction.context.js';
import { UserInteractionContext } from '../types/contexts/user-interaction.context.js';

type InteractionReplyOptionsWithComponents = InteractionReplyOptions & {
  components: Required<InteractionReplyOptions>['components']
};

const isInteractionReplyOptionsWithComponents = (options: InteractionReplyOptions): options is InteractionReplyOptionsWithComponents => Boolean(options.components);

const upgradeToComponentsV2 = (options: InteractionReplyOptions): InteractionReplyOptionsWithComponents => {
  if (isInteractionReplyOptionsWithComponents(options)) {
    return options;
  }

  const { content, flags, ...rest } = options;
  return {
    ...rest,
    flags: Array.isArray(flags)
      ? [...flags, MessageFlags.IsComponentsV2]
      : ((typeof flags === 'number' ? flags : 0) | MessageFlags.IsComponentsV2),
    components: [
      {
        type: ComponentType.TextDisplay,
        content,
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

export const interactionReply = (context: Pick<UserInteractionContext, 't' | 'commandIdMap'>, interaction: CommandInteraction | ChatInputCommandInteraction | ContextMenuCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction, options: InteractionReplyOptions) => {
  if (interaction.replied || interaction.deferred) {
    if (Array.isArray(options.flags) && options.flags.includes(MessageFlags.Ephemeral)) {
      options.flags = options.flags.filter(flag => flag !== MessageFlags.Ephemeral);
    }
    if (interaction.isContextMenuCommand()) {
      return interaction.followUp(upgradeToComponentsV2(options));
    }
    return interaction.editReply(options as InteractionEditReplyOptions);
  }
  return interaction.reply(upgradeToComponentsV2(options));
};
