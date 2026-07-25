import { describe, expect, it } from 'vitest';
import { Ajv } from 'ajv';
import { buildApplicationCommandsBody } from '@went.tf/discord-bot-framework/commands';
import { parseCommandsFile, registerFrameworkSchemas, resolveCommandsSchemaRefs, getCommandsFileEntries, CommandsFile } from '@went.tf/discord-bot-framework/commands/schema';
import { createCommandLocalizer } from '@went.tf/discord-bot-framework/i18n';
import commandsSchemaRaw from '../commands.schema.json' with { type: 'json' };
import commandsData from '../commands.json' with { type: 'json' };
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, initI18next } from '../constants/locales.js';
import { chatInputCommandRegistry, contextMenuCommandRegistry } from './interactions.js';

// Avoids importing @went.tf/discord-bot-framework/logger's DevNullLogger here -
// that barrel pulls in create-logger.ts's module-level pino-pretty worker-thread
// setup, which breaks under pnpm link's symlinked import.meta.url resolution
// (a local-testing artifact, not a real published-package issue).
const stubLogger = { log() {}, warn() {}, error() {}, nest: () => stubLogger } as unknown as Parameters<typeof initI18next>[0];

describe('commands.json runtime smoke test', () => {
  it('validates, resolves descriptions via real locale files, and builds a full Discord body with no throws', async () => {
    const commandsSchema = resolveCommandsSchemaRefs(commandsSchemaRaw);
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    registerFrameworkSchemas(ajv);
    const validate = ajv.compile(commandsSchema);

    const commandsFile = parseCommandsFile<CommandsFile>(commandsData, { validate });
    expect(getCommandsFileEntries(commandsFile)).toHaveLength(18);

    const i18next = await initI18next(stubLogger);
    const localizer = createCommandLocalizer({ locales: SUPPORTED_LANGUAGES, baseLocale: DEFAULT_LANGUAGE, t: i18next.t.bind(i18next) });

    const body = buildApplicationCommandsBody(
      commandsFile,
      { chatInput: chatInputCommandRegistry, contextMenu: contextMenuCommandRegistry },
      {
        resolveDescription: localizer.resolveDescription,
        localizeNames: localizer.localizeName,
        localizeDescriptions: localizer.localizeDescription,
      },
    );

    expect(body).toHaveLength(18);

    const sticker = body.find(c => c.name === 'sticker') as { description?: string; description_localizations?: Record<string, string>; name_localizations?: Record<string, string> } | undefined;
    expect(sticker?.description).toBe('Sends a sticker');
    expect(sticker?.description_localizations).toMatchObject({ hu: 'Matrica küldése' });
    expect(sticker?.name_localizations).toMatchObject({ hu: 'matrica' });

    const search = body.find(c => c.name === 'mass-edit-stickers');
    const startOption = (search?.options as { name: string }[] | undefined)?.find(o => o.name === 'start');
    expect(startOption).toMatchObject({ name: 'start', description: 'Position of the sticker to start from (defaults to 1, the first sticker)' });

    const updateMessage = body.find(c => c.name === 'Update Message');
    expect(updateMessage).toBeDefined();
    expect(updateMessage).not.toHaveProperty('description');
  });
});
