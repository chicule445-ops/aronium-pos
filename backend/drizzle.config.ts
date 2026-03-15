import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();

const isPg = !!process.env.DATABASE_URL;

export default defineConfig({
    schema: isPg ? './src/db/schema.pg.ts' : './src/db/schema.ts',
    out: isPg ? './drizzle/pg' : './drizzle',
    dialect: (isPg ? 'postgresql' : 'sqlite') as any,
    dbCredentials: {
        url: process.env.DATABASE_URL || 'sqlite.db',
    },
});
