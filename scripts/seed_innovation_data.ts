import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

async function run() {
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const userId = process.env.SEED_USER_ID || uuidv4();

  console.log('Seeding for user:', userId);

  const mistakes = [
    { id: uuidv4(), user_id: userId, type: 'Grammar', excerpt: 'He don\'t know the answer.', source: 'writing exercise', created_at: new Date().toISOString(), resolved: false },
    { id: uuidv4(), user_id: userId, type: 'Vocabulary', excerpt: 'The company made a big damage to its brand.', source: 'reading exercise', created_at: new Date().toISOString(), resolved: false },
  ];

  const tasks = [
    { id: uuidv4(), user_id: userId, text: 'Practice 10 collocations about business.', scheduled_at: null, delivered: false, created_at: new Date().toISOString() },
    { id: uuidv4(), user_id: userId, text: '3-minute speaking: Describe a memorable trip.', scheduled_at: null, delivered: false, created_at: new Date().toISOString() },
  ];

  await supabase.from('mistakes_book').insert(mistakes);
  await supabase.from('whatsapp_tasks').insert(tasks);

  console.log('Seeded.');
}

run().catch((e) => { console.error(e); process.exit(1); });
