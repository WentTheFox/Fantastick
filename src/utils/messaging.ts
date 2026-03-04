import { ComponentType } from 'discord-api-types/v10';
import {
  ApplicationCommandOptionType,
  Attachment,
  ChannelType,
  ChatInputCommandInteraction,
  CommandInteraction,
  CommandInteractionOption,
  Embed,
  ModalSubmitInteraction,
  TopLevelComponent,
  User,
} from 'discord.js';
import { DiscordUser } from '../generated/prisma/client.js';
import { DiscordUserUpdateInput } from '../generated/prisma/models/DiscordUser.js';
import { InteractionContext, InteractionHandlerContext } from '../types/bot-interaction.js';

type UserFriendCode = `@${string}` | `${string}#${string}`;
export const getUserFriendCode = (user: User): UserFriendCode => {
  return user.discriminator === '0' ? `@${user.username}` : `${user.username}#${user.discriminator}`;
};

export const getUserIdentifier = (user: User): `${UserFriendCode} (${string})` => {
  return `${getUserFriendCode(user)} (${user.id})`;
};

export const stringifyChannelName = (channelId: string | null, channel?: CommandInteraction['channel']): string => {
  if (channel) {
    let stringName: string;
    if (channel.type === ChannelType.GuildText && 'name' in channel) {
      stringName = `#${channel.name}`;
    } else {
      stringName = channel.toString();
    }

    return `${stringName} (${channel.id})`;
  }

  if (channelId) {
    return `Channel#${channelId}`;
  }
  return '(unknown channel)';
};

export const stringifyGuildName = (guildId: string | null, guild: CommandInteraction['guild']): string => {
  if (guild?.name) {
    return `${guild.name} (${guild.id})`;
  }

  const potentialGuildId = guild?.id ?? guildId;
  if (potentialGuildId) {
    return `Guild#${guildId}`;
  }

  return '(unknown guild)';
};

export const stringifyOptionsData = (data: readonly CommandInteractionOption[]): string => data.map((option): string => {
  const optionName = option.name;
  let optionValue: string | number | boolean | null | undefined = option.value;
  switch (option.type) {
    case ApplicationCommandOptionType.Channel:
      if (option.channel) optionValue = `${option.channel.type === ChannelType.GuildText ? '#' : ''}${option.channel.name}`;
      break;
    case ApplicationCommandOptionType.User:
      if (option.user) optionValue = getUserIdentifier(option.user);
      break;
    case ApplicationCommandOptionType.Role:
      if (option.role) optionValue = `@${option.role.name}`;
      break;
    case ApplicationCommandOptionType.Subcommand:
      optionValue = option.options ? stringifyOptionsData(option.options) : null;
      break;
  }
  return `(${optionName}${optionValue !== null ? `:${optionValue}` : ''})`;
}).join(' ');

export type EmbedTextData = Partial<Pick<Embed, 'title' | 'description' | 'footer' | 'fields'>>;

export const findEmbedsTextFields = (embeds: EmbedTextData[]) =>
  embeds.reduce((acc, embed) => {
    if (embed.title) {
      acc.push(embed.title);
    }
    if (embed.description) {
      acc.push(embed.description);
    }
    if (embed.footer?.text) {
      acc.push(embed.footer.text);
    }
    if (embed.fields) {
      embed.fields.forEach(field => {
        if (field.name) {
          acc.push(field.name);
        }
        if (field.value) {
          acc.push(field.value);
        }
      });
    }
    return acc;
  }, [] as string[]);

export const findTextComponentContentsRecursively = (components: TopLevelComponent[]): string[] =>
  components.reduce((contents, component) => {
    if ('content' in component) {
      contents.push(component.content);
    }
    if ('components' in component) {
      return [
        ...contents,
        ...findTextComponentContentsRecursively(component.components as TopLevelComponent[]),
      ];
    }
    return contents;
  }, [] as string[]);

export const emoji = (context: Pick<InteractionHandlerContext, 'emojiIdMap'>, name: string, animated = false): string => {
  return `<${animated ? 'a' : ''}:${name}:${context.emojiIdMap[name]}>`;
};

export const updateOrCreateUser = (context: InteractionContext, interaction: Pick<ChatInputCommandInteraction, 'user'>): Promise<DiscordUser> => {
  const { db } = context;

  const id = BigInt(interaction.user.id);
  const update = {
    name: interaction.user.username,
    discriminator: interaction.user.discriminator,
    displayName: interaction.user.globalName,
    avatar: interaction.user.avatar,
  } satisfies DiscordUserUpdateInput;
  return db.discordUser.upsert({
    where: { id },
    create: {
      id,
      ...update,
    },
    update,
  });
};

export const truncateToMaximumLength = (str: string, maxLength: number) => str.length > maxLength ? `${str.substring(0, maxLength)}…` : str;

interface ModalCustomIdSegments {
  modalId: string,
  resourceId: string | undefined
}

export const getModalCustomIdSegments = (customId: string): ModalCustomIdSegments => {
  const [modalId, resourceId] = customId.split(/:/);
  return { modalId, resourceId };
};

export interface ModalSubmittedData<CustomIds extends string> {
  data: Record<CustomIds, string>;
  indexedAttachments: Record<string, Attachment>;
}

export const collectModalSubmittedData = <CustomIds extends string>(interaction: ModalSubmitInteraction, customIds: Record<string, CustomIds>): ModalSubmittedData<CustomIds> => {
  const customIdsSet = new Set(Object.values(customIds));
  const isValidCustomId = (customId: string): customId is CustomIds => customIdsSet.has(customId as never);

  const indexedAttachments: Record<string, Attachment> = {};
  const data = interaction.components.reduce((acc, component) => {
    switch (component.type) {
      case ComponentType.Label: {
        const customId = component.component.customId;

        if (isValidCustomId(customId)) {
          switch (component.component.type) {
            case ComponentType.TextInput:
              acc[customId] = component.component.value;
              break;
            case ComponentType.StringSelect:
              acc[customId] = component.component.values[0];
              break;
            case ComponentType.FileUpload:
              acc[customId] = component.component.values[0];
              component.component.attachments?.forEach(attachment => {
                indexedAttachments[attachment.id] = attachment;
              });
              break;
          }
        }
      }
        break;
    }
    return acc;
  }, {} as Record<CustomIds, string>);
  return { data, indexedAttachments };
};
