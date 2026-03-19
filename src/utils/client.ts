import { Client, Events, InteractionType, Partials } from 'discord.js';
import { env } from '../env.js';
import { InteractionHandlerContext } from '../types/contexts/interaction-handler.context.js';
import { getGitData } from './get-git-data.js';
import { handleComponentInteraction } from './interaction-handlers/handle-component-interaction.js';
import { handleModalInteraction } from './interaction-handlers/handle-modal-interaction.js';
import { handleCommandAutocomplete } from './interaction-handlers/handle-command-autocomplete.js';
import { handleCommandInteraction } from './interaction-handlers/handle-command-interaction.js';

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
  const client = new Client({
    intents: [],
    partials: [Partials.Message, Partials.Channel],
  });

  client.on(Events.ClientReady, handleReady(context));

  client.on(Events.InteractionCreate, async (interaction) => {
    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        await handleCommandInteraction(interaction, context);
        return;
      case InteractionType.ApplicationCommandAutocomplete:
        await handleCommandAutocomplete(interaction, context);
        return;
      case InteractionType.ModalSubmit:
        await handleModalInteraction(interaction, context);
        return;
      case InteractionType.MessageComponent:
        await handleComponentInteraction(interaction, context);
        return;
      default:
        // @ts-expect-error All types are handled currently but new ones might be added later
        throw new Error(`Unhandled interaction of type ${interaction.type}`);
    }

  });

  await client.login();
};
