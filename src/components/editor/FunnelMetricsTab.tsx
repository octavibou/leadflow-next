import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Funnel } from "@/types/funnel";
import { cn } from "@/lib/utils";

type DateRange = "today" | "7d" | "month" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Hoy",
  "7d": "7d",
  month: "Mes",
  all: "Siempre",
};

function getFromDate(range: DateRange): string | null {
  const now = new Date();
  if (range === "today") return now.toISOString().split("T")[0] + "T00:00:00";
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] + "T00:00:00";
  return null;
}

type SessionRow = {
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  pageViews: number;
  stepViews: number;
  formSubmits: number;
  qualified: boolean | null;
};

export function FunnelMetricsTab({ funnel }: { funnel: Funnel }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("7d");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("events")
        .select("event_type, metadata, created_at")
        .eq("funnel_id", funnel.id);

      const fromDate = getFromDate(dateRange);
      if (fromDate) query = query.gte("created_at", fromDate);

      const { data } = await query.order("created_at", { ascending: true });
      setEvents(data || []);
      setLoading(false);
    };
    load();
  }, [funnel.id, dateRange]);

  const stats = useMemo(() => {
    const getSessionId = (row: any): string | null => {
      const value = row?.metadata?.session_id;
      return typeof value === "string" && value.length > 0 ? value : null;
    };

    const sessionRowsMap = new Map<string, SessionRow>();

    const ensureSessionRow = (sessionId: string, createdAt: string | null | undefined) => {
      const existing = sessionRowsMap.get(sessionId);
      const ts = createdAt ?? "";
      if (existing) {
        if (ts && (!existing.firstSeen || ts < existing.firstSeen)) existing.firstSeen = ts;
        if (ts && (!existing.lastSeen || ts > existing.lastSeen)) existing.lastSeen = ts;
        return existing;
      }
      const created: SessionRow = {
        sessionId,
        firstSeen: ts,
        lastSeen: ts,
        pageViews: 0,
        stepViews: 0,
        formSubmits: 0,
        qualified: null,
      };
      sessionRowsMap.set(sessionId, created);
      return created;
    };

    events.forEach((event) => {
      const sessionId = getSessionId(event);
      if (!sessionId) return;
      const row = ensureSessionRow(sessionId, event.created_at);
      if (event.event_type === "page_view") row.pageViews += 1;
      if (event.event_type === "step_view") row.stepViews += 1;
      if (event.event_type === "form_submit") row.formSubmits += 1;
      if (event.event_type === "qualification_evaluated") row.qualified = Boolean(event.metadata?.qualified);
    });

    const sessionRows = Array.from(sessionRowsMap.values()).sort((a, b) => {
      if (!a.lastSeen && !b.lastSeen) return 0;
      if (!a.lastSeen) return 1;
      if (!b.lastSeen) return -1;
      return b.lastSeen.localeCompare(a.lastSeen);
    });

    const evaluated = sessionRows.filter((s) => s.qualified !== null);
    const qualified = evaluated.filter((s) => s.qualified === true);
    const qualityScore = evaluated.length > 0 ? (qualified.length / evaluated.length) * 100 : 0;

    return {
      totalSessions: sessionRows.length,
      evaluatedSessions: evaluated.length,
      qualifiedSessions: qualified.length,
      qualityScore,
      sessionRows,
    };
  }, [events]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Métricas del funnel</h2>
          <p className="text-sm text-muted-foreground mt-1">{funnel.name}</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted p-1">
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={dateRange === key ? "secondary" : "ghost"}
              onClick={() => setDateRange(key)}
              className="h-7 px-2.5 text-xs"
            >
              {DATE_RANGE_LABELS[key]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sesiones totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sesiones evaluadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.evaluatedSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sesiones cualificadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.qualifiedSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">% cualificación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.qualityScore.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todas las sesiones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando sesiones...</p>
          ) : stats.sessionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay sesiones en este rango</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr_0.6fr] gap-2 px-3 py-2 bg-muted/40 text-[11px] text-muted-foreground font-medium">
                <span>Sesión</span>
                <span>Estado</span>
                <span>Views</span>
                <span>Steps</span>
                <span>Submit</span>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y">
                {stats.sessionRows.map((s) => {
                  const statusLabel =
                    s.qualified === true ? "Cualificada" :
                    s.qualified === false ? "No cualificada" :
                    "Sin evaluar";
                  const statusClass =
                    s.qualified === true ? "bg-green-500/10 text-green-700" :
                    s.qualified === false ? "bg-red-500/10 text-red-700" :
                    "bg-zinc-500/10 text-zinc-600";

                  return (
                    <div key={s.sessionId} className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr_0.6fr] gap-2 px-3 py-2 text-xs items-center">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.sessionId}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.lastSeen ? new Date(s.lastSeen).toLocaleString("es-ES") : "Sin actividad"}
                        </p>
                      </div>
                      <span className={cn("inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-medium", statusClass)}>
                        {statusLabel}
                      </span>
                      <span className="font-medium">{s.pageViews}</span>
                      <span className="font-medium">{s.stepViews}</span>
                      <span className="font-medium">{s.formSubmits}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

