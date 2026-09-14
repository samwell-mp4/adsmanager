import { FastifyInstance } from 'fastify';
import {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  listProductsHandler,
  getProductHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  deleteAllProductsHandler,
  importProductsHandler,
  uploadCatalogImageHandler,
  createSupplierInquiryHandler,
  getSupplierInquiryHandler,
  answerSupplierInquiryHandler
} from '../controllers/catalog.controller.js';

export async function catalogRoutes(fastify: FastifyInstance) {
  // Upload de Imagens de Produtos
  const uploadUrls = ['/api/catalog/upload', '/catalog/upload'];
  for (const u of uploadUrls) {
    fastify.post(u, uploadCatalogImageHandler);
  }

  // Categorias
  const catListUrls = ['/api/catalog/categories', '/catalog/categories'];
  for (const u of catListUrls) {
    fastify.get(u, listCategoriesHandler);
    fastify.post(u, createCategoryHandler);
  }
  const catItemUrls = ['/api/catalog/categories/:id', '/catalog/categories/:id'];
  for (const u of catItemUrls) {
    fastify.patch(u, updateCategoryHandler);
    fastify.delete(u, deleteCategoryHandler);
  }

  // Produtos
  const prodListUrls = ['/api/catalog/products', '/catalog/products'];
  for (const u of prodListUrls) {
    fastify.get(u, listProductsHandler);
    fastify.post(u, createProductHandler);
    fastify.delete(u, deleteAllProductsHandler);
  }
  const prodItemUrls = ['/api/catalog/products/:id', '/catalog/products/:id'];
  for (const u of prodItemUrls) {
    fastify.get(u, getProductHandler);
    fastify.put(u, updateProductHandler);
    fastify.delete(u, deleteProductHandler);
  }

  // Importação em lote
  const importUrls = ['/api/catalog/import', '/catalog/import'];
  for (const u of importUrls) {
    fastify.post(u, importProductsHandler);
  }

  // Supplier Inquiries
  fastify.post('/api/catalog/supplier-inquiry', createSupplierInquiryHandler);
  fastify.get('/api/catalog/supplier-inquiry/:uuid', getSupplierInquiryHandler);
  fastify.post('/api/catalog/supplier-inquiry/:uuid/answer', answerSupplierInquiryHandler);
}
