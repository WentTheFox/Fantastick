import {
  createChatInputCommandRegistry,
  createComponentRegistry,
  createContextMenuCommandRegistry,
  flattenCommandModals,
} from '@wentthefox-org/discord-bot-framework/interactions';
import { createPackCommand } from '../commands/create-pack.command.js';
import { createStickerCommand } from '../commands/create-sticker.command.js';
import { deletePackCommand } from '../commands/delete-pack.command.js';
import { deleteStickerCommand } from '../commands/delete-sticker.command.js';
import { editPackCommand } from '../commands/edit-pack.command.js';
import { editStickerMetadataCommand } from '../commands/edit-sticker-metadata.command.js';
import { importTelegramPackCommand } from '../commands/import-telegram-pack.command.js';
import { massEditStickersCommand } from '../commands/mass-edit-stickers.command.js';
import { migrateToTelegramStickerCommand } from '../commands/migrate-to-telegram-sticker.command.js';
import { nsfwPackCommand } from '../commands/nsfw-pack.command.js';
import { nsfwStickerCommand } from '../commands/nsfw-sticker.command.js';
import { packCommand } from '../commands/pack.command.js';
import { publishImportedPackCommand } from '../commands/publish-imported-pack.command.js';
import { reorderStickerCommand } from '../commands/reorder-sticker.command.js';
import { replaceStickerCommand } from '../commands/replace-sticker.command.js';
import { stickerCommand } from '../commands/sticker.command.js';
import { stickerDetailsCommand } from '../commands/sticker-details.command.js';
import { updateMessageCommand } from '../commands/update-message.command.js';
import { deleteMessageComponent } from '../components/delete-message.component.js';
import { massEditEditMetadataComponent } from '../components/mass-edit-edit-metadata.component.js';
import { massEditNextComponent } from '../components/mass-edit-next.component.js';
import { massEditPrevComponent } from '../components/mass-edit-prev.component.js';
import { massEditReplaceComponent } from '../components/mass-edit-replace.component.js';
import { packPageFirstComponent } from '../components/pack-page-first.component.js';
import { packPageLastComponent } from '../components/pack-page-last.component.js';
import { packPageNextComponent } from '../components/pack-page-next.component.js';
import { packPagePrevComponent } from '../components/pack-page-prev.component.js';
import { publishConfirmComponent } from '../components/publish-confirm.component.js';
import { publishJumpInvalidComponent } from '../components/publish-jump-invalid.component.js';
import { publishNextComponent } from '../components/publish-next.component.js';
import { publishOpenComponent } from '../components/publish-open.component.js';
import { publishPrevComponent } from '../components/publish-prev.component.js';
import { updateMessageComponent } from '../components/update-message.component.js';

export const chatInputCommandRegistry = createChatInputCommandRegistry([
  stickerCommand,
  nsfwStickerCommand,
  createPackCommand,
  importTelegramPackCommand,
  createStickerCommand,
  packCommand,
  nsfwPackCommand,
  editStickerMetadataCommand,
  replaceStickerCommand,
  deleteStickerCommand,
  deletePackCommand,
  editPackCommand,
  reorderStickerCommand,
  massEditStickersCommand,
  publishImportedPackCommand,
  migrateToTelegramStickerCommand,
]);

export const contextMenuCommandRegistry = createContextMenuCommandRegistry([
  updateMessageCommand,
  stickerDetailsCommand,
]);

export const componentRegistry = createComponentRegistry([
  updateMessageComponent,
  deleteMessageComponent,
  packPageFirstComponent,
  packPagePrevComponent,
  packPageNextComponent,
  packPageLastComponent,
  massEditEditMetadataComponent,
  massEditReplaceComponent,
  massEditPrevComponent,
  massEditNextComponent,
  publishOpenComponent,
  publishPrevComponent,
  publishNextComponent,
  publishConfirmComponent,
  publishJumpInvalidComponent,
]);

export const modalRegistry = flattenCommandModals(chatInputCommandRegistry);
