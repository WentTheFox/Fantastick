import { ChatInputCommandInteraction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pack, Sticker } from '../generated/prisma/client.js';
import { InteractionContext } from '../types/contexts/interaction.context.js';
import { postStickerToFeed, StickerSnapshot } from './post-sticker-to-feed.js';

const send = vi.fn();

vi.mock('discord.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('discord.js')>();
  return {
    ...actual,
    WebhookClient: vi.fn().mockImplementation(function WebhookClient() {
      return { send };
    }),
  };
});

const baseSticker = {
  id: 'sticker-id',
  packId: 'pack-id',
  name: 'my-sticker',
  description: null,
  deleteUrl: null,
  createdBy: 1n,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: null,
  deletedAt: null,
  deletedBy: null,
  order: 0,
  telegramStickerId: null,
  nsfwOverride: null,
  telegramSticker: null,
} satisfies Partial<Sticker> & { telegramSticker: null };

const userPack = {
  id: 'pack-id',
  name: 'my-pack',
  createdBy: 1n,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: null,
  deletedAt: null,
  deletedBy: null,
  nsfw: false,
  public: true,
  telegramPackId: null,
  telegramPack: null,
} as unknown as Pack & { telegramPack?: null };

const interaction = {
  user: { id: '42' },
  token: 'token',
  id: 'interaction-id',
} as unknown as ChatInputCommandInteraction;

const db = {
  $transaction: vi.fn().mockResolvedValue([]),
  stickerMessage: { create: vi.fn() },
};
const context = { db } as unknown as InteractionContext;

const contentOf = () => send.mock.calls.at(-1)?.[0].content as string;
const filesOf = () => send.mock.calls.at(-1)?.[0].files as { name: string }[];

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ id: '111', channelId: '222', guildId: '333' });
  db.$transaction.mockClear();
});

describe('postStickerToFeed', () => {
  it('shows a single Image line and no Old/New URL when the URL did not change', async () => {
    const sticker = { ...baseSticker, url: 'https://cdn.example.com/current.png' } as Sticker & { telegramSticker: null };

    await postStickerToFeed({
      context,
      interaction,
      sticker,
      userPack,
      action: 'create',
    });

    const content = contentOf();
    expect(content).toContain('**Image:** https://cdn.example.com/current.png');
    expect(content).not.toContain('Old URL');
    expect(content).not.toContain('New URL');
  });

  it('shows plain Old/New URL lines with no Image line when both URLs are remote (upload API)', async () => {
    const snapshot: StickerSnapshot = {
      name: 'my-sticker',
      description: null,
      url: 'https://cdn.example.com/old.png',
      nsfwOverride: null,
    };
    const sticker = { ...baseSticker, url: 'https://cdn.example.com/new.png' } as Sticker & { telegramSticker: null };

    await postStickerToFeed({
      context,
      interaction,
      sticker,
      userPack,
      action: 'edit',
      snapshot,
    });

    const content = contentOf();
    expect(content).toContain('**Old URL:** https://cdn.example.com/old.png');
    expect(content).toContain('**New URL:** https://cdn.example.com/new.png');
    expect(content).not.toContain('**New URL:** `');
    expect(content).not.toContain('**Image:**');
    // the URLs must not be duplicated anywhere else in the message
    expect(content?.match(/cdn\.example\.com\/old\.png/g)).toHaveLength(1);
    expect(content?.match(/cdn\.example\.com\/new\.png/g)).toHaveLength(1);
    expect(filesOf()).toHaveLength(0);
  });

  it('attaches the old local file when going from a local upload to a remote URL', async () => {
    const snapshot: StickerSnapshot = {
      name: 'my-sticker',
      description: null,
      url: 'fs://old-file-id.png',
      nsfwOverride: null,
    };
    const sticker = { ...baseSticker, url: 'https://cdn.example.com/new.png' } as Sticker & { telegramSticker: null };

    await postStickerToFeed({
      context,
      interaction,
      sticker,
      userPack,
      action: 'edit',
      snapshot,
    });

    const content = contentOf();
    expect(content).toContain('**Old URL:** fs://old-file-id.png');
    expect(content).toContain('**New URL:** https://cdn.example.com/new.png');
    expect(content).not.toContain('**Image:**');
    // the old local file must still be attached so it's visible in the feed post
    expect(filesOf()).toHaveLength(1);
    expect(filesOf()[0].name).toBe('old-file-id.png');
  });

  it('attaches the new local file when going from a remote URL to a local upload', async () => {
    const snapshot: StickerSnapshot = {
      name: 'my-sticker',
      description: null,
      url: 'https://cdn.example.com/old.png',
      nsfwOverride: null,
    };
    const sticker = { ...baseSticker, url: 'fs://new-file-id.png' } as Sticker & { telegramSticker: null };

    await postStickerToFeed({
      context,
      interaction,
      sticker,
      userPack,
      action: 'edit',
      snapshot,
    });

    const content = contentOf();
    expect(content).toContain('**Old URL:** https://cdn.example.com/old.png');
    expect(content).toContain('**New URL:** fs://new-file-id.png');
    expect(content).not.toContain('**Image:**');
    // the new local file must be attached so it's visible in the feed post
    expect(filesOf()).toHaveLength(1);
    expect(filesOf()[0].name).toBe('new-file-id.png');
  });

  it('attaches both local files when going from one local upload to another', async () => {
    const snapshot: StickerSnapshot = {
      name: 'my-sticker',
      description: null,
      url: 'fs://old-file-id.png',
      nsfwOverride: null,
    };
    const sticker = { ...baseSticker, url: 'fs://new-file-id.png' } as Sticker & { telegramSticker: null };

    await postStickerToFeed({
      context,
      interaction,
      sticker,
      userPack,
      action: 'edit',
      snapshot,
    });

    expect(filesOf()).toHaveLength(2);
    expect(filesOf().map(file => file.name)).toEqual(['old-file-id.png', 'new-file-id.png']);
  });
});
