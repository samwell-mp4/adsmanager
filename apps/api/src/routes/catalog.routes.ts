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
  fastify.get('/api/catalog/categories', listCategoriesHandler);
  fastify.post('/api/catalog/categories', createCategoryHandler);
  fastify.patch('/api/catalog/categories/:id', updateCategoryHandler);
  fastify.delete('/api/catalog/categories/:id', deleteCategoryHandler);

  // Produtos
  fastify.get('/api/catalog/products', listProductsHandler);
  fastify.get('/api/catalog/products/:id', getProductHandler);
  fastify.post('/api/catalog/products', createProductHandler);
  fastify.put('/api/catalog/products/:id', updateProductHandler);
  fastify.delete('/api/catalog/products/:id', deleteProductHandler);

  // Importação em lote
  fastify.post('/api/catalog/import', importProductsHandler);
}
