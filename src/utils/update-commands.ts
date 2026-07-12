import {
  ApplicationIntegrationType,
  InteractionContextType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { filledBar } from 'string-progressbar';
import { buildApplicationCommandsBody, createCommandRegistrar } from '@wentthefox-org/discord-bot-framework/commands';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { env } from '../env.js';

import { InteractionHandlerContext } from '../types/contexts/interaction-handler.context.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';
import { chatInputCommandRegistry, contextMenuCommandRegistry } from './interactions.js';
import { rest } from './rest.js';

const commonCommandOptions: Pick<RESTPostAPIChatInputApplicationCommandsJSONBody, 'integration_types' | 'contexts'> = {
  integration_types: [ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
};

export type BasicCommandData = Array<{ id: string, name: string }>;

export const updateCommandsFromInteraction = async (interactionContext: InteractionContext, progressReporter?: (progress: string) => Promise<unknown>): Promise<BasicCommandData | undefined> => {
  interactionContext.logger.log(`Application ${env.LOCAL ? 'is' : 'is NOT'} in local mode`);
  const registrar = createCommandRegistrar({ rest, applicationId: env.DISCORD_CLIENT_ID, logger: interactionContext.logger });
  const body = buildApplicationCommandsBody(
    { chatInput: chatInputCommandRegistry, contextMenu: contextMenuCommandRegistry },
    { sharedMetadata: commonCommandOptions, definitionArg: interactionContext.t },
  );

  let result: BasicCommandData | undefined;
  if (env.LOCAL) {
    await progressReporter?.('Getting authorized servers list…');
    const serverIds = await registrar.getAuthorizedServers();
    await progressReporter?.('Cleaning global commands…');
    await registrar.cleanGlobalCommands();
    const serverCount = serverIds.length;
    let completed = 0;
    const updateProgress = progressReporter ? async () => {
      const progressbar = filledBar(serverCount, completed, 18, EmojiCharacters.WHITE_SQUARE, EmojiCharacters.GREEN_SQUARE)[0];
      await progressReporter?.(`Updating server commands…\n-# ${progressbar}`);
    } : undefined;
    await Promise.all(serverIds.map(async (serverId) => {
      await updateProgress?.();
      result = await registrar.updateGuildCommands(serverId, body);
      completed++;
      await updateProgress?.();
    }));
  } else {
    await progressReporter?.('Updating global commands…');
    result = await registrar.updateGlobalCommands(body);
  }

  return result;
};

export const updateCommands = async (context: InteractionHandlerContext): Promise<void> => {
  const { i18next, ...restContext } = context;
  const logger = context.logger.nest('updateCommands');
  logger.log('Updating commands…');
  const t = i18next.t.bind(i18next);
  await updateCommandsFromInteraction({ ...restContext, t, logger });
};
