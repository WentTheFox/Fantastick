import { Client, Partials } from 'discord.js';
import { createBotClient } from '@went.tf/discord-bot-framework/client';
import { getGitData } from '@went.tf/discord-bot-framework/utils';
import { env } from '../env.js';
import { InteractionHandlerContext } from '../types/contexts/interaction-handler.context.js';
import { handleInteraction } from './handle-interaction.js';

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
  await createBotClient({
    intents: [],
    partials: [Partials.Message, Partials.Channel],
    token: env.DISCORD_BOT_TOKEN,
    onReady: handleReady(context),
    onInteraction: (interaction) => handleInteraction(interaction, context),
  });
};
