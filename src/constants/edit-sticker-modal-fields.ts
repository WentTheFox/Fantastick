export enum EditStickerModalCustomIds {
  NEW_NAME_INPUT = 'newNameInput',
  NEW_ALT_INPUT = 'newAltInput',
  NEW_FILE_INPUT = 'newFileInput',
  NEW_URL_INPUT = 'newUrlInput',
  RATING_INPUT = 'ratingInput',
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
