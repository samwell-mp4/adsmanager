import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Upload,
  LayoutGrid,
  List,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Tag,
  Layers,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { api } from '../services/api.js';

export const CatalogView: React.FC = () => {
  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter & Search States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal / Drawer States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Form States
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    brand: '',
    category_id: '' as string | number,
    description: '',
    price: '',
    promotional_price: '',
    cost_price: '',
    stock: '',
    main_image: '',
    is_active: true,
    notes: '',
  });

  // Variants State
  const [variants, setVariants] = useState<Array<{ sku: string; name: string; variant_type: string; price: string; stock: string }>>([]);
  const [newVariant, setNewVariant] = useState({ sku: '', name: '', variant_type: 'volume', price: '', stock: '' });

  // Media Gallery State
  const [mediaList, setMediaList] = useState<Array<{ url: string; media_type: 'image' | 'video' }>>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');

  // Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importText, setImportText] = useState<string>('');

  // Category Manager Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Load initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, prodsRes] = await Promise.all([
        api.getCatalogCategories().catch(() => []),
        api.getCatalogProducts({ limit: 100 }).catch(() => ({ products: [] })),
      ]);
      setCategories(cats || []);
      setProducts(prodsRes.products || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao carregar catálogo: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(term);
        const matchesSku = p.sku?.toLowerCase().includes(term);
        const matchesBrand = p.brand?.toLowerCase().includes(term);
        if (!matchesName && !matchesSku && !matchesBrand) return false;
      }

      // Category
      if (selectedCategory !== 'all') {
        if (String(p.category_id) !== String(selectedCategory)) return false;
      }

      // Stock
      if (stockFilter === 'in_stock' && p.stock <= 0) return false;
      if (stockFilter === 'low_stock' && (p.stock <= 0 || p.stock > 10)) return false;
      if (stockFilter === 'out_of_stock' && p.stock > 0) return false;

      // Status
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;

      return true;
    });
  }, [products, searchTerm, selectedCategory, stockFilter, statusFilter]);

  // Open Modal to Create
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      sku: `PRD-${Date.now().toString().slice(-6)}`,
      name: '',
      brand: '',
      category_id: categories[0]?.id || '',
      description: '',
      price: '',
      promotional_price: '',
      cost_price: '',
      stock: '10',
      main_image: '',
      is_active: true,
      notes: '',
    });
    setVariants([]);
    setMediaList([]);
    setIsModalOpen(true);
  };

  // Open Modal to Edit
  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku || '',
      name: product.name || '',
      brand: product.brand || '',
      category_id: product.category_id || '',
      description: product.description || '',
      price: String(product.price || ''),
      promotional_price: product.promotional_price ? String(product.promotional_price) : '',
      cost_price: product.cost_price ? String(product.cost_price) : '',
      stock: String(product.stock || 0),
      main_image: product.main_image || '',
      is_active: product.is_active,
      notes: product.notes || '',
    });

    setVariants(
      (product.variants || []).map((v: any) => ({
        sku: v.sku || '',
        name: v.name || '',
        variant_type: v.variant_type || 'volume',
        price: v.price ? String(v.price) : '',
        stock: String(v.stock || 0),
      }))
    );

    setMediaList(
      (product.media || []).map((m: any) => ({
        url: m.url,
        media_type: m.media_type || 'image',
      }))
    );

    setIsModalOpen(true);
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o nome do produto.' });
      return;
    }
    if (!formData.price || Number(formData.price) < 0) {
      setFeedback({ type: 'error', message: 'Preço de venda é obrigatório.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sku: formData.sku.trim() || undefined,
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        description: formData.description.trim() || undefined,
        price: Number(formData.price),
        promotional_price: formData.promotional_price ? Number(formData.promotional_price) : null,
        cost_price: formData.cost_price ? Number(formData.cost_price) : null,
        stock: Number(formData.stock) || 0,
        main_image: formData.main_image.trim() || undefined,
        is_active: formData.is_active,
        notes: formData.notes.trim() || undefined,
        variants: variants.map((v) => ({
          sku: v.sku.trim() || undefined,
          name: v.name.trim(),
          variant_type: v.variant_type,
          price: v.price ? Number(v.price) : Number(formData.price),
          stock: Number(v.stock) || 0,
        })),
        media: mediaList.map((m, idx) => ({
          url: m.url.trim(),
          media_type: m.media_type,
          position: idx + 1,
        })),
      };

      if (editingProduct) {
        await api.updateCatalogProduct(editingProduct.id, payload);
        setFeedback({ type: 'success', message: 'Produto atualizado com sucesso!' });
      } else {
        await api.createCatalogProduct(payload);
        setFeedback({ type: 'success', message: 'Produto cadastrado com sucesso!' });
      }

      setIsModalOpen(false);
      await fetchData();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao salvar produto' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: number, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover "${name}" do catálogo?`)) return;
    try {
      await api.deleteCatalogProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setFeedback({ type: 'success', message: 'Produto removido com sucesso!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao remover: ' + err.message });
    }
  };

  // Add Variant
  const handleAddVariant = () => {
    if (!newVariant.name.trim()) return;
    setVariants((prev) => [
      ...prev,
      {
        ...newVariant,
        price: newVariant.price || formData.price,
        stock: newVariant.stock || '10',
      },
    ]);
    setNewVariant({ sku: '', name: '', variant_type: 'volume', price: '', stock: '' });
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Media
  const handleAddMedia = () => {
    if (!newMediaUrl.trim()) return;
    setMediaList((prev) => [...prev, { url: newMediaUrl.trim(), media_type: 'image' }]);
    setNewMediaUrl('');
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  // Create Category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await api.createCatalogCategory(newCategoryName.trim());
      setCategories((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, category_id: created.id }));
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      setFeedback({ type: 'success', message: 'Categoria criada!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao criar categoria: ' + err.message });
    }
  };

  // Import JSON / CSV Preview
  const handleParseImport = () => {
    try {
      if (!importText.trim()) return;
      let parsed: any[] = [];
      const trimmed = importText.trim();

      if (trimmed.startsWith('[')) {
        parsed = JSON.parse(trimmed);
      } else {
        // Simple CSV parser
        const lines = trimmed.split('\n').filter((l) => l.trim());
        if (lines.length > 1) {
          const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["\r]/g, ''));
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim().replace(/["\r]/g, ''));
            const obj: any = {};
            header.forEach((h, idx) => {
              obj[h] = values[idx];
            });
            parsed.push({
              sku: obj.sku || obj.codigo || `IMP-${i}`,
              name: obj.nome || obj.produto || obj.name || 'Produto Importado',
              brand: obj.marca || obj.brand || '',
              price: parseFloat(obj.preco || obj.valor || obj.price || '0') || 0,
              stock: parseInt(obj.estoque || obj.stock || '10', 10) || 10,
              main_image: obj.imagem || obj.foto || obj.image || '',
            });
          }
        }
      }

      setImportPreview(parsed);
      setFeedback({ type: 'success', message: `${parsed.length} itens identificados para importação!` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao analisar dados: ' + err.message });
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    try {
      const res = await api.importCatalogProducts(importPreview);
      setFeedback({
        type: 'success',
        message: `${res.imported} produtos importados com sucesso!`,
      });
      setIsImportModalOpen(false);
      setImportPreview([]);
      setImportText('');
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro na importação: ' + err.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden w-full">
      {/* Top Header Controls - Clean White SaaS */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        {/* Branding & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                Central de Catálogo & Produtos
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                {products.length} {products.length === 1 ? 'produto' : 'produtos'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Gerencie estoque, fotos, variantes e precificação para vendas no chat
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Grade (Cards)"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Lista (Tabela)"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Manage Categories Button */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            <span>Categorias ({categories.length})</span>
          </button>

          {/* Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <Upload className="h-3.5 w-3.5 text-purple-600" />
            <span>Importar (CSV/JSON)</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition shadow-xs"
            title="Atualizar lista"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* + Add Product Button */}
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-blue-500/25"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`mx-6 mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs transition-all animate-fadeIn shrink-0 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 text-xs px-2 py-0.5 rounded">
            ✕
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="px-6 py-3 border-b border-slate-200/80 bg-white/70 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, SKU, marca..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
          >
            <option value="all">Categorias (Todas)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
          >
            <option value="all">Estoque (Todos)</option>
            <option value="in_stock">Em Estoque (&gt; 0)</option>
            <option value="low_stock">Estoque Baixo (&le; 10)</option>
            <option value="out_of_stock">Esgotado (0)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
          >
            <option value="all">Status (Todos)</option>
            <option value="active">Ativos para Venda</option>
            <option value="inactive">Pausados / Inativos</option>
          </select>

          {(searchTerm || selectedCategory !== 'all' || stockFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setStockFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-blue-600 hover:underline px-1.5 py-1 font-semibold"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {loading && products.length === 0 ? (
          <div className="py-24 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span>Carregando produtos do catálogo...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <Package className="h-12 w-12 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">Nenhum produto encontrado</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Tente ajustar os filtros de busca ou clique no botão abaixo para cadastrar o primeiro produto.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Novo Produto</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((p) => {
              const hasVariants = p.variants && p.variants.length > 0;
              const isOutOfStock = p.stock <= 0;
              const isLowStock = p.stock > 0 && p.stock <= 10;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  {/* Top Image & Badges */}
                  <div>
                    <div className="relative w-full aspect-square rounded-xl bg-slate-100 overflow-hidden mb-3 border border-slate-100 flex items-center justify-center">
                      {p.main_image ? (
                        <img
                          src={p.main_image}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-slate-300 gap-1">
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-[10px]">Sem foto</span>
                        </div>
                      )}

                      {/* Stock Pill on Image */}
                      <span
                        className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                          isOutOfStock
                            ? 'bg-rose-500 text-white'
                            : isLowStock
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isOutOfStock ? 'Esgotado' : `${p.stock} un.`}
                      </span>

                      {/* Active Status Badge */}
                      {!p.is_active && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800/80 text-white backdrop-blur-xs">
                          Inativo
                        </span>
                      )}
                    </div>

                    {/* Category & Brand */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-blue-600 truncate max-w-[120px]">
                        {p.category_name || 'Geral'}
                      </span>
                      {p.brand && <span className="truncate max-w-[80px]">{p.brand}</span>}
                    </div>

                    {/* Name */}
                    <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mb-1.5 title={p.name}">
                      {p.name}
                    </h3>

                    {/* SKU & Variants Pill */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {p.sku && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {p.sku}
                        </span>
                      )}
                      {hasVariants && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {p.variants.length} var.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing & Footer Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {p.promotional_price && p.promotional_price < p.price ? (
                        <div>
                          <span className="text-[10px] text-slate-400 line-through mr-1 font-medium">
                            R$ {Number(p.price).toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-sm font-black text-emerald-600">
                            R$ {Number(p.promotional_price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm font-black text-slate-900">
                          R$ {Number(p.price).toFixed(2).replace('.', ',')}
                        </div>
                      )}
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Editar produto"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Excluir produto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3 w-12">Foto</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Nome do Produto</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Estoque</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                        {p.main_image ? (
                          <img src={p.main_image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{p.sku || '-'}</td>
                    <td className="p-3 font-bold text-slate-800">
                      <div>{p.name}</div>
                      {p.brand && <div className="text-[10px] text-slate-400 font-normal">{p.brand}</div>}
                    </td>
                    <td className="p-3 text-blue-600 font-semibold">{p.category_name || '-'}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {p.promotional_price ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-emerald-600">R$ {Number(p.promotional_price).toFixed(2).replace('.', ',')}</span>
                          <span className="text-[10px] text-slate-400 line-through">R$ {Number(p.price).toFixed(2).replace('.', ',')}</span>
                        </div>
                      ) : (
                        `R$ ${Number(p.price).toFixed(2).replace('.', ',')}`
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.stock <= 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : p.stock <= 10
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {p.stock} unidades
                      </span>
                    </td>
                    <td className="p-3">
                      {p.is_active ? (
                        <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Ativo
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Editar"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL / DRAWER: CRIAR / EDITAR PRODUTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina especificações, variantes e precificação comercial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Row 1: Name, SKU, Brand */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Brand Collection Nº 331 (Sauvage)"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    SKU / Código
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ex: BC-331"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Category, Brand, Active */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Brand Collection, Dior..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-slate-700">Ativo para Venda</span>
                  </label>
                </div>
              </div>

              {/* Row 3: Pricing & General Stock */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="49.90"
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Preço Promocional (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.promotional_price}
                    onChange={(e) => setFormData({ ...formData, promotional_price: e.target.value })}
                    placeholder="39.90"
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs text-emerald-600 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="18.00"
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Estoque Geral
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="10"
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Main Image URL & Preview */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  URL da Imagem Principal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={formData.main_image}
                    onChange={(e) => setFormData({ ...formData, main_image: e.target.value })}
                    placeholder="https://exemplo.com/foto-do-produto.jpg"
                    className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  {formData.main_image && (
                    <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                      <img src={formData.main_image} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Variantes de Produto */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-purple-600" />
                      Variantes de Produto (Volume, Tamanho, Kit)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Cadastre variações com preço e estoque individuais (ex: 25ml, 50ml, 100ml)
                    </p>
                  </div>
                </div>

                {/* Existing variants list */}
                {variants.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {variants.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-800">{v.name}</span>
                          <span className="text-[10px] text-purple-700 font-semibold px-1.5 py-0.2 rounded bg-purple-50 border border-purple-100 uppercase">
                            {v.variant_type}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">{v.sku || 'Sem SKU'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600">R$ {Number(v.price).toFixed(2).replace('.', ',')}</span>
                          <span className="text-slate-500">{v.stock} un.</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new variant inputs */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    placeholder="Nome (ex: 25ml)"
                    value={newVariant.name}
                    onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                  />
                  <select
                    value={newVariant.variant_type}
                    onChange={(e) => setNewVariant({ ...newVariant, variant_type: e.target.value })}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                  >
                    <option value="volume">Volume (ml)</option>
                    <option value="tamanho">Tamanho</option>
                    <option value="cor">Cor</option>
                    <option value="aroma">Aroma</option>
                    <option value="kit">Kit</option>
                    <option value="outro">Outro</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Preço R$"
                    value={newVariant.price}
                    onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                  />
                  <input
                    type="number"
                    placeholder="Estoque"
                    value={newVariant.stock}
                    onChange={(e) => setNewVariant({ ...newVariant, stock: e.target.value })}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              {/* Section: Galeria de Mídias */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-blue-600" />
                  Galeria de Fotos Adicionais
                </span>
                {mediaList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mediaList.map((m, idx) => (
                      <div key={idx} className="relative h-14 w-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden group">
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-0 right-0 h-4 w-4 bg-rose-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="URL de outra imagem do produto..."
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddMedia}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    + Foto
                  </button>
                </div>
              </div>

              {/* Description & Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Descrição Comercial (Enviada no WhatsApp)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Texto explicativo das qualidades do produto para enviar ao cliente..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAÇÃO CSV / JSON */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <Upload className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Importador de Catálogo em Lote
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cole uma lista em formato JSON ou CSV com colunas: nome, sku, preco, estoque, imagem
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Cole os dados (JSON ou CSV):
                </label>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Exemplo CSV:
nome,sku,preco,estoque,marca,imagem
Brand Collection 331,BC-331,49.90,30,Brand Collection,https://...
Brand Collection 212,BC-212,49.90,25,Brand Collection,https://...`}
                  className="w-full p-3 font-mono rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseImport}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Pré-visualizar Importação
                </button>
              </div>

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 block">
                    Pré-visualização ({importPreview.length} produtos):
                  </span>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-[10px]">
                        <tr>
                          <th className="p-2">Nome</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">Preço</th>
                          <th className="p-2">Estoque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-medium">{item.name}</td>
                            <td className="p-2 font-mono text-slate-500">{item.sku}</td>
                            <td className="p-2 text-emerald-600 font-bold">R$ {Number(item.price || 0).toFixed(2)}</td>
                            <td className="p-2">{item.stock || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || importPreview.length === 0}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                {importing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Confirmar e Importar {importPreview.length} Produtos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORIAS */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Gerenciar Categorias</h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Add New Category */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nome da nova categoria..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                >
                  Adicionar
                </button>
              </div>

              {/* List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pt-2 border-t border-slate-100">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-700">{c.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">slug: {c.slug}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
