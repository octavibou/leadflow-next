import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { STRIPE_API_VERSION } from "./stripe-plans";
import {
  clearPendingPortalUpgrade,
  detectPlanFromSubscription,
  doesSubscriptionMatchPendingTarget,
  ensureMeteredItemMatchesBasePlan,
  getPendingPortalUpgrade,
  isPendingPortalUpgradeFresh,
} from "./stripe-subscriptions";

const MAX_ATTEMPTS = 5;
/** Lotes leídos de la cola por iteración (evita cargas enormes en memoria). */
const BATCH_SIZE = 50;
/** Máximo de lotes por petición HTTP (50 × 20 = 1000 filas). Evita timeouts en rutas serverless. */
const MAX_BATCHES_PER_REQUEST = 20;

async function resolveMeteredItemId(
  stripe: Stripe,
  supabaseAdmin: SupabaseClient,
  subscriptionRow: {
    id: string;
    metered_subscription_item_id: string | null;
    stripe_subscription_id: string | null;
  },
): Promise<{ deferred: boolean; meteredItemId: string | null }> {
  if (!subscriptionRow.stripe_subscription_id) {
    return { deferred: false, meteredItemId: null };
  }

  let subscription = (await stripe.subscriptions.retrieve(
    subscriptionRow.stripe_subscription_id,
  )) as Stripe.Subscription;
  const pendingUpgrade = getPendingPortalUpgrade(subscription);

  if (pendingUpgrade && !doesSubscriptionMatchPendingTarget(subscription, pendingUpgrade)) {
    if (isPendingPortalUpgradeFresh(pendingUpgrade)) {
      return { deferred: true, meteredItemId: null };
    }

    subscription = (await clearPendingPortalUpgrade(stripe, subscription)) as Stripe.Subscription;
  }

  subscription = (await ensureMeteredItemMatchesBasePlan(stripe, subscription)) as Stripe.Subscription;
  const { meteredItemId } = detectPlanFromSubscription(subscription);

  if (meteredItemId) {
    await supabaseAdmin.from("subscriptions").update({ metered_subscription_item_id: meteredItemId }).eq("id", subscriptionRow.id);
  }

  return { deferred: false, meteredItemId };
}

export async function processLeadUsageQueueBatch(): Promise<{
  ok: boolean;
  source: "next";
  processed: number;
  success: number;
  failed: number;
  batches: number;
}> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey?.trim()) {
    throw new Error("STRIPE_SECRET_KEY no está configurada en el servidor (Next)");
  }
  if (!url?.trim() || !serviceRole?.trim()) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
  const supabaseAdmin = createClient(url, serviceRole);

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
        await supabaseAdmin
          .from("lead_usage_queue")
          .update({
            status: "skipped",
            last_error: "Subscription not found",
          })
          .eq("id", item.id);
        continue;
      }

      let meteredItemId = sub.metered_subscription_item_id;

      if (!meteredItemId) {
        const resolved = await resolveMeteredItemId(stripe, supabaseAdmin, sub);
        if (resolved.deferred) {
          await supabaseAdmin.from("lead_usage_queue").update({ last_error: "Stripe upgrade pending" }).eq("id", item.id);
          continue;
        }

        meteredItemId = resolved.meteredItemId;
      }

      if (!meteredItemId) {
        await supabaseAdmin
          .from("lead_usage_queue")
          .update({
            status: "skipped",
            last_error: "No metered_subscription_item_id",
          })
          .eq("id", item.id);
        continue;
      }

      try {
        await stripe.subscriptionItems.createUsageRecord(
          meteredItemId,
          { quantity: 1, timestamp: "now", action: "increment" },
          { idempotencyKey: `lead_${item.lead_id}` },
        );
      } catch (recordError: unknown) {
        const message = String((recordError as { message?: string })?.message ?? recordError);
        const canRepair = sub.stripe_subscription_id && /subscription item|resource_missing|No such/i.test(message);

        if (!canRepair) throw recordError;

        const repaired = await resolveMeteredItemId(stripe, supabaseAdmin, sub);
        if (repaired.deferred) {
          await supabaseAdmin.from("lead_usage_queue").update({ last_error: "Stripe upgrade pending" }).eq("id", item.id);
          continue;
        }

        if (!repaired.meteredItemId) throw recordError;

        await stripe.subscriptionItems.createUsageRecord(
          repaired.meteredItemId,
          { quantity: 1, timestamp: "now", action: "increment" },
          { idempotencyKey: `lead_${item.lead_id}` },
        );
      }

      await supabaseAdmin
        .from("lead_usage_queue")
        .update({
          status: "reported",
          attempts: item.attempts + 1,
        })
        .eq("id", item.id);
      success++;
    } catch (err: unknown) {
      const newAttempts = item.attempts + 1;
      const newStatus = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
      await supabaseAdmin
        .from("lead_usage_queue")
        .update({
          status: newStatus,
          attempts: newAttempts,
          last_error: String((err as { message?: string })?.message ?? err).slice(0, 500),
        })
        .eq("id", item.id);
      failed++;
    }
    }

    processed += queue.length;
  }

  return { ok: true, source: "next", processed, success, failed, batches };
}
