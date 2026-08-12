import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Standard client for public/client-side reads
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with full privileges for server-side API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
