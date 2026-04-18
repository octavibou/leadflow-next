'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey! },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">QuizzFlow</span>
          </div>

          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Verificando...</p>
            </>
          )}

          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-bold">¿Cancelar suscripción?</h2>
              <p className="text-muted-foreground text-sm">
                Dejarás de recibir emails de notificaciones de QuizzFlow.
              </p>
              <Button onClick={handleConfirm} disabled={processing} className="mt-2">
                {processing ? "Procesando..." : "Confirmar cancelación"}
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-xl font-bold">Suscripción cancelada</h2>
              <p className="text-muted-foreground text-sm">
                Ya no recibirás más emails de notificaciones.
              </p>
            </>
          )}

          {status === "already" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-bold">Ya estás desuscrito</h2>
              <p className="text-muted-foreground text-sm">
                Esta dirección de email ya fue desuscrita previamente.
              </p>
            </>
          )}

          {(status === "invalid" || status === "error") && (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-bold">Enlace no válido</h2>
              <p className="text-muted-foreground text-sm">
                Este enlace de cancelación no es válido o ha expirado.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
