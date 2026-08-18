import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');

async function ensureSchemaMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  );

  return new Set(result.rows.map((row) => row.filename));
}

async function applyMigration(filename: string, sql: string): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
  await ensureSchemaMigrationsTable();

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const appliedMigrations = await getAppliedMigrations();
  const pendingMigrations = files.filter((file) => !appliedMigrations.has(file));

  if (pendingMigrations.length === 0) {
    console.log('Database is up to date.');
    return;
  }

  for (const file of pendingMigrations) {
    const filePath = path.join(migrationsDir, file);
    const sql = await readFile(filePath, 'utf8');

    console.log(`Applying migration: ${file}`);
    await applyMigration(file, sql);
  }
}

async function main(): Promise<void> {
  try {
    await runMigrations();
  } catch (error) {
    console.error('Migration failed.');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
