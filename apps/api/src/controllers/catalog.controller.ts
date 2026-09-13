import { FastifyRequest, FastifyReply } from 'fastify';
import { catalogService } from '../services/catalog.service.js';
import { CreateProductInput } from '../types/index.js';

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
