import { APIMediaGalleryItem } from 'discord-api-types/v9';
import { AttachmentBuilder } from 'discord.js';
import { Sticker } from '../generated/prisma/client.js';
import { getStickerFilePathFromUrl } from './filesystem.js';
import { getStickerUrl, StickerUrlSource } from './get-sticker-url.js';

export interface StickerGalleryItems {
  files: AttachmentBuilder[];
  items: APIMediaGalleryItem[];
}

export const mapStickersToGalleryItems = (stickers: (Pick<Sticker, 'description'> & StickerUrlSource)[], spoiler = false): StickerGalleryItems => {
  const { files, galleryStickers } = stickers.reduce((acc, sticker) => {
    const url = getStickerUrl(sticker);
    const paths = getStickerFilePathFromUrl(url);
    if (paths === null) {
      return {
        ...acc,
        galleryStickers: [...acc.galleryStickers, { description: sticker.description, url }],
      };
    }

    const newFile = new AttachmentBuilder(paths.filePath, {
      name: paths.stickerFileName,
    }).setSpoiler(spoiler);
    const attachmentUrl = `attachment://${newFile.name}`;
    return {
      galleryStickers: [...acc.galleryStickers, { description: sticker.description, url: attachmentUrl }],
      files: [
        ...acc.files,
        newFile,
      ],
    };
  }, {
    files: [] as AttachmentBuilder[],
    galleryStickers: [] as { description: string | null, url: string }[],
  });

  return {
    files,
    items: galleryStickers.map(sticker => ({
      media: { url: sticker.url },
      description: sticker.description ?? undefined,
      spoiler,
    })),
  };
};
