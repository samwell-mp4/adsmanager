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
  last_tested_at: string | null;
  latency_ms: number | null;
  status: ProxyStatus;
  created_at: string;
  updated_at: string;
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
  last_started_at: string | null;
  last_stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrowserEvent {
  id: number;
  profile_id: number;
  type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
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

export interface CreateProxyDTO {
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  type?: ProxyType;
}

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
  created_at: string;
  updated_at: string;
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
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
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
