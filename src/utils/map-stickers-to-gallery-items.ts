import { APIMediaGalleryItem } from 'discord-api-types/v9';
import { AttachmentBuilder } from 'discord.js';
import { Sticker } from '../generated/prisma/client.js';
import { getStickerFilePathFromUrl } from './filesystem.js';
import { getStickerUrl, StickerUrlSource } from './get-sticker-url.js';

export interface StickerGalleryItems {
  files: AttachmentBuilder[];
  items: APIMediaGalleryItem[];
}

export const mapStickersToGalleryItems = (stickers: (Pick<Sticker, 'description'> & StickerUrlSource)[], spoiler: boolean | boolean[] = false): StickerGalleryItems => {
  const resolveSpoiler = (index: number) => Array.isArray(spoiler) ? spoiler[index] ?? false : spoiler;

  const { files, galleryStickers } = stickers.reduce((acc, sticker, index) => {
    const url = getStickerUrl(sticker);
    const paths = getStickerFilePathFromUrl(url);
    const stickerSpoiler = resolveSpoiler(index);
    if (paths === null) {
      return {
        ...acc,
        galleryStickers: [...acc.galleryStickers, { description: sticker.description, url, spoiler: stickerSpoiler }],
      };
    }

    const newFile = new AttachmentBuilder(paths.filePath, {
      name: paths.stickerFileName,
    }).setSpoiler(stickerSpoiler);
    const attachmentUrl = `attachment://${newFile.name}`;
    return {
      galleryStickers: [...acc.galleryStickers, { description: sticker.description, url: attachmentUrl, spoiler: stickerSpoiler }],
      files: [
        ...acc.files,
        newFile,
      ],
    };
  }, {
    files: [] as AttachmentBuilder[],
    galleryStickers: [] as { description: string | null, url: string, spoiler: boolean }[],
  });

  return {
    files,
    items: galleryStickers.map(sticker => ({
      media: { url: sticker.url },
      description: sticker.description ?? undefined,
      spoiler: sticker.spoiler,
    })),
  };
};
