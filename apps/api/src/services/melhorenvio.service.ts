export interface ShippingProductItem {
  id?: string;
  name?: string;
  width?: number; // cm
  height?: number; // cm
  length?: number; // cm
  weight?: number; // kg
  insurance_value?: number; // R$
  quantity?: number;
}

export interface CalculateShippingInput {
  from_postal_code?: string;
  to_postal_code: string;
  products?: ShippingProductItem[];
  default_dimensions?: {
    height?: number;
    width?: number;
    length?: number;
    weight?: number;
  };
}

export interface ShippingQuote {
  id: number;
  name: string; // e.g. "SEDEX", "PAC", "Loggi Express", ".Package"
  company: {
    id: number;
    name: string; // "Correios", "Jadlog", "Loggi", "Azul Cargo Express", etc.
    picture: string;
  };
  price: number; // calculated cost
  custom_price: number; // user's configured price in Melhor Envio
  delivery_time: number; // working days
  custom_delivery_time: number;
  currency: string;
  error?: string;
}

export const PRESET_ORIGINS = [
  {
    id: '30730130',
    label: 'Estoque Central (Padre Eustáquio - CEP 30730-130)',
    cep: '30730130',
    formatted_cep: '30730-130'
  },
  {
    id: '30110017',
    label: 'Estoque Secundário (Savassi - CEP 30110-017)',
    cep: '30110017',
    formatted_cep: '30110-017'
  },
  {
    id: '30190110',
    label: 'Loja Física (Savannah Mall / Barro Preto - CEP 30190-110)',
    cep: '30190110',
    formatted_cep: '30190-110'
  }
];

export class MelhorEnvioService {
  private token: string;
  private email: string;
  private apiUrl: string;
  private defaultOriginCep: string;

  constructor() {
    this.token = process.env.MELHOR_ENVIO_TOKEN || '';
    this.email = process.env.MELHOR_ENVIO_EMAIL || 'samwellmidia@gmail.com';
    this.apiUrl = (process.env.MELHOR_ENVIO_URL || 'https://melhorenvio.com.br').replace(/\/$/, '');
    this.defaultOriginCep = (process.env.MELHOR_ENVIO_ORIGIN_CEP || '30730130').replace(/\D/g, '');
  }

  public getShippingConfig() {
    return {
      default_origin_cep: this.defaultOriginCep,
      preset_origins: PRESET_ORIGINS,
      default_dimensions: {
        height: 1, // 1 cm
        width: 10, // 10 cm
        length: 15, // 15 cm
        weight: 0.5 // 0.5 kg (faixa 0.4kg - 0.6kg perfume 25ml)
      }
    };
  }

  public async calculateShipping(input: CalculateShippingInput) {
    if (!this.token) {
      throw new Error('Token do Melhor Envio não configurado no servidor');
    }

    const cleanTo = (input.to_postal_code || '').replace(/\D/g, '');
    if (!cleanTo || cleanTo.length !== 8) {
      throw new Error('CEP de destino inválido. O CEP deve conter 8 dígitos');
    }

    let cleanFrom = (input.from_postal_code || this.defaultOriginCep).replace(/\D/g, '');
    if (!cleanFrom || cleanFrom.length !== 8) {
      cleanFrom = this.defaultOriginCep;
    }

    // Default package parameters (1 x 10 x 15 cm, 0.5 kg)
    const defaultHeight = Math.max(1, input.default_dimensions?.height || 1);
    const defaultWidth = Math.max(10, input.default_dimensions?.width || 10);
    const defaultLength = Math.max(15, input.default_dimensions?.length || 15);
    const defaultWeight = Math.max(0.1, input.default_dimensions?.weight || 0.5);

    let productsPayload: any[] = [];

    if (input.products && Array.isArray(input.products) && input.products.length > 0) {
      productsPayload = input.products.map((p, idx) => ({
        id: p.id || `item-${idx + 1}`,
        width: Math.max(10, p.width || defaultWidth),
        height: Math.max(1, p.height || defaultHeight),
        length: Math.max(15, p.length || defaultLength),
        weight: Math.max(0.1, p.weight || defaultWeight),
        insurance_value: Math.max(10, p.insurance_value || 50.0),
        quantity: Math.max(1, p.quantity || 1)
      }));
    } else {
      productsPayload = [
        {
          id: 'perfume-25ml',
          width: defaultWidth,
          height: defaultHeight,
          length: defaultLength,
          weight: defaultWeight,
          insurance_value: 50.0,
          quantity: 1
        }
      ];
    }

    const requestBody = {
      from: { postal_code: cleanFrom },
      to: { postal_code: cleanTo },
      products: productsPayload,
      options: {
        receipt: false,
        own_hand: false
      }
    };

    const endpoint = `${this.apiUrl}/api/v2/me/shipment/calculate`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'User-Agent': `AdsManager (${this.email})`
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Erro ${res.status} ao consultar Melhor Envio`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || errJson.error || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const rawData: any = await res.json();
    if (!Array.isArray(rawData)) {
      throw new Error(rawData?.message || 'Resposta inesperada da API do Melhor Envio');
    }

    // Process quotes
    const quotes: ShippingQuote[] = [];
    const unavailable: Array<{ name: string; company: string; reason: string }> = [];

    for (const item of rawData) {
      if (item.error) {
        unavailable.push({
          name: item.name || 'Serviço',
          company: item.company?.name || 'Transportadora',
          reason: item.error
        });
        continue;
      }

      const priceVal = parseFloat(item.custom_price || item.price);
      if (isNaN(priceVal) || priceVal <= 0) continue;

      quotes.push({
        id: item.id,
        name: item.name,
        company: {
          id: item.company?.id || 0,
          name: item.company?.name || 'Transportadora',
          picture: item.company?.picture || ''
        },
        price: parseFloat(item.price) || priceVal,
        custom_price: priceVal,
        delivery_time: parseInt(item.delivery_time, 10) || 0,
        custom_delivery_time: parseInt(item.custom_delivery_time || item.delivery_time, 10) || 0,
        currency: item.currency || 'BRL'
      });
    }

    // Sort quotes by cheapest custom_price
    quotes.sort((a, b) => a.custom_price - b.custom_price);

    return {
      success: true,
      from_postal_code: cleanFrom,
      to_postal_code: cleanTo,
      quotes_count: quotes.length,
      quotes,
      unavailable
    };
  }
}

export const melhorEnvioService = new MelhorEnvioService();
