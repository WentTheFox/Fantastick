import { AttachmentBuilder } from 'discord.js';

const transparentPixelGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7', 'base64');

export const transparentPixelAttachmentName = 'pixel.gif';

export const getTransparentPixelAttachment = (): AttachmentBuilder =>
  new AttachmentBuilder(transparentPixelGif, { name: transparentPixelAttachmentName });
