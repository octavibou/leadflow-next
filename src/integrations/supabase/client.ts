import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null as any;
