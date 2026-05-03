import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  serviceRoleKey ?? 'missing-service-role-key',
  {
  auth: { persistSession: false }
  }
);
