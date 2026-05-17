import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  extractBranchDeploymentColumns,
  normalizeVisitMetadataForStorage,
} from "@/lib/visitAttribution";

function pickCountryFromHeaders(headers: Headers): string | null {
  const candidates = [
    // Vercel Edge / Serverless
    "x-vercel-ip-country",
    // Cloudflare
    "cf-ipcountry",
    // Generic / custom proxies
    "x-country",
    "x-geo-country",
  ];

  for (const key of candidates) {
    const raw = headers.get(key);
    if (!raw) continue;
    const v = raw.trim().toUpperCase();
    if (!v || v === "XX" || v === "UNKNOWN") continue;
    // Normalmente ISO-3166-1 alpha-2
    if (v.length >= 2 && v.length <= 3) return v;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url?.trim() || !serviceRole?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => null)) as
      | {
          type: "event";
          funnelId: string;
          campaignId: string | null;
          eventType: string;
          metadata?: Record<string, unknown>;
        }
      | null;

    if (!body || body.type !== "event") {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const funnelId = String(body.funnelId || "").trim();
    const eventType = String(body.eventType || "").trim();
    const campaignId = body.campaignId ? String(body.campaignId) : null;
    const metadataRaw = (body.metadata && typeof body.metadata === "object" ? body.metadata : {}) as Record<
      string,
      unknown
    >;
    const metadata = normalizeVisitMetadataForStorage(metadataRaw);
    const { branch_id: branchIdCol, deployment_id: deploymentIdCol } = extractBranchDeploymentColumns(metadata);

    if (!funnelId || !eventType) {
      return NextResponse.json({ ok: false, error: "Missing funnelId or eventType" }, { status: 400 });
    }

    const geoCountry = pickCountryFromHeaders(req.headers);
    if (geoCountry && typeof metadata.geo_country !== "string") {
      metadata.geo_country = geoCountry;
    }

    const supabaseAdmin = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabaseAdmin.from("events").insert({
      funnel_id: funnelId,
      campaign_id: campaignId,
      event_type: eventType,
      metadata: metadata as any,
      ...(branchIdCol ? { branch_id: branchIdCol } : {}),
      ...(deploymentIdCol ? { deployment_id: deploymentIdCol } : {}),
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

