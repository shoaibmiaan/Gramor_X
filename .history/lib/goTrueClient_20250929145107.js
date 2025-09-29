// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Ensure you only instantiate once
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

let supabase;

if (typeof window !== 'undefined') {
  // Use the existing instance if it's already created
  supabase = supabase || createClient(supabaseUrl, supabaseKey);
}

export default supabase;
