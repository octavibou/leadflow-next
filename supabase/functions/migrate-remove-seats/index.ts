// One-time migration: remove all "addon_seats" subscription items from active subscriptions
// with prorated credit. Also strips `seats` from plan_limits in our DB.
//
// Run once via curl after deploy. Idempotent — safe to re-run.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check — only authenticated users can trigger
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find canonical addon_seats product to identify items to remove
    let seatsProductId: string | null = null;
    try {
      const search = await stripe.products.search({
        query: `metadata['lf_product']:'addon_seats' AND active:'true'`,
        limit: 1,
      });
      seatsProductId = search.data[0]?.id ?? null;
    } catch {
      // no canonical product — fall back to checking metadata.lf_kind on each price
    }

    // List all subs from DB (we trust DB to know which subs are ours)
    const { data: subs, error: subsErr } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, stripe_subscription_id, plan_limits");
    if (subsErr) throw subsErr;

    const results: Array<{
      user_id: string;
      stripe_subscription_id: string;
      removed_items: number;
      status: string;
      error?: string;
    }> = [];

    for (const sub of subs ?? []) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
          expand: ["items.data.price.product"],
        });

        const seatItems = stripeSub.items.data.filter(it => {
          const price = it.price;
          // Identify by metadata.lf_kind first
          if (price.metadata?.lf_kind === "addon_seats") return true;
          // Fall back to product match
          const productId = typeof price.product === "string" ? price.product : price.product?.id;
          if (seatsProductId && productId === seatsProductId) return true;
          // Last resort: nickname contains "seat" (case-insensitive)
          if (price.nickname?.toLowerCase().includes("seat")) return true;
          return false;
        });

        if (seatItems.length > 0) {
          const itemsUpdate: Stripe.SubscriptionUpdateParams.Item[] = seatItems.map(it => ({
            id: it.id,
            deleted: true,
          }));

          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            items: itemsUpdate,
            proration_behavior: "always_invoice",
          });
        }

        // Strip "seats" from plan_limits in DB (always, even if no seat item existed)
        const limits = (sub.plan_limits as { funnels?: number; leads?: number; seats?: number }) ?? {};
        const cleanLimits: Record<string, number> = {};
        if (typeof limits.funnels === "number") cleanLimits.funnels = limits.funnels;
        if (typeof limits.leads === "number") cleanLimits.leads = limits.leads;

        await supabaseAdmin
          .from("subscriptions")
          .update({ plan_limits: cleanLimits })
          .eq("user_id", sub.user_id);

        results.push({
          user_id: sub.user_id,
          stripe_subscription_id: sub.stripe_subscription_id,
          removed_items: seatItems.length,
          status: "ok",
        });
      } catch (e) {
        results.push({
          user_id: sub.user_id,
          stripe_subscription_id: sub.stripe_subscription_id,
          removed_items: 0,
          status: "error",
          error: (e as Error).message,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
