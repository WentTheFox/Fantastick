import { Client, Events, InteractionType } from 'discord.js';
import { env } from '../env.js';
import { getGitData } from './get-git-data.js';
import {
  handleCommandAutocomplete,
  handleCommandInteraction,
} from './interaction-handlers.js';
import { InteractionHandlerContext } from '../types/bot-interaction.js';

const handleReady = (context: InteractionHandlerContext) => async (client: Client<true>) => {
  const { logger } = context;
  const clientUser = client.user;
  if (!clientUser) throw new Error('Expected `client.user` to be defined');
  logger.log(`Logged in as ${clientUser.tag}!`);

  const versionString = env.LOCAL ? 'a local version' : await getGitData(context)
    .then(({ hash }) => `version ${hash}`)
    .catch(() => 'an unknown version');
  clientUser.setActivity(versionString);
};

export const createClient = async (context: InteractionHandlerContext): Promise<void> => {
  const client = new Client({ intents: [] });

  client.on(Events.ClientReady, handleReady(context));

  client.on(Events.InteractionCreate, async (interaction) => {
    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        await handleCommandInteraction(interaction, context);
        return;
      case InteractionType.ApplicationCommandAutocomplete:
        await handleCommandAutocomplete(interaction, context);
        return;
      default:
        throw new Error(`Unhandled interaction of type ${interaction.type}`);
    }

  });

  await client.login();
};
