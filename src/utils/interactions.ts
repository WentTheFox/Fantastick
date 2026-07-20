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
import { editStickerCommand } from '../commands/edit-sticker.command.js';
import { importTelegramPackCommand } from '../commands/import-telegram-pack.command.js';
import { massRenameStickersCommand } from '../commands/mass-rename-stickers.command.js';
import { nsfwPackCommand } from '../commands/nsfw-pack.command.js';
import { nsfwStickerCommand } from '../commands/nsfw-sticker.command.js';
import { packCommand } from '../commands/pack.command.js';
import { reorderStickerCommand } from '../commands/reorder-sticker.command.js';
import { stickerCommand } from '../commands/sticker.command.js';
import { stickerDetailsCommand } from '../commands/sticker-details.command.js';
import { updateMessageCommand } from '../commands/update-message.command.js';
import { deleteMessageComponent } from '../components/delete-message.component.js';
import { massRenameNextComponent } from '../components/mass-rename-next.component.js';
import { massRenameOpenComponent } from '../components/mass-rename-open.component.js';
import { massRenamePrevComponent } from '../components/mass-rename-prev.component.js';
import { packPageFirstComponent } from '../components/pack-page-first.component.js';
import { packPageLastComponent } from '../components/pack-page-last.component.js';
import { packPageNextComponent } from '../components/pack-page-next.component.js';
import { packPagePrevComponent } from '../components/pack-page-prev.component.js';
import { updateMessageComponent } from '../components/update-message.component.js';

export const chatInputCommandRegistry = createChatInputCommandRegistry([
  stickerCommand,
  nsfwStickerCommand,
  createPackCommand,
  importTelegramPackCommand,
  createStickerCommand,
  packCommand,
  nsfwPackCommand,
  editStickerCommand,
  deleteStickerCommand,
  deletePackCommand,
  editPackCommand,
  reorderStickerCommand,
  massRenameStickersCommand,
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
  massRenameOpenComponent,
  massRenamePrevComponent,
  massRenameNextComponent,
]);

export const modalRegistry = flattenCommandModals(chatInputCommandRegistry);
