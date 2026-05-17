import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fireMetaCapiServerSide } from "@/lib/tracking";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type GhlEventType =
  | "appointment_booked"
  | "appointment_show"
  | "appointment_no_show"
  | "opportunity_created"
  | "opportunity_status_changed"
  | "contact_tag_added";

type MappedStatus = "lead" | "booked" | "show" | "no_show" | "open" | "won" | "lost";

interface GhlPayload {
  id?: string;
  contactId?: string;
  contact_id?: string;
  opportunityId?: string;
  opportunity_id?: string;
  appointmentId?: string;
  appointment_id?: string;
  monetaryValue?: number;
  monetary_value?: number;
  pipelineId?: string;
  pipeline_id?: string;
  pipelineStageId?: string;
  pipeline_stage_id?: string;
  stageName?: string;
  stage_name?: string;
  status?: string;
  email?: string;
  contact_email?: string;
  customFields?: Record<string, string>;
  custom_fields?: Record<string, string>;
  lf_lead_id?: string;
  [key: string]: unknown;
}

function inferEventType(payload: GhlPayload): GhlEventType {
  if (payload.appointmentId || payload.appointment_id) {
    const status = String(payload.status || "").toLowerCase();
    if (status === "show" || status === "showed") return "appointment_show";
    if (status === "no_show" || status === "noshow") return "appointment_no_show";
    return "appointment_booked";
  }
  if (payload.opportunityId || payload.opportunity_id) {
    return "opportunity_status_changed";
  }
  return "opportunity_created";
}

function mapGhlStatus(eventType: GhlEventType, payload: GhlPayload): MappedStatus | null {
  switch (eventType) {
    case "appointment_booked":
      return "booked";
    case "appointment_show":
      return "show";
    case "appointment_no_show":
      return "no_show";
    case "opportunity_created":
      return "open";
    case "opportunity_status_changed": {
      const stageName = (payload.stageName || payload.stage_name || "").toLowerCase();
      if (
        stageName.includes("won") ||
        stageName.includes("ganado") ||
        stageName.includes("closed won") ||
        stageName.includes("cerrado ganado")
      ) {
        return "won";
      }
      if (
        stageName.includes("lost") ||
        stageName.includes("perdido") ||
        stageName.includes("closed lost") ||
        stageName.includes("cerrado perdido")
      ) {
        return "lost";
      }
      return "open";
    }
    default:
      return null;
  }
}

async function resolveLeadByLfId(workspaceId: string, lfLeadId: string) {
  const { data } = await supabaseAdmin
    .from("leads")
    .select("id, funnel_id, campaign_id, branch_id, deployment_id, metadata")
    .eq("id", lfLeadId)
    .single();

  if (!data) return null;

  const { data: funnel } = await supabaseAdmin
    .from("funnels")
    .select("workspace_id")
    .eq("id", data.funnel_id)
    .single();

  if (funnel?.workspace_id !== workspaceId) return null;
  return data;
}

