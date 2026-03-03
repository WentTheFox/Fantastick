import { APIMediaGalleryItem } from 'discord-api-types/v9';
import { AttachmentBuilder } from 'discord.js';
import { Sticker } from '../generated/prisma/client.js';
import { getStickerFilePathFromUrl } from './filesystem.js';

export interface StickerGalleryItems {
  files: AttachmentBuilder[];
  items: APIMediaGalleryItem[];
}

export const mapStickersToGalleryItems = (stickers: Sticker[]): StickerGalleryItems => {
  const { files, galleryStickers } = stickers.reduce((acc, sticker) => {
    const paths = getStickerFilePathFromUrl(sticker.url);
    if (paths === null) {
      return acc;
    }

    const attachmentUrl = `attachment://${paths.stickerFileName}`;
    const newFile = new AttachmentBuilder(paths.filePath, {
      name: paths.stickerFileName,
    });
    return {
      galleryStickers: [...acc.galleryStickers, { ...sticker, url: attachmentUrl }],
      files: [
        ...acc.files,
        newFile,
      ],
    };
  }, { files: [] as AttachmentBuilder[], galleryStickers: [] as Sticker[] });

  return {
    files,
    items: galleryStickers.map(sticker => ({
      media: { url: sticker.url },
      description: sticker.description ? sticker.description : undefined,
    })),
  };
};
