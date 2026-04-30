"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { WORKSPACE_ROLE_LABELS_ES } from "@/lib/workspaceRoles";
import type { WorkspaceRole } from "@/store/workspaceStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Invite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t")?.trim() || "";

  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [peekError, setPeekError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [inviteMismatchEmail, setInviteMismatchEmail] = useState(false);

  const inviteNext = `/invite?t=${encodeURIComponent(token)}`;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setPeekError("invitacion_invalida");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!cancelled) {
        setSessionEmail(sessionData.session?.user?.email?.toLowerCase() ?? null);
      }

      const { data: rows, error } = await supabase.rpc("peek_workspace_invitation_by_token", {
        _token: token,
      });

      if (cancelled) return;

      if (error || !rows?.length) {
        setPeekError("no_encontrada");
        setLoading(false);
        return;
      }

      const row = rows[0];
      setWorkspaceName(row.workspace_name);
      setRole(row.role as WorkspaceRole);
      setLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const { data: id, error: resErr } = await supabase.rpc(
        "resolve_workspace_invitation_id_for_token",
        { _token: token },
      );
      if (resErr || !id) {
        setInviteMismatchEmail(true);
        setAccepting(false);
        return;
      }
      const { error } = await supabase.rpc("accept_workspace_invitation", {
        invitation_id: id as string,
      });
      setAccepting(false);
      if (error) {
        setPeekError("aceptar_fallo");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setAccepting(false);
      setPeekError("aceptar_fallo");
    }
  };

  const loginHref = `/login?next=${encodeURIComponent(inviteNext)}`;
  const signupHref = `/signup?next=${encodeURIComponent(inviteNext)}`;

  if (!token || peekError === "invitacion_invalida") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace incorrecto</CardTitle>
            <CardDescription>Falta el token de invitación o es inválido.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Ir al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Cargando invitación…</p>
      </div>
    );
  }

  if (peekError === "no_encontrada") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitación no disponible</CardTitle>
            <CardDescription>Este enlace puede haber expirado o la invitación ya fue tratada.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = role ? WORKSPACE_ROLE_LABELS_ES[role] : "";

  const wrongAccount = inviteMismatchEmail
    ? "Esta invitación es para otro correo. Cierra sesión o usa Iniciar sesión con otro email."
    : null;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Invitación a workspace</CardTitle>
          <CardDescription>
            {workspaceName ? (
              <>
                Te han invitado a <strong>{workspaceName}</strong>
                {roleLabel ? <> con rol de <strong>{roleLabel}</strong></> : null}.
              </>
            ) : (
              "Te han invitado a colaborar en Leadflow."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!sessionEmail ? (
            <>
              <Button asChild className="w-full">
                <Link href={loginHref}>Iniciar sesión</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={signupHref}>Crear cuenta</Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Regístrate o entra con el mismo email al que llegó esta invitación.
              </p>
            </>
          ) : (
            <>
              {wrongAccount ? (
                <p className="text-sm text-destructive text-center">{wrongAccount}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Sesión: <span className="font-medium text-foreground">{sessionEmail}</span>
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={accepting || !!peekError}
                    onClick={() => handleAccept()}
                  >
                    {accepting ? "Uniéndote…" : "Aceptar invitación"}
                  </Button>
                  {peekError === "aceptar_fallo" ? (
                    <p className="text-sm text-destructive text-center">
                      No pudimos aceptar ahora. Prueba desde el dashboard.
                    </p>
                  ) : null}
                  <Button variant="outline" className="w-full" type="button" asChild>
                    <Link href="/dashboard">Ir al dashboard</Link>
                  </Button>
                </>
              )}
              {inviteMismatchEmail ? (
                <>
                  <Button variant="outline" className="w-full" type="button" asChild>
                    <Link href={signupHref}>Crear cuenta</Link>
                  </Button>
                  <Button variant="ghost" className="w-full" type="button" asChild>
                    <Link href={loginHref}>Iniciar sesión con otro email</Link>
                  </Button>
                </>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
