import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import pg from 'pg';
import * as schemaSqlite from './schema.js';
import * as schemaPg from './schema.pg.js';
import dotenv from 'dotenv';

dotenv.config();

const isPg = !!process.env.DATABASE_URL;

let dbInstance: any;
let schemaInstance: any;

if (isPg) {
  console.log('🌐 Connecting to PostgreSQL Cloud Database');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });
  dbInstance = drizzlePg(pool, { schema: schemaPg });
  schemaInstance = schemaPg;
} else {
  console.log('🏠 Connecting to Local SQLite Database');
  const sqlite = new Database('sqlite.db');
  dbInstance = drizzleSqlite(sqlite, { schema: schemaSqlite });
  schemaInstance = schemaSqlite;
}

export const db = dbInstance;
export const schema = schemaInstance;
