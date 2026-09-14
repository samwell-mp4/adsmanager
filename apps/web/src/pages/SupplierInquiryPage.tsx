import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { Loader2, CheckCircle2, Box, Send, AlertCircle, XCircle } from 'lucide-react';

export const SupplierInquiryPage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [inquiry, setInquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State to hold the responses from the supplier
  const [responses, setResponses] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (uuid) {
      fetchInquiry(uuid);
    }
  }, [uuid]);

  const fetchInquiry = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.getSupplierInquiry(id);
      setInquiry(res.inquiry);
      
      // Initialize response state based on requested items
      if (res.inquiry && res.inquiry.items) {
        const initialResponses = res.inquiry.items.map((item: any) => ({
          ...item,
          available: true,
          confirmedQuantity: item.quantity
        }));
        setResponses(initialResponses);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar consulta');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailable = (id: number) => {
    setResponses(prev => prev.map(item => {
      if (item.id === id) {
        const nextAvail = !item.available;
        return { ...item, available: nextAvail, confirmedQuantity: nextAvail ? item.quantity : 0 };
      }
      return item;
    }));
  };

  const handleQuantityChange = (id: number, qty: number) => {
    if (qty < 0) qty = 0;
    setResponses(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, confirmedQuantity: qty, available: qty > 0 };
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    if (!uuid) return;
    setIsSubmitting(true);
    try {
      await api.answerSupplierInquiry(uuid, responses);
      setSuccess(true);
      
      // Abre o WhatsApp para o fornecedor enviar a resposta diretamente
      // Número configurado (da loja): 5531988868362
      const targetPhone = '5531988868362';
      let msg = `Olá! Confirmei o estoque do pedido #${uuid.split('-')[0]}.\n\nResumo:\n`;
      responses.forEach(r => {
        msg += `- ${r.name}: ${r.available ? `✅ Temos ${r.confirmedQuantity} un.` : '❌ Em falta'}\n`;
      });
      msg += `\nObrigado!`;
      
      const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
      window.location.href = waUrl;
      
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar estoque');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="font-semibold text-sm">Carregando lista de produtos...</p>
        </div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-slate-800 mb-2">Consulta Inválida</h1>
          <p className="text-slate-500 text-sm">{error || 'Não foi possível encontrar este pedido.'}</p>
        </div>
      </div>
    );
  }

  const isAnswered = inquiry.status === 'ANSWERED' || success;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">Consulta de Estoque</h1>
            <p className="text-[11px] text-slate-500">Pedido #{inquiry.uuid.split('-')[0]}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-xl mx-auto p-4 space-y-4">
        {isAnswered ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Pedido já Respondido!</p>
              <p className="text-emerald-700 mt-1">Agradecemos por confirmar o estoque. O lojista já foi notificado e entrará em contato.</p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <p><strong>Olá fornecedor!</strong> Por favor, verifique a lista abaixo e confirme quais itens você tem em estoque no momento e a quantidade disponível.</p>
          </div>
        )}

        <div className="space-y-3">
          {responses.map((item) => (
            <div key={item.id} className={`bg-white border rounded-2xl p-4 transition-all shadow-xs ${item.available ? 'border-blue-200 ring-1 ring-blue-500/10' : 'border-slate-200 opacity-75'}`}>
              <div className="flex gap-3 mb-4">
                <div className="h-14 w-14 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                  {item.main_image ? (
                    <img src={item.main_image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Box className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{item.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">Qtd Solicitada: <strong className="text-slate-700">{item.quantity}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => !isAnswered && handleToggleAvailable(item.id)}
                  disabled={isAnswered}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition ${
                    item.available 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600'
                  } ${isAnswered ? 'opacity-90 cursor-default' : 'hover:bg-blue-700'}`}
                >
                  {item.available ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {item.available ? 'Em Estoque' : 'Em Falta'}
                </button>

                {item.available && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                    <span className="text-[10px] font-semibold text-slate-500 px-2 uppercase tracking-wide">Qtd:</span>
                    <input
                      type="number"
                      min="0"
                      value={item.confirmedQuantity}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                      disabled={isAnswered}
                      className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-center text-sm font-bold focus:outline-none focus:border-blue-500 disabled:opacity-80 disabled:bg-slate-50"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Bar */}
      {!isAnswered && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <div className="max-w-xl mx-auto flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 font-bold text-sm shadow-md transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Confirmando...</>
              ) : (
                <><Send className="h-5 w-5" /> Confirmar Estoque e Enviar</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
