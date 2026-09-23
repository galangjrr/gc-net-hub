import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wbuqekmigjqnrtxwkgjx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidXFla21pZ2pxbnJ0eHdrZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTYzMzUsImV4cCI6MjEwMjA3MjMzNX0.u9ykUPExzIomFbniREYGAgTPAXvY6SJWHP2z04OVNks';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidXFla21pZ2pxbnJ0eHdrZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ5NjMzNSwiZXhwIjoyMTAyMDcyMzM1fQ.FgTDLkmgC1L0N6hSVdOW70tJk-OEDNla0orRUsix8C4';

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

