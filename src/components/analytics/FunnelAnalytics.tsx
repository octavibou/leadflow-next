import { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell } from "recharts";
import { Eye, Users, Target, TrendDown, ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Campaign } from "@/store/campaignStore";
import type { FunnelStep } from "@/types/funnel";

interface FunnelAnalyticsProps {
  funnelId: string;
  campaigns: Campaign[];
  steps: FunnelStep[];
}

interface EventRow {
  campaign_id: string | null;
  event_type: string;
  metadata: any;
  created_at: string;
}

interface LeadRow {
  campaign_id: string | null;
  result: string | null;
  created_at: string;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  intro: "Landing",
  question: "Pregunta",
  contact: "Contacto",
  results: "Resultados",
  booking: "Reserva",
  vsl: "VSL",
  delivery: "Entrega",
  thankyou: "Gracias",
};

const FUNNEL_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.85)",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.3)",
  "hsl(var(--primary) / 0.2)",
  "hsl(var(--primary) / 0.15)",
];

export default function FunnelAnalytics({ funnelId, campaigns, steps }: FunnelAnalyticsProps) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  if (!funnelId || !steps || steps.length === 0) {
    return <div className="p-6 text-center text-muted-foreground">Cargando datos...</div>;
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [eventsRes, leadsRes] = await Promise.all([
        supabase
          .from("events")
          .select("campaign_id, event_type, metadata, created_at")
          .eq("funnel_id", funnelId)
          .order("created_at", { ascending: true }),
        supabase
          .from("leads")
          .select("campaign_id, result, created_at")
          .eq("funnel_id", funnelId),
      ]);
      setEvents((eventsRes.data as EventRow[]) || []);
      setLeads((leadsRes.data as LeadRow[]) || []);
      setLoading(false);
    };
    load();
  }, [funnelId]);

  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const stepViews = events.filter((e) => e.event_type === "step_view");
    const formSubmits = events.filter((e) => e.event_type === "form_submit").length;
    const resultAssigned = events.filter((e) => e.event_type === "result_assigned").length;
    const totalLeads = leads.length;
    const cvr = pageViews > 0 ? (totalLeads / pageViews) * 100 : 0;
    const ctr = formSubmits > 0 ? (resultAssigned / formSubmits) * 100 : 0;

    // Time-series data for line chart (last 7 days)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const timeSeriesData = last7Days.map((date) => {
      const dayEvents = events.filter((e) => e.created_at.startsWith(date));
      const dayLeads = leads.filter((l) => l.created_at.startsWith(date));
      const dayPageViews = dayEvents.filter((e) => e.event_type === "page_view").length;
      const dayFormSubmits = dayEvents.filter((e) => e.event_type === "form_submit").length;
      const dayDayAverageCvr = dayPageViews > 0 ? (dayLeads.length / dayPageViews) * 100 : 0;
      const dayCtr = dayFormSubmits > 0 ? (dayEvents.filter((e) => e.event_type === "result_assigned").length / dayFormSubmits) * 100 : 0;

      return {
        date: new Date(date).toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
        impressions: dayPageViews,
        leads: dayLeads.length,
        cvr: dayDayAverageCvr,
        ctr: dayCtr,
      };
    });

    // Step-by-step funnel data
    const stepFunnel = steps.map((step, i) => {
      let count = 0;
      if (step.type === "intro") {
        count = pageViews;
      } else if (step.type === "question") {
        count = stepViews.filter((e) => e.metadata?.step_id === step.id).length;
      } else if (step.type === "contact") {
        count = formSubmits;
      } else if (step.type === "results") {
        count = resultAssigned;
      } else {
        // For other steps, approximate from step_view events
        count = stepViews.filter((e) => e.metadata?.step_id === step.id).length;
      }

      const label = step.type === "question" && step.question
        ? step.question.text.substring(0, 30) + (step.question.text.length > 30 ? "..." : "")
        : STEP_TYPE_LABELS[step.type] || step.type;

      return {
        name: `${i + 1}. ${label}`,
        shortName: STEP_TYPE_LABELS[step.type] || step.type,
        count,
        stepType: step.type,
      };
    });

    // Add drop-off rates
    const stepFunnelWithDropoff = stepFunnel.map((s, i) => {
      const prev = i === 0 ? s.count : stepFunnel[i - 1].count;
      const dropoff = prev > 0 ? ((prev - s.count) / prev) * 100 : 0;
      return { ...s, dropoff, prevCount: prev };
    });

    // Per-campaign breakdown
    const campaignStats = campaigns.map((c) => {
      const cEvents = events.filter((e) => e.campaign_id === c.id);
      const cLeads = leads.filter((l) => l.campaign_id === c.id);
      const cViews = cEvents.filter((e) => e.event_type === "page_view").length;
      const cForms = cEvents.filter((e) => e.event_type === "form_submit").length;
      const cResults = cEvents.filter((e) => e.event_type === "result_assigned").length;
      const cCvr = cViews > 0 ? (cLeads.length / cViews) * 100 : 0;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        views: cViews,
        formSubmits: cForms,
        results: cResults,
        leads: cLeads.length,
        cvr: cCvr,
      };
    });

    // Direct traffic
    const directEvents = events.filter((e) => !e.campaign_id);
    const directLeads = leads.filter((l) => !l.campaign_id);
    const directViews = directEvents.filter((e) => e.event_type === "page_view").length;
    if (directViews > 0 || directLeads.length > 0) {
      campaignStats.push({
        id: "direct",
        name: "Tráfico directo",
        slug: "-",
        views: directViews,
        formSubmits: directEvents.filter((e) => e.event_type === "form_submit").length,
        results: directEvents.filter((e) => e.event_type === "result_assigned").length,
        leads: directLeads.length,
        cvr: directViews > 0 ? (directLeads.length / directViews) * 100 : 0,
      });
    }

    return { pageViews, totalLeads, formSubmits, resultAssigned, cvr, ctr, timeSeriesData, stepFunnel: stepFunnelWithDropoff, campaignStats };
  }, [events, leads, steps, campaigns]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const bestCvr = Math.max(...stats.campaignStats.map((c) => c.cvr), 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Eye} label="Impresiones" value={stats.pageViews} />
        <KpiCard icon={Users} label="Leads" value={stats.totalLeads} />
        <KpiCard icon={Target} label="CVR" value={`${stats.cvr.toFixed(1)}%`} />
        <KpiCard icon={TrendDown} label="CTR" value={`${stats.ctr.toFixed(1)}%`} />
      </div>

      {/* Time-series metrics chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métricas en el tiempo (últimos 7 días)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.timeSeriesData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sin datos aún</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.timeSeriesData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="fill-muted-foreground" label={{ value: "Impresiones / Leads", angle: -90, position: "insideLeft" }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} className="fill-muted-foreground" label={{ value: "Porcentaje (%)", angle: 90, position: "insideRight" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" name="Impresiones" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="leads" stroke="hsl(var(--primary) / 0.6)" name="Leads" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="cvr" stroke="hsl(var(--destructive))" name="CVR (%)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="hsl(var(--primary) / 0.4)" name="CTR (%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step-by-step funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embudo por pasos</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.stepFunnel.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sin datos aún</p>
          ) : (
            <>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.stepFunnel} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [value, "Usuarios"]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.stepFunnel.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Drop-off table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paso</TableHead>
                    <TableHead className="text-right">Usuarios</TableHead>
                    <TableHead className="text-right">Drop-off</TableHead>
                    <TableHead className="text-right">% del total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.stepFunnel.map((step, i) => {
                    const pctTotal = stats.pageViews > 0 ? (step.count / stats.pageViews) * 100 : 0;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{step.name}</TableCell>
                        <TableCell className="text-right">{step.count}</TableCell>
                        <TableCell className="text-right">
                          {i === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={step.dropoff > 50 ? "text-destructive" : step.dropoff > 25 ? "text-orange-500" : "text-green-600"}>
                              <ArrowDown className="h-3 w-3 inline mr-0.5" weight="bold" />
                              {step.dropoff.toFixed(1)}%
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${pctTotal}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{pctTotal.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Campaign comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rendimiento por campaña</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.campaignStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sin datos aún</p>
          ) : (
            <>
              {stats.campaignStats.length > 1 && (
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.campaignStats} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="views" name="Visitas" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead>
                    <TableHead className="text-right">Visitas</TableHead>
                    <TableHead className="text-right">Formularios</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CVR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.campaignStats.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {c.name}
                          {c.cvr === bestCvr && bestCvr > 0 && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              <ArrowUp className="h-3 w-3 mr-0.5" weight="bold" /> Mejor
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{c.views}</TableCell>
                      <TableCell className="text-right">{c.formSubmits}</TableCell>
                      <TableCell className="text-right">{c.leads}</TableCell>
                      <TableCell className="text-right font-medium">{c.cvr.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" weight="bold" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
