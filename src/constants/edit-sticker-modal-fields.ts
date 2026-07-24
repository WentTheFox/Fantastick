// Used by the combined full-edit modal shared between /edit-sticker and mass-edit-stickers
export enum EditStickerModalCustomIds {
  NEW_NAME_INPUT = 'newNameInput',
  NEW_ALT_INPUT = 'newAltInput',
  NEW_FILE_INPUT = 'newFileInput',
  NEW_URL_INPUT = 'newUrlInput',
  RATING_INPUT = 'ratingInput',
}

// Used by /edit-sticker-metadata's name/description/rating-only modal
export enum EditStickerMetadataModalCustomIds {
  NAME_INPUT = 'nameInput',
  ALT_INPUT = 'altInput',
  RATING_INPUT = 'ratingInput',
}

// Used by /replace-sticker's file/URL-only modal
export enum ReplaceStickerModalCustomIds {
  FILE_INPUT = 'fileInput',
  URL_INPUT = 'urlInput',
}

export enum EditStickerRatingOption {
  DEFAULT = 'default',
  SFW = 'sfw',
  NSFW = 'nsfw',
}

export const parseRatingOption = (value: string | null): boolean | null => {
  switch (value) {
    case EditStickerRatingOption.SFW: return false;
    case EditStickerRatingOption.NSFW: return true;
    default: return null;
  }
};
