import { type NextRequest, NextResponse } from "next/server";
import { processLeadUsageQueueBatch } from "@/lib/stripe/processLeadUsageQueue";

/**
 * Única vía de procesamiento: `lead_usage_queue` → registros de uso en Stripe vía `processLeadUsageQueueBatch`.
 * Requiere `STRIPE_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY` + URL en el servidor (p. ej. Vercel).
 *
 * Cron (Vercel): `GET` cada 6 h (`vercel.json`). En producción, `CRON_SECRET` y el `Authorization: Bearer` que envía Vercel.
 * `POST`: disparo tras guardar lead (`tracking.ts`) sin auth adicional.
 */

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runProcessLeadUsage(): Promise<NextResponse> {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        {
          error: "STRIPE_SECRET_KEY no está configurada en el servidor. Configúrala para procesar la cola de uso de leads.",
        },
        { status: 503 },
      );
    }

    const result = await processLeadUsageQueueBatch();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Cron de Vercel (GET): ver `vercel.json`. Producción → `CRON_SECRET` obligatorio para este endpoint. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.CRON_SECRET?.trim()) {
      return NextResponse.json(
        { error: "CRON_SECRET no definida — el cron desde Vercel no usará esta ruta hasta configurarla." },
        { status: 503 },
      );
    }
    if (!cronAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return runProcessLeadUsage();
}

export async function POST() {
  return runProcessLeadUsage();
}
