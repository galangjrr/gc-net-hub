import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wbuqekmigjqnrtxwkgjx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidXFla21pZ2pxbnJ0eHdrZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTYzMzUsImV4cCI6MjEwMjA3MjMzNX0.u9ykUPExzIomFbniREYGAgTPAXvY6SJWHP2z04OVNks';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidXFla21pZ2pxbnJ0eHdrZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ5NjMzNSwiZXhwIjoyMTAyMDcyMzM1fQ.FgTDLkmgC1L0N6hSVdOW70tJk-OEDNla0orRUsix8C4';

// Standard client for public/client-side reads
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with full privileges for server-side API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

