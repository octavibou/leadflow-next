# Tracking interno y Meta (Pixel + CAPI)

## Tabla `events` (metadata JSON)

| Campo | Origen | Descripción |
| --- | --- | --- |
| `session_id` | Cliente | UUID estable por navegador (`localStorage`), correlaciona eventos y leads. |
| `utm_*` | Query string | `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` si existen. |
| `fbclid`, `gclid`, `ttclid`, `msclkid` | Query string | IDs de clic por plataforma (first-touch). |
| `landing_url` | Primera visita | URL de entrada (sin hash). |
| `referrer` | `document.referrer` | URL completa del referrer (puede estar vacío). |
| `referrer_host` | Derivado | Host del referrer sin `www.`. |
| `attribution_source` | Derivado | Prioridad: UTMs → click ids → referrer → `direct`. |
| `attribution_medium` | Derivado | p.ej. `paid_social`, `cpc`, `referral`, `none`. |
| `captured_at` | ISO | Momento en que se fijó el first-touch para esa sesión+funnel. |

**First-touch**: se guarda una sola vez por par `(funnel_id, session_id)` en `localStorage` bajo la clave `leadflow_ft_v1_{funnelId}_{sessionId}`.

## Tabla `leads` (metadata JSON)

Incluye los mismos campos de atribución que los eventos del primer envío + `session_id`, `formData`.

## Meta Conversions API (`supabase/functions/meta-capi`)

- **Dedupe Pixel/CAPI**: mismo `event_id` en cliente (`fireMetaCapi`).
- **Cookies**: `_fbp`, `_fbc` enviadas desde el navegador.
- **Fallback `_fbc`**: si no hay cookie `_fbc` pero el cliente envía `fbclid`, el servidor construye `fbc` como `fb.1.{unix_ts}.{fbclid}`.
- **IP**: `client_ip_address` desde headers del request a la Edge Function.
- **PII**: `em`, `ph`, `fn`, `ln` en texto plano desde el cliente; la función normaliza y envía SHA-256 a Meta cuando aplique.
- **`external_id`**: normalmente el `session_id` del funnel; se hashea en servidor si no viene ya en hex.

## Checklist de verificación en producción (manual)

1. **Incógnito**: abrir funnel con `fbclid` ficticio en URL → en Supabase `events`, primer `page_view` debe incluir `fbclid`, `attribution_source=facebook`.
2. **Sin UTMs**: confirmar que la UI Analytics muestra origen Facebook / medio paid_social.
3. **Meta Test Events**: Events Manager → Test Events → repetir flujo completo; comprobar PageView, ViewContent, Lead, CompleteRegistration y deduplicación por `event_id`.
4. **Consentimiento cookies**: rechazar cookies → CAPI sigue pudiendo enviar eventos con `fbclid` fallback y sin `_fbp` (match puede ser menor).
