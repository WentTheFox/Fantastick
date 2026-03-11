import fs from 'node:fs';
import path from 'node:path';
import { Stream } from 'node:stream';
import { InteractionContext } from '../types/bot-interaction.js';

export interface SaveStickerInput {
  stickerId?: string;
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
  stickerFileId: string;
  stickerUrl: string;
  filePath: string;
}

const allowedFileExtensions = new Set<string>(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export const saveStickerFile = async (context: Pick<InteractionContext, 'logger'>, input: SaveStickerInput): Promise<SaveStickerResult> => {
  const stickerFileId = crypto.randomUUID();
  context.logger.info(`[StickerFile#${stickerFileId}] ID generated for file ${input.fileId}`);
  const fileExtension = input.fileName.split('.').pop();
  if (!fileExtension || !allowedFileExtensions.has(fileExtension)) {
    throw new Error(`Sticker file ${input.fileName} has an unsupported file extension: ${fileExtension}`);
  }
  const stickerFileName = `${stickerFileId}.${fileExtension}`;
  const { filePath, folderPath } = getStickerFilePathFromFileName(stickerFileName);

  context.logger.info(`[StickerFile#${stickerFileId}] creating output directory ${folderPath}`);
  await fs.promises.mkdir(folderPath, { recursive: true });

  context.logger.info(`[StickerFile#${stickerFileId}] writing file to ${filePath}`);
  await fs.promises.writeFile(filePath, input.data);

  return {
    stickerFileId,
    stickerUrl: getStickerFileFsUrl(stickerFileName),
    filePath,
  };
};

const fsUrlPrefix = 'fs://';

export const getStickerFileFsUrl = (stickerFileName: string): string => fsUrlPrefix + stickerFileName;

export interface StickerFileLocation {
  stickerFileName: string;
  folderPath: string;
  filePath: string;
}

export const getStickerFilePathFromFileName = (stickerFileName: string): StickerFileLocation => {
  const folderPath = path.join(process.cwd(), 'fs', stickerFileName[0], stickerFileName.substring(1, 3));
  const filePath = path.join(folderPath, stickerFileName);
  return { folderPath, filePath, stickerFileName };
};

export const getStickerFilePathFromUrl = (url: string): StickerFileLocation | null => {
  if (!url.startsWith(fsUrlPrefix)) {
    return null;
  }

  return getStickerFilePathFromFileName(url.substring(fsUrlPrefix.length));
};
