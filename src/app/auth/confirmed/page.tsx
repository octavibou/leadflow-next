"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { safeAppPath } from "@/lib/safeRedirectPath";

/**
 * Pantalla tras confirmar el email (enlace de Supabase → /auth/callback → aquí).
 */
function AuthConfirmedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeAppPath(searchParams.get("next"));

  useEffect(() => {
    if (!nextPath || nextPath === "/dashboard") return;
    const t = window.setTimeout(() => router.replace(nextPath), 400);
    return () => clearTimeout(t);
  }, [nextPath, router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Cuenta verificada</CardTitle>
            <CardDescription>
              Tu correo está confirmado y la sesión está activa. Ya puedes entrar al panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button type="button" className="w-full" onClick={() => router.replace(nextPath)}>
              {nextPath !== "/dashboard" ? "Continuar" : "Ir al dashboard"}
            </Button>
            {nextPath !== "/dashboard" ? (
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/dashboard">Ir al dashboard</Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/login">Inicio de sesión</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AuthConfirmedContent />
    </Suspense>
  );
}
