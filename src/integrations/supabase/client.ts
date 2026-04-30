import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createBrowserClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null;
