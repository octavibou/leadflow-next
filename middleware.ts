import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "@supabase/supabase-js";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirmed",
];

export async function middleware(request: NextRequest) {
  /** Next.js 15+: no mutar `request.cookies` (lanza y devuelve 500). Solo escribir en la respuesta. @see https://github.com/supabase/supabase/issues/30030 */
  let response = NextResponse.next({ request });

  // Skip auth check if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  let session: Session | null = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data } = await supabase.auth.getSession();
    session = data.session ?? null;
  } catch (err) {
    console.error("[middleware] Supabase getSession failed:", err);
  }

  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  /** Invitaciones por correo enlazan aquí antes de tener sesión. */
  const isPublicInviteFlow = pathname === "/invite" || pathname.startsWith("/invite/");
  const isPublicFunnel = pathname.startsWith("/f/");
  const isOnboarding = pathname.startsWith("/onboarding/");
  const isUnsubscribe = pathname === "/unsubscribe";
  /** Callback OAuth de GHL: debe ejecutarse aunque la sesión haya caducado durante el flujo externo. */
  const isGhlOAuthCallback = pathname === "/api/integrations/ghl/callback";

  if (
    !session &&
    !isPublicPath &&
    !isPublicInviteFlow &&
    !isPublicFunnel &&
    !isOnboarding &&
    !isUnsubscribe &&
    !isGhlOAuthCallback
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Tras verificar el email debe poder verse el mensaje de éxito aunque ya haya sesión.
  if (session && isPublicPath && pathname !== "/auth/confirmed") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$).*)"],
};
