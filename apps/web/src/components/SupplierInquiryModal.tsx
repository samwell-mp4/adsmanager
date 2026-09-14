import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, CheckCircle2, Box, ExternalLink, Send } from 'lucide-react';
import { api } from '../services/api.js';

interface SupplierInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageGenerated: (message: string) => void;
}

interface ProductSelection {
  id: number;
  sku: string;
  name: string;
  quantity: number;
}

export const SupplierInquiryModal: React.FC<SupplierInquiryModalProps> = ({ isOpen, onClose, onMessageGenerated }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<ProductSelection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successLink, setSuccessLink] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setSelectedItems([]);
      setSuccessLink('');
      setSearch('');
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getCatalogProducts({ limit: 1000 });
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load products for inquiry', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    (p.name?.toLowerCase().includes(search.toLowerCase())) || 
    (p.sku?.toLowerCase().includes(search.toLowerCase())) ||
    (p.brand?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelection = (product: any) => {
    setSelectedItems(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.filter(item => item.id !== product.id);
      }
      return [...prev, { id: product.id, sku: product.sku || '', name: product.name, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, qty: number) => {
    if (qty < 1) qty = 1;
    setSelectedItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const handleGenerateInquiry = async () => {
    if (selectedItems.length === 0) return;
    setIsSubmitting(true);
    try {
      // 1. Criar a consulta no banco
      const res = await api.createSupplierInquiry(selectedItems);
      const uuid = res.inquiry.uuid;
      
      // 2. Gerar a URL pública (usamos window.location.origin)
      const baseUrl = window.location.origin;
      const inquiryUrl = `${baseUrl}/fornecedor/${uuid}`;
      setSuccessLink(inquiryUrl);

      // 3. Montar a mensagem padrão formatada para WhatsApp
      let msg = `Olá! Preciso verificar a disponibilidade dos seguintes itens:\n\n`;
      selectedItems.forEach(item => {
        msg += `📦 *${item.name}* (Qtd: ${item.quantity})\n`;
      });
      msg += `\nPara confirmar o estoque rapidamente, por favor acesse este link e marque o que tem disponível:\n${inquiryUrl}\n\nObrigado!`;

      // Passar para o componente pai
      onMessageGenerated(msg);
      
    } catch (err) {
      console.error('Erro ao gerar consulta', err);
      alert('Erro ao gerar consulta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Consultar Fornecedor</h2>
              <p className="text-xs text-slate-500">Selecione os produtos e as quantidades para perguntar o estoque.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Product Selection */}
          <div className="w-1/2 border-r border-slate-100 flex flex-col bg-white">
            <div className="p-4 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map(p => {
                    const isSelected = selectedItems.some(i => i.id === p.id);
                    return (
                      <div 
                        key={p.id}
                        onClick={() => toggleSelection(p)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                          <span className="text-xs text-slate-400 font-mono truncate">{p.brand} {p.sku ? `• ${p.sku}` : ''}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected Items & Action */}
          <div className="w-1/2 flex flex-col bg-slate-50/50">
            <div className="p-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-700">Produtos Selecionados ({selectedItems.length})</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedItems.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Nenhum produto selecionado ainda.
                </div>
              ) : (
                selectedItems.map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate" title={item.name}>{item.name}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500">Qtd:</span>
                      <input 
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 p-1 text-sm border border-slate-200 rounded-lg text-center focus:outline-none focus:border-blue-500"
                      />
                      <button onClick={() => toggleSelection(item)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              {successLink ? (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-800 mb-1">Consulta Gerada com Sucesso!</p>
                  <p className="text-xs text-emerald-600 mb-3">A mensagem foi copiada para o chat.</p>
                  <a href={successLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1">
                    Visualizar link do fornecedor <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <button
                  onClick={handleGenerateInquiry}
                  disabled={selectedItems.length === 0 || isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Gerar Mensagem de Consulta
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
