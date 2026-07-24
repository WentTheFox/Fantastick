import { stickerUrlPrefix } from '../options/metadata/import-url.option-meta.js';

export const parseTelegramPackName = (url: string): string | null => {
  if (!url.startsWith(stickerUrlPrefix)) return null;

  const packNameFromUrl = decodeURIComponent(url.substring(stickerUrlPrefix.length));
  if (!/^[^/()]+$/.test(packNameFromUrl)) return null;

  return packNameFromUrl;
};
