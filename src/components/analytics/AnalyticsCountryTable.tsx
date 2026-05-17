"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isoAlpha2ToFlagEmoji } from "@/lib/countryFlag";
import type { CountryBucket } from "@/lib/sessionAnalytics";

const numberFormatter = new Intl.NumberFormat("es-ES");

export function AnalyticsCountryTable({ data }: { data: CountryBucket[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Visitas por país</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Top {data.length} en este rango.
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        {data.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Sin datos en este rango.</p>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/60 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2 text-left font-medium">País</th>
                  <th className="py-1.5 px-1 text-right font-medium">Visitas</th>
                  <th className="py-1.5 px-1 text-right font-medium">Share</th>
                  <th className="py-1.5 pl-1 text-right font-medium">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.map((row) => {
                  const flag = row.countryCode.length === 2 ? isoAlpha2ToFlagEmoji(row.countryCode) : null;
                  return (
                    <tr key={row.countryCode} className="hover:bg-muted/30">
                      <td className="py-1.5 pr-2 align-middle">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {flag ? (
                            <span className="text-base leading-none">{flag}</span>
                          ) : (
                            <span className="inline-block w-4 text-center text-[10px] text-muted-foreground">—</span>
                          )}
                          <span className="min-w-0 truncate font-medium">{row.countryCode}</span>
                        </span>
                      </td>
                      <td className="py-1.5 px-1 text-right tabular-nums">
                        {numberFormatter.format(row.sessions)}
                      </td>
                      <td className="py-1.5 px-1 text-right text-muted-foreground tabular-nums">
                        {(row.share * 100).toFixed(1)}%
                      </td>
                      <td className="py-1.5 pl-1 text-right tabular-nums">
                        {row.leads > 0 ? numberFormatter.format(row.leads) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
