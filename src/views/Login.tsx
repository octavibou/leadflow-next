'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Login({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Error de conexión. Verifica tu conexión a internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="w-full max-w-md">
        <Card className="border shadow-lg">
          <CardContent className="pt-12 pb-8 px-8 flex flex-col gap-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
                <Sparkle className="h-8 w-8 text-white" weight="fill" />
              </div>
            </div>

            {/* Título */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
              <p className="text-muted-foreground text-base">
                Choose your preferred sign in method
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                type="button"
                className="w-full h-12 text-base font-medium"
                onClick={() => supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/dashboard` },
                }).catch(e => toast.error(e.message))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 mr-2">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor" />
                </svg>
                Continue with Google
              </Button>
              <Button
                variant="outline"
                type="button"
                className="w-full h-12 text-base font-medium"
                onClick={() => supabase.auth.signInWithOAuth({
                  provider: 'apple',
                  options: { redirectTo: `${window.location.origin}/dashboard` },
                }).catch(e => toast.error(e.message))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 mr-2">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor" />
                </svg>
                Continue with Apple
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-sm text-muted-foreground font-medium">or</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-base font-semibold">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-base"
                  required
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-base font-medium cursor-pointer">
                  Remember me
                </Label>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-5 w-5 ml-2" weight="bold" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Up Link */}
        <div className="text-center mt-6 text-base text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline font-semibold">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
