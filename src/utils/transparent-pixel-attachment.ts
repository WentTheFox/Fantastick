import { AttachmentBuilder } from 'discord.js';

// A GIF's transparency is a 1-bit index flag that many image-processing pipelines
// don't honor consistently (it showed up as a solid white square on mobile), whereas
// a PNG's real alpha channel is reliably respected, so this is a PNG despite being
// a couple dozen bytes larger than the equivalent transparent GIF.
const transparentPixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=', 'base64');

export const transparentPixelAttachmentName = 'pixel.png';

export const getTransparentPixelAttachment = (): AttachmentBuilder =>
  new AttachmentBuilder(transparentPixelPng, { name: transparentPixelAttachmentName });
