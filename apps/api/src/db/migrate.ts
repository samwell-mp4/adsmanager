import fs from 'fs';
import path from 'path';
import { pool } from './index.js';

export async function runMigrations() {
  console.log('[Migrations] Checking and running database migrations...');
  const client = await pool.connect();

  try {
    // Create migrations tracker table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Look for migrations in relative directories
    const migrationDirs = [
      path.resolve(process.cwd(), '../../database/migrations'),
      path.resolve(process.cwd(), 'database/migrations'),
      path.resolve(process.cwd(), '../database/migrations'),
    ];

    let migrationsDir = migrationDirs.find((dir) => fs.existsSync(dir));

    if (!migrationsDir) {
      throw new Error(`Migrations directory not found in any expected location: ${migrationDirs.join(', ')}`);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM migrations_history WHERE filename = $1',
        [file]
      );

      if (rows.length === 0) {
        console.log(`[Migrations] Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO migrations_history (filename) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`[Migrations] Successfully applied: ${file}`);
        } catch (migrationErr: any) {
          await client.query('ROLLBACK');
          console.error(`[Migrations] Failed applying ${file}:`, migrationErr.message);
          throw migrationErr;
        }
      } else {
        // Migration already executed
      }
    }
    console.log('[Migrations] Database is up to date.');
  } finally {
    client.release();
  }
}

// Allow direct execution via CLI
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migrations] Execution failed:', err);
      process.exit(1);
    });
}
