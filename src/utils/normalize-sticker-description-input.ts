export const normalizeStickerDescriptionInput = (input: string | undefined | null) => {
  const description = (input ?? '').trim();
  return description.length === 0 ? null : description;
};
