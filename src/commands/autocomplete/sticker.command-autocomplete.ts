import { AutocompleteHandlers } from '../../types/bot-interaction.js';
import { StickerCommandOptionName } from '../../types/localization.js';
import {
  getStickerNameAutocompleteHandler,
} from '../../utils/autocomplete/sticker-name.autocomplete.js';

export const stickerCommandAutocomplete = (nsfw: boolean): AutocompleteHandlers => ({
  [StickerCommandOptionName.NAME]: getStickerNameAutocompleteHandler(nsfw),
});
