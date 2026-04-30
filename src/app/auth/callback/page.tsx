"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

/**
 * Tras confirmar el email, Supabase redirige aquí con ?code= (PKCE) o tokens en el hash.
 * Debe ser ruta pública para que el cliente pueda fijar cookies antes del middleware.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    const finish = (path: string) => {
      if (!cancelled) router.replace(path);
    };

    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !error) {
          finish("/dashboard");
          return;
        }
        if (!cancelled && error) {
          finish("/login?error=auth_callback");
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        finish("/dashboard");
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (nextSession && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          subscription.unsubscribe();
          finish("/dashboard");
        }
      });

      window.setTimeout(() => {
        subscription.unsubscribe();
        if (cancelled) return;
        void supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s) finish("/dashboard");
          else finish("/login?error=auth_callback");
        });
      }, 3000);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-muted p-6">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Confirmando tu cuenta…</p>
    </div>
  );
}
