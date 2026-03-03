import fs from 'node:fs';
import path from 'node:path';
import { Stream } from 'node:stream';
import { InteractionContext } from '../types/bot-interaction.js';

export interface SaveStickerInput {
  fileId: string;
  fileName: string;
  data:
    | string
    | NodeJS.ArrayBufferView
    | Iterable<string | NodeJS.ArrayBufferView>
    | AsyncIterable<string | NodeJS.ArrayBufferView>
    | Stream;
}

export interface SaveStickerResult {
  stickerId: string;
  stickerUrl: string;
  filePath: string;
}

const allowedFileExtensions = new Set<string>(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export const saveStickerFile = async (context: Pick<InteractionContext, 'logger'>, input: SaveStickerInput): Promise<SaveStickerResult> => {
  const stickerId = crypto.randomUUID();
  context.logger.info(`Saving sticker ${stickerId}: ID generated for file ${input.fileId}`);
  const fileExtension = input.fileName.split('.').pop();
  if (!fileExtension || !allowedFileExtensions.has(fileExtension)) {
    throw new Error(`Sticker file ${input.fileName} has an unsupported file extension: ${fileExtension}`);
  }
  const stickerFileName = `${stickerId}.${fileExtension}`;
  const { filePath, folderPath } = getStickerFilePathFromFileName(stickerFileName);

  context.logger.info(`Saving sticker ${stickerId}: creating output directory ${folderPath}`);
  await fs.promises.mkdir(folderPath, { recursive: true });

  context.logger.info(`Saving sticker ${stickerId}: writing file to ${filePath}`);
  await fs.promises.writeFile(filePath, input.data);

  return {
    stickerId,
    stickerUrl: getStickerFileFsUrl(stickerFileName),
    filePath,
  };
};

const fsUrlPrefix = 'fs://';

export const getStickerFileFsUrl = (stickerFileName: string): string => fsUrlPrefix + stickerFileName;

export interface StickerFilePath {
  stickerFileName: string;
  folderPath: string;
  filePath: string;
}

export const getStickerFilePathFromFileName = (stickerFileName: string): StickerFilePath => {
  const folderPath = path.join(process.cwd(), 'fs', stickerFileName[0], stickerFileName.substring(1, 3));
  const filePath = path.join(folderPath, stickerFileName);
  return { folderPath, filePath, stickerFileName };
};

export const getStickerFilePathFromUrl = (url: string): StickerFilePath | null => {
  if (!url.startsWith(fsUrlPrefix)) {
    return null;
  }

  return getStickerFilePathFromFileName(url.substring(fsUrlPrefix.length));
};
