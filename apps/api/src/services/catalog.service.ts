import { catalogRepository } from '../repositories/catalog.repository.js';
import {
  CatalogCategory,
  CatalogProduct,
  CreateProductInput,
  ProductFilterOptions
} from '../types/index.js';

export class CatalogService {
  async listCategories(): Promise<CatalogCategory[]> {
    return catalogRepository.listCategories();
  }

  async createCategory(name: string, icon?: string): Promise<CatalogCategory> {
    if (!name || !name.trim()) {
      throw new Error('O nome da categoria é obrigatório.');
    }
    return catalogRepository.createCategory(name, icon);
  }

  async updateCategory(id: number, name: string, icon?: string): Promise<CatalogCategory> {
    if (!name || !name.trim()) {
      throw new Error('O nome da categoria é obrigatório.');
    }
    return catalogRepository.updateCategory(id, name, icon);
  }

  async deleteCategory(id: number): Promise<boolean> {
    return catalogRepository.deleteCategory(id);
  }

  async listProducts(options: ProductFilterOptions = {}): Promise<{ total: number; products: CatalogProduct[] }> {
    return catalogRepository.listProducts(options);
  }

  async getProductById(id: number): Promise<CatalogProduct | null> {
    return catalogRepository.getProductById(id);
  }

  async createProduct(data: CreateProductInput): Promise<CatalogProduct> {
    if (!data.name || !data.name.trim()) {
      throw new Error('O nome do produto é obrigatório.');
    }
    if (data.price === undefined || data.price < 0) {
      throw new Error('O preço do produto é obrigatório e não pode ser negativo.');
    }

    // Se possui variantes com estoque, sincronizar estoque total
    if (data.variants && data.variants.length > 0) {
      const variantStockTotal = data.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
      if (variantStockTotal > 0 && (!data.stock || data.stock === 0)) {
        data.stock = variantStockTotal;
      }
    }

    return catalogRepository.createProduct(data);
  }

  async updateProduct(id: number, data: CreateProductInput): Promise<CatalogProduct | null> {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('O nome do produto não pode ser vazio.');
    }
    if (data.price !== undefined && data.price < 0) {
      throw new Error('O preço do produto não pode ser negativo.');
    }

    // Se possui variantes com estoque, sincronizar estoque total
    if (data.variants && data.variants.length > 0) {
      const variantStockTotal = data.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
      if (variantStockTotal > 0 && (!data.stock || data.stock === 0)) {
        data.stock = variantStockTotal;
      }
    }

    return catalogRepository.updateProduct(id, data);
  }

  async deleteProduct(id: number): Promise<boolean> {
    return catalogRepository.deleteProduct(id);
  }

  async importProducts(items: CreateProductInput[]): Promise<{ imported: number; errors: string[] }> {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Nenhum item fornecido para importação.');
    }
    return catalogRepository.importProducts(items);
  }
}

export const catalogService = new CatalogService();
