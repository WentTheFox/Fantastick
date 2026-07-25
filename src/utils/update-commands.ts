import { Ajv } from 'ajv';
import {
  ApplicationIntegrationType,
  InteractionContextType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { filledBar } from 'string-progressbar';
import { buildApplicationCommandsBody, createCommandRegistrar } from '@went.tf/discord-bot-framework/commands';
import { parseCommandsFile, registerFrameworkSchemas, resolveCommandsSchemaRefs, CommandsFile } from '@went.tf/discord-bot-framework/commands/schema';
import { createCommandLocalizer } from '@went.tf/discord-bot-framework/i18n';
import { EmojiCharacters } from '../constants/emoji-characters.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../constants/locales.js';
import { env } from '../env.js';

import commandsSchemaRaw from '../commands.schema.json' with { type: 'json' };
import commandsData from '../commands.json' with { type: 'json' };
import { InteractionHandlerContext } from '../types/contexts/interaction-handler.context.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';
import { chatInputCommandRegistry, contextMenuCommandRegistry } from './interactions.js';
import { rest } from './rest.js';

const commonCommandOptions: Pick<RESTPostAPIChatInputApplicationCommandsJSONBody, 'integration_types' | 'contexts'> = {
  integration_types: [ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
};

// Rewrites the relative-path $refs in commands.schema.json (which point into
// node_modules, so an editor can resolve them for autocomplete) to each
// fragment's real ajv-resolvable identity - see the framework README's
// "JSON Schema fragments" section.
const commandsSchema = resolveCommandsSchemaRefs(commandsSchemaRaw);

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
registerFrameworkSchemas(ajv);
const validateCommandsFile = ajv.compile(commandsSchema);

export type BasicCommandData = Array<{ id: string, name: string }>;

export const updateCommandsFromInteraction = async (interactionContext: InteractionContext, progressReporter?: (progress: string) => Promise<unknown>): Promise<BasicCommandData | undefined> => {
  interactionContext.logger.log(`Application ${env.LOCAL ? 'is' : 'is NOT'} in local mode`);
  const registrar = createCommandRegistrar({ rest, applicationId: env.DISCORD_CLIENT_ID, logger: interactionContext.logger });

  const commandsFile = parseCommandsFile<CommandsFile>(commandsData, { validate: validateCommandsFile });
  const localizer = createCommandLocalizer({ locales: SUPPORTED_LANGUAGES, baseLocale: DEFAULT_LANGUAGE, t: interactionContext.t });

  const body = buildApplicationCommandsBody(
    commandsFile,
    { chatInput: chatInputCommandRegistry, contextMenu: contextMenuCommandRegistry },
    {
      sharedMetadata: commonCommandOptions,
      resolveDescription: localizer.resolveDescription,
      localizeNames: localizer.localizeName,
      localizeDescriptions: localizer.localizeDescription,
    },
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
