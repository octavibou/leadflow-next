"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CurrencyEur,
  Handshake,
  CalendarCheck,
  TrendUp,
  ChartBar,
  Info,
} from "@phosphor-icons/react";
import {
  computeRevenueSummary,
  computeRevenueByBranch,
  type LeadDealRow,
  type RevenueSummary,
} from "@/lib/sessionAnalytics";
import { cn } from "@/lib/utils";

interface AnalyticsRevenueTabProps {
  deals: LeadDealRow[];
  totalLeads: number;
  totalSessions: number;
  branches?: { id: string; name: string; slug: string }[];
}

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("es-ES");

function KpiCard({
  label,
  value,
  subValue,
  icon: Icon,
  tooltip,
  accent = "neutral",
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  tooltip?: string;
  accent?: "success" | "primary" | "neutral";
}) {
  const accentClasses = {
    success: "text-green-600 dark:text-green-400",
    primary: "text-primary",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className="p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Icon className={cn("h-4 w-4", accentClasses[accent])} weight="duotone" />
        )}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums", accentClasses[accent])}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-muted-foreground">{subValue}</div>
      )}
    </Card>
  );
}

function RevenueFunnel({ summary }: { summary: RevenueSummary }) {
  const stages = [
    {
      label: "Citas Reservadas",
      count: summary.bookedAppointments + summary.showAppointments + summary.noShowAppointments,
    },
    { label: "Asistieron", count: summary.showAppointments },
    { label: "Deals Ganados", count: summary.wonDeals },
  ];

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <ChartBar className="h-4 w-4 text-muted-foreground" weight="duotone" />
        <h3 className="text-sm font-medium">Embudo de Conversión</h3>
      </div>
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const prevCount = idx > 0 ? stages[idx - 1].count : null;
          const convRate = prevCount && prevCount > 0 ? stage.count / prevCount : null;

          return (
            <div key={stage.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">
                    {numberFormatter.format(stage.count)}
                  </span>
                  {convRate !== null && (
                    <span className="text-muted-foreground/70">
                      ({percentFormatter.format(convRate)})
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/80 rounded-full transition-all duration-500"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RevenueByBranchTable({
  data,
}: {
  data: { key: string; label: string; revenue: number; deals: number; leads: number; conversionRate: number }[];
}) {
  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendUp className="h-4 w-4 text-muted-foreground" weight="duotone" />
        <h3 className="text-sm font-medium">Revenue por Variante</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium text-muted-foreground">
                Variante
              </th>
              <th className="text-right py-2 font-medium text-muted-foreground">
                Revenue
              </th>
              <th className="text-right py-2 font-medium text-muted-foreground">
                Deals
              </th>
              <th className="text-right py-2 font-medium text-muted-foreground">
                Conv. Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="py-2 font-medium">{row.label}</td>
                <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">
                  {currencyFormatter.format(row.revenue)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {numberFormatter.format(row.deals)}
                </td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">
                  {percentFormatter.format(row.conversionRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RecentDealsTable({ deals }: { deals: LeadDealRow[] }) {
  const recentWonDeals = useMemo(() => {
    return deals
      .filter((d) => d.status === "won" && d.amount && d.amount > 0)
      .sort((a, b) => {
        const aDate = a.closed_at || a.updated_at;
        const bDate = b.closed_at || b.updated_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })
      .slice(0, 10);
  }, [deals]);

  if (recentWonDeals.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Handshake className="h-4 w-4 text-muted-foreground" weight="duotone" />
        <h3 className="text-sm font-medium">Cierres Recientes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium text-muted-foreground">
                Fecha
              </th>
              <th className="text-left py-2 font-medium text-muted-foreground">
                Stage
              </th>
              <th className="text-right py-2 font-medium text-muted-foreground">
                Importe
              </th>
            </tr>
          </thead>
          <tbody>
            {recentWonDeals.map((deal) => (
              <tr key={deal.id} className="border-b last:border-0">
                <td className="py-2 text-muted-foreground">
                  {new Date(deal.closed_at || deal.updated_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                  })}
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-medium">
                    {deal.external_stage_name || "Won"}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums font-medium text-green-600 dark:text-green-400">
                  {currencyFormatter.format(deal.amount || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AnalyticsRevenueTab({
  deals,
  totalLeads,
  totalSessions,
  branches = [],
}: AnalyticsRevenueTabProps) {
  const summary = useMemo(
    () => computeRevenueSummary(deals, totalLeads, totalSessions),
    [deals, totalLeads, totalSessions]
  );

  const revenueByBranch = useMemo(
    () => computeRevenueByBranch(deals, branches),
    [deals, branches]
  );

  const hasDeals = deals.length > 0;
  const hasRevenue = summary.totalRevenue > 0;

  if (!hasDeals) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CurrencyEur className="h-12 w-12 text-muted-foreground/30 mb-4" weight="duotone" />
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          Sin datos de revenue todavía
        </h3>
        <p className="text-xs text-muted-foreground/70 max-w-[280px]">
          Configura la integración con GHL en la pestaña Webhook para empezar a trackear cierres y revenue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Revenue Total"
          value={currencyFormatter.format(summary.totalRevenue)}
          subValue={`${numberFormatter.format(summary.wonDeals)} cierres`}
          icon={CurrencyEur}
          accent="success"
        />
        <KpiCard
          label="Ticket Medio"
          value={currencyFormatter.format(summary.averageDealSize)}
          icon={Handshake}
          accent="primary"
        />
        <KpiCard
          label="Revenue/Lead"
          value={currencyFormatter.format(summary.revenuePerLead)}
          tooltip="Revenue total dividido entre el total de leads generados"
          icon={TrendUp}
        />
        <KpiCard
          label="Tasa de Cierre"
          value={percentFormatter.format(summary.leadToWonRate)}
          subValue={`${summary.wonDeals} de ${totalLeads} leads`}
          icon={CalendarCheck}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RevenueFunnel summary={summary} />
        {revenueByBranch.length > 0 && (
          <RevenueByBranchTable data={revenueByBranch} />
        )}
      </div>

      {hasRevenue && <RecentDealsTable deals={deals} />}
    </div>
  );
}
