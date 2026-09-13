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
  customer_phone?: string | null;
  deal_value?: string | null;
  customer_city?: string | null;
  customer_state?: string | null;
  customer_address?: string | null;
  customer_assigned_to?: string | null;
  product_title: string | null;
  product_price: string | null;
  product_image: string | null;
  product_url: string | null;
  last_message: string | null;
  last_message_at: Date | string;
  unread_count: number;
  lead_status: LeadStatus | string;
  notes: string | null;
  tags?: CrmTag[];
  next_followup?: CrmFollowup | null;
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

export interface CrmInsightData {
  id?: number;
  profile_id?: number;
  platform?: string;
  timeframe?: number;
  views: number;
  viewers: number;
  followers_views_pct: number;
  non_followers_views_pct: number;
  stories_views_pct: number;
  posts_views_pct: number;
  reels_views_pct: number;
  interactions: number;
  followers_interactions_pct: number;
  non_followers_interactions_pct: number;
  accounts_engaged: number;
  stories_interactions_pct: number;
  posts_interactions_pct: number;
  reels_interactions_pct: number;
  profile_activity: number;
  profile_visits: number;
  external_link_taps: number;
  total_followers: number;
  active_times?: Array<{ hour: string; count: number }>;
  top_content_views?: Array<{ views: number; date: string }>;
  top_content_interactions?: Array<{ interactions: number; date: string }>;
  raw_data?: any;
  synced_at?: Date | string;
  created_at?: Date | string;
}

export interface CrmCustomStatus {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  position: number;
  is_initial: boolean;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CrmTag {
  id: number;
  name: string;
  slug: string;
  color: string;
  created_at: Date | string;
}

export interface CrmNote {
  id: number;
  conversation_id: number;
  author_name: string;
  note_text: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export type FollowupType = 'WhatsApp' | 'Ligar' | 'Mensagem' | 'Pagamento' | 'Pedido' | 'Orçamento' | 'Retorno' | 'Outro';
export type FollowupPriority = 'baixa' | 'normal' | 'alta' | 'urgente';
export type FollowupStatus = 'pending' | 'completed' | 'cancelled';

export interface CrmFollowup {
  id: number;
  conversation_id: number;
  profile_id: number;
  scheduled_at: Date | string;
  followup_type: FollowupType;
  priority: FollowupPriority;
  notes?: string | null;
  assignee?: string | null;
  status: FollowupStatus;
  completed_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  customer_name?: string;
  customer_phone?: string;
  platform?: string;
}

export interface CrmEvent {
  id: number;
  conversation_id: number;
  event_type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, any>;
  created_at: Date | string;
}

// ==========================================
// Catalog Types (Fase 3)
// ==========================================

export interface CatalogCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CatalogProductVariant {
  id: number;
  product_id: number;
  sku?: string | null;
  name: string;
  variant_type: string;
  price?: number | null;
  stock: number;
  created_at: Date | string;
}

export interface CatalogProductMedia {
  id: number;
  product_id: number;
  media_type: 'image' | 'video' | 'document';
  url: string;
  thumbnail_url?: string | null;
  position: number;
  created_at: Date | string;
}

export interface CatalogProduct {
  id: number;
  sku?: string | null;
  name: string;
  description?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  brand?: string | null;
  price: number;
  promotional_price?: number | null;
  cost_price?: number | null;
  stock: number;
  main_image?: string | null;
  is_active: boolean;
  notes?: string | null;
  whatsapp_catalog_link?: string | null;
  variants?: CatalogProductVariant[];
  media?: CatalogProductMedia[];
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateProductInput {
  sku?: string;
  name: string;
  description?: string;
  category_id?: number | null;
  brand?: string;
  price: number;
  promotional_price?: number | null;
  cost_price?: number | null;
  stock?: number;
  main_image?: string;
  is_active?: boolean;
  notes?: string;
  whatsapp_catalog_link?: string;
  variants?: Array<{
    sku?: string;
    name: string;
    variant_type?: string;
    price?: number;
    stock?: number;
  }>;
  media?: Array<{
    media_type?: 'image' | 'video' | 'document';
    url: string;
    thumbnail_url?: string;
    position?: number;
  }>;
}

export interface ProductFilterOptions {
  search?: string;
  category_id?: number;
  brand?: string;
  is_active?: boolean;
  in_stock?: boolean;
  page?: number;
  limit?: number;
}

// ==========================================
// Comandas / Pedidos de Venda & Financeiro
// ==========================================

export interface CrmOrderItem {
  id?: number;
  order_id?: number;
  product_id?: number | null;
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CrmOrder {
  id: number;
  order_code: string;
  conversation_id?: number | null;
  customer_name: string;
  customer_cpf?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  delivery_method: 'uber_flash' | 'motoboy' | 'retirada' | 'correios' | 'outro';
  shipping_fee: number;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: 'pix' | 'cartao_vista' | 'cartao_parcelado' | 'dinheiro' | 'outro';
  installments: number;
  installment_amount: number;
  status: 'pendente' | 'confirmado' | 'enviado' | 'entregue' | 'cancelado';
  notes?: string | null;
  whatsapp_sent: boolean;
  items?: CrmOrderItem[];
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateOrderInput {
  conversation_id?: number;
  order_code?: string;
  customer_name: string;
  customer_cpf?: string;
  customer_email?: string;
  customer_phone?: string;
  delivery_address?: string;
  delivery_method?: 'uber_flash' | 'motoboy' | 'retirada' | 'correios' | 'outro';
  shipping_fee?: number;
  discount?: number;
  payment_method?: 'pix' | 'cartao_vista' | 'cartao_parcelado' | 'dinheiro' | 'outro';
  installments?: number;
  installment_amount?: number;
  notes?: string;
  send_whatsapp?: boolean;
  items: Array<{
    product_id?: number;
    product_name: string;
    variant_name?: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface CrmFinancialTransaction {
  id: number;
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  order_id?: number | null;
  status: 'pago' | 'pendente' | 'cancelado';
  due_date: string;
  paid_at?: Date | string | null;
  notes?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateFinancialTransactionInput {
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  amount: number;
  payment_method?: string;
  order_id?: number;
  status?: 'pago' | 'pendente' | 'cancelado';
  due_date?: string;
  notes?: string;
}

export interface FinancialSummary {
  balance: number;
  total_income: number;
  total_expenses: number;
  pending_income: number;
  pending_expenses: number;
  recent_count: number;
}


