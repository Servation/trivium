// Server-side Supabase client (service role key, bypasses RLS).
// Import ONLY in API routes -- never in client components or pages.
import { createClient } from '@supabase/supabase-js';

export function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
