import { filledBar } from 'string-progressbar';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { env } from '../env.js';
import { InteractionContext, InteractionHandlerContext } from '../types/bot-interaction.js';
import {
  cleanGlobalCommands,
  getAuthorizedServers,
  updateGlobalCommands,
  updateGuildCommands,
} from './update-guild-commands.js';


export type BasicCommandData = Array<{ id: string, name: string }>;

export const updateCommandsFromInteraction = async (interactionContext: InteractionContext, progressReporter?: (progress: string) => Promise<unknown>): Promise<BasicCommandData | undefined> => {
  interactionContext.logger.log(`Application ${env.LOCAL ? 'is' : 'is NOT'} in local mode`);
  let result: BasicCommandData | undefined;
  if (env.LOCAL) {
    await progressReporter?.('Getting authorized servers list…');
    const serverIds = await getAuthorizedServers(interactionContext);
    await progressReporter?.('Cleaning global commands…');
    await cleanGlobalCommands(interactionContext);
    const serverCount = serverIds.length;
    let completed = 0;
    const updateProgress = progressReporter ? async () => {
      const progressbar = filledBar(serverCount, completed, 18, EmojiCharacters.WHITE_SQUARE, EmojiCharacters.GREEN_SQUARE)[0];
      await progressReporter?.(`Updating server commands…\n-# ${progressbar}`);
    } : undefined;
    await Promise.all(serverIds.map(async (serverId) => {
      await updateProgress?.();
      result = await updateGuildCommands(interactionContext, serverId);
      completed++;
      await updateProgress?.();
    }));
  } else {
    await progressReporter?.('Updating global commands…');
    result = await updateGlobalCommands(interactionContext);
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
