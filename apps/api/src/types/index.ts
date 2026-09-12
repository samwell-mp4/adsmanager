export type ProfileStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5';
export type ProxyStatus = 'active' | 'error' | 'untested';

export interface BrowserProxy {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string | null;
  password?: string | null;
  type: ProxyType;
  country: string | null;
  state: string | null;
  city: string | null;
  last_ip: string | null;
  last_tested_at: Date | string | null;
  latency_ms: number | null;
  status: ProxyStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BrowserProfile {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  group_name: string;
  status: ProfileStatus;
  chrome_data_path: string;
  container_name: string | null;
  novnc_port: number | null;
  vnc_port: number | null;
  cdp_port: number | null;
  screen_width: number;
  screen_height: number;
  locale: string;
  timezone: string;
  proxy_id: number | null;
  proxy?: BrowserProxy | null;
  last_started_at: Date | string | null;
  last_stopped_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BrowserEvent {
  id: number;
  profile_id: number;
  type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: Date | string;
}

export interface CreateProfileDTO {
  name: string;
  description?: string;
  group_name?: string;
  screen_width?: number;
  screen_height?: number;
  locale?: string;
  timezone?: string;
  proxy_id?: number | null;
}

export interface UpdateProfileDTO {
  name?: string;
  description?: string;
  group_name?: string;
  screen_width?: number;
  screen_height?: number;
  locale?: string;
  timezone?: string;
  proxy_id?: number | null;
}

export interface CreateProxyDTO {
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  type?: ProxyType;
}

export interface UpdateProxyDTO {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  type?: ProxyType;
}

export interface ProxyTestResult {
  success: boolean;
  ip?: string;
  latency_ms?: number;
  country?: string;
  message: string;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  database: boolean;
  docker: boolean;
  timestamp: string;
}

export type CrmPlatform = 'facebook' | 'olx' | 'whatsapp';
export type LeadStatus = 'novo' | 'em_negociacao' | 'fechado' | 'perdido';

export interface CrmConversation {
  id: number;
  profile_id: number | null;
  profile_name?: string;
  platform: CrmPlatform;
  external_id: string;
  customer_name: string;
  customer_avatar: string | null;
  product_title: string | null;
  product_price: string | null;
  product_image: string | null;
  product_url: string | null;
  last_message: string | null;
  last_message_at: Date | string;
  unread_count: number;
  lead_status: LeadStatus;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CrmMessage {
  id: number;
  conversation_id: number;
  sender_type: 'customer' | 'me';
  sender_name: string | null;
  content: string;
  external_id: string | null;
  sent_at: Date | string;
  created_at: Date | string;
}

export interface CrmOutgoingMessage {
  id: number;
  conversation_id: number;
  profile_id: number;
  platform: CrmPlatform;
  external_id: string;
  message_text: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  error_message?: string | null;
  created_at: Date | string;
  sent_at?: Date | string | null;
}

export interface CrmWebhookPayload {
  profile_uuid?: string;
  profile_id?: number;
  platform: CrmPlatform;
  conversations?: Array<{
    external_id: string;
    customer_name: string;
    customer_avatar?: string;
    product_title?: string;
    product_price?: string;
    product_image?: string;
    product_url?: string;
    last_message?: string;
    last_message_at?: string;
    unread?: boolean;
    messages?: Array<{
      external_id?: string;
      sender_type: 'customer' | 'me';
      sender_name?: string;
      content: string;
      sent_at?: string;
    }>;
  }>;
}
