const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// We need the postgres connection string from the environment.
// Let's assume there's a POSTGRES_URL or we construct it.
const pgUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!pgUrl) {
  console.error("Missing POSTGRES_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

async function run() {
  const sql = fs.readFileSync('supabase/migrations/20260711000004_whatsapp_queues.sql', 'utf8');
  
  const client = new Client({ connectionString: pgUrl });
  await client.connect();
  
  console.log("Running SQL script...");
  try {
      await client.query(sql);
      console.log("Success!");
  } catch(e) {
      console.error(e);
  } finally {
      await client.end();
  }
}

run();
