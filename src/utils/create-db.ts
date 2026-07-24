import { createPostgresPrismaDb } from '@wentthefox-org/discord-bot-framework/db';
import { env } from '../env.js';
import { PrismaClient } from '../generated/prisma/client.js';

export const createDb = () => createPostgresPrismaDb(PrismaClient, {
  connectionString: env.DATABASE_URL,
});
