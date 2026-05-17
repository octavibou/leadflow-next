export type SendIntegrationId = "webhook" | "meta_ads" | "gohighlevel" | "zapier" | "make" | "api";

const SEND_INTEGRATION_IDS: SendIntegrationId[] = [
  "webhook",
  "meta_ads",
  "gohighlevel",
  "zapier",
  "make",
  "api",
];

export function parseSendIntegrationParam(raw: string | null): SendIntegrationId | null {
  if (!raw) return null;
  return SEND_INTEGRATION_IDS.includes(raw as SendIntegrationId) ? (raw as SendIntegrationId) : null;
}
