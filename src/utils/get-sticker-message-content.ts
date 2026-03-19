import { ComponentType } from 'discord-api-types/v10';
import { MessageEditOptions } from 'discord.js';
import {
  deleteMessageComponentDefinition,
} from '../components/component-definitions/delete-message.component-definition.js';
import {
  updateMessageComponentDefinition,
} from '../components/component-definitions/update-message.component-definition.js';
import { Sticker } from '../generated/prisma/client.js';import { InteractionContext } from '../types/contexts/interaction.context.js';
import { mapStickersToGalleryItems, StickerGalleryItems } from './map-stickers-to-gallery-items.js';

interface GetStickerMessageContentParams {
  context: InteractionContext;
  stickers: Sticker[];
  preview?: boolean;
}

export const getStickerMessageContent = ({
  context,
  stickers,
  preview = false,
}: GetStickerMessageContentParams): Pick<MessageEditOptions, 'components'> & {
  files?: StickerGalleryItems['files']
} => {
  const { t, emojiIdMap } = context;
  const { files, items } = mapStickersToGalleryItems(stickers);

  return {
    components: [
      {
        type: ComponentType.MediaGallery,
        items,
      },
      ...(!preview ? [{
        type: ComponentType.ActionRow,
        components: [
          updateMessageComponentDefinition(t, emojiIdMap),
          deleteMessageComponentDefinition(t, emojiIdMap),
        ],
      }] : []),
    ],
    files,
  };
};
