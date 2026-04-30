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
    const payload = await req.json().catch(() => ({}));
    const userIdFromBody = payload?.user_id;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let userId: string | null = null;

    if (token === serviceRoleKey && typeof userIdFromBody === "string" && userIdFromBody.length > 0) {
      userId = userIdFromBody;
    } else {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !user) throw new Error("User not authenticated");
      userId = user.id;
    }

    // Get stripe_customer_id from DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled", metered_subscription_item_id: null })
        .eq("user_id", userId);
      throw new Error("No Stripe customer found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });
    try {
      await stripe.customers.retrieve(sub.stripe_customer_id);
    } catch {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceled", metered_subscription_item_id: null })
        .eq("user_id", userId);
      throw new Error("Stripe customer no longer exists");
    }

    const headerOrigin = req.headers.get("x-app-origin")
      || req.headers.get("origin")
      || req.headers.get("referer")
      || "http://localhost:3000";
    const origin = headerOrigin.replace(/\/$/, "");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/profile`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
