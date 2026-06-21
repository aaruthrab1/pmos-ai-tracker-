/**
 * Apply tracking schema migration to Supabase.
 * Requires SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL in environment.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/apply-tracking-migration.mjs
 *   DATABASE_URL=postgresql://... node scripts/apply-tracking-migration.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '../supabase/migrations/009_sync_tracking_schema.sql'), 'utf8');

async function viaPostgres(connectionString) {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('Migration applied via DATABASE_URL');
}

async function viaSupabaseRest(serviceKey) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) throw new Error('Missing SUPABASE_URL');

  // Supabase SQL API (management) — fallback: instruct manual run
  const res = await fetch(`${url}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(
      'Cannot run SQL via REST without a SQL RPC. Paste supabase/migrations/009_sync_tracking_schema.sql into Supabase Dashboard → SQL Editor and run it.',
    );
  }
}

async function main() {
  if (process.env.DATABASE_URL) {
    await viaPostgres(process.env.DATABASE_URL);
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.log('No DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY set.');
    console.log('Run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('  supabase/migrations/009_sync_tracking_schema.sql');
    console.log('\nThen reload schema: NOTIFY pgrst, \'reload schema\';');
    process.exit(0);
  }

  try {
    await viaSupabaseRest(serviceKey);
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }
}

main();
