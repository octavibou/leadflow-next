// Processes the lead_usage_queue: reports each pending lead to Stripe as a metered usage record.
// Idempotent (uses lead_id as Stripe idempotency key) and retry-safe.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { STRIPE_API_VERSION } from "../_shared/stripe-plans.ts";
import {
  clearPendingPortalUpgrade,
  detectPlanFromSubscription,
  doesSubscriptionMatchPendingTarget,
  ensureMeteredItemMatchesBasePlan,
  getPendingPortalUpgrade,
  isPendingPortalUpgradeFresh,
} from "../_shared/stripe-subscriptions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;
/** Hasta ~1000 filas por invocación; evita quedarse corto ante picos (>50 pendientes). */
const MAX_BATCHES_PER_REQUEST = 20;

async function resolveMeteredItemId(
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof createClient>,
  subscriptionRow: { id: string; metered_subscription_item_id: string | null; stripe_subscription_id: string | null },
): Promise<{ deferred: boolean; meteredItemId: string | null }> {
  if (!subscriptionRow.stripe_subscription_id) {
    return { deferred: false, meteredItemId: null };
  }

  let subscription = await stripe.subscriptions.retrieve(subscriptionRow.stripe_subscription_id);
  const pendingUpgrade = getPendingPortalUpgrade(subscription);

  if (pendingUpgrade && !doesSubscriptionMatchPendingTarget(subscription, pendingUpgrade)) {
    if (isPendingPortalUpgradeFresh(pendingUpgrade)) {
      return { deferred: true, meteredItemId: null };
    }

    subscription = await clearPendingPortalUpgrade(stripe, subscription);
  }

  subscription = await ensureMeteredItemMatchesBasePlan(stripe, subscription);
  const { meteredItemId } = detectPlanFromSubscription(subscription);

  if (meteredItemId) {
    await supabaseAdmin.from("subscriptions").update({
      metered_subscription_item_id: meteredItemId,
    }).eq("id", subscriptionRow.id);
  }

  return { deferred: false, meteredItemId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: STRIPE_API_VERSION });
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let processed = 0;
    let success = 0;
    let failed = 0;
    let batches = 0;

    for (let b = 0; b < MAX_BATCHES_PER_REQUEST; b++) {
      const { data: queue, error: qErr } = await supabaseAdmin
        .from("lead_usage_queue")
        .select("id, subscription_id, lead_id, attempts")
        .eq("status", "pending")
        .lt("attempts", MAX_ATTEMPTS)
        .order("created_at", { ascending: true })
        .limit(BATCH_SIZE);

      if (qErr) throw qErr;
      if (!queue || queue.length === 0) {
        break;
      }

      batches += 1;

      for (const item of queue) {
      try {
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("id, metered_subscription_item_id, stripe_subscription_id")
          .eq("id", item.subscription_id)
          .maybeSingle();

        if (!sub) {
          await supabaseAdmin.from("lead_usage_queue").update({
            status: "skipped",
            last_error: "Subscription not found",
          }).eq("id", item.id);
          continue;
        }

        let meteredItemId = sub.metered_subscription_item_id;

        if (!meteredItemId) {
          const resolved = await resolveMeteredItemId(stripe, supabaseAdmin, sub);
          if (resolved.deferred) {
            await supabaseAdmin.from("lead_usage_queue").update({
              last_error: "Stripe upgrade pending",
            }).eq("id", item.id);
            continue;
          }

          meteredItemId = resolved.meteredItemId;
        }

        if (!meteredItemId) {
          await supabaseAdmin.from("lead_usage_queue").update({
            status: "skipped",
            last_error: "No metered_subscription_item_id",
          }).eq("id", item.id);
          continue;
        }

        try {
          await stripe.subscriptionItems.createUsageRecord(
            meteredItemId,
            { quantity: 1, timestamp: "now", action: "increment" },
            { idempotencyKey: `lead_${item.lead_id}` }
          );
        } catch (recordError: any) {
          const message = String(recordError?.message ?? recordError);
          const canRepair = sub.stripe_subscription_id && /subscription item|resource_missing|No such/i.test(message);

          if (!canRepair) throw recordError;

          const repaired = await resolveMeteredItemId(stripe, supabaseAdmin, sub);
          if (repaired.deferred) {
            await supabaseAdmin.from("lead_usage_queue").update({
              last_error: "Stripe upgrade pending",
            }).eq("id", item.id);
            continue;
          }

          if (!repaired.meteredItemId) throw recordError;

          await stripe.subscriptionItems.createUsageRecord(
            repaired.meteredItemId,
            { quantity: 1, timestamp: "now", action: "increment" },
            { idempotencyKey: `lead_${item.lead_id}` }
          );
        }

        await supabaseAdmin.from("lead_usage_queue").update({
          status: "reported",
          attempts: item.attempts + 1,
        }).eq("id", item.id);
        success++;
      } catch (err: any) {
        const newAttempts = item.attempts + 1;
        const newStatus = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
        await supabaseAdmin.from("lead_usage_queue").update({
          status: newStatus,
          attempts: newAttempts,
          last_error: String(err?.message ?? err).slice(0, 500),
        }).eq("id", item.id);
        failed++;
      }
      }

      processed += queue.length;
    }

    return new Response(JSON.stringify({ ok: true, processed, success, failed, batches }), {

      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("report-lead-usage error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
