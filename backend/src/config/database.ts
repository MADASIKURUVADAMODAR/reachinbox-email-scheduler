import dotenv from 'dotenv';
import { Pool, type PoolConfig } from 'pg';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not defined.');
}

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
  query_timeout: 10_000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
};

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.info('[postgres] New PostgreSQL client connected.');
});

pool.on('error', (error: Error) => {
  console.error('[postgres] Unexpected PostgreSQL pool error:', error.message);
});

export { pool };
export default pool;
