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
  Tv
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick reply templates
  const quickTemplates = [
    'Olá! Está disponível sim, você tem interesse?',
    'Fazemos o envio hoje mesmo com código de rastreio!',
    'Qual seria a sua região/bairro para combinar a entrega?',
    'Aceitamos pagamento via PIX, Cartão ou dinheiro na entrega.',
    'Pode me passar seu WhatsApp para acertarmos os detalhes?'
  ];

  // Fetch conversation list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const data = await api.getCrmConversations({
        platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
        profile_id: selectedProfileId !== 'all' ? selectedProfileId : undefined,
        lead_status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
      });
      setConversations(data || []);

      // If nothing selected yet, select the first conversation
      if (!selectedId && data && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching CRM conversations:', err);
    } finally {
      if (!silent) setLoadingList(false);
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

  // Initial load & filter change
  useEffect(() => {
    fetchConversations();
  }, [selectedPlatform, selectedProfileId, selectedStatus]);

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
  }, [autoRefresh, selectedId, selectedPlatform, selectedProfileId, selectedStatus]);

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
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    try {
      await api.updateCrmLeadStatus(selectedId, newStatus);
      if (activeThread?.conversation) {
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
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Novo Lead</span>;
      case 'em_negociacao':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Negociando</span>;
      case 'fechado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Venda Fechada</span>;
      case 'perdido':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Perdido</span>;
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header Controls */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              CRM & Chats Omnichannel
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Webhook Ativo
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Centralize e responda mensagens do Facebook Marketplace e OLX de todos os seus navegadores em uma só tela.
            </p>
          </div>
        </div>

        {/* Global Filters & Polling Controls */}
        <div className="flex items-center gap-2">
          {/* Platform Filter */}
          <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${selectedPlatform === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedPlatform('facebook')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${selectedPlatform === 'facebook' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Facebook
            </button>
            <button
              onClick={() => setSelectedPlatform('olx')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${selectedPlatform === 'olx' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              OLX
            </button>
          </div>

          {/* Profile Select */}
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os Perfis</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Lead Status Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Status do Lead (Todos)</option>
            <option value="novo">Novo Lead</option>
            <option value="em_negociacao">Em Negociação</option>
            <option value="fechado">Venda Fechada</option>
            <option value="perdido">Perdido</option>
          </select>

          {/* Auto-Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Alternar sincronização automática (a cada 5s)"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{autoRefresh ? 'Auto 5s' : 'Pausado'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchConversations()}
            disabled={loadingList}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Atualizar conversas"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3-Column Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Conversations List */}
        <div className="w-80 md:w-96 border-r border-slate-800 flex flex-col bg-slate-900/40">
          {/* Search Box */}
          <div className="p-3 border-b border-slate-800/80">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                placeholder="Buscar por cliente ou produto..."
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
              <div className="py-16 px-6 text-center space-y-3">
                <MessageSquare className="h-10 w-10 text-slate-700 mx-auto" />
                <div className="text-xs text-slate-300 font-semibold">Nenhum chat sincronizado ainda</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Inicie um perfil de navegador e acesse suas mensagens do Facebook Marketplace ou OLX. A extensão integrada capturará automaticamente os leads e sincronizará nesta tela a cada poucos segundos!
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedId === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition relative group ${
                      isSelected
                        ? 'bg-blue-600/10 border-l-4 border-blue-500'
                        : 'hover:bg-slate-800/40 border-l-4 border-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {conv.customer_avatar ? (
                        <img
                          src={conv.customer_avatar}
                          alt={conv.customer_name}
                          className="h-11 w-11 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-700">
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
                        <span className="text-xs font-bold text-slate-200 truncate">{conv.customer_name}</span>
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
                      <p className="text-xs text-slate-400 truncate mb-1.5">
                        {conv.last_message || 'Nenhuma mensagem recente'}
                      </p>

                      {/* Footer tags */}
                      <div className="flex items-center justify-between gap-2">
                        {getStatusBadge(conv.lead_status || 'novo')}
                        {conv.profile_name && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {conv.profile_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Active Chat Thread */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4">
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
                        <span>{activeThread.conversation.product_title}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions (Lead Status & VNC Link) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Status Dropdown */}
                  <select
                    value={activeThread.conversation.lead_status || 'novo'}
                    onChange={(e) => handleStatusChange(e.target.value)}
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
                      <span>Abrir noVNC</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`mx-6 mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Messages Feed */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {loadingThread ? (
                  <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                    Carregando mensagens do chat...
                  </div>
                ) : activeThread.messages.length === 0 ? (
                  <div className="py-20 text-center text-slate-600 text-xs">
                    Nenhuma mensagem registrada nesta conversa ainda.
                  </div>
                ) : (
                  activeThread.messages.map((msg, index) => {
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
                          {new Date(msg.sent_at || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe && ' • Enviado'}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Templates Bar */}
              <div className="px-6 py-2 border-t border-slate-800/60 bg-slate-900/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
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
              <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-end gap-3">
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
                  className="px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-600/25"
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
          <div className="w-72 border-l border-slate-800 bg-slate-900/30 p-5 overflow-y-auto space-y-6 hidden lg:block">
            {/* Product Card */}
            {activeThread.conversation.product_title && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Produto Negociado
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-white line-clamp-2">
                    {activeThread.conversation.product_title}
                  </div>
                  {activeThread.conversation.product_price && (
                    <div className="text-sm font-bold text-emerald-400">
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
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
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
                  <span className="text-[10px] text-slate-500 block">Identificador Único</span>
                  <span className="font-mono text-[10px] text-slate-500 truncate block">{activeThread.conversation.external_id}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
