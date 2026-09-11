import { BrowserProfile, BrowserProxy, BrowserEvent, CreateProfileDTO, CreateProxyDTO } from '../types/index.js';

const API_BASE = '/api';

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

  // Proxies
  async getProxies(): Promise<BrowserProxy[]> {
    const res = await fetch(`${API_BASE}/proxies`);
    return handleResponse<BrowserProxy[]>(res);
  },

  async createProxy(data: CreateProxyDTO): Promise<BrowserProxy> {
    const res = await fetch(`${API_BASE}/proxies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BrowserProxy>(res);
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
    const res = await fetch('/health');
    return res.json();
  },
};
