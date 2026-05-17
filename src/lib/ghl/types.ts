export type GhlConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'error';

export interface GhlOAuthConfig {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  location_id: string;
  location_name?: string;
  company_id?: string;
  connected_at: string;
  last_sync_at?: string;
  app_version?: string;
  user_type?: 'Location' | 'Company';
}

export interface GhlIntegrationWithOAuth {
  id: string;
  workspace_id: string;
  provider: 'ghl';
  inbound_secret: string | null;
  enabled: boolean;
  config: GhlOAuthConfig | null;
  created_at: string;
  updated_at: string;
}

export interface GhlFieldMapping {
  id: string;
  workspace_id: string;
  funnel_id: string;
  leadflow_field_slug: string;
  leadflow_field_label: string;
  leadflow_field_type: string;
  ghl_field_id: string | null;
  ghl_field_name: string | null;
  created_in_ghl: boolean;
  sync_status: 'pending' | 'synced' | 'orphaned' | 'error';
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GhlSyncEvent {
  id: string;
  workspace_id: string;
  funnel_id: string | null;
  event_type: GhlSyncEventType;
  payload: Record<string, unknown>;
  status: 'ok' | 'error';
  error_message: string | null;
  created_at: string;
}

export type GhlSyncEventType =
  | 'connected'
  | 'disconnected'
  | 'token_refreshed'
  | 'field_created'
  | 'field_updated'
  | 'field_removed'
  | 'push_sync'
  | 'lead_sent'
  | 'sync_error';

export interface LeadflowField {
  slug: string;
  label: string;
  type: 'text' | 'single_select' | 'multi_select' | 'number' | 'email' | 'phone' | 'boolean';
  options?: string[];
  category: 'contact' | 'qualification' | 'question' | 'attribution';
}

export interface FieldDiff {
  type: 'added' | 'renamed' | 'removed' | 'type_changed';
  field: LeadflowField;
  previousLabel?: string;
  previousType?: string;
  mapping?: GhlFieldMapping;
}

export interface GhlSyncStatus {
  connected: boolean;
  connectionStatus: GhlConnectionStatus;
  locationId: string | null;
  locationName: string | null;
  lastSyncAt: string | null;
  connectedAt?: string | null;
  pendingChanges: FieldDiff[];
  hasPendingChanges: boolean;
  diffSummary: string;
  mappings: GhlFieldMapping[];
  schema?: LeadflowField[];
}

export interface GhlTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  locationId: string;
  companyId?: string;
  userId?: string;
  userType: 'Location' | 'Company';
}

export interface GhlCustomField {
  id: string;
  name: string;
  fieldKey: string;
  dataType: string;
  placeholder?: string;
  position?: number;
}

export interface GhlContact {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  customFields?: Record<string, string>;
}

/** Authorization UI (choose location, install). */
export const GHL_OAUTH_AUTHORIZE_URL = 'https://marketplace.gohighlevel.com';
/** Token exchange & refresh (API host — not marketplace.gohighlevel.com). */
export const GHL_OAUTH_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
export const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com';
/** @deprecated Use GHL_OAUTH_AUTHORIZE_URL or GHL_OAUTH_TOKEN_URL */
export const GHL_OAUTH_BASE_URL = GHL_OAUTH_AUTHORIZE_URL;

export const GHL_SCOPES = [
  'contacts.readonly',
  'contacts.write',
  'locations.readonly',
].join(' ');
