import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Tv,
  Download,
  Trash2,
  Bell,
  Kanban,
  LayoutList,
  Volume2,
  VolumeX,
  Store,
} from 'lucide-react';
import { api } from '../services/api.js';
import { BrowserProfile } from '../types/index.js';

interface CrmViewProps {
  profiles: BrowserProfile[];
  onOpenVnc?: (profile: BrowserProfile) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({ profiles, onOpenVnc }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeThread, setActiveThread] = useState<{ conversation: any; messages: any[] } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tabs & Views
  const [currentTab, setCurrentTab] = useState<'inbox' | 'kanban'>('inbox');
  const [marketplaceOnly, setMarketplaceOnly] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLastMsgTimeRef = useRef<Record<number, string>>({});
  const initialLoadDone = useRef(false);

  // Quick reply templates
  const quickTemplates = [
    'Olá! Está disponível sim, você tem interesse?',
    'Fazemos o envio hoje mesmo com código de rastreio!',
    'Qual seria a sua região/bairro para combinar a entrega?',
    'Aceitamos pagamento via PIX, Cartão ou dinheiro na entrega.',
    'Pode me passar seu WhatsApp para acertarmos os detalhes?'
  ];

  const [testingWebhook, setTestingWebhook] = useState(false);

  // Modern 2-tone notification sound (synthesized with Web Audio API)
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // First tone: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Second tone: 1318.5Hz (E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, now + 0.08);
      gain2.gain.setValueAtTime(0.22, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.4);
    } catch (e) {
      // Audio playback blocked until user interaction
    }
  };

  // Fetch conversation list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const data = await api.getCrmConversations({
        platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
        profile_id: selectedProfileId !== 'all' ? selectedProfileId : undefined,
        lead_status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
        marketplace_only: marketplaceOnly,
      });

      // Realtime notification detection
      if (initialLoadDone.current && data && Array.isArray(data)) {
        let hasNewIncoming = false;
        for (const conv of data) {
          const prevTime = prevLastMsgTimeRef.current[conv.id];
          const currTime = conv.last_message_at || conv.updated_at;
          if (prevTime && currTime && new Date(currTime).getTime() > new Date(prevTime).getTime()) {
            if (conv.id !== selectedId) {
              hasNewIncoming = true;
            }
          }
        }
        if (hasNewIncoming) {
          playNotificationSound();
          setFeedback({
            type: 'success',
            message: 'Nova mensagem recebida no CRM!'
          });
          setTimeout(() => setFeedback(null), 4000);
        }
      }

      // Record timestamps
      if (data && Array.isArray(data)) {
        for (const conv of data) {
          prevLastMsgTimeRef.current[conv.id] = conv.last_message_at || conv.updated_at;
        }
        initialLoadDone.current = true;
      }

      setConversations(data || []);

      // If nothing selected yet and on inbox tab, select first conversation
      if (!selectedId && data && data.length > 0 && currentTab === 'inbox') {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching CRM conversations:', err);
      // Auto-repair if database tables are missing
      if (err.message && (err.message.includes('relation') || err.message.includes('does not exist') || err.message.includes('500'))) {
        try {
          await api.initCrmTables();
          const retryData = await api.getCrmConversations({
            platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
            profile_id: selectedProfileId !== 'all' ? selectedProfileId : undefined,
            lead_status: selectedStatus !== 'all' ? selectedStatus : undefined,
            search: searchTerm.trim() ? searchTerm.trim() : undefined,
            marketplace_only: marketplaceOnly,
          });
          setConversations(retryData || []);
          if (!selectedId && retryData && retryData.length > 0) {
            setSelectedId(retryData[0].id);
          }
        } catch (repairErr) {
          console.warn('[CRM View] Auto-init fallback:', repairErr);
        }
      }
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  // Test n8n Webhook forward
  const handleTestN8nWebhook = async () => {
    setTestingWebhook(true);
    setFeedback(null);
    try {
      const res = await api.testCrmWebhook();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Webhook n8n disparado com sucesso! ' + (res.result?.status ? `(HTTP ${res.result.status})` : '')
        });
      } else {
        const hint = res.result?.response?.hint || res.result?.error || 'Verifique se o workflow está ativo no n8n.';
        setFeedback({
          type: 'error',
          message: 'Retorno do n8n: ' + hint
        });
      }
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Falha ao testar webhook: ' + err.message });
      setTimeout(() => setFeedback(null), 6000);
    } finally {
      setTestingWebhook(false);
    }
  };

  // Fetch active conversation messages
  const fetchThread = async (id: number, silent = false) => {
    if (!silent) setLoadingThread(true);
    try {
      const data = await api.getCrmConversationDetails(id);
      setActiveThread(data);
    } catch (err: any) {
      console.error('Error fetching thread:', err);
    } finally {
      if (!silent) setLoadingThread(false);
    }
  };

  // Delete a conversation / lead
  const handleDeleteConversation = async (id: number, name?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o lead "${name || 'este cliente'}" e todas as suas mensagens?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.deleteCrmConversation(id);
      setFeedback({ type: 'success', message: 'Lead excluído com sucesso do CRM!' });
      if (selectedId === id) {
        setSelectedId(null);
        setActiveThread(null);
      }
      await fetchConversations(true);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Falha ao excluir conversa: ' + err.message });
    } finally {
      setDeletingId(null);
    }
  };

  // Initial load & filter change
  useEffect(() => {
    fetchConversations();
  }, [selectedPlatform, selectedProfileId, selectedStatus, searchTerm, marketplaceOnly]);

  // Load thread when selectedId changes
  useEffect(() => {
    if (selectedId) {
      fetchThread(selectedId);
    }
  }, [selectedId]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  // Periodic polling for new messages (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchConversations(true);
      if (selectedId) {
        fetchThread(selectedId, true);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, selectedId, selectedPlatform, selectedProfileId, selectedStatus, marketplaceOnly]);

  // Send reply
  const handleSendReply = async (customText?: string) => {
    const text = (customText || replyText).trim();
    if (!text || !selectedId) return;

    setSendingReply(true);
    setFeedback(null);

    try {
      const res = await api.sendCrmReply(selectedId, text);
      setReplyText('');
      setFeedback({ type: 'success', message: res.message || 'Mensagem enviada com sucesso!' });
      await fetchThread(selectedId, true);
      await fetchConversations(true);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao despachar mensagem' });
    } finally {
      setSendingReply(false);
    }
  };

  // Update lead status
  const handleStatusChange = async (targetId: number, newStatus: string) => {
    try {
      await api.updateCrmLeadStatus(targetId, newStatus);
      if (activeThread?.conversation && activeThread.conversation.id === targetId) {
        setActiveThread({
          ...activeThread,
          conversation: { ...activeThread.conversation, lead_status: newStatus },
        });
      }
      fetchConversations(true);
    } catch (err: any) {
      console.error('Error updating status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'novo':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">Novo Lead</span>;
      case 'em_negociacao':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">Negociando</span>;
      case 'fechado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Venda Fechada</span>;
      case 'perdido':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">Perdido</span>;
      default:
        return null;
    }
  };

  // Filtered conversations with unread
  const unreadConversations = conversations.filter(c => (c.unread_count && c.unread_count > 0) || c.unread);

  // Kanban definitions
  const KANBAN_STAGES = [
    {
      id: 'novo',
      title: 'Novos Leads',
      color: 'blue',
      badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      headerGlow: 'from-blue-600/20 to-transparent',
      nextStatus: 'em_negociacao',
      nextLabel: '➜ Negociar',
    },
    {
      id: 'em_negociacao',
      title: 'Em Negociação',
      color: 'amber',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      headerGlow: 'from-amber-600/20 to-transparent',
      nextStatus: 'fechado',
      nextLabel: '✓ Fechar Venda',
      altStatus: 'perdido',
      altLabel: '✕ Perdido',
    },
    {
      id: 'fechado',
      title: 'Vendas Fechadas',
      color: 'emerald',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      headerGlow: 'from-emerald-600/20 to-transparent',
      nextStatus: 'em_negociacao',
      nextLabel: '↺ Reabrir',
    },
    {
      id: 'perdido',
      title: 'Perdidos / Desistência',
      color: 'rose',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      headerGlow: 'from-rose-600/20 to-transparent',
      nextStatus: 'novo',
      nextLabel: '↺ Reativar Lead',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden w-full max-w-full">
      {/* Top Header Controls */}
      <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-900/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left branding & view switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                CRM & Chats Omnichannel
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Webhook Ativo
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Central de Atendimento e Funil de Vendas do Marketplace & OLX
              </p>
            </div>
          </div>

          {/* View Mode Tabs (Inbox vs Kanban) */}
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setCurrentTab('inbox')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'inbox'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Inbox & Chat</span>
              {unreadConversations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] animate-pulse">
                  {unreadConversations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('kanban')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'kanban'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Funil Kanban</span>
            </button>
          </div>
        </div>

        {/* Global Filters & Polling Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Marketplace Filter Toggle (User explicitly wanted Marketplace chats) */}
          <button
            onClick={() => setMarketplaceOnly(!marketplaceOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border shadow-sm ${
              marketplaceOnly
                ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border-blue-500/50 text-blue-300 shadow-blue-500/10'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Filtrar apenas mensagens de vendas de produtos (Marketplace & OLX)"
          >
            <Store className={`h-3.5 w-3.5 ${marketplaceOnly ? 'text-blue-400' : ''}`} />
            <span>{marketplaceOnly ? '🛍️ Somente Marketplace' : '🌐 Todas as Conversas'}</span>
          </button>

          {/* Platform Filter */}
          <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${selectedPlatform === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedPlatform('facebook')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${selectedPlatform === 'facebook' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Facebook
            </button>
            <button
              onClick={() => setSelectedPlatform('olx')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${selectedPlatform === 'olx' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              OLX
            </button>
          </div>

          {/* Profile Select */}
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">Todos os Perfis</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Lead Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">Status (Todos)</option>
            <option value="novo">Novos Leads</option>
            <option value="em_negociacao">Em Negociação</option>
            <option value="fechado">Venda Fechada</option>
            <option value="perdido">Perdido</option>
          </select>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-xl border transition ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'Notificações sonoras ativas (clique para mutar)' : 'Som mutado (clique para ativar)'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Notification Center Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationCenter(!showNotificationCenter)}
              className={`p-1.5 rounded-xl border transition relative ${
                unreadConversations.length > 0
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Central de Notificações de Novas Mensagens"
            >
              <Bell className="h-4 w-4" />
              {unreadConversations.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-emerald-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  {unreadConversations.length}
                </span>
              )}
            </button>

            {/* Notification Center Dropdown */}
            {showNotificationCenter && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Central de Mensagens</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    {unreadConversations.length} não lidas
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-800/60">
                  {unreadConversations.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Tudo em dia! Nenhuma mensagem nova pendente.
                    </div>
                  ) : (
                    unreadConversations.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedId(c.id);
                          setCurrentTab('inbox');
                          setShowNotificationCenter(false);
                        }}
                        className="pt-1.5 p-2 rounded-xl hover:bg-slate-800/70 cursor-pointer transition flex items-start gap-2.5"
                      >
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0 border border-emerald-500/40">
                          {c.customer_name?.charAt(0) || 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 truncate">{c.customer_name}</span>
                            <span className="text-[9px] text-emerald-400 font-bold">Nova</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{c.last_message || 'Nova mensagem recebida'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Auto-Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Alternar sincronização automática a cada 5s"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{autoRefresh ? 'Auto 5s' : 'Pausado'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchConversations()}
            disabled={loadingList}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Atualizar agora"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Test n8n Webhook Button */}
          <button
            onClick={handleTestN8nWebhook}
            disabled={testingWebhook}
            className="px-2.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Disparar teste para o webhook do n8n"
          >
            <span>📡</span>
            <span className="hidden lg:inline">{testingWebhook ? 'Testando...' : 'Testar n8n'}</span>
          </button>

          {/* Download Extension Button */}
          <a
            href="/api/crm/extension/download"
            download="adsmanager-crm-extension.zip"
            className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Baixar Extensão Oficial (.zip)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Extensão</span>
          </a>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`mx-6 mt-2.5 p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-lg transition-all animate-fadeIn shrink-0 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN VIEW: INBOX vs KANBAN */}
      {currentTab === 'inbox' ? (
        /* INBOX & CHAT VIEW */
        <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
          {/* Left Column: Conversations List (Protected with shrink-0) */}
          <div className="w-80 md:w-96 shrink-0 flex-shrink-0 min-w-[320px] max-w-[380px] border-r border-slate-800 flex flex-col bg-slate-900/50 min-h-0 z-10">
            {/* Header with Title & Lead Count */}
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-200">
                  {marketplaceOnly ? 'Leads do Marketplace' : 'Todas as Conversas'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                  {conversations.length}
                </span>
              </div>
              <button
                onClick={() => fetchConversations()}
                disabled={loadingList}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Atualizar lista"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-slate-800/80 shrink-0">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                  placeholder="Buscar cliente, produto ou mensagem..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 transition"
                />
              </div>
            </div>

            {/* Conversations Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
              {loadingList && conversations.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                  Carregando conversas sincronizadas...
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-16 px-6 text-center space-y-4">
                  <MessageSquare className="h-10 w-10 text-slate-700 mx-auto" />
                  <div className="text-xs text-slate-300 font-semibold">Nenhuma conversa encontrada</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {marketplaceOnly
                      ? 'Nenhum lead com produto detectado no momento. Verifique se o Marketplace do Facebook está aberto no perfil.'
                      : 'Abra o Facebook Messenger ou OLX no perfil de navegador para capturar chats automaticamente!'}
                  </p>
                  {marketplaceOnly && (
                    <button
                      onClick={() => setMarketplaceOnly(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:text-white"
                    >
                      Ver todos os chats (incluindo pessoais)
                    </button>
                  )}
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = selectedId === conv.id;
                  const isUnread = (conv.unread_count && conv.unread_count > 0) || conv.unread;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition relative group cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/15 border-l-4 border-blue-500 shadow-sm'
                          : isUnread
                          ? 'bg-emerald-500/10 border-l-4 border-emerald-500 ring-1 ring-emerald-500/30'
                          : 'hover:bg-slate-800/40 border-l-4 border-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {conv.customer_avatar ? (
                          <img
                            src={conv.customer_avatar}
                            alt={conv.customer_name}
                            className={`h-11 w-11 rounded-full object-cover border ${
                              isUnread ? 'border-emerald-400 ring-2 ring-emerald-500/40' : 'border-slate-700'
                            }`}
                          />
                        ) : (
                          <div className={`h-11 w-11 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border ${
                            isUnread ? 'border-emerald-400 ring-2 ring-emerald-500/40' : 'border-slate-700'
                          }`}>
                            {conv.customer_name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                        )}
                        {/* Platform Icon Badge */}
                        <span
                          className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow ${
                            conv.platform === 'facebook' ? 'bg-blue-600' : 'bg-purple-600'
                          }`}
                        >
                          {conv.platform === 'facebook' ? 'f' : 'O'}
                        </span>
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs truncate ${isUnread ? 'font-black text-emerald-300' : 'font-bold text-slate-200'}`}>
                            {conv.customer_name}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(conv.last_message_at || conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Product Tag */}
                        {conv.product_title && (
                          <div className="text-[11px] text-blue-400 font-medium truncate flex items-center gap-1 mb-1">
                            <ShoppingBag className="h-3 w-3 shrink-0" />
                            <span className="truncate">{conv.product_title}</span>
                          </div>
                        )}

                        {/* Last Message Snippet */}
                        <p className={`text-xs truncate mb-1.5 ${isUnread ? 'font-semibold text-slate-200' : 'text-slate-400'}`}>
                          {conv.last_message || 'Nenhuma mensagem recente'}
                        </p>

                        {/* Footer tags & Unread Badge & Delete Action */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(conv.lead_status || 'novo')}
                            {conv.profile_name && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[90px]">
                                {conv.profile_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* WhatsApp-style Unread Badge */}
                            {isUnread && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] shadow-sm animate-pulse">
                                {conv.unread_count || 1}
                              </span>
                            )}

                            {/* Delete Button on Hover */}
                            <button
                              onClick={(e) => handleDeleteConversation(conv.id, conv.customer_name, e)}
                              disabled={deletingId === conv.id}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition"
                              title="Excluir lead e conversa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Center Column: Active Chat Thread (Protected with min-w-0) */}
          <div className="flex-1 min-w-0 flex flex-col bg-slate-950 min-h-0">
            {activeThread ? (
              <>
                {/* Thread Header */}
                <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 shrink-0 border border-slate-700">
                      {activeThread.conversation.customer_avatar ? (
                        <img
                          src={activeThread.conversation.customer_avatar}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        activeThread.conversation.customer_name?.charAt(0) || 'C'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-white truncate">
                          {activeThread.conversation.customer_name}
                        </h2>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
                            activeThread.conversation.platform === 'facebook' ? 'bg-blue-600' : 'bg-purple-600'
                          }`}
                        >
                          {activeThread.conversation.platform}
                        </span>
                      </div>
                      {activeThread.conversation.product_title && (
                        <p className="text-xs text-blue-400 font-medium truncate flex items-center gap-1">
                          <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{activeThread.conversation.product_title}</span>
                          {activeThread.conversation.product_price && (
                            <span className="text-emerald-400 font-bold ml-1">
                              ({activeThread.conversation.product_price})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Status Dropdown, noVNC Link & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Dropdown */}
                    <select
                      value={activeThread.conversation.lead_status || 'novo'}
                      onChange={(e) => handleStatusChange(activeThread.conversation.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="novo">Status: Novo Lead</option>
                      <option value="em_negociacao">Status: Negociando</option>
                      <option value="fechado">Status: Venda Fechada</option>
                      <option value="perdido">Status: Perdido</option>
                    </select>

                    {/* Open in Browser VNC Button */}
                    {onOpenVnc && activeThread.conversation.profile_id && (
                      <button
                        onClick={() => {
                          const targetProfile = profiles.find((p) => p.id === activeThread.conversation.profile_id);
                          if (targetProfile) onOpenVnc(targetProfile);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
                        title="Abrir navegador noVNC desta conversa"
                      >
                        <Tv className="h-3.5 w-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Abrir noVNC</span>
                      </button>
                    )}

                    {/* Delete Lead Button */}
                    <button
                      onClick={(e) => handleDeleteConversation(activeThread.conversation.id, activeThread.conversation.customer_name, e)}
                      disabled={deletingId === activeThread.conversation.id}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center gap-1 transition"
                      title="Excluir este lead e histórico"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0">
                  {loadingThread ? (
                    <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                      Carregando mensagens do chat...
                    </div>
                  ) : (() => {
                    const threadMessages = activeThread.messages && activeThread.messages.length > 0
                      ? activeThread.messages
                      : (activeThread.conversation.last_message ? [{
                          id: -1,
                          sender_type: 'customer',
                          sender_name: activeThread.conversation.customer_name,
                          content: activeThread.conversation.last_message,
                          sent_at: activeThread.conversation.last_message_at || activeThread.conversation.updated_at
                        }] : []);

                    if (threadMessages.length === 0) {
                      return (
                        <div className="py-20 text-center text-slate-600 text-xs">
                          Nenhuma mensagem registrada nesta conversa ainda.
                        </div>
                      );
                    }

                    return threadMessages.map((msg: any, index: number) => {
                      const isMe = msg.sender_type === 'me';
                      return (
                        <div
                          key={msg.id || index}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-xl ${
                            isMe ? 'ml-auto' : 'mr-auto'
                          }`}
                        >
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                              isMe
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none'
                                : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1 px-1">
                            {new Date(msg.sent_at || msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && ' • Enviado'}
                          </span>
                        </div>
                      );
                    });
                  })()}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Templates Bar */}
                <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-900/30 flex items-center gap-2 overflow-x-auto min-w-0 max-w-full shrink-0">
                  <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Respostas Rápidas:
                  </span>
                  {quickTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendReply(template)}
                      disabled={sendingReply}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] whitespace-nowrap transition border border-slate-700/50"
                    >
                      {template}
                    </button>
                  ))}
                </div>

                {/* Reply Input Bar */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-end gap-3 shrink-0">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Digite sua resposta (pressione Enter para enviar para o Facebook/OLX)..."
                    rows={2}
                    className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition resize-none placeholder:text-slate-600 font-sans"
                  />
                  <button
                    onClick={() => handleSendReply()}
                    disabled={sendingReply || !replyText.trim()}
                    className="px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-600/25 shrink-0"
                  >
                    {sendingReply ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>Enviar</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-600">
                <MessageSquare className="h-12 w-12 text-slate-700" />
                <div className="text-sm font-semibold text-slate-400">Nenhuma conversa selecionada</div>
                <p className="text-xs text-slate-500 max-w-sm">
                  Selecione um cliente na lista à esquerda para visualizar as mensagens e responder diretamente pelo painel.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Lead & Product Details */}
          {activeThread && (
            <div className="w-72 shrink-0 flex-shrink-0 min-w-[280px] border-l border-slate-800 bg-slate-900/30 p-5 overflow-y-auto space-y-6 hidden xl:block min-h-0">
              {/* Product Card */}
              {activeThread.conversation.product_title && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-blue-400" />
                    Produto Negociado
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-white line-clamp-2">
                      {activeThread.conversation.product_title}
                    </div>
                    {activeThread.conversation.product_price && (
                      <div className="text-sm font-black text-emerald-400">
                        {activeThread.conversation.product_price}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lead Info */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dados do Lead
                </span>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Nome do Cliente</span>
                    <span className="font-semibold text-slate-200">{activeThread.conversation.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Canal de Origem</span>
                    <span className="font-semibold text-blue-400 capitalize">{activeThread.conversation.platform}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Perfil no Sistema</span>
                    <span className="font-semibold text-slate-300">{activeThread.conversation.profile_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Status Atual</span>
                    <div className="mt-1">{getStatusBadge(activeThread.conversation.lead_status || 'novo')}</div>
                  </div>
                </div>
              </div>

              {/* Fast Action Buttons in Sidebar */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  onClick={(e) => handleDeleteConversation(activeThread.conversation.id, activeThread.conversation.customer_name, e)}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Excluir Lead</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="flex-1 overflow-x-auto p-6 bg-slate-950 min-h-0 flex gap-5">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = conversations.filter(
              (c) => (c.lead_status || 'novo') === stage.id
            );

            return (
              <div
                key={stage.id}
                className="w-80 shrink-0 flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl"
              >
                {/* Column Header */}
                <div className={`p-4 border-b border-slate-800/80 bg-gradient-to-b ${stage.headerGlow} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{stage.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${stage.badgeClass}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {stageLeads.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-600">
                      Nenhum lead nesta etapa
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const isUnread = (lead.unread_count && lead.unread_count > 0) || lead.unread;

                      return (
                        <div
                          key={lead.id}
                          className={`p-4 rounded-xl bg-slate-950 border transition shadow-md hover:border-slate-700 space-y-3 ${
                            isUnread ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-slate-800'
                          }`}
                        >
                          {/* Card Top: Customer & Platform */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0 border border-slate-700">
                                {lead.customer_name?.charAt(0) || 'C'}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white truncate block">
                                  {lead.customer_name}
                                </span>
                                <span className="text-[10px] text-slate-500 block capitalize">
                                  {lead.platform} • {new Date(lead.last_message_at || lead.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {isUnread && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] animate-pulse">
                                Novo
                              </span>
                            )}
                          </div>

                          {/* Product snippet */}
                          {lead.product_title && (
                            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] space-y-0.5">
                              <div className="text-blue-400 font-medium truncate flex items-center gap-1">
                                <ShoppingBag className="h-3 w-3 shrink-0" />
                                <span className="truncate">{lead.product_title}</span>
                              </div>
                              {lead.product_price && (
                                <div className="text-emerald-400 font-bold text-xs">
                                  {lead.product_price}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Last message */}
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed bg-slate-900/30 p-2 rounded-lg">
                            {lead.last_message || 'Nenhuma mensagem recente'}
                          </p>

                          {/* Fast Action Buttons Bar */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                            {/* Open Chat */}
                            <button
                              onClick={() => {
                                setSelectedId(lead.id);
                                setCurrentTab('inbox');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold flex items-center gap-1 transition"
                              title="Abrir bate-papo com este lead"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Chat</span>
                            </button>

                            {/* Move status buttons */}
                            <div className="flex items-center gap-1">
                              {stage.nextStatus && (
                                <button
                                  onClick={() => handleStatusChange(lead.id, stage.nextStatus)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition border border-slate-700"
                                  title={`Mover lead para ${stage.nextStatus}`}
                                >
                                  <span>{stage.nextLabel}</span>
                                </button>
                              )}

                              {stage.altStatus && (
                                <button
                                  onClick={() => handleStatusChange(lead.id, stage.altStatus)}
                                  className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition"
                                  title={`Marcar como ${stage.altStatus}`}
                                >
                                  <span>{stage.altLabel}</span>
                                </button>
                              )}

                              {/* Delete lead */}
                              <button
                                onClick={(e) => handleDeleteConversation(lead.id, lead.customer_name, e)}
                                disabled={deletingId === lead.id}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Excluir este lead"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
