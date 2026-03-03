import { ApiAuthType, ApiClient } from '../classes/api-client.js';

export const createTelegramApiClient = () => new ApiClient(console, {
  baseUrl: 'https://api.telegram.org/bot:token',
  authentication: {
    type: ApiAuthType.PATH_SEGMENT,
    tokenEnvKey: 'TELEGRAM_BOT_TOKEN',
  },
});
export const createTelegramFileClient = () => new ApiClient(console, {
  baseUrl: 'https://api.telegram.org/file/bot:token',
  authentication: {
    type: ApiAuthType.PATH_SEGMENT,
    tokenEnvKey: 'TELEGRAM_BOT_TOKEN',
  },
});

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
}

export interface TelegramApiFile {
  file_id: string;
  file_unique_id: string;
  file_size: number;
}

export interface TelegramApiImageFile extends TelegramApiFile {
  width: number;
  height: number;
}

export type TelegramApiStickerType = 'regular' | string;

export interface TelegramApiSticker extends TelegramApiImageFile {
  emoji: string;
  set_name: string;
  is_animated: boolean;
  is_video: boolean;
  type: TelegramApiStickerType;
  thumbnail?: TelegramApiImageFile;
  thumb?: TelegramApiImageFile;
}

export interface TelegramApiGetStickerSetResult {
  name: string;
  title: string;
  thumbnail?: TelegramApiImageFile;
  thumb?: TelegramApiImageFile;
  sticker_type: TelegramApiStickerType;
  contains_masks: boolean;
  stickers: TelegramApiSticker[];
}

export type TelegramApiGetStickerSetResponse = TelegramApiResponse<TelegramApiGetStickerSetResult>;

export interface TelegramApiGetFileResult extends TelegramApiFile {
  file_path: string;
}

export type TelegramApiGetFileResponse = TelegramApiResponse<TelegramApiGetFileResult>;
