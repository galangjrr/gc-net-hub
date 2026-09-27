import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diisi di env.');
}
// Server routes get the secret key. In the browser bundle it is undefined, so the admin client falls back to the publishable key and RLS applies.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

declare global {
  var __supabaseInstance: SupabaseClient<any> | undefined;
  var __supabaseAdminInstance: SupabaseClient<any> | undefined;
}

// Standard client for public/client-side reads & persistent member sessions
export const supabase =
  globalThis.__supabaseInstance ??
  (globalThis.__supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }));

// Admin client with full privileges for server-side API routes
export const supabaseAdmin =
  globalThis.__supabaseAdminInstance ??
  (globalThis.__supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }));

