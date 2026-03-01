import dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: path.join(process.cwd(), '.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
