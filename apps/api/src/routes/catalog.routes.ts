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
  importProductsHandler
} from '../controllers/catalog.controller.js';

export async function catalogRoutes(fastify: FastifyInstance) {
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
}
