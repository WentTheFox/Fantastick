import { AutocompleteHandlers } from '../../types/bot-interaction.js';
import { PackCommandOptionName } from '../../types/localization.js';
import { getPackNameAutocompleteHandler } from '../../utils/autocomplete/pack-name.autocomplete.js';

export const packCommandAutocomplete = (nsfw: boolean): AutocompleteHandlers => ({
  [PackCommandOptionName.NAME]: getPackNameAutocompleteHandler(nsfw),
});
