import { MessageComponentInteraction } from 'discord.js';
import { deleteMessageComponent } from '../../components/delete-message.component.js';
import { updateMessageComponent } from '../../components/update-message.component.js';
import { BotMessageComponent, BotMessageComponentCustomId } from '../../types/bot-interaction.js';

export const messageComponentMap: Record<BotMessageComponentCustomId, BotMessageComponent> = {
  [BotMessageComponentCustomId.UPDATE_MESSAGE]: updateMessageComponent,
  [BotMessageComponentCustomId.DELETE_MESSAGE]: deleteMessageComponent,
};

export const messageComponents = (Object.keys(messageComponentMap) as BotMessageComponentCustomId[]);

export const isKnownMessageComponent = (customId: string): customId is BotMessageComponentCustomId => customId in messageComponentMap;

export const isKnownMessageComponentInteraction = <InteractionType extends MessageComponentInteraction>(interaction: InteractionType): interaction is InteractionType & {
  customId: BotMessageComponentCustomId
} => isKnownMessageComponent(interaction.customId);
