import { FastifyRequest, FastifyReply } from 'fastify';
import { catalogService } from '../services/catalog.service.js';
import { CreateProductInput, ProductFilterOptions } from '../types/index.js';
import { randomUUID } from 'crypto';
import { evolutionService } from '../services/evolution.service.js';

// ==========================================
// Categorias
// ==========================================

export async function listCategoriesHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const categories = await catalogService.listCategories();
    return reply.send({ success: true, data: categories });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function createCategoryHandler(
  req: FastifyRequest<{ Body: { name: string; icon?: string } }>,
  reply: FastifyReply
) {
  try {
    const { name, icon } = req.body || {};
    const category = await catalogService.createCategory(name, icon);
    return reply.status(201).send({ success: true, data: category });
  } catch (err: any) {
    return reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateCategoryHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: { name: string; icon?: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, icon } = req.body || {};
    const category = await catalogService.updateCategory(id, name, icon);
    return reply.send({ success: true, data: category });
  } catch (err: any) {
    return reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteCategoryHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await catalogService.deleteCategory(id);
    return reply.send({ success: true, deleted });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

// ==========================================
// Produtos
// ==========================================

export async function listProductsHandler(
  req: FastifyRequest<{
    Querystring: {
      search?: string;
      category_id?: string;
      brand?: string;
      is_active?: string;
      in_stock?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const search = req.query.search;
    const category_id = req.query.category_id ? parseInt(req.query.category_id, 10) : undefined;
    const brand = req.query.brand;
    const is_active = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
    const in_stock = req.query.in_stock !== undefined ? req.query.in_stock === 'true' : undefined;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;

    const result = await catalogService.listProducts({
      search,
      category_id,
      brand,
      is_active,
      in_stock,
      page,
      limit,
    });

    return reply.send({
      success: true,
      data: result.products,
      meta: {
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function getProductHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await catalogService.getProductById(id);
    if (!product) {
      return reply.status(404).send({ success: false, message: 'Produto não encontrado.' });
    }
    return reply.send({ success: true, data: product });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function createProductHandler(
  req: FastifyRequest<{ Body: CreateProductInput }>,
  reply: FastifyReply
) {
  try {
    const product = await catalogService.createProduct(req.body);
    return reply.status(201).send({ success: true, data: product });
  } catch (err: any) {
    return reply.status(400).send({ success: false, message: err.message });
  }
}

export async function updateProductHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: CreateProductInput }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await catalogService.updateProduct(id, req.body);
    if (!product) {
      return reply.status(404).send({ success: false, message: 'Produto não encontrado para atualização.' });
    }
    return reply.send({ success: true, data: product });
  } catch (err: any) {
    return reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteProductHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await catalogService.deleteProduct(id);
    return reply.send({ success: true, deleted });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function deleteAllProductsHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const deleted = await catalogService.deleteAllProducts();
    return reply.send({ success: true, deleted, message: 'Todos os produtos foram removidos com sucesso.' });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function importProductsHandler(
  req: FastifyRequest<{ Body: { items: CreateProductInput[] } }>,
  reply: FastifyReply
) {
  try {
    const { items } = req.body || {};
    const result = await catalogService.importProducts(items);
    return reply.send({ success: true, ...result });
  } catch (err: any) {
    return reply.status(400).send({ success: false, message: err.message });
  }
}

import fs from 'fs';
import path from 'path';
import { activePublicUrl } from '../server.js';

export async function uploadCatalogImageHandler(
  req: FastifyRequest<{ Body: { filename?: string; fileBase64: string } }>,
  reply: FastifyReply
) {
  try {
    const { filename, fileBase64 } = req.body || {};
    if (!fileBase64) {
      return reply.status(400).send({ success: false, message: 'Nenhuma imagem enviada em base64.' });
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads/catalog');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o777 });
    }

    const rawBase64 = fileBase64.replace(/^data:image\/[a-z0-9.+_-]+;base64,/i, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    const ext = filename ? path.extname(filename).toLowerCase() || '.jpg' : '.jpg';
    const cleanBaseName = (filename ? path.basename(filename, ext) : 'produto')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 30);
    const uniqueName = `${cleanBaseName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    fs.writeFileSync(filePath, buffer);
    try { fs.chmodSync(filePath, 0o777); } catch {}

    const relativeUrl = `/uploads/catalog/${uniqueName}`;
    const fullUrl = `${(activePublicUrl || '').replace(/\/$/, '')}${relativeUrl}`;

    return reply.send({
      success: true,
      url: relativeUrl,
      full_url: fullUrl,
      filename: uniqueName,
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: 'Falha ao salvar imagem: ' + err.message });
  }
}

// ==========================================
// Supplier Inquiries
// ==========================================

export async function createSupplierInquiryHandler(
  req: FastifyRequest<{ Body: { items: any[] } }>,
  reply: FastifyReply
) {
  try {
    const { items } = req.body;
    if (!items || !items.length) {
      return reply.status(400).send({ success: false, message: 'Nenhum item fornecido.' });
    }
    const uuid = randomUUID();
    const inquiry = await catalogService.createSupplierInquiry(uuid, items);
    return reply.send({ success: true, inquiry });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function getSupplierInquiryHandler(
  req: FastifyRequest<{ Params: { uuid: string } }>,
  reply: FastifyReply
) {
  try {
    const { uuid } = req.params;
    const inquiry = await catalogService.getSupplierInquiryByUuid(uuid);
    if (!inquiry) {
      return reply.status(404).send({ success: false, message: 'Consulta não encontrada.' });
    }
    return reply.send({ success: true, inquiry });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function answerSupplierInquiryHandler(
  req: FastifyRequest<{ Params: { uuid: string }, Body: { answeredItems: any[] } }>,
  reply: FastifyReply
) {
  try {
    const { uuid } = req.params;
    const { answeredItems } = req.body;
    
    const inquiry = await catalogService.getSupplierInquiryByUuid(uuid);
    if (!inquiry) {
      return reply.status(404).send({ success: false, message: 'Consulta não encontrada.' });
    }

    if (inquiry.status === 'ANSWERED') {
      return reply.status(400).send({ success: false, message: 'Esta consulta já foi respondida.' });
    }

    const updated = await catalogService.answerSupplierInquiry(uuid, answeredItems);

    // Format message to send via Evolution API
    let message = `*Resposta do Fornecedor (Pedido #${uuid.split('-')[0]})*\n\nO fornecedor confirmou o estoque dos itens solicitados:\n\n`;
    answeredItems.forEach(item => {
      const statusText = item.available ? '✅ Em estoque' : '❌ Em falta';
      message += `- *${item.name}*\n  Solicitado: ${item.quantity} | Confirmado: ${item.confirmedQuantity}\n  Status: ${statusText}\n\n`;
    });

    try {
      const targetNumber = '5531988868362@s.whatsapp.net';
      await evolutionService.sendTextMessage(targetNumber, message);
    } catch (evoErr: any) {
      console.error('[SupplierInquiry] Falha ao enviar WhatsApp:', evoErr.message);
    }

    return reply.send({ success: true, inquiry: updated });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}
