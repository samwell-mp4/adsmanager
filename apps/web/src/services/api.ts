import { BrowserProfile, BrowserProxy, BrowserEvent, CreateProfileDTO, CreateProxyDTO } from '../types/index.js';

const RAW_API_URL = (import.meta as any).env?.VITE_API_URL || '';
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  let json: any;
  try {
    json = await res.json();
  } catch {
    json = { error: 'Falha ao processar resposta do servidor' };
  }
  if (!res.ok || json.success === false) {
    const message = typeof json.error === 'string'
      ? json.error
      : (json.error?.message || json.message || (typeof json.error === 'object' ? JSON.stringify(json.error) : 'Erro inesperado na requisição'));
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
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
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
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
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
    tag_id?: number;
    search?: string;
    marketplace_only?: boolean;
  }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.profile_id) query.append('profile_id', String(params.profile_id));
    if (params?.platform) query.append('platform', params.platform);
    if (params?.lead_status) query.append('lead_status', params.lead_status);
    if (params?.tag_id) query.append('tag_id', String(params.tag_id));
    if (params?.search) query.append('search', params.search);
    if (params?.marketplace_only) query.append('marketplace_only', 'true');

    const res = await fetch(`${API_BASE}/crm/conversations?${query.toString()}`);
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async getCrmConversationDetails(id: number): Promise<{ conversation: any; messages: any[] }> {
    const res = await fetch(`${API_BASE}/crm/conversations/${id}`);
    const data = await handleResponse<any>(res);
    return data?.conversation ? data : (data?.data || data);
  },

  async sendCrmReply(id: number, message: string, media_url?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/crm/conversations/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, media_url }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async updateCrmLeadStatus(
    id: number,
    lead_status?: string,
    notes?: string,
    customer_phone?: string,
    deal_value?: string,
    customer_city?: string,
    customer_state?: string,
    customer_address?: string,
    customer_assigned_to?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/conversations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_status,
        notes,
        customer_phone,
        deal_value,
        customer_city,
        customer_state,
        customer_address,
        customer_assigned_to
      }),
    });
    const data = await handleResponse<any>(res);
    return data?.data !== undefined ? data.data : data;
  },

  async deleteCrmConversation(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/crm/conversations/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async initCrmTables(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/crm/init`);
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async testCrmWebhook(target_url?: string): Promise<{ success: boolean; result: any }> {
    const res = await fetch(`${API_BASE}/crm/test-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_url }),
    });
    return handleResponse<{ success: boolean; result: any }>(res);
  },

  async syncEvolutionWhatsApp(): Promise<{ success: boolean; message: string; stats?: any }> {
    const res = await fetch(`${API_BASE}/crm/evolution/sync`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string; stats?: any }>(res);
  },

  async bulkUpdateCrmStatus(ids: number[], lead_status: string): Promise<{ success: boolean; updated_count: number }> {
    const res = await fetch(`${API_BASE}/crm/conversations/bulk-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, lead_status }),
    });
    return handleResponse<{ success: boolean; updated_count: number }>(res);
  },

  async bulkDeleteCrmConversations(ids: number[]): Promise<{ success: boolean; deleted_count: number }> {
    const res = await fetch(`${API_BASE}/crm/conversations/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return handleResponse<{ success: boolean; deleted_count: number }>(res);
  },

  async syncCrmExtensions(): Promise<{ success: boolean; synced: number; containers: string[] }> {
    const res = await fetch(`${API_BASE}/crm/sync-extensions`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; synced: number; containers: string[] }>(res);
  },

  async openCrmTab(data: { profile_id?: number; profile_uuid?: string; url: string }): Promise<{ success: boolean; container?: string; url: string }> {
    const res = await fetch(`${API_BASE}/crm/open-tab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; container?: string; url: string }>(res);
  },

  async getCrmInsights(timeframe: number = 30, profileId?: number): Promise<{ success: boolean; data: any }> {
    let url = `${API_BASE}/crm/insights?timeframe=${timeframe}`;
    if (profileId) url += `&profile_id=${profileId}`;
    const res = await fetch(url);
    return handleResponse<{ success: boolean; data: any }>(res);
  },

  // Statuses Personalizados
  async getCrmStatuses(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/crm/statuses`);
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async createCrmStatus(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/statuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateCrmStatus(id: number, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/statuses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteCrmStatus(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/crm/statuses/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  // Tags Personalizadas
  async getCrmTags(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/crm/tags`);
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async createCrmTag(name: string, color?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    return handleResponse<any>(res);
  },

  async deleteCrmTag(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/crm/tags/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  async addCrmLeadTag(conversationId: number, tag_id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/conversations/${conversationId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id }),
    });
    return handleResponse<any>(res);
  },

  async removeCrmLeadTag(conversationId: number, tagId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/conversations/${conversationId}/tags/${tagId}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  // Notas Internas
  async getCrmLeadNotes(conversationId: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/crm/conversations/${conversationId}/notes`);
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async createCrmLeadNote(conversationId: number, note_text: string, author_name = 'Atendente'): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/conversations/${conversationId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_text, author_name }),
    });
    return handleResponse<any>(res);
  },

  async deleteCrmLeadNote(noteId: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/crm/notes/${noteId}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  // Follow-ups & Agendamentos
  async getCrmFollowups(params?: { status?: string; timeframe?: string; profile_id?: number }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.timeframe) query.append('timeframe', params.timeframe);
    if (params?.profile_id) query.append('profile_id', String(params.profile_id));
    const res = await fetch(`${API_BASE}/crm/followups?${query.toString()}`);
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async getCrmLeadFollowups(conversationId: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/crm/conversations/${conversationId}/followups`);
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async createCrmFollowup(conversationId: number, data: {
    profile_id?: number;
    scheduled_at: string;
    followup_type?: string;
    priority?: string;
    notes?: string;
    assignee?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/conversations/${conversationId}/followups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateCrmFollowup(id: number, data: {
    status?: string;
    scheduled_at?: string;
    notes?: string;
    priority?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/followups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteCrmFollowup(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/crm/followups/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  // Timeline de Atividades do Cliente
  async getCrmLeadTimeline(conversationId: number, limit = 50): Promise<any[]> {
    const res = await fetch(`${API_BASE}/crm/conversations/${conversationId}/timeline?limit=${limit}`);
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  // ==========================================
  // CENTRAL DE CATÁLOGO (Fase 3)
  // ==========================================

  async getCatalogCategories(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/catalog/categories`);
    const data = await handleResponse<any>(res);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async createCatalogCategory(name: string, icon = 'Tag'): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon }),
    });
    return handleResponse<any>(res);
  },

  async updateCatalogCategory(id: number, name: string, icon?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon }),
    });
    return handleResponse<any>(res);
  },

  async deleteCatalogCategory(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/catalog/categories/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  async getCatalogProducts(options?: {
    search?: string;
    category_id?: number;
    brand?: string;
    is_active?: boolean;
    in_stock?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ products: any[]; total: number; pages: number }> {
    const query = new URLSearchParams();
    if (options?.search) query.set('search', options.search);
    if (options?.category_id) query.set('category_id', String(options.category_id));
    if (options?.brand) query.set('brand', options.brand);
    if (options?.is_active !== undefined) query.set('is_active', String(options.is_active));
    if (options?.in_stock !== undefined) query.set('in_stock', String(options.in_stock));
    if (options?.page) query.set('page', String(options.page));
    if (options?.limit) query.set('limit', String(options.limit));

    const res = await fetch(`${API_BASE}/catalog/products?${query.toString()}`);
    let rawJson: any;
    try {
      rawJson = await res.json();
    } catch {
      rawJson = {};
    }
    if (!res.ok || rawJson.success === false) {
      const message = typeof rawJson.error === 'string'
        ? rawJson.error
        : (rawJson.error?.message || rawJson.message || 'Erro ao carregar produtos do catálogo');
      throw new Error(message);
    }

    const products = Array.isArray(rawJson.data)
      ? rawJson.data
      : (Array.isArray(rawJson) ? rawJson : (Array.isArray(rawJson.products) ? rawJson.products : []));

    return {
      products,
      total: rawJson.meta?.total !== undefined ? rawJson.meta.total : products.length,
      pages: rawJson.meta?.pages || 1,
    };
  },

  async getCatalogProduct(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/products/${id}`);
    const data = await handleResponse<any>(res);
    return data?.data !== undefined ? data.data : data;
  },

  async createCatalogProduct(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateCatalogProduct(id: number, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteCatalogProduct(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/catalog/products/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  async importCatalogProducts(items: any[]): Promise<{ imported: number; errors: string[] }> {
    const res = await fetch(`${API_BASE}/catalog/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return handleResponse<any>(res);
  },

  // ==========================================
  // COMANDAS / PEDIDOS DE VENDA
  // ==========================================

  async createCrmOrder(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async getCrmOrders(params?: { conversation_id?: number; search?: string; status?: string; limit?: number; offset?: number }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.conversation_id) query.set('conversation_id', String(params.conversation_id));
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/crm/orders?${query.toString()}`);
    const json = await handleResponse<any>(res);
    return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
  },

  async getCrmOrderById(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/crm/orders/${id}`);
    return handleResponse<any>(res);
  },

  async deleteCrmOrder(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/crm/orders/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  async uploadCatalogImage(filename: string, fileBase64: string): Promise<{ success: boolean; url: string; full_url: string; filename: string }> {
    const res = await fetch(`${API_BASE}/catalog/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileBase64 }),
    });
    return handleResponse<any>(res);
  },

  // ==========================================
  // CONTROLE FINANCEIRO
  // ==========================================

  async getFinancialSummary(): Promise<any> {
    const res = await fetch(`${API_BASE}/finance/summary`);
    return handleResponse<any>(res);
  },

  async getFinancialTransactions(params?: {
    type?: string;
    category?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: any[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/finance/transactions?${query.toString()}`);
    const json = await handleResponse<any>(res);
    const transactions = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
    return {
      transactions,
      total: json?.total !== undefined ? json.total : transactions.length,
    };
  },

  async createFinancialTransaction(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/finance/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteFinancialTransaction(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/finance/transactions/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },

  // ==========================================
  // MELHOR ENVIO / CÁLCULO DE FRETES
  // ==========================================

  async getShippingConfig(): Promise<{
    default_origin_cep: string;
    preset_origins: Array<{ id: string; label: string; cep: string; formatted_cep: string }>;
    default_dimensions: { height: number; width: number; length: number; weight: number };
  }> {
    const res = await fetch(`${API_BASE}/shipping/config`);
    const json = await handleResponse<any>(res);
    return json.config;
  },

  async calculateShipping(data: {
    from_postal_code?: string;
    to_postal_code: string;
    products?: Array<{
      id?: string;
      name?: string;
      width?: number;
      height?: number;
      length?: number;
      weight?: number;
      insurance_value?: number;
      quantity?: number;
    }>;
    default_dimensions?: {
      height?: number;
      width?: number;
      length?: number;
      weight?: number;
    };
  }): Promise<{
    success: boolean;
    from_postal_code: string;
    to_postal_code: string;
    quotes_count: number;
    quotes: Array<{
      id: number;
      name: string;
      company: { id: number; name: string; picture: string };
      price: number;
      custom_price: number;
      delivery_time: number;
      custom_delivery_time: number;
      currency: string;
    }>;
    unavailable: Array<{ name: string; company: string; reason: string }>;
  }> {
    const res = await fetch(`${API_BASE}/shipping/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },
};





