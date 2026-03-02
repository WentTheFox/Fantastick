import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../env.js';
import { PrismaClient } from '../generated/prisma/client.js';

export const createDb = () => new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
    }),
  });