async function resolveLeadByEmail(workspaceId: string, email: string) {
  const { data: funnels } = await supabaseAdmin
    .from("funnels")
    .select("id")
    .eq("workspace_id", workspaceId);

  if (!funnels || funnels.length === 0) return null;

  const funnelIds = funnels.map((f) => f.id);

  const { data } = await supabaseAdmin
    .from("leads")
    .select("id, funnel_id, campaign_id, branch_id, deployment_id, metadata")
    .in("funnel_id", funnelIds)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data) return null;

  const normalizedEmail = email.toLowerCase().trim();
  for (const lead of data) {
    const meta = lead.metadata as Record<string, unknown> | null;
    if (!meta) continue;
    const formData = meta.formData as Record<string, string> | undefined;
    const leadEmail = formData?.email || (meta.email as string | undefined);
    if (leadEmail && leadEmail.toLowerCase().trim() === normalizedEmail) {
      return lead;
    }
  }

  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const { data: integration } = await supabaseAdmin
      .from("workspace_integrations")
      .select("inbound_secret, config, enabled")
      .eq("workspace_id", workspaceId)
      .eq("provider", "ghl")
      .single();

    if (!integration?.enabled || !integration.inbound_secret) {
      return NextResponse.json(
        { error: "Integration not configured" },
        { status: 404 }
      );
    }

    if (token !== integration.inbound_secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as GhlPayload;
    const eventType = inferEventType(payload);
    const externalEventId =
      payload.id ||
      payload.opportunityId ||
      payload.opportunity_id ||
      payload.appointmentId ||
      payload.appointment_id ||
      null;

    if (externalEventId) {
      const { data: existing } = await supabaseAdmin
        .from("webhook_events_in")
        .select("id")
        .eq("provider", "ghl")
        .eq("external_event_id", externalEventId)
        .single();

      if (existing) {
        return NextResponse.json({ ok: true, skipped: "duplicate" });
      }
    }

    const { data: insertedEvent } = await supabaseAdmin
      .from("webhook_events_in")
      .insert({
        workspace_id: workspaceId,
        provider: "ghl",
        event_type: eventType,
        external_event_id: externalEventId,
        raw_payload: payload,
      })
      .select("id")
      .single();

    const webhookEventId = insertedEvent?.id;

    const customFields = payload.customFields || payload.custom_fields || {};
    const lfLeadId =
      customFields.lf_lead_id || payload.lf_lead_id || (payload as Record<string, unknown>).lf_lead_id;
    const contactEmail = payload.email || payload.contact_email || "";

    let lead = lfLeadId ? await resolveLeadByLfId(workspaceId, String(lfLeadId)) : null;

    if (!lead && contactEmail) {
      lead = await resolveLeadByEmail(workspaceId, contactEmail);
    }

    if (!lead) {
      if (webhookEventId) {
        await supabaseAdmin
          .from("webhook_events_in")
          .update({
            processed_at: new Date().toISOString(),
            result: "ignored",
            error_message: "lead_not_found",
          })
          .eq("id", webhookEventId);
      }

      return NextResponse.json({ ok: true, ignored: "lead_not_found" });
    }

    const mappedStatus = mapGhlStatus(eventType, payload);
    if (!mappedStatus) {
      if (webhookEventId) {
        await supabaseAdmin
          .from("webhook_events_in")
          .update({
            processed_at: new Date().toISOString(),
            result: "ignored",
            error_message: "unmapped_event",
          })
          .eq("id", webhookEventId);
      }
      return NextResponse.json({ ok: true, ignored: "unmapped_event" });
    }

    const amount = payload.monetaryValue || payload.monetary_value || null;
    const externalDealId =
      payload.opportunityId ||
      payload.opportunity_id ||
      `appt:${payload.appointmentId || payload.appointment_id || "unknown"}`;

    await supabaseAdmin.from("lead_deals").upsert(
      {
        lead_id: lead.id,
        funnel_id: lead.funnel_id,
        workspace_id: workspaceId,
        campaign_id: lead.campaign_id,
        branch_id: lead.branch_id,
        deployment_id: lead.deployment_id,
        external_provider: "ghl",
        external_deal_id: externalDealId,
        external_pipeline_id: payload.pipelineId || payload.pipeline_id || null,
        external_stage_id: payload.pipelineStageId || payload.pipeline_stage_id || null,
        external_stage_name: payload.stageName || payload.stage_name || null,
        status: mappedStatus,
        amount: amount,
        currency: "EUR",
        closed_at:
          mappedStatus === "won" || mappedStatus === "lost"
            ? new Date().toISOString()
            : null,
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_provider,external_deal_id" }
    );

    if (
      mappedStatus === "won" ||
      mappedStatus === "lost" ||
      mappedStatus === "booked" ||
      mappedStatus === "show" ||
      mappedStatus === "no_show"
    ) {
      const updateData: Record<string, unknown> = {
        stage: mappedStatus,
        stage_updated_at: new Date().toISOString(),
      };
      if (mappedStatus === "won" && amount) {
        updateData.revenue_amount = amount;
        updateData.revenue_currency = "EUR";
      }
      await supabaseAdmin.from("leads").update(updateData).eq("id", lead.id);
    }

    // Fire Meta CAPI Purchase event for closed-won deals with fbclid attribution
    if (mappedStatus === "won" && amount && amount > 0) {
      const meta = lead.metadata as Record<string, unknown> | null;
      const fbclid = meta?.fbclid as string | undefined;
      const sessionId = meta?.session_id as string | undefined;
      const formData = meta?.formData as Record<string, string> | undefined;

      if (fbclid || sessionId) {
        const eventId = `${lead.id}:${externalDealId}`;
        void fireMetaCapiServerSide(
          lead.funnel_id,
          "Purchase",
          {
            external_id: sessionId,
            email: formData?.email,
            phone: formData?.phone,
            first_name: formData?.firstName || formData?.first_name,
            last_name: formData?.lastName || formData?.last_name,
            fbclid,
          },
          {
            value: amount,
            currency: "EUR",
            content_name: "lead_closed_won",
          },
          eventId
        );
      }
    }

    if (webhookEventId) {
      await supabaseAdmin
        .from("webhook_events_in")
        .update({
          processed_at: new Date().toISOString(),
          result: "ok",
        })
        .eq("id", webhookEventId);
    }

    return NextResponse.json({
      ok: true,
      status: mappedStatus,
      leadId: lead.id,
    });
  } catch (err) {
    console.error("[GHL Inbound]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
