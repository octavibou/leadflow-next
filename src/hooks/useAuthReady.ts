import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuthReady() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setIsReady(true);
      }).catch((error) => {
        // If Supabase is not configured, allow access in dev mode
        console.warn("[v0] Supabase auth failed, allowing dev mode access:", error.message);
        setUser({ id: "dev-user" } as User);
        setIsReady(true);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
        }
      );

      return () => subscription.unsubscribe();
    } catch (error) {
      // If Supabase is not configured, allow access in dev mode
      console.warn("[v0] Supabase not configured, allowing dev mode access");
      setUser({ id: "dev-user" } as User);
      setIsReady(true);
    }
  }, []);

  return { user, isReady };
}
