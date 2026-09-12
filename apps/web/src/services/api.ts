import { BrowserProfile, BrowserProxy, BrowserEvent, CreateProfileDTO, CreateProxyDTO } from '../types/index.js';

const RAW_API_URL = (import.meta as any).env?.VITE_API_URL || '';
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.success === false) {
    const message = json.error?.message || json.message || 'Erro inesperado na requisição';
    throw new Error(message);
  }
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Profiles
  async getProfiles(): Promise<BrowserProfile[]> {
    const res = await fetch(`${API_BASE}/profiles`);
    return handleResponse<BrowserProfile[]>(res);
  },

  async getProfile(id: number): Promise<BrowserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${id}`);
    return handleResponse<BrowserProfile>(res);
  },

  async createProfile(data: CreateProfileDTO): Promise<BrowserProfile> {
    const res = await fetch(`${API_BASE}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BrowserProfile>(res);
  },

  async deleteProfile(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/profiles/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<void>(res);
  },

  async startProfile(id: number): Promise<BrowserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${id}/start`, {
      method: 'POST',
    });
    return handleResponse<BrowserProfile>(res);
  },

  async stopProfile(id: number): Promise<BrowserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${id}/stop`, {
      method: 'POST',
    });
    return handleResponse<BrowserProfile>(res);
  },

  async restartProfile(id: number): Promise<BrowserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${id}/restart`, {
      method: 'POST',
    });
    return handleResponse<BrowserProfile>(res);
  },

  async changeProxy(id: number, proxy_id: number | null): Promise<BrowserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${id}/proxy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proxy_id }),
    });
    return handleResponse<BrowserProfile>(res);
  },

  async getProfileEvents(id: number): Promise<BrowserEvent[]> {
    const res = await fetch(`${API_BASE}/profiles/${id}/events`);
    return handleResponse<BrowserEvent[]>(res);
  },

  async getProfileLogs(id: number): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/profiles/${id}/logs`);
      const json = await res.json();
      return json.logs || 'Nenhum log retornado.';
    } catch (e: any) {
      return `Erro ao buscar logs: ${e.message}`;
    }
  },

  async getProfilePages(id: number): Promise<{ title: string; url: string }[]> {
    const res = await fetch(`${API_BASE}/profiles/${id}/pages`);
    return handleResponse<{ title: string; url: string }[]>(res);
  },

  async navigateProfile(id: number, url: string): Promise<{ success: boolean; finalUrl: string; title: string }> {
    const res = await fetch(`${API_BASE}/profiles/${id}/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return handleResponse<{ success: boolean; finalUrl: string; title: string }>(res);
  },

  // Cookies
  async getCookies(id: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/profiles/${id}/cookies`);
    return handleResponse<any[]>(res);
  },

  async setCookies(id: number, cookies: any[] | string): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch(`${API_BASE}/profiles/${id}/cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookies }),
    });
    return handleResponse<{ success: boolean; count: number; message: string }>(res);
  },

  async clearCookies(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/profiles/${id}/cookies`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Cache & Storage
  async clearCache(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/profiles/${id}/clear-cache`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async updateProfileGroup(id: number, group_name: string): Promise<BrowserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_name }),
    });
    return handleResponse<BrowserProfile>(res);
  },

  // Proxies
  async getProxies(): Promise<BrowserProxy[]> {
    const res = await fetch(`${API_BASE}/proxies`);
    return handleResponse<BrowserProxy[]>(res);
  },

  async createProxy(data: CreateProxyDTO & { raw?: string; test_now?: boolean }): Promise<BrowserProxy> {
    const res = await fetch(`${API_BASE}/proxies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BrowserProxy>(res);
  },

  async parseProxy(raw: string): Promise<{ success: boolean; data: any }> {
    const res = await fetch(`${API_BASE}/proxies/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    return res.json();
  },

  async deleteProxy(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/proxies/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<void>(res);
  },

  async testProxy(id: number): Promise<{ success: boolean; ip?: string; latency_ms?: number; message: string; error?: string }> {
    const res = await fetch(`${API_BASE}/proxies/${id}/test`, {
      method: 'POST',
    });
    return res.json();
  },

  // Health
  async getHealth(): Promise<{ status: string; database: boolean; docker: boolean; timestamp: string }> {
    const healthUrl = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/health` : '/health';
    const res = await fetch(healthUrl);
    return res.json();
  },

  // Custom Extensions (.zip)
  async uploadProfileExtension(
    profileId: number,
    filename: string,
    fileBase64: string
  ): Promise<{ success: boolean; data: any }> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/extensions/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileBase64 }),
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || json.message || 'Falha ao descompactar extensão');
    }
    return json;
  },

  async getProfileExtensions(profileId: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/extensions`);
    const json = await handleResponse<{ success: boolean; data: any[] }>(res);
    return json.data || [];
  },

  async installOfficialExtension(profileId: number): Promise<{ success: boolean; message: string; data?: any }> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/extensions/install-official`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || json.message || 'Falha ao instalar extensão oficial');
    }
    return json;
  },

  getOfficialExtensionDownloadUrl(profileId?: number): string {
    return profileId
      ? `${API_BASE}/profiles/${profileId}/extensions/official/download`
      : `${API_BASE}/extensions/crm/download`;
  },

  async deleteProfileExtension(profileId: number, extId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/extensions/${extId}`, {
      method: 'DELETE',
    });
    await handleResponse<any>(res);
  },

  async uploadGlobalExtension(filename: string, fileBase64: string): Promise<{ success: boolean; data: any }> {
    const res = await fetch(`${API_BASE}/extensions/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileBase64 }),
    });
    return handleResponse<{ success: boolean; data: any }>(res);
  },

  async getGlobalExtensions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/extensions`);
    const json = await handleResponse<{ success: boolean; data: any[] }>(res);
    return json.data || [];
  },

  async deleteGlobalExtension(extId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/extensions/${extId}`, {
      method: 'DELETE',
    });
    await handleResponse<any>(res);
  },

  // CRM Omnichannel Endpoints
  async getCrmConversations(params?: {
    profile_id?: number;
    platform?: string;
    lead_status?: string;
    search?: string;
  }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.profile_id) query.append('profile_id', String(params.profile_id));
    if (params?.platform) query.append('platform', params.platform);
    if (params?.lead_status) query.append('lead_status', params.lead_status);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/crm/conversations?${query.toString()}`);
    const json = await handleResponse<{ success: boolean; data: any[] }>(res);
    return json.data || [];
  },

  async getCrmConversationDetails(id: number): Promise<{ conversation: any; messages: any[] }> {
    const res = await fetch(`${API_BASE}/crm/conversations/${id}`);
    const json = await handleResponse<{ success: boolean; data: { conversation: any; messages: any[] } }>(res);
    return json.data;
  },

  async sendCrmReply(id: number, message: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/crm/conversations/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async updateCrmLeadStatus(id: number, lead_status: string, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/conversations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_status, notes }),
    });
    const json = await handleResponse<{ success: boolean; data: any }>(res);
    return json.data;
  },
};
