import fs from 'node:fs';
import path from 'node:path';
import { Readable, Stream } from 'node:stream';
import { LoggerContext } from '../types/contexts/logger.context.js';
import { streamToBuffer } from './stream-to-buffer.js';
import { isUploadApiEnabled, uploadFile } from './upload-api.js';

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
  deleteUrl: string | null;
  filePath: string | null;
}

const allowedFileExtensions = new Set<string>(['png', 'jpg', 'jpeg', 'webp', 'gif']);

/**
 * Saves a sticker file, either to the remote upload API (when UPLOAD_API_ENABLED)
 * or to the local filesystem otherwise. See src/utils/upload-api.ts for the
 * remote-upload contract.
 */
export const saveStickerFile = async (context: LoggerContext, input: SaveStickerInput): Promise<SaveStickerResult> => {
  const stickerFileId = crypto.randomUUID();
  context.logger.info(`[StickerFile#${stickerFileId}] ID generated for file ${input.fileId}`);
  const fileExtension = input.fileName.split('.').pop();
  if (!fileExtension || !allowedFileExtensions.has(fileExtension)) {
    throw new Error(`Sticker file ${input.fileName} has an unsupported file extension: ${fileExtension}`);
  }
  const stickerFileName = `${stickerFileId}.${fileExtension}`;

  if (isUploadApiEnabled()) {
    context.logger.info(`[StickerFile#${stickerFileId}] uploading via upload API`);
    const buffer = await toBuffer(input.data);
    const { url, deleteUrl } = await uploadFile(context.logger, stickerFileName, buffer);
    return {
      stickerFileId,
      stickerUrl: url,
      deleteUrl,
      filePath: null,
    };
  }

  const { filePath, folderPath } = getStickerFilePathFromFileName(stickerFileName);

  context.logger.info(`[StickerFile#${stickerFileId}] creating output directory ${folderPath}`);
  await fs.promises.mkdir(folderPath, { recursive: true });

  context.logger.info(`[StickerFile#${stickerFileId}] writing file to ${filePath}`);
  await fs.promises.writeFile(filePath, input.data);

  return {
    stickerFileId,
    stickerUrl: getStickerFileFsUrl(stickerFileName),
    deleteUrl: null,
    filePath,
  };
};

const toBuffer = async (data: SaveStickerInput['data']): Promise<Buffer> => {
  if (data instanceof Readable) {
    return streamToBuffer(data);
  }
  if (typeof data === 'string' || ArrayBuffer.isView(data)) {
    return Buffer.from(data as never);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of data as AsyncIterable<string | NodeJS.ArrayBufferView>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
  }
  return Buffer.concat(chunks);
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

export const isFileUploadStickerUrl = (url: string) => url.startsWith(fsUrlPrefix);

export const getStickerFilePathFromUrl = (url: string): StickerFileLocation | null => {
  if (!isFileUploadStickerUrl(url)) {
    return null;
  }

  return getStickerFilePathFromFileName(url.substring(fsUrlPrefix.length));
};
