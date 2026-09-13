import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Trash2,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Receipt
} from 'lucide-react';
import { api } from '../services/api.js';

export const FinanceView: React.FC = () => {
  const [summary, setSummary] = useState<{
    balance: number;
    total_income: number;
    total_expenses: number;
    pending_income: number;
    pending_expenses: number;
    recent_count: number;
  }>({
    balance: 0,
    total_income: 0,
    total_expenses: 0,
    pending_income: 0,
    pending_expenses: 0,
    recent_count: 0,
  });

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'receita' | 'despesa'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pago' | 'pendente'>('all');

  // Modals
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'despesa' | 'receita'>('despesa');
  const [savingTransaction, setSavingTransaction] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    description: '',
    category: 'Frete / Transporte / Uber',
    amount: '',
    payment_method: 'pix',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pago' as 'pago' | 'pendente',
    notes: '',
  });

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [sum, listRes] = await Promise.all([
        api.getFinancialSummary().catch(() => ({
          balance: 0,
          total_income: 0,
          total_expenses: 0,
          pending_income: 0,
          pending_expenses: 0,
          recent_count: 0,
        })),
        api.getFinancialTransactions({ limit: 200 }).catch(() => ({ transactions: [], total: 0 })),
      ]);

      setSummary(sum || {
        balance: 0,
        total_income: 0,
        total_expenses: 0,
        pending_income: 0,
        pending_expenses: 0,
        recent_count: 0,
      });
      setTransactions(listRes.transactions || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados financeiros:', err);
      setFeedback({ type: 'error', message: 'Erro ao carregar lançamentos financeiros' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const parseCurrencyInput = (val: any): number => {
    if (!val) return 0;
    const str = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(str) || 0;
  };

  const handleOpenModal = (type: 'despesa' | 'receita') => {
    setModalType(type);
    setFormData({
      description: '',
      category: type === 'despesa' ? 'Frete / Transporte / Uber' : 'Vendas - Geral',
      amount: '',
      payment_method: 'pix',
      due_date: new Date().toISOString().split('T')[0],
      status: 'pago',
      notes: '',
    });
    setShowModal(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert('Preencha a descrição do lançamento');
      return;
    }
    const val = parseCurrencyInput(formData.amount);
    if (val <= 0) {
      alert('Informe um valor válido maior que zero');
      return;
    }

    setSavingTransaction(true);
    try {
      await api.createFinancialTransaction({
        type: modalType,
        category: formData.category,
        description: formData.description.trim(),
        amount: val,
        payment_method: formData.payment_method,
        status: formData.status,
        due_date: formData.due_date,
        notes: formData.notes.trim() || undefined,
      });

      setFeedback({
        type: 'success',
        message: `${modalType === 'despesa' ? 'Despesa' : 'Receita'} cadastrada com sucesso!`,
      });
      setShowModal(false);
      await fetchFinanceData();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar lançamento');
    } finally {
      setSavingTransaction(false);
    }
  };

  const handleDeleteTransaction = async (id: number, desc: string) => {
    if (!window.confirm(`Deseja excluir o lançamento "${desc}"?`)) return;
    try {
      await api.deleteFinancialTransaction(id);
      setFeedback({ type: 'success', message: 'Lançamento excluído com sucesso!' });
      await fetchFinanceData();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const descMatch = t.description?.toLowerCase().includes(term);
        const catMatch = t.category?.toLowerCase().includes(term);
        const orderMatch = t.order_code?.toLowerCase().includes(term);
        const clientMatch = t.order_customer_name?.toLowerCase().includes(term);
        if (!descMatch && !catMatch && !orderMatch && !clientMatch) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, statusFilter, categoryFilter, searchTerm]);

  // Unique categories for filter
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [transactions]);

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden w-full">
      {/* Top Header Controls - Clean White SaaS */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Controle Financeiro & Fluxo de Caixa</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                {transactions.length} movimentações
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Receitas automáticas das comandas/pedidos e lançamento manual de despesas operacionais
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchFinanceData()}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition shadow-xs"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => handleOpenModal('despesa')}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <ArrowDownRight className="h-4 w-4 text-rose-600" />
            <span>+ Nova Despesa (Frete / Operacional)</span>
          </button>

          <button
            onClick={() => handleOpenModal('receita')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs shadow-emerald-600/20"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>+ Nova Receita</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Líquido */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Líquido Real</span>
              <div className={`p-2 rounded-xl ${summary.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {summary.balance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              R$ {Number(summary.balance).toFixed(2).replace('.', ',')}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Receitas realizadas menos despesas pagas</span>
            </div>
          </div>

          {/* Card 2: Receitas */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Receitas</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600">
              R$ {Number(summary.total_income).toFixed(2).replace('.', ',')}
            </div>
            <div className="text-[11px] text-emerald-700/80 font-medium">
              + R$ {Number(summary.pending_income).toFixed(2).replace('.', ',')} a receber
            </div>
          </div>

          {/* Card 3: Despesas */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Despesas / Custos</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600">
              R$ {Number(summary.total_expenses).toFixed(2).replace('.', ',')}
            </div>
            <div className="text-[11px] text-rose-700/80 font-medium">
              Fretes, entregadores, compras e custos
            </div>
          </div>

          {/* Card 4: Contas Pendentes */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">A Pagar Pendente</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600">
              R$ {Number(summary.pending_expenses).toFixed(2).replace('.', ',')}
            </div>
            <div className="text-[11px] text-amber-700/80 font-medium">
              Lançamentos com pagamento em aberto
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por descrição, categoria, código de pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Type Pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  typeFilter === 'all' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter('receita')}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  typeFilter === 'receita' ? 'bg-white text-emerald-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Receitas (+)
              </button>
              <button
                onClick={() => setTypeFilter('despesa')}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  typeFilter === 'despesa' ? 'bg-white text-rose-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Despesas (-)
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="all">Status: Todos</option>
              <option value="pago">Status: Pago / Concluído</option>
              <option value="pendente">Status: Pendente</option>
            </select>

            {/* Category Filter */}
            {availableCategories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="all">Categorias: Todas ({availableCategories.length})</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-slate-500" />
              Lançamentos Financeiros ({filteredTransactions.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Forma Pagto</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Carregando movimentações financeiras...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhuma movimentação financeira encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => {
                    const isIncome = t.type === 'receita';
                    const isPaid = t.status === 'pago';
                    const dateFormatted = t.due_date
                      ? new Date(t.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')
                      : '-';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {isIncome ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {isIncome ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{t.description}</div>
                          {t.order_code && (
                            <span className="text-[10px] text-blue-600 font-bold">
                              Pedido #{t.order_code} {t.order_customer_name ? `• ${t.order_customer_name}` : ''}
                            </span>
                          )}
                          {t.notes && <p className="text-[11px] text-slate-400 mt-0.5">{t.notes}</p>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500 whitespace-nowrap">
                          {t.payment_method || 'PIX'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold">
                          <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                            {isIncome ? '+ ' : '- '}R$ {Number(t.amount).toFixed(2).replace('.', ',')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPaid ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteTransaction(t.id, t.description)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nova Despesa / Receita Manual */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleIn">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    modalType === 'despesa' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {modalType === 'despesa' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {modalType === 'despesa' ? 'Nova Despesa Manual' : 'Nova Receita Manual'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {modalType === 'despesa'
                      ? 'Registre fretes internos, Uber Flash, motoboy, compras ou embalagens'
                      : 'Registre entradas extras ou adiantamentos'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4">
              {/* Descrição */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descrição do Lançamento *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    modalType === 'despesa'
                      ? 'Ex: Uber Flash entrega cliente William / Motoboy centro'
                      : 'Ex: Entrada avulsa de vendas'
                  }
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Categoria e Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Categoria *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  >
                    {modalType === 'despesa' ? (
                      <>
                        <option value="Frete / Transporte / Uber">Frete / Transporte / Uber</option>
                        <option value="Motoboy / Logística">Motoboy / Logística</option>
                        <option value="Combustível / Deslocamento">Combustível / Deslocamento</option>
                        <option value="Embalagens & Caixas">Embalagens & Caixas</option>
                        <option value="Fornecedor / Compra de Estoque">Fornecedor / Estoque</option>
                        <option value="Despesas Operacionais">Despesas Operacionais</option>
                        <option value="Marketing & Tráfego">Marketing & Tráfego</option>
                        <option value="Outros">Outros</option>
                      </>
                    ) : (
                      <>
                        <option value="Vendas - Geral">Vendas - Geral</option>
                        <option value="Vendas - Balcão">Vendas - Balcão</option>
                        <option value="Adiantamento">Adiantamento</option>
                        <option value="Reembolso">Reembolso</option>
                        <option value="Outros">Outros</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valor (R$) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 25,00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Data, Forma de Pagamento e Status */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Forma Pagamento</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="pago">Pago / Concluído</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Observações (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes adicionais, comprovante ou número da corrida..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTransaction}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-md disabled:opacity-50 ${
                    modalType === 'despesa' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {savingTransaction ? 'Salvando...' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
