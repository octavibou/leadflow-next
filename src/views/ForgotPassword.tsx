'use client';

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm text-center space-y-4 bg-background p-8 rounded-xl border shadow-sm">
          <div className="text-4xl">📧</div>
          <h2 className="text-xl font-bold">Correo enviado</h2>
          <p className="text-muted-foreground text-sm">Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.</p>
          <Link href="/login" className="text-primary hover:underline text-sm">Volver a iniciar sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold">QuizzFlow</span>
          </div>
          <p className="text-muted-foreground text-sm">Recupera tu contraseña</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4 bg-background p-6 rounded-xl border shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">← Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
