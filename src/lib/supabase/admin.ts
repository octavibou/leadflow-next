import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let adminClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRole) {
    throw new Error(
      "Missing Supabase admin config: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  adminClient = createClient<Database>(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}
