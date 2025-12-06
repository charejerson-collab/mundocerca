import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY (or ANON key) must be set in the environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const seedPath = new URL('../data/seed.json', import.meta.url).pathname;
  if (!fs.existsSync(seedPath)) {
    console.error('seed.json not found at', seedPath);
    process.exit(1);
  }
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  console.log('Upserting listings...');
  for (const l of seed.listings || []) {
    const { error } = await supabase.from('listings').upsert(l, { onConflict: 'id' });
    if (error) console.error('Listing error', l.id, error.message);
  }

  console.log('Upserting professionals...');
  for (const p of seed.professionals || []) {
    const { error } = await supabase.from('professionals').upsert(p, { onConflict: 'id' });
    if (error) console.error('Pro error', p.id, error.message);
  }

  console.log('Creating test user...');
  const bcrypt = (await import('bcryptjs')).default;
  const pw = bcrypt.hashSync('password', 10);
  const { error } = await supabase.from('users').upsert({ email: 'test@example.com', name: 'Test User', password: pw }, { onConflict: 'email' });
  if (error) console.error('User error', error.message);

  console.log('Migration completed.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
