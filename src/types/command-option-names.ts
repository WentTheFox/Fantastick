// Split out of localization.ts so command files (which need these enums) don't import
// a module that itself needs to import the command registry (for ChatInputCommandName) -
// that would form a real import cycle: interactions.ts -> command files ->
// localization.ts -> interactions.ts, which degrades RegistryName<...>'s inferred type
// back to `string` when observed from within that cycle.

export const enum GlobalCommandOptionName {
}

export const enum StickerCommandOptionName {
  NAME = 'name',
  PREVIEW = 'preview',
}

export const enum CreatePackCommandOptionName {
  NAME = 'name',
}

export const enum ImportCommandOptionName {
  URL = 'url',
  NSFW = 'nsfw',
}

export const enum PackCommandOptionName {
  NAME = 'name',
}

export const enum EditStickerMetadataCommandOptionName {
  NAME = 'name',
}

export const enum ReplaceStickerCommandOptionName {
  NAME = 'name',
}

export const enum CreateStickerCommandOptionName {
  PACK = 'pack',
}

export const enum DeleteStickerCommandOptionName {
  NAME = 'name',
}

export const enum DeletePackCommandOptionName {
  NAME = 'name',
}

export const enum EditPackCommandOptionName {
  NAME = 'name',
}

export const enum ReorderStickerCommandOptionName {
  STICKER = 'sticker',
  BEFORE = 'before',
  AFTER = 'after',
}

export const enum MassEditStickersCommandOptionName {
  PACK = 'pack',
  START = 'start',
}

export const enum PublishImportedPackCommandOptionName {
  PACK = 'pack',
}
