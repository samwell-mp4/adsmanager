import { pool } from '../db/index.js';
import {
  CatalogCategory,
  CatalogProduct,
  CatalogProductVariant,
  CatalogProductMedia,
  CreateProductInput,
  ProductFilterOptions
} from '../types/index.js';

let catalogTablesInitialized = false;

export class CatalogRepository {
  /**
   * Automatically ensures all Catalog tables and indexes exist in PostgreSQL
   */
  async ensureCatalogTablesExist(): Promise<void> {
    if (catalogTablesInitialized) return;
    const client = await pool.connect();
    try {
      await client.query(`
        -- 1. Categorias do Catálogo
        CREATE TABLE IF NOT EXISTS catalog_categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            slug VARCHAR(150) NOT NULL UNIQUE,
            icon VARCHAR(50) DEFAULT 'Tag',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- 2. Produtos do Catálogo
        CREATE TABLE IF NOT EXISTS catalog_products (
            id SERIAL PRIMARY KEY,
            sku VARCHAR(100) UNIQUE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category_id INTEGER REFERENCES catalog_categories(id) ON DELETE SET NULL,
            brand VARCHAR(150),
            price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            promotional_price NUMERIC(10, 2),
            cost_price NUMERIC(10, 2),
            stock INTEGER NOT NULL DEFAULT 0,
            main_image TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- 3. Variantes do Produto (volume, tamanho, cor, modelo, aroma)
        CREATE TABLE IF NOT EXISTS catalog_product_variants (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
            sku VARCHAR(100),
            name VARCHAR(150) NOT NULL,
            variant_type VARCHAR(50) DEFAULT 'volume',
            price NUMERIC(10, 2),
            stock INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- 4. Galeria de Mídias (Imagens e Vídeos)
        CREATE TABLE IF NOT EXISTS catalog_product_media (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
            media_type VARCHAR(20) NOT NULL DEFAULT 'image',
            url TEXT NOT NULL,
            thumbnail_url TEXT,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Índices para alta performance
        CREATE INDEX IF NOT EXISTS idx_catalog_prod_cat ON catalog_products(category_id);
        CREATE INDEX IF NOT EXISTS idx_catalog_prod_active ON catalog_products(is_active);
        CREATE INDEX IF NOT EXISTS idx_catalog_prod_stock ON catalog_products(stock);
        CREATE INDEX IF NOT EXISTS idx_catalog_prod_sku ON catalog_products(sku);
        CREATE INDEX IF NOT EXISTS idx_catalog_var_prod ON catalog_product_variants(product_id);
        CREATE INDEX IF NOT EXISTS idx_catalog_media_prod ON catalog_product_media(product_id);
      `);

      // Seed sample categories if empty
      const catCount = await client.query('SELECT COUNT(*) as c FROM catalog_categories');
      if (parseInt(catCount.rows[0].c, 10) === 0) {
        await client.query(`
          INSERT INTO catalog_categories (name, slug, icon) VALUES
            ('Brand Collection (Miniaturas)', 'brand-collection', 'Sparkles'),
            ('Perfumes Importados Masculinos', 'masculinos', 'Flame'),
            ('Perfumes Importados Femininos', 'femininos', 'Heart'),
            ('Perfumes Árabes', 'arabes', 'Crown'),
            ('Decants & Fracionados', 'decants', 'Droplet')
          ON CONFLICT (slug) DO NOTHING;
        `);
      }

      // Seed initial sample products if empty
      const prodCount = await client.query('SELECT COUNT(*) as c FROM catalog_products');
      if (parseInt(prodCount.rows[0].c, 10) === 0) {
        const catRes = await client.query("SELECT id FROM catalog_categories WHERE slug = 'brand-collection' LIMIT 1");
        const catId = catRes.rows[0]?.id || null;

        const p1 = await client.query(`
          INSERT INTO catalog_products (
            sku, name, description, category_id, brand, price, promotional_price, cost_price, stock, main_image, is_active
          ) VALUES (
            'BC-331', 'Brand Collection Nº 331 (Inspirado em Sauvage)',
            'Miniatura importada com frasco em vidro original e alta fixação (25ml). Ideal para levar na bolsa ou no carro.',
            $1, 'Brand Collection', 49.90, 39.90, 18.00, 48,
            'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop', TRUE
          ) RETURNING id;
        `, [catId]);

        if (p1.rows[0]?.id) {
          const p1Id = p1.rows[0].id;
          await client.query(`
            INSERT INTO catalog_product_variants (product_id, sku, name, variant_type, price, stock) VALUES
              ($1, 'BC-331-25ML', '25ml', 'volume', 39.90, 35),
              ($1, 'BC-331-KIT3', 'Kit 3 Unidades (Promocional)', 'kit', 99.90, 13);
          `, [p1Id]);

          await client.query(`
            INSERT INTO catalog_product_media (product_id, media_type, url, position) VALUES
              ($1, 'image', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop', 1);
          `, [p1Id]);
        }

        const p2 = await client.query(`
          INSERT INTO catalog_products (
            sku, name, description, category_id, brand, price, promotional_price, cost_price, stock, main_image, is_active
          ) VALUES (
            'BC-212', 'Brand Collection Nº 212 VIP Black (25ml)',
            'Fragrância aromática marcante para homens modernos e sofisticados.',
            $1, 'Brand Collection', 49.90, 44.90, 18.00, 32,
            'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&auto=format&fit=crop', TRUE
          ) RETURNING id;
        `, [catId]);

        if (p2.rows[0]?.id) {
          const p2Id = p2.rows[0].id;
          await client.query(`
            INSERT INTO catalog_product_variants (product_id, sku, name, variant_type, price, stock) VALUES
              ($1, 'BC-212-25ML', '25ml', 'volume', 44.90, 32);
          `, [p2Id]);
        }
      }

      catalogTablesInitialized = true;
    } catch (err) {
      console.error('Error creating catalog tables:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // Categorias
  // ==========================================

  async listCategories(): Promise<CatalogCategory[]> {
    await this.ensureCatalogTablesExist();
    const res = await pool.query(`
      SELECT id, name, slug, icon, created_at, updated_at
      FROM catalog_categories
      ORDER BY name ASC
    `);
    return res.rows;
  }

  async createCategory(name: string, icon = 'Tag'): Promise<CatalogCategory> {
    await this.ensureCatalogTablesExist();
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.floor(Math.random() * 1000);

    const res = await pool.query(`
      INSERT INTO catalog_categories (name, slug, icon)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name.trim(), slug, icon]);
    return res.rows[0];
  }

  async updateCategory(id: number, name: string, icon?: string): Promise<CatalogCategory> {
    await this.ensureCatalogTablesExist();
    const res = await pool.query(`
      UPDATE catalog_categories
      SET name = $1, icon = COALESCE($2, icon), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [name.trim(), icon, id]);
    return res.rows[0];
  }

  async deleteCategory(id: number): Promise<boolean> {
    await this.ensureCatalogTablesExist();
    const res = await pool.query('DELETE FROM catalog_categories WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // Produtos
  // ==========================================

  async listProducts(options: ProductFilterOptions = {}): Promise<{ total: number; products: CatalogProduct[] }> {
    await this.ensureCatalogTablesExist();
    const {
      search,
      category_id,
      brand,
      is_active,
      in_stock,
      page = 1,
      limit = 30
    } = options;

    const conditions: string[] = [];
    const values: any[] = [];
    let valIdx = 1;

    if (search && search.trim()) {
      conditions.push(`(p.name ILIKE $${valIdx} OR p.sku ILIKE $${valIdx} OR p.brand ILIKE $${valIdx} OR p.description ILIKE $${valIdx})`);
      values.push(`%${search.trim()}%`);
      valIdx++;
    }

    if (category_id) {
      conditions.push(`p.category_id = $${valIdx}`);
      values.push(category_id);
      valIdx++;
    }

    if (brand && brand.trim()) {
      conditions.push(`p.brand = $${valIdx}`);
      values.push(brand.trim());
      valIdx++;
    }

    if (typeof is_active === 'boolean') {
      conditions.push(`p.is_active = $${valIdx}`);
      values.push(is_active);
      valIdx++;
    }

    if (typeof in_stock === 'boolean') {
      if (in_stock) {
        conditions.push(`p.stock > 0`);
      } else {
        conditions.push(`p.stock <= 0`);
      }
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count query
    const countRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM catalog_products p
      ${whereClause}
    `, values);
    const total = parseInt(countRes.rows[0].total, 10);

    // Items query with pagination
    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const query = `
      SELECT 
        p.id, p.sku, p.name, p.description, p.category_id, p.brand,
        p.price::numeric, p.promotional_price::numeric, p.cost_price::numeric,
        p.stock, p.main_image, p.is_active, p.notes, p.created_at, p.updated_at,
        c.name as category_name,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', v.id,
            'product_id', v.product_id,
            'sku', v.sku,
            'name', v.name,
            'variant_type', v.variant_type,
            'price', v.price::numeric,
            'stock', v.stock
          )) FROM catalog_product_variants v WHERE v.product_id = p.id),
          '[]'::json
        ) as variants,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', m.id,
            'product_id', m.product_id,
            'media_type', m.media_type,
            'url', m.url,
            'thumbnail_url', m.thumbnail_url,
            'position', m.position
          ) ORDER BY m.position ASC) FROM catalog_product_media m WHERE m.product_id = p.id),
          '[]'::json
        ) as media
      FROM catalog_products p
      LEFT JOIN catalog_categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT $${valIdx} OFFSET $${valIdx + 1}
    `;

    const res = await pool.query(query, values);
    return {
      total,
      products: res.rows.map(r => ({
        ...r,
        price: Number(r.price),
        promotional_price: r.promotional_price ? Number(r.promotional_price) : null,
        cost_price: r.cost_price ? Number(r.cost_price) : null,
      }))
    };
  }

  async getProductById(id: number): Promise<CatalogProduct | null> {
    await this.ensureCatalogTablesExist();
    const query = `
      SELECT 
        p.id, p.sku, p.name, p.description, p.category_id, p.brand,
        p.price::numeric, p.promotional_price::numeric, p.cost_price::numeric,
        p.stock, p.main_image, p.is_active, p.notes, p.created_at, p.updated_at,
        c.name as category_name,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', v.id,
            'product_id', v.product_id,
            'sku', v.sku,
            'name', v.name,
            'variant_type', v.variant_type,
            'price', v.price::numeric,
            'stock', v.stock
          )) FROM catalog_product_variants v WHERE v.product_id = p.id),
          '[]'::json
        ) as variants,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', m.id,
            'product_id', m.product_id,
            'media_type', m.media_type,
            'url', m.url,
            'thumbnail_url', m.thumbnail_url,
            'position', m.position
          ) ORDER BY m.position ASC) FROM catalog_product_media m WHERE m.product_id = p.id),
          '[]'::json
        ) as media
      FROM catalog_products p
      LEFT JOIN catalog_categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;
    const res = await pool.query(query, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      price: Number(r.price),
      promotional_price: r.promotional_price ? Number(r.promotional_price) : null,
      cost_price: r.cost_price ? Number(r.cost_price) : null,
    };
  }

  async createProduct(data: CreateProductInput): Promise<CatalogProduct> {
    await this.ensureCatalogTablesExist();
    const client = await pool.connect();
    let released = false;
    try {
      await client.query('BEGIN');

      // Check category_id validity to avoid foreign key violation
      let categoryId = data.category_id ? Number(data.category_id) : null;
      if (categoryId) {
        const catCheck = await client.query('SELECT id FROM catalog_categories WHERE id = $1', [categoryId]);
        if (catCheck.rows.length === 0) {
          categoryId = null;
        }
      }

      const sku = data.sku?.trim() || `PRD-${Date.now().toString().slice(-6)}`;
      const price = Number(data.price) || 0;
      const promotionalPrice = data.promotional_price !== undefined && data.promotional_price !== null ? Number(data.promotional_price) : null;
      const costPrice = data.cost_price !== undefined && data.cost_price !== null ? Number(data.cost_price) : null;
      const stock = Number(data.stock) || 0;

      const prodRes = await client.query(`
        INSERT INTO catalog_products (
          sku, name, description, category_id, brand, price,
          promotional_price, cost_price, stock, main_image, is_active, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        sku,
        data.name.trim(),
        data.description || null,
        categoryId,
        data.brand?.trim() || null,
        price,
        promotionalPrice,
        costPrice,
        stock,
        data.main_image || null,
        data.is_active !== undefined ? data.is_active : true,
        data.notes || null
      ]);

      const productId = prodRes.rows[0].id;

      // Inserir variantes se informadas
      if (data.variants && data.variants.length > 0) {
        for (const v of data.variants) {
          if (!v.name || !v.name.trim()) continue;
          await client.query(`
            INSERT INTO catalog_product_variants (product_id, sku, name, variant_type, price, stock)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            productId,
            v.sku?.trim() || null,
            v.name.trim(),
            v.variant_type || 'volume',
            v.price !== undefined && v.price !== null ? Number(v.price) : price,
            Number(v.stock) || 0
          ]);
        }
      }

      // Inserir mídias se informadas
      if (data.media && data.media.length > 0) {
        for (let i = 0; i < data.media.length; i++) {
          const m = data.media[i];
          if (!m.url || !m.url.trim()) continue;
          await client.query(`
            INSERT INTO catalog_product_media (product_id, media_type, url, thumbnail_url, position)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            productId,
            m.media_type || 'image',
            m.url.trim(),
            m.thumbnail_url || null,
            m.position || i + 1
          ]);
        }
      }

      await client.query('COMMIT');
      client.release();
      released = true;

      const created = await this.getProductById(productId);
      return created!;
    } catch (err) {
      if (!released) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      throw err;
    } finally {
      if (!released) {
        try { client.release(); } catch {}
      }
    }
  }

  async updateProduct(id: number, data: CreateProductInput): Promise<CatalogProduct | null> {
    await this.ensureCatalogTablesExist();
    const client = await pool.connect();
    let released = false;
    try {
      await client.query('BEGIN');

      await client.query(`
        UPDATE catalog_products SET
          sku = COALESCE($1, sku),
          name = COALESCE($2, name),
          description = $3,
          category_id = $4,
          brand = $5,
          price = COALESCE($6, price),
          promotional_price = $7,
          cost_price = $8,
          stock = COALESCE($9, stock),
          main_image = COALESCE($10, main_image),
          is_active = COALESCE($11, is_active),
          notes = $12,
          updated_at = NOW()
        WHERE id = $13
      `, [
        data.sku?.trim() || null,
        data.name?.trim() || null,
        data.description !== undefined ? data.description : null,
        data.category_id !== undefined ? data.category_id : null,
        data.brand !== undefined ? data.brand : null,
        data.price,
        data.promotional_price !== undefined ? data.promotional_price : null,
        data.cost_price !== undefined ? data.cost_price : null,
        data.stock,
        data.main_image !== undefined ? data.main_image : null,
        data.is_active,
        data.notes !== undefined ? data.notes : null,
        id
      ]);

      // Atualizar variantes se fornecidas
      if (data.variants !== undefined) {
        await client.query('DELETE FROM catalog_product_variants WHERE product_id = $1', [id]);
        for (const v of data.variants) {
          if (!v.name || !v.name.trim()) continue;
          await client.query(`
            INSERT INTO catalog_product_variants (product_id, sku, name, variant_type, price, stock)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            id,
            v.sku?.trim() || null,
            v.name.trim(),
            v.variant_type || 'volume',
            v.price || data.price || null,
            v.stock || 0
          ]);
        }
      }

      // Atualizar mídias se fornecidas
      if (data.media !== undefined) {
        await client.query('DELETE FROM catalog_product_media WHERE product_id = $1', [id]);
        for (let i = 0; i < data.media.length; i++) {
          const m = data.media[i];
          if (!m.url || !m.url.trim()) continue;
          await client.query(`
            INSERT INTO catalog_product_media (product_id, media_type, url, thumbnail_url, position)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            id,
            m.media_type || 'image',
            m.url.trim(),
            m.thumbnail_url || null,
            m.position || i + 1
          ]);
        }
      }

      await client.query('COMMIT');
      client.release();
      released = true;

      return await this.getProductById(id);
    } catch (err) {
      if (!released) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      throw err;
    } finally {
      if (!released) {
        try { client.release(); } catch {}
      }
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    await this.ensureCatalogTablesExist();
    const res = await pool.query('DELETE FROM catalog_products WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async importProducts(items: CreateProductInput[]): Promise<{ imported: number; errors: string[] }> {
    await this.ensureCatalogTablesExist();
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.name || !item.name.trim()) {
          errors.push(`Linha ${i + 1}: Nome do produto não pode ser vazio.`);
          continue;
        }
        await this.createProduct(item);
        imported++;
      } catch (err: any) {
        errors.push(`Linha ${i + 1} (${item.name}): ${err.message}`);
      }
    }

    return { imported, errors };
  }
}

export const catalogRepository = new CatalogRepository();
