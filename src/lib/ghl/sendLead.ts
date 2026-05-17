import { createClient } from "@supabase/supabase-js";
import type { GhlFieldMapping, GhlContact } from "./types";
import { GHL_API_BASE_URL } from "./types";
import { getValidGhlToken } from "./tokenRefresh";
import { GHL_NATIVE_CONTACT_SLUGS } from "./nativeFields";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export interface SendLeadPayload {
  leadId: string;
  funnelId: string;
  funnelName: string;
  workspaceId: string;
  campaignId?: string;
  branchId?: string;
  branchSlug?: string;
  sessionId?: string;
  formData: Record<string, string>;
  answers: Record<string, string>;
  namedAnswers: Record<string, string>;
  qualified: boolean;
  summary: string;
  score?: number;
  source?: string;
  submittedAt: string;
}

export interface SendLeadResult {
  success: boolean;
  contactId?: string;
  error?: string;
}

async function createOrUpdateGhlContact(
  accessToken: string,
  locationId: string,
  contact: Partial<GhlContact>
): Promise<{ id: string }> {
  const response = await fetch(
    `${GHL_API_BASE_URL}/contacts/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        locationId,
        ...contact,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create contact: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return { id: data.contact?.id || data.id };
}

function buildCustomFieldsPayload(
  mappings: GhlFieldMapping[],
  payload: SendLeadPayload
): Record<string, string> {
  const customFields: Record<string, string> = {};

  const mappingBySlug = new Map<string, GhlFieldMapping>();
  for (const mapping of mappings) {
    if (mapping.ghl_field_id && mapping.sync_status === "synced") {
      mappingBySlug.set(mapping.leadflow_field_slug, mapping);
    }
  }

  const setField = (slug: string, value: string | undefined | null) => {
    if (value === undefined || value === null || value === "") return;
    if (GHL_NATIVE_CONTACT_SLUGS.has(slug)) return;
    const mapping = mappingBySlug.get(slug);
    if (mapping?.ghl_field_id) {
      customFields[mapping.ghl_field_id] = value;
    }
  };

  setField("qualified", payload.qualified ? "true" : "false");
  setField("lf_summary", payload.summary);
  if (payload.score !== undefined) {
    setField("lf_score", String(payload.score));
  }

  for (const [questionText, answerLabel] of Object.entries(payload.namedAnswers)) {
    for (const mapping of mappings) {
      if (
        mapping.leadflow_field_label === questionText &&
        mapping.ghl_field_id &&
        mapping.sync_status === "synced"
      ) {
        customFields[mapping.ghl_field_id] = answerLabel;
        break;
      }
    }
  }

  setField("lf_lead_id", payload.leadId);
  setField("lf_funnel_id", payload.funnelId);
  setField("lf_funnel_name", payload.funnelName);
  setField("lf_workspace_id", payload.workspaceId);
  setField("lf_campaign_id", payload.campaignId);
  setField("lf_branch_id", payload.branchId);
  setField("lf_branch_slug", payload.branchSlug);
  setField("lf_session_id", payload.sessionId);
  setField("lf_source", payload.source);
  setField("lf_submitted_at", payload.submittedAt);

  return customFields;
}

export async function sendLeadToGhl(
  payload: SendLeadPayload
): Promise<SendLeadResult> {
  try {
    const tokenResult = await getValidGhlToken(payload.workspaceId);
    if (tokenResult.needsReconnect || !tokenResult.accessToken) {
      await updateLeadGhlStatus(payload.leadId, "error", tokenResult.error || "GHL not connected");
      return {
        success: false,
        error: tokenResult.error || "GHL connection expired",
      };
    }

    const { data: integration } = await supabaseAdmin
      .from("workspace_integrations")
      .select("enabled")
      .eq("workspace_id", payload.workspaceId)
      .eq("provider", "ghl")
      .single();

    if (!integration?.enabled) {
      await updateLeadGhlStatus(payload.leadId, "skipped", "GHL integration disabled");
      return {
        success: true,
        error: "GHL integration disabled",
      };
    }

    const { data: mappings } = await supabaseAdmin
      .from("ghl_field_mappings")
      .select("*")
      .eq("workspace_id", payload.workspaceId)
      .eq("funnel_id", payload.funnelId)
      .eq("sync_status", "synced");

    const customFields = buildCustomFieldsPayload(
      (mappings as GhlFieldMapping[]) || [],
      payload
    );

    const firstName = payload.formData.firstName || payload.formData.first_name || "";
    const lastName = payload.formData.lastName || payload.formData.last_name || "";
    const email = payload.formData.email || "";
    const phone = payload.formData.phone || payload.formData.tel || "";

    const contact: Partial<GhlContact> = {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      customFields,
    };

    const result = await createOrUpdateGhlContact(
      tokenResult.accessToken,
      tokenResult.locationId,
      contact
    );

    await updateLeadGhlStatus(payload.leadId, "sent", null, result.id);

    await supabaseAdmin.from("ghl_sync_events").insert({
      workspace_id: payload.workspaceId,
      funnel_id: payload.funnelId,
      event_type: "lead_sent",
      payload: {
        lead_id: payload.leadId,
        contact_id: result.id,
        email,
        qualified: payload.qualified,
      },
      status: "ok",
    });

    return {
      success: true,
      contactId: result.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[GHL Send Lead]", errorMsg);

    await updateLeadGhlStatus(payload.leadId, "error", errorMsg);

    await supabaseAdmin.from("ghl_sync_events").insert({
      workspace_id: payload.workspaceId,
      funnel_id: payload.funnelId,
      event_type: "lead_sent",
      payload: {
        lead_id: payload.leadId,
        error: errorMsg,
      },
      status: "error",
      error_message: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

async function updateLeadGhlStatus(
  leadId: string,
  status: string,
  error: string | null,
  contactId?: string
) {
  const update: Record<string, unknown> = {
    ghl_send_status: status,
    ghl_send_error: error,
  };

  if (contactId) {
    update.ghl_contact_id = contactId;
    update.ghl_sent_at = new Date().toISOString();
  }

  await supabaseAdmin.from("leads").update(update).eq("id", leadId);
}

export async function retryLeadToGhl(leadId: string): Promise<SendLeadResult> {
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select(`
      id,
      funnel_id,
      campaign_id,
      answers,
      result,
      metadata,
      funnels!inner(workspace_id, name)
    `)
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    return { success: false, error: "Lead not found" };
  }

  const funnel = (lead as any).funnels;
  if (!funnel?.workspace_id) {
    return { success: false, error: "Funnel has no workspace" };
  }

  const metadata = (lead.metadata || {}) as Record<string, any>;
  const formData = (metadata.formData || {}) as Record<string, string>;
  const answers = (lead.answers || {}) as Record<string, string>;

  const payload: SendLeadPayload = {
    leadId: lead.id,
    funnelId: lead.funnel_id,
    funnelName: funnel.name,
    workspaceId: funnel.workspace_id,
    campaignId: lead.campaign_id || undefined,
    branchId: metadata.branch_id,
    branchSlug: metadata.branch_slug,
    sessionId: metadata.session_id,
    formData,
    answers,
    namedAnswers: {},
    qualified: lead.result === "qualified",
    summary: metadata.summary || "",
    score: metadata.score,
    source: metadata.source,
    submittedAt: metadata.submitted_at || new Date().toISOString(),
  };

  return sendLeadToGhl(payload);
}
