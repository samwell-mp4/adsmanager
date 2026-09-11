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
