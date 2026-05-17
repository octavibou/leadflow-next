"use client";

import { useMemo, useState } from "react";
import { Eye } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GeoCountryCityInline } from "@/components/GeoCountryCityInline";
import {
  classifySessionSource,
  formatDurationMs,
  getSessionIdFromRow,
  sessionSourceShortLabel,
  type SessionDetail,
} from "@/lib/sessionAnalytics";
import { FunnelSessionDetailSheet } from "@/components/editor/FunnelSessionDetailSheet";
import type { FunnelStep } from "@/types/funnel";

export type SessionsTableFilters = {
  search: string;
  channelFilter: "all" | "facebook" | "google" | "direct" | "other";
  statusFilter: "all" | "qualified" | "disqualified" | "lead" | "pending";
};

export function AnalyticsSessionsTable({
  loading,
  sessions,
  leads,
  filters,
  onFiltersChange,
  stepsByFunnelId,
  stepOrderByFunnelId,
}: {
  loading: boolean;
  sessions: SessionDetail[];
  leads: any[];
  filters: SessionsTableFilters;
  onFiltersChange: (next: SessionsTableFilters | ((prev: SessionsTableFilters) => SessionsTableFilters)) => void;
  stepsByFunnelId: Map<string, FunnelStep[]>;
  stepOrderByFunnelId: Map<string, Map<string, number>>;
}) {
  const { search, channelFilter, statusFilter } = filters;
  const setSearch = (s: string) => onFiltersChange((f) => ({ ...f, search: s }));
  const setChannelFilter = (c: SessionsTableFilters["channelFilter"]) =>
    onFiltersChange((f) => ({ ...f, channelFilter: c }));
  const setStatusFilter = (s: SessionsTableFilters["statusFilter"]) =>
    onFiltersChange((f) => ({ ...f, statusFilter: s }));

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (q) {
        const hay = [
          s.sessionId,
          s.attribution?.fbclid || "",
          s.attribution?.landing_url || "",
          s.attribution?.resolvedSource || "",
          s.campaignName || "",
          s.funnelName || "",
          s.visitDeploymentLabel || "",
          s.visitDeploymentId || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (channelFilter !== "all" && classifySessionSource(s) !== channelFilter) return false;
      if (statusFilter === "qualified") return s.qualified === true;
      if (statusFilter === "disqualified") return s.qualified === false;
      if (statusFilter === "lead") return s.hasLead;
      if (statusFilter === "pending") return s.qualified === null;
      return true;
    });
  }, [sessions, search, channelFilter, statusFilter]);

  function sessionQuestionNumber(s: SessionDetail): number | null {
    if (!s.lastAnsweredStepId) return null;
    const map = stepOrderByFunnelId.get(s.funnelId);
    const n = map?.get(s.lastAnsweredStepId);
    return typeof n === "number" ? n : null;
  }

  const selectedDetail = selectedSessionId
    ? sessions.find((x) => x.sessionId === selectedSessionId) ?? null
    : null;
  const selectedLead = selectedSessionId
    ? leads.find((l) => getSessionIdFromRow(l) === selectedSessionId) ?? null
    : null;

  const leadFormData =
    selectedLead?.metadata && typeof (selectedLead.metadata as any).formData === "object"
      ? ((selectedLead.metadata as any).formData as Record<string, string>)
      : null;
  const leadAnswers = (selectedLead?.answers as Record<string, string> | undefined) ?? null;
  const leadMetadataRaw =
    selectedLead?.metadata && typeof selectedLead.metadata === "object"
      ? (selectedLead.metadata as Record<string, unknown>)
      : null;

  return (
    <Card>
      <CardHeader className="space-y-3 pb-2">
        <CardTitle className="text-base">Todas las visitas</CardTitle>
        <Input
          placeholder="Buscar por id de visita, fbclid, landing, funnel o campaña…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-md text-sm"
        />
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">Canal</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "Todos"],
                ["facebook", "Meta"],
                ["google", "Google"],
                ["direct", "Directo"],
                ["other", "Otro"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                variant={channelFilter === key ? "default" : "outline"}
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setChannelFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">Estado</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "Todas"],
                ["qualified", "Cualificado"],
                ["disqualified", "Descualificado"],
                ["lead", "Con lead"],
                ["pending", "Sin eval."],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                variant={statusFilter === key ? "default" : "outline"}
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando visitas…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay visitas que coincidan</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <div className="max-h-[520px] min-w-[1080px] overflow-y-auto [scrollbar-gutter:stable]">
              <table className="w-full caption-bottom border-collapse text-xs table-fixed">
                <colgroup>
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/80">
                  <tr className="text-[11px] font-medium text-muted-foreground">
                    <th className="py-2 pl-3 pr-2 text-left font-medium align-middle">ID / hora / día</th>
                    <th className="py-2 pl-2 pr-3 text-center font-medium align-middle">País</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">Fuente</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">Tiempo total</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">1ª preg.</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">Se fue en</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">Acabó</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">Tiempo form</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">Cualificado</th>
                    <th className="px-3 py-2 text-center font-medium align-middle">Visitas</th>
                    <th className="px-3 py-2 text-right font-medium align-middle">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map((s) => {
                    const formTime =
                      s.contactViewAt && s.formSubmitAt
                        ? formatDurationMs(s.contactViewAt, s.formSubmitAt)
                        : "—";
                    const totalTime =
                      s.landingStartAt && s.sessionEndAt
                        ? formatDurationMs(s.landingStartAt, s.sessionEndAt)
                        : "—";
                    const finalStatusLabel =
                      s.qualified === true
                        ? "Cualificado"
                        : s.qualified === false
                          ? "Descualificado"
                          : "—";
                    const finalStatusClass =
                      s.qualified === true ? "bg-green-500/10 text-green-700" :
                      s.qualified === false ? "bg-red-500/10 text-red-700" :
                      "bg-muted text-muted-foreground";

                    const hasStarted = s.startedQuiz;
                    const leftAt = sessionQuestionNumber(s);
                    const finished = s.completedQuiz;

                    const visits = s.sessionStarts > 0 ? s.sessionStarts : 1;
                    const when = s.lastSeen ? new Date(s.lastSeen) : null;
                    const whenTime = when
                      ? when.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                      : "—";
                    const whenDay = when
                      ? when.toLocaleDateString("es-ES", { dateStyle: "short" })
                      : "—";

                    return (
                      <tr key={s.sessionId} className="hover:bg-muted/30">
                        <td className="min-w-0 py-2 pl-3 pr-2 align-middle">
                          <p className="font-mono text-[10px] truncate" title={s.sessionId}>
                            {s.sessionId.slice(0, 8)}…
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {whenTime} · {whenDay}
                            {s.campaignName ? ` · ${s.campaignName}` : ""}
                          </p>
                        </td>
                        <td className="min-w-0 py-2 pl-2 pr-3 text-center align-middle">
                          {s.geo?.country || s.geo?.city ? (
                            <p
                              className="flex min-w-0 items-center justify-center gap-1 truncate text-[11px] font-medium"
                              title={[s.geo?.country, s.geo?.city].filter(Boolean).join(" · ")}
                            >
                              <GeoCountryCityInline country={s.geo?.country} city={s.geo?.city} />
                            </p>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <div className="flex justify-center">
                            <Badge variant="outline" className="w-fit text-[10px] font-normal">
                              {sessionSourceShortLabel(s)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-middle text-[10px] tabular-nums text-muted-foreground">
                          {totalTime}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex justify-center">
                            {hasStarted ? (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                Sí
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-middle font-medium tabular-nums">
                          {leftAt ? `P${leftAt}` : "—"}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex justify-center">
                            {finished ? (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                Sí
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-middle text-[10px] tabular-nums text-muted-foreground">
                          {formTime}
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <div className="flex justify-center">
                            <span className={cn("inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-medium", finalStatusClass)}>
                              {finalStatusLabel}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-middle font-medium tabular-nums">{visits}</td>
                        <td className="px-3 py-2 text-right align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-[11px]"
                            onClick={() => setSelectedSessionId(s.sessionId)}
                          >
                            <Eye className="h-3.5 w-3.5" weight="bold" />
                            Detalle
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">
          Mostrando {filteredRows.length} de {sessions.length} visitas en este rango.
        </p>
      </CardContent>

      <FunnelSessionDetailSheet
        open={!!selectedSessionId}
        onOpenChange={(v) => {
          if (!v) setSelectedSessionId(null);
        }}
        detail={selectedDetail}
        stepsByFunnelId={stepsByFunnelId}
        leadAnswers={leadAnswers}
        leadFormData={leadFormData}
        leadMetadataRaw={leadMetadataRaw}
      />
    </Card>
  );
}
