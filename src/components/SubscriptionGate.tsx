'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { toast } from "sonner";
import { PricingConfigurator } from "@/components/PricingConfigurator";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import type { PlanName, BillingInterval, Currency, PriceBreakdown } from "@/lib/pricing";

type SubRecord = {
  status: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
} | null;

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuthReady();
  const [subRecord, setSubRecord] = useState<SubRecord | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchSub = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, stripe_subscription_id, stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as SubRecord;
    };

    const isCheckoutSuccess = new URLSearchParams(window.location.search).get("checkout") === "success";

    if (isCheckoutSuccess) {
      let attempts = 0;
      const maxAttempts = 15;
      const poll = async () => {
        const record = await fetchSub();
        if (record?.status === "active" || record?.status === "trialing") {
          setSubRecord(record);
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setSubRecord(record ?? null);
          toast.error("La verificación del pago está tardando. Recarga la página en unos segundos.");
        }
      };
      poll();
    } else {
      fetchSub().then((r) => setSubRecord(r ?? null));
    }
  }, [user]);

  const isActive = subRecord?.status === "active" || subRecord?.status === "trialing";
  const isExistingCustomer = !!subRecord?.stripe_subscription_id;

  const handleCheckout = async (selection: {
    plan: PlanName;
    interval: BillingInterval;
    currency: Currency;
    breakdown: PriceBreakdown;
  }) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };
      const body = { plan: selection.plan, interval: selection.interval };

      const res = await supabase.functions.invoke("create-checkout", { headers, body });
      if (res.error) throw res.error;
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error("Error al iniciar el pago: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManagePayments = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-portal", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setPortalLoading(false);
    }
  };

  if (subRecord === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isActive) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6 md:p-12 flex flex-col items-center justify-start gap-6">
      {isExistingCustomer && subRecord?.status === "past_due" && (
        <div className="w-full max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center space-y-3">
          <p className="text-sm text-foreground">
            Tienes un pago pendiente. Puedes actualizar tu método de pago o gestionar tu suscripción directamente.
          </p>
          <Button onClick={handleManagePayments} disabled={portalLoading} variant="outline" size="sm">
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
            Gestionar pagos
          </Button>
        </div>
      )}
      <PricingConfigurator onCheckout={handleCheckout} loading={loading} />
    </div>
  );
}
