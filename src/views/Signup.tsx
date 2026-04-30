'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Signup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const authCallbackUrl = () =>
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast.error("No hay cliente de autenticación configurado.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authCallbackUrl() },
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      // Email ya registrado: Supabase devuelve user sin identidades (anti-enumeración).
      if (data.user?.identities && data.user.identities.length === 0) {
        toast.error("Este email ya está registrado. Prueba a iniciar sesión.");
        return;
      }

      // Confirmación por email desactivada en el proyecto: sesión inmediata.
      if (data.session) {
        toast.success("Cuenta creada. Ya puedes usar la app.");
        router.push("/dashboard");
        return;
      }

      setSent(true);
    } catch {
      toast.error("Error de conexion. Verifica tu conexion a internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!supabase) {
      toast.error("No hay cliente de autenticación configurado.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(),
      },
    });
    if (error) {
      toast.error(error.message);
    }
  };

  const handleAppleSignup = async () => {
    if (!supabase) {
      toast.error("No hay cliente de autenticación configurado.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: authCallbackUrl(),
      },
    });
    if (error) {
      toast.error(error.message);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Revisa tu correo</CardTitle>
              <CardDescription>
                Te hemos enviado un enlace de confirmación a <strong>{email}</strong>. Ábrelo para
                activar tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/login">Volver al inicio de sesión</Link>
                  </Button>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className={cn("flex w-full max-w-sm flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription>
              Sign up with your Apple or Google account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup}>
              <FieldGroup>
                <Field>
                  <Button variant="outline" type="button" className="w-full" onClick={handleAppleSignup}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                      <path
                        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                        fill="currentColor"
                      />
                    </svg>
                    Sign up with Apple
                  </Button>
                  <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignup}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Sign up with Google
                  </Button>
                </Field>
                <FieldSeparator>
                  Or continue with
                </FieldSeparator>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </Field>
                <Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create account"}
                  </Button>
                  <FieldDescription className="text-center">
                    Already have an account? <Link href="/login">Login</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center">
          By clicking continue, you agree to our <Link href="/terms">Terms of Service</Link>{" "}
          and <Link href="/privacy">Privacy Policy</Link>.
        </FieldDescription>
      </div>
    </div>
  );
}
