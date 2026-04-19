'use client';

import { useEffect, useState } from "react";
import { ChartBar } from "@phosphor-icons/react";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import FunnelAnalytics from "@/components/analytics/FunnelAnalytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const AnalyticsPage = () => {
  const { funnels, loading, fetchFunnels } = useFunnelStore();
  const { campaigns, fetchCampaigns } = useCampaignStore();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  useEffect(() => {
    if (funnels.length > 0 && !selectedFunnelId) {
      setSelectedFunnelId(funnels[0].id);
    }
  }, [funnels, selectedFunnelId]);

  useEffect(() => {
    if (selectedFunnelId) {
      fetchCampaigns(selectedFunnelId);
    }
  }, [selectedFunnelId, fetchCampaigns]);

  const selectedFunnel = funnels.find((f) => f.id === selectedFunnelId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChartBar className="h-6 w-6 text-primary" weight="fill" />
          Analytics
        </h1>
        <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecciona un funnel" />
          </SelectTrigger>
          <SelectContent>
            {funnels.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !selectedFunnel ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ChartBar className="h-10 w-10 mx-auto mb-3 opacity-50" weight="bold" />
            <p>Selecciona un funnel para ver sus analiticas</p>
          </CardContent>
        </Card>
      ) : (
        <FunnelAnalytics
          funnelId={selectedFunnelId}
          campaigns={campaigns}
          steps={selectedFunnel.steps as any}
        />
      )}
    </div>
  );
};

export default AnalyticsPage;
