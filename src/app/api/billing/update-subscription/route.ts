import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const body = await req.json().catch(() => ({}));
    const appOrigin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const sanitizeToken = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.replace(/^Bearer\s+/i, "").trim();
    };
    const tokenFromHeader = sanitizeToken(authHeader);
    const tokenFromBody = sanitizeToken(body?.access_token);
    const token = tokenFromHeader || tokenFromBody;
    const cookieStore = await cookies();
    const supabaseFromCookies = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op in route handler
        },
      },
    });

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    let user: { id: string } | null = null;
    let userError: any = null;
    if (token) {
      const authRes = await supabaseAuth.auth.getUser(token);
      user = authRes.data.user ? { id: authRes.data.user.id } : null;
      userError = authRes.error;
    }

    // Fallback to cookie session (important in mixed dev/prod auth flows).
    if (!user) {
      const cookieAuthRes = await supabaseFromCookies.auth.getUser();
      user = cookieAuthRes.data.user ? { id: cookieAuthRes.data.user.id } : null;
      userError = cookieAuthRes.error;
    }

    if (userError || !user) {
      const debug = {
        tokenFromHeader: Boolean(tokenFromHeader),
        tokenFromBody: Boolean(tokenFromBody),
        tokenValidationError: userError?.message ?? null,
      };
      console.error("[billing/update-subscription] Unauthorized", debug);
      return NextResponse.json(
        {
          error: "Unauthorized",
          reason: userError?.message ?? "No authenticated user",
          debug,
        },
        { status: 401 }
      );
    }

    const edgeAuthToken = token ?? null;
    if (!edgeAuthToken) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          reason: "Missing access token for Edge Function call",
        },
        { status: 401 }
      );
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/update-subscription`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${edgeAuthToken}`,
        apikey: supabaseAnonKey,
        "x-app-origin": appOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        access_token: undefined,
        user_id: user.id,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (res.status === 401) {
      const edgeDebug = {
        tokenSource: tokenFromHeader ? "header" : tokenFromBody ? "body" : "none",
        tokenDotCount: edgeAuthToken.split(".").length - 1,
        tokenLength: edgeAuthToken.length,
      };
      console.error("[billing/update-subscription] Edge 401", {
        edgePayload: payload,
        edgeDebug,
      });
      return NextResponse.json(
        {
          ...payload,
          edgeDebug,
        },
        { status: 401 }
      );
    }
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
