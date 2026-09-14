import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Settings,
  Edit3,
  Phone,
  DollarSign,
  X,
  Plus,
  ExternalLink,
  FileText,
  CheckSquare,
  Square,
  BarChart3,
  Clock,
  Users,
  Eye,
  Activity,
  Compass,
  Tag,
  Check,
  MapPin,
  User,
  Package,
  Copy,
  Image as ImageIcon,
  Layers,
  Truck,
  ArrowLeft,
  Box,
} from 'lucide-react';
import { api } from '../services/api.js';
import { BrowserProfile } from '../types/index.js';
import { SupplierInquiryModal } from '../components/SupplierInquiryModal.js';

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
  const [currentTab, setCurrentTab] = useState<'inbox' | 'kanban' | 'insights'>('inbox');
  const [kanbanMode, setKanbanMode] = useState<'board' | 'list'>('board');
  const [marketplaceOnly, setMarketplaceOnly] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);
  const [mobileShowDetails, setMobileShowDetails] = useState<boolean>(false);

  // Operational CRM States (Fase 2)
  const [statuses, setStatuses] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<number | 'all'>('all');
  const [rightPanelTab, setRightPanelTab] = useState<'RESUMO' | 'ATIVIDADES' | 'FOLLOW_UP' | 'NOTAS' | 'CATALOGO' | 'PEDIDOS'>('RESUMO');

  // Comandas / Pedidos de Venda States
  const [leadOrders, setLeadOrders] = useState<any[]>([]);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [activeOrderReceiptModal, setActiveOrderReceiptModal] = useState<any | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  const [orderForm, setOrderForm] = useState<{
    customer_name: string;
    customer_cpf: string;
    customer_email: string;
    customer_phone: string;
    delivery_address: string;
    delivery_method: 'uber_flash' | 'motoboy' | 'retirada' | 'correios' | 'outro';
    shipping_fee: number;
    discount: number;
    payment_method: 'pix' | 'cartao_vista' | 'cartao_parcelado' | 'dinheiro' | 'outro';
    installments: number;
    notes: string;
    send_whatsapp: boolean;
    origin_cep: string;
    destination_cep: string;
    package_height: number;
    package_width: number;
    package_length: number;
    package_weight: number;
    items: Array<{
      product_id: number | null;
      product_name: string;
      variant_name: string;
      quantity: number;
      unit_price: number;
    }>;
  }>({
    customer_name: '',
    customer_cpf: '',
    customer_email: '',
    customer_phone: '',
    delivery_address: '',
    delivery_method: 'uber_flash',
    shipping_fee: 0,
    discount: 0,
    payment_method: 'cartao_parcelado',
    installments: 6,
    notes: '',
    send_whatsapp: true,
    origin_cep: '30730130',
    destination_cep: '',
    package_height: 1,
    package_width: 10,
    package_length: 15,
    package_weight: 0.5,
    items: [
      { product_id: null, product_name: '', variant_name: '', quantity: 1, unit_price: 0 }
    ]
  });

  // Calculadora de Fretes (Melhor Envio) States
  const [shippingLoading, setShippingLoading] = useState<boolean>(false);
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [showShippingModal, setShowShippingModal] = useState<boolean>(false);
  const [isSupplierInquiryModalOpen, setIsSupplierInquiryModalOpen] = useState<boolean>(false);
  const [shippingModalCep, setShippingModalCep] = useState<string>('');
  const [shippingModalOrigin, setShippingModalOrigin] = useState<string>('30730130');
  const [shippingModalCustomOrigin, setShippingModalCustomOrigin] = useState<string>('');
  const [shippingModalHeight, setShippingModalHeight] = useState<number>(1);
  const [shippingModalWidth, setShippingModalWidth] = useState<number>(10);
  const [shippingModalLength, setShippingModalLength] = useState<number>(15);
  const [shippingModalWeight, setShippingModalWeight] = useState<number>(0.5);
  const [shippingModalQuotes, setShippingModalQuotes] = useState<any[]>([]);
  const [shippingModalLoading, setShippingModalLoading] = useState<boolean>(false);
  const [shippingModalError, setShippingModalError] = useState<string | null>(null);
  const [showDimensionsDrawer, setShowDimensionsDrawer] = useState<boolean>(false);

  // Omnichannel Catalog States (Fase 4)
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [selectedProductVariants, setSelectedProductVariants] = useState<Record<number, any>>({});
  const [activeMediaGallery, setActiveMediaGallery] = useState<{ product: any; media: any[] } | null>(null);
  const [copiedProductId, setCopiedProductId] = useState<number | null>(null);
  const [showFloatingCatalog, setShowFloatingCatalog] = useState<boolean>(false);

  // Lead specifics
  const [leadNotes, setLeadNotes] = useState<any[]>([]);
  const [leadFollowups, setLeadFollowups] = useState<any[]>([]);
  const [leadTimeline, setLeadTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);
  const [allFollowups, setAllFollowups] = useState<any[]>([]);

  // Modals & Popovers
  const [showFollowupModal, setShowFollowupModal] = useState<boolean>(false);
  const [followupForm, setFollowupForm] = useState({
    scheduled_at: '',
    followup_type: 'WhatsApp',
    priority: 'normal',
    notes: '',
  });
  const [showGlobalFollowupsModal, setShowGlobalFollowupsModal] = useState<boolean>(false);
  const [globalFollowupFilter, setGlobalFollowupFilter] = useState<'hoje' | 'atrasados' | 'amanha' | 'semana' | 'todos' | 'concluidos'>('hoje');
  const [showAddTagPopover, setShowAddTagPopover] = useState<boolean>(false);
  const [newTagName, setNewTagName] = useState<string>('');
  const [newTagColor, setNewTagColor] = useState<string>('#3B82F6');
  const [newNoteInput, setNewNoteInput] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);

  // Insights State
  const [insightTimeframe, setInsightTimeframe] = useState<string>('30');
  const [openingInsightTab, setOpeningInsightTab] = useState<boolean>(false);
  const [syncingExtensions, setSyncingExtensions] = useState<boolean>(false);
  const [realInsights, setRealInsights] = useState<any | null>(null);
  const [loadingInsights, setLoadingInsights] = useState<boolean>(false);

  // Lead Details / Observations Modal
  const [detailsModalLead, setDetailsModalLead] = useState<any | null>(null);
  const [modalStatus, setModalStatus] = useState<string>('novo');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalPhone, setModalPhone] = useState<string>('');
  const [modalDealValue, setModalDealValue] = useState<string>('');
  const [modalCity, setModalCity] = useState<string>('');
  const [modalState, setModalState] = useState<string>('');
  const [modalAddress, setModalAddress] = useState<string>('');
  const [modalAssignedTo, setModalAssignedTo] = useState<string>('');
  const [savingLeadDetails, setSavingLeadDetails] = useState<boolean>(false);

  // Quick reply templates with localStorage persistence
  const [quickTemplates, setQuickTemplates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_quick_templates');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      'Olá! Está disponível sim, você tem interesse?',
      'Fazemos o envio hoje mesmo com código de rastreio!',
      'Qual seria a sua região/bairro para combinar a entrega?',
      'Aceitamos pagamento via PIX, Cartão ou dinheiro na entrega.',
      'Pode me passar seu WhatsApp para acertarmos os detalhes?'
    ];
  });
  const [showQuickSettings, setShowQuickSettings] = useState<boolean>(false);
  const [newTemplateInput, setNewTemplateInput] = useState<string>('');

  // WhatsApp Evolution Sync
  const [syncingWhatsApp, setSyncingWhatsApp] = useState<boolean>(false);

  // Bulk Selection (Seletor em Massa)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  // Mobile Kanban active stage tab
  const [activeMobileStage, setActiveMobileStage] = useState<string>('novo');

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenMessageSignaturesRef = useRef<Record<number, string>>({});
  const initialLoadDone = useRef(false);
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

  // Helper to ensure 100% unique clients/leads in UI strictly sorted by last message time
  const deduplicateConversations = (list: any[]): any[] => {
    if (!list || !Array.isArray(list)) return [];
    const map = new Map<string, any>();

    for (const conv of list) {
      const name = (conv.customer_name || '').trim();
      const lower = name.toLowerCase();
      if (
        !name ||
        name === 'Cliente Atual' ||
        lower.includes('parece que publicaste') ||
        lower.includes('pedido de mensagem') ||
        lower === 'ativo agora'
      ) {
        continue;
      }

      const isGeneric = ['cliente', 'cliente facebook', 'cliente atual'].includes(lower);
      const key = (!isGeneric && lower.length >= 3)
        ? `${conv.platform || 'facebook'}_${lower}`
        : `${conv.platform || 'facebook'}_${conv.external_id}`;

      if (!map.has(key)) {
        map.set(key, conv);
      } else {
        const existing = map.get(key);
        const preferCurrent = (!existing.product_title && conv.product_title) ||
          (new Date(conv.last_message_at || conv.updated_at || 0).getTime() > new Date(existing.last_message_at || existing.updated_at || 0).getTime());

        if (preferCurrent) {
          map.set(key, { ...existing, ...conv });
        }
      }
    }

    const result = Array.from(map.values());

    // ORDENAÇÃO ESTRITA: O chat mais recente fica no topo absoluto, os antigos no fim
    result.sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.updated_at || 0).getTime();
      const timeB = new Date(b.last_message_at || b.updated_at || 0).getTime();
      return timeB - timeA;
    });

    return result;
  };

  // Fetch conversation list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const rawData = await api.getCrmConversations({
        platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
        profile_id: selectedProfileId !== 'all' ? selectedProfileId : undefined,
        lead_status: selectedStatus !== 'all' ? selectedStatus : undefined,
        tag_id: selectedTagFilter !== 'all' ? selectedTagFilter : undefined,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
        marketplace_only: marketplaceOnly,
      });

      const data = deduplicateConversations(rawData || []);

      // Realtime notification detection (dispara apenas quando a mensagem mudar de fato e não for enviada por mim)
      if (initialLoadDone.current && data && Array.isArray(data)) {
        let hasNewIncoming = false;
        for (const conv of data) {
          const prevMsg = seenMessageSignaturesRef.current[conv.id];
          const currMsg = (conv.last_message || '').trim();
          if (prevMsg !== undefined && currMsg && currMsg !== prevMsg) {
            // Verificar se não foi enviada por mim mesmo
            const lower = currMsg.toLowerCase();
            if (
              conv.id !== selectedId &&
              !lower.startsWith('tu:') &&
              !lower.startsWith('você:') &&
              !lower.startsWith('atendente:')
            ) {
              hasNewIncoming = true;
            }
          }
        }
        if (hasNewIncoming) {
          playNotificationSound();
          setFeedback({
            type: 'success',
            message: 'Nova mensagem de cliente recebida!',
          });
          setTimeout(() => setFeedback(null), 4000);
        }
      }

      // Gravar assinaturas atuais das mensagens
      if (data && Array.isArray(data)) {
        for (const conv of data) {
          seenMessageSignaturesRef.current[conv.id] = (conv.last_message || '').trim();
        }
        initialLoadDone.current = true;
      }

      setConversations(data);

      // If nothing selected yet and on inbox tab, select first conversation (desktop only >= 1024px)
      if (!selectedId && data && data.length > 0 && currentTab === 'inbox') {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setSelectedId(data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching CRM conversations:', err);
      // Auto-repair if database tables are missing
      if (err.message && (err.message.includes('relation') || err.message.includes('does not exist') || err.message.includes('500'))) {
        try {
          await api.initCrmTables();
          const retryRaw = await api.getCrmConversations({
            platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
            profile_id: selectedProfileId !== 'all' ? selectedProfileId : undefined,
            lead_status: selectedStatus !== 'all' ? selectedStatus : undefined,
            search: searchTerm.trim() ? searchTerm.trim() : undefined,
            marketplace_only: marketplaceOnly,
          });
          const retryData = deduplicateConversations(retryRaw || []);
          setConversations(retryData);
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

  // Open lead details modal
  const openLeadDetails = (lead: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDetailsModalLead(lead);
    setModalStatus(lead.lead_status || 'novo');
    setModalNotes(lead.notes || '');
    setModalPhone(lead.customer_phone || '');
    setModalDealValue(lead.deal_value || '');
    setModalCity(lead.customer_city || '');
    setModalState(lead.customer_state || '');
    setModalAddress(lead.customer_address || '');
    setModalAssignedTo(lead.customer_assigned_to || '');
  };

  // Save lead details (Status, Notes, Phone, Deal Value, Location)
  const handleSaveLeadDetails = async () => {
    if (!detailsModalLead) return;
    setSavingLeadDetails(true);
    try {
      await api.updateCrmLeadStatus(
        detailsModalLead.id,
        modalStatus,
        modalNotes,
        modalPhone,
        modalDealValue,
        modalCity,
        modalState,
        modalAddress,
        modalAssignedTo
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === detailsModalLead.id
            ? {
                ...c,
                lead_status: modalStatus,
                notes: modalNotes,
                customer_phone: modalPhone,
                deal_value: modalDealValue,
                customer_city: modalCity,
                customer_state: modalState,
                customer_address: modalAddress,
                customer_assigned_to: modalAssignedTo,
              }
            : c
        )
      );
      if (activeThread && activeThread.conversation.id === detailsModalLead.id) {
        setActiveThread({
          ...activeThread,
          conversation: {
            ...activeThread.conversation,
            lead_status: modalStatus,
            notes: modalNotes,
            customer_phone: modalPhone,
            deal_value: modalDealValue,
            customer_city: modalCity,
            customer_state: modalState,
            customer_address: modalAddress,
            customer_assigned_to: modalAssignedTo,
          },
        });
      }
      setFeedback({ type: 'success', message: 'Detalhes do lead salvos com sucesso!' });
      setTimeout(() => setFeedback(null), 3000);
      setDetailsModalLead(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Falha ao salvar detalhes: ' + err.message });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSavingLeadDetails(false);
    }
  };

  // Manage quick reply templates
  const handleAddTemplate = () => {
    const trimmed = newTemplateInput.trim();
    if (!trimmed) return;
    const updated = [...quickTemplates, trimmed];
    setQuickTemplates(updated);
    try {
      localStorage.setItem('crm_quick_templates', JSON.stringify(updated));
    } catch (e) {}
    setNewTemplateInput('');
  };

  const handleDeleteTemplate = (index: number) => {
    const updated = quickTemplates.filter((_, i) => i !== index);
    setQuickTemplates(updated);
    try {
      localStorage.setItem('crm_quick_templates', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleResetTemplates = () => {
    const defaults = [
      'Olá! Está disponível sim, você tem interesse?',
      'Fazemos o envio hoje mesmo com código de rastreio!',
      'Qual seria a sua região/bairro para combinar a entrega?',
      'Aceitamos pagamento via PIX, Cartão ou dinheiro na entrega.',
      'Pode me passar seu WhatsApp para acertarmos os detalhes?'
    ];
    setQuickTemplates(defaults);
    try {
      localStorage.setItem('crm_quick_templates', JSON.stringify(defaults));
    } catch (e) {}
  };

  // Fetch active conversation messages & operational CRM data
  const fetchThread = async (id: number, silent = false) => {
    if (!silent) setLoadingThread(true);
    try {
      const data = await api.getCrmConversationDetails(id);
      setActiveThread(data);

      // Carregar notas, follow-ups, timeline e pedidos da conversa
      const [notes, followups, timeline, orders] = await Promise.all([
        api.getCrmLeadNotes(id).catch(() => []),
        api.getCrmLeadFollowups(id).catch(() => []),
        api.getCrmLeadTimeline(id).catch(() => []),
        api.getCrmOrders({ conversation_id: id }).catch(() => [])
      ]);
      setLeadNotes(notes || []);
      setLeadFollowups(followups || []);
      setLeadTimeline(timeline || []);
      setLeadOrders(orders || []);
    } catch (err: any) {
      console.error('Error fetching thread:', err);
    } finally {
      if (!silent) setLoadingThread(false);
    }
  };

  // ==========================================
  // OPERATIONAL CRM HANDLERS (Fase 2)
  // ==========================================

  const fetchOperationalData = async () => {
    try {
      const [stList, tgList, flList] = await Promise.all([
        api.getCrmStatuses().catch(() => []),
        api.getCrmTags().catch(() => []),
        api.getCrmFollowups().catch(() => [])
      ]);
      if (stList && Array.isArray(stList)) setStatuses(stList);
      if (tgList && Array.isArray(tgList)) setAvailableTags(tgList);
      if (flList && Array.isArray(flList)) setAllFollowups(flList);
    } catch (e) {
      console.warn('Erro ao carregar dados operacionais:', e);
    }
  };

  useEffect(() => {
    fetchOperationalData();
  }, []);

  const handleAddLeadTag = async (tagId: number) => {
    if (!activeThread?.conversation?.id) return;
    try {
      await api.addCrmLeadTag(activeThread.conversation.id, tagId);
      const tagObj = availableTags.find(t => t.id === tagId);
      if (tagObj) {
        const currentTags = activeThread.conversation.tags || [];
        if (!currentTags.some((t: any) => t.id === tagId)) {
          const updatedTags = [...currentTags, tagObj];
          setActiveThread({
            ...activeThread,
            conversation: { ...activeThread.conversation, tags: updatedTags }
          });
          setConversations(prev => prev.map(c => c.id === activeThread.conversation.id ? { ...c, tags: updatedTags } : c));
        }
      }
      const tl = await api.getCrmLeadTimeline(activeThread.conversation.id);
      setLeadTimeline(tl || []);
      setShowAddTagPopover(false);
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Erro ao adicionar tag: ' + e.message });
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!newTagName.trim() || !activeThread?.conversation?.id) return;
    try {
      const createdTag = await api.createCrmTag(newTagName.trim(), newTagColor);
      setAvailableTags(prev => [...prev.filter(t => t.id !== createdTag.id), createdTag]);
      await handleAddLeadTag(createdTag.id);
      setNewTagName('');
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Erro ao criar tag: ' + e.message });
    }
  };

  const handleRemoveLeadTag = async (tagId: number) => {
    if (!activeThread?.conversation?.id) return;
    try {
      await api.removeCrmLeadTag(activeThread.conversation.id, tagId);
      const updatedTags = (activeThread.conversation.tags || []).filter((t: any) => t.id !== tagId);
      setActiveThread({
        ...activeThread,
        conversation: { ...activeThread.conversation, tags: updatedTags }
      });
      setConversations(prev => prev.map(c => c.id === activeThread.conversation.id ? { ...c, tags: updatedTags } : c));
      const tl = await api.getCrmLeadTimeline(activeThread.conversation.id);
      setLeadTimeline(tl || []);
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Erro ao remover tag: ' + e.message });
    }
  };

  const handleCreateLeadNote = async () => {
    if (!newNoteInput.trim() || !activeThread?.conversation?.id) return;
    setSavingNote(true);
    try {
      const note = await api.createCrmLeadNote(activeThread.conversation.id, newNoteInput.trim(), 'Atendente');
      setLeadNotes(prev => [note, ...prev]);
      setNewNoteInput('');
      const tl = await api.getCrmLeadTimeline(activeThread.conversation.id);
      setLeadTimeline(tl || []);
      setFeedback({ type: 'success', message: 'Nota interna adicionada!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Erro ao criar nota: ' + e.message });
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteLeadNote = async (noteId: number) => {
    try {
      await api.deleteCrmLeadNote(noteId);
      setLeadNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Erro ao excluir nota: ' + e.message });
    }
  };

  const handleCreateFollowup = async () => {
    if (!activeThread?.conversation?.id || !followupForm.scheduled_at) {
      setFeedback({ type: 'error', message: 'Defina a data e horário do follow-up.' });
      return;
    }
    try {
      const fl = await api.createCrmFollowup(activeThread.conversation.id, {
        profile_id: activeThread.conversation.profile_id || 0,
        scheduled_at: followupForm.scheduled_at,
        followup_type: followupForm.followup_type,
        priority: followupForm.priority,
        notes: followupForm.notes,
        assignee: 'Operador'
      });
      setLeadFollowups(prev => [...prev, fl]);
      setAllFollowups(prev => [...prev, fl]);
      setShowFollowupModal(false);
      setFollowupForm({ scheduled_at: '', followup_type: 'WhatsApp', priority: 'normal', notes: '' });

      setActiveThread({
        ...activeThread,
        conversation: { ...activeThread.conversation, next_followup: fl }
      });
      setConversations(prev => prev.map(c => c.id === activeThread.conversation.id ? { ...c, next_followup: fl } : c));

      const tl = await api.getCrmLeadTimeline(activeThread.conversation.id);
      setLeadTimeline(tl || []);
      setFeedback({ type: 'success', message: 'Follow-up agendado com sucesso!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Erro ao agendar follow-up: ' + e.message });
    }
  };

  const handleCompleteFollowup = async (followupId: number) => {
    try {
      await api.updateCrmFollowup(followupId, { status: 'completed' });
      setLeadFollowups(prev => prev.map(f => f.id === followupId ? { ...f, status: 'completed', completed_at: new Date() } : f));
      setAllFollowups(prev => prev.map(f => f.id === followupId ? { ...f, status: 'completed', completed_at: new Date() } : f));
      if (activeThread?.conversation?.id) {
        const tl = await api.getCrmLeadTimeline(activeThread.conversation.id);
        setLeadTimeline(tl || []);
      }
      setFeedback({ type: 'success', message: 'Follow-up concluído!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Erro ao concluir follow-up: ' + e.message });
    }
  };

  const handleDeleteFollowup = async (followupId: number) => {
    try {
      await api.deleteCrmFollowup(followupId);
      setLeadFollowups(prev => prev.filter(f => f.id !== followupId));
      setAllFollowups(prev => prev.filter(f => f.id !== followupId));
    } catch (e: any) {
      setFeedback({ type: 'error', message: 'Erro ao excluir follow-up: ' + e.message });
    }
  };

  const setQuickFollowupDate = (daysFromNow: number, hours = 14, minutes = 30) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hours, minutes, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    setFollowupForm(prev => ({ ...prev, scheduled_at: localISOTime }));
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
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setActiveThread(null);
      }
      setFeedback({ type: 'success', message: 'Lead excluído com sucesso do CRM!' });
      await fetchConversations(true);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Falha ao excluir conversa: ' + err.message });
    } finally {
      setDeletingId(null);
    }
  };

  // WhatsApp Evolution Sync Handler
  const handleSyncWhatsApp = async () => {
    setSyncingWhatsApp(true);
    setFeedback(null);
    try {
      const res = await api.syncEvolutionWhatsApp();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `WhatsApp sincronizado com sucesso! ${res.stats?.count || 0} conversas mapeadas.`,
        });
        await fetchConversations(true);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Falha ao sincronizar WhatsApp' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao conectar à Evolution API: ' + err.message });
    } finally {
      setSyncingWhatsApp(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Bulk Actions Handlers
  const handleToggleSelect = (id: number, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === conversations.length && conversations.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(conversations.map((c) => c.id));
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await api.bulkUpdateCrmStatus(selectedIds, status);
      setFeedback({
        type: 'success',
        message: `${res.updated_count} leads atualizados para "${status}" com sucesso!`,
      });
      setConversations((prev) =>
        prev.map((c) => (selectedIds.includes(c.id) ? { ...c, lead_status: status } : c))
      );
      setSelectedIds([]);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Falha na atualização em massa: ' + err.message });
    } finally {
      setBulkLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir permanentemente ${selectedIds.length} leads selecionados e todas as suas mensagens?`
      )
    ) {
      return;
    }
    setBulkLoading(true);
    try {
      const res = await api.bulkDeleteCrmConversations(selectedIds);
      setFeedback({
        type: 'success',
        message: `${res.deleted_count} conversas excluídas com sucesso!`,
      });
      setConversations((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
      if (selectedId && selectedIds.includes(selectedId)) {
        setSelectedId(null);
        setActiveThread(null);
      }
      setSelectedIds([]);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Falha na exclusão em massa: ' + err.message });
    } finally {
      setBulkLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };


  // Initial load & filter change
  useEffect(() => {
    fetchConversations();
  }, [selectedPlatform, selectedProfileId, selectedStatus, selectedTagFilter, searchTerm, marketplaceOnly]);

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

  // Periodic polling for new messages (every 5 seconds) + automatic WhatsApp sync
  useEffect(() => {
    if (!autoRefresh) return;
    let ticks = 0;
    const timer = setInterval(() => {
      fetchConversations(true);
      if (selectedId) {
        fetchThread(selectedId, true);
      }
      ticks++;
      // A cada 15s (a cada 3 ciclos de 5s), executa sincronização silenciosa com WhatsApp
      if (ticks % 3 === 0) {
        api.syncEvolutionWhatsApp().catch(() => {});
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, selectedId, selectedPlatform, selectedProfileId, selectedStatus, selectedTagFilter, marketplaceOnly]);

  // Fetch real Instagram Insights
  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const pId = selectedProfileId !== 'all' ? selectedProfileId : undefined;
      const res = await api.getCrmInsights(parseInt(insightTimeframe, 10), pId);
      if (res && res.data) {
        setRealInsights(res.data);
      }
    } catch (e) {
      console.warn('Erro ao carregar insights:', e);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [insightTimeframe, selectedProfileId]);

  // Omnichannel Catalog Fetcher & Helpers (Fase 4)
  const fetchCatalogData = async () => {
    try {
      setLoadingCatalog(true);
      const [prodsRes, cats] = await Promise.all([
        api.getCatalogProducts({ limit: 100 }).catch(() => ({ products: [] })),
        api.getCatalogCategories().catch(() => []),
      ]);
      setCatalogProducts(prodsRes.products || []);
      setCatalogCategories(cats || []);
    } catch (err) {
      console.warn('Erro ao carregar catálogo para o CRM:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const generateProductPitch = (product: any, variant?: any) => {
    const vName = variant ? ` (${variant.name})` : '';
    const vPrice = variant && variant.price ? Number(variant.price) : Number(product.price);
    const promo = !variant && product.promotional_price ? Number(product.promotional_price) : null;

    let text = `✨ *${product.name}${vName}*\n`;
    if (product.brand) text += `Marca: *${product.brand}*\n`;
    if (product.description) text += `\n${product.description}\n`;

    if (promo && promo < vPrice) {
      text += `\n💰 De ~R$ ${vPrice.toFixed(2).replace('.', ',')}~ por apenas *R$ ${promo.toFixed(2).replace('.', ',')}*!`;
    } else {
      text += `\n💰 Valor: *R$ ${vPrice.toFixed(2).replace('.', ',')}*`;
    }

    text += `\n📦 Pronta entrega com envio rápido!`;

    const catLink = product.whatsapp_catalog_link || product.whatsapp_link || product.catalog_url;
    if (catLink && String(catLink).trim()) {
      text += `\n\n📲 *Ver no Catálogo WhatsApp:*\n${String(catLink).trim()}`;
    }

    text += `\n\nComo prefere efetuar o pagamento: Pix ou Cartão?`;
    return text;
  };

  const handleInsertProductPitch = (product: any, variant?: any, sendDirect = false) => {
    const pitch = generateProductPitch(product, variant);
    if (sendDirect) {
      const imgToSend = product.main_image || product.image_url || (product.media && product.media[0]?.url);
      handleSendReply(pitch, imgToSend || undefined);
    } else {
      setReplyText(pitch);
      setFeedback({ type: 'success', message: `Proposta de "${product.name}" inserida no campo de resposta!` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSendProductPhoto = async (product: any, imageUrl?: string) => {
    const imgToSend = imageUrl || product.main_image || product.image_url || (product.media && product.media[0]?.url);
    if (!imgToSend) {
      setFeedback({ type: 'error', message: 'Este produto não possui imagem para envio.' });
      return;
    }
    if (!selectedId) return;

    setSendingReply(true);
    try {
      const priceVal = product.promotional_price || product.price || 0;
      const caption = `✨ *${product.name}* - R$ ${Number(priceVal).toFixed(2).replace('.', ',')}`;
      const res = await api.sendCrmReply(selectedId, caption, imgToSend);
      setFeedback({ type: 'success', message: res.message || 'Foto do produto enviada com sucesso!' });
      await fetchThread(selectedId, true);
      await fetchConversations(true);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao enviar foto no chat' });
    } finally {
      setSendingReply(false);
    }
  };

  const handleCopyProductInfo = (product: any, variant?: any) => {
    const pitch = generateProductPitch(product, variant);
    navigator.clipboard.writeText(pitch);
    setCopiedProductId(product.id);
    setFeedback({ type: 'success', message: `Texto comercial de "${product.name}" copiado!` });
    setTimeout(() => {
      setCopiedProductId(null);
      setFeedback(null);
    }, 2500);
  };

  // Send reply (supporting text and optional media attachment)
  const handleSendReply = async (customText?: string, customMediaUrl?: string) => {
    const text = (customText !== undefined ? customText : replyText).trim();
    if ((!text && !customMediaUrl) || !selectedId) return;

    setSendingReply(true);
    setFeedback(null);

    try {
      const res = await api.sendCrmReply(selectedId, text, customMediaUrl);
      if (customText === undefined && !customMediaUrl) setReplyText('');
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

  // Filtered catalog products for chat integration
  const filteredChatCatalogProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      if (catalogSearch.trim()) {
        const term = catalogSearch.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(term);
        const matchesSku = p.sku?.toLowerCase().includes(term);
        const matchesBrand = p.brand?.toLowerCase().includes(term);
        if (!matchesName && !matchesSku && !matchesBrand) return false;
      }
      if (catalogCategoryFilter !== 'all') {
        if (String(p.category_id) !== String(catalogCategoryFilter)) return false;
      }
      return true;
    });
  }, [catalogProducts, catalogSearch, catalogCategoryFilter]);

  // ==========================================
  // COMANDAS & PEDIDOS DE VENDA HANDLERS
  // ==========================================

  const handleOpenCreateOrder = (presetProduct?: any) => {
    if (!activeThread?.conversation) return;
    const conv = activeThread.conversation;

    let initialItem = {
      product_id: null as number | null,
      product_name: '',
      variant_name: '',
      quantity: 1,
      unit_price: 0
    };

    if (presetProduct) {
      initialItem = {
        product_id: presetProduct.id,
        product_name: presetProduct.name,
        variant_name: '',
        quantity: 1,
        unit_price: Number(presetProduct.promotional_price || presetProduct.price || 0)
      };
    } else if (conv.product_title) {
      const priceNum = conv.product_price ? parseFloat(String(conv.product_price).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0 : 0;
      initialItem = {
        product_id: null,
        product_name: conv.product_title,
        variant_name: '',
        quantity: 1,
        unit_price: priceNum
      };
    }

    const fullAddress = [conv.customer_address, conv.customer_city, conv.customer_state].filter(Boolean).join(' - ');
    const cepMatch = fullAddress.match(/\b\d{5}-?\d{3}\b/);
    const detectedCep = cepMatch ? cepMatch[0].replace(/\D/g, '') : '';

    setOrderForm({
      customer_name: conv.customer_name || '',
      customer_cpf: conv.custom_fields?.cpf || '',
      customer_email: conv.customer_email || '',
      customer_phone: conv.customer_phone || '',
      delivery_address: fullAddress,
      delivery_method: 'uber_flash',
      shipping_fee: 0,
      discount: 0,
      payment_method: 'cartao_parcelado',
      installments: 6,
      notes: '',
      send_whatsapp: true,
      origin_cep: '30730130',
      destination_cep: detectedCep,
      package_height: 1,
      package_width: 10,
      package_length: 15,
      package_weight: 0.5,
      items: [initialItem]
    });

    setShippingQuotes([]);
    setShippingError(null);
    setShowOrderModal(true);
  };

  const handleAddOrderItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { product_id: null, product_name: '', variant_name: '', quantity: 1, unit_price: 0 }
      ]
    }));
  };

  const handleRemoveOrderItem = (index: number) => {
    if (orderForm.items.length <= 1) return;
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateOrderItem = (index: number, field: string, value: any) => {
    setOrderForm(prev => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const handleSelectCatalogForOrderItem = (index: number, product: any) => {
    const priceVal = Number(product.promotional_price || product.price || 0);
    setOrderForm(prev => {
      const nextItems = [...prev.items];
      nextItems[index] = {
        ...nextItems[index],
        product_id: product.id,
        product_name: product.name,
        unit_price: priceVal
      };
      return { ...prev, items: nextItems };
    });
  };

  const orderSubtotal = useMemo(() => {
    return orderForm.items.reduce((acc, item) => acc + (Number(item.quantity || 1) * Number(item.unit_price || 0)), 0);
  }, [orderForm.items]);

  const orderTotalAmount = useMemo(() => {
    const total = orderSubtotal + Number(orderForm.shipping_fee || 0) - Number(orderForm.discount || 0);
    return Math.max(0, total);
  }, [orderSubtotal, orderForm.shipping_fee, orderForm.discount]);

  const handleSaveOrder = async () => {
    if (!orderForm.customer_name.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, informe o nome do cliente' });
      return;
    }
    const validItems = orderForm.items.filter(it => it.product_name.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      setFeedback({ type: 'error', message: 'Adicione ao menos 1 produto válido à comanda' });
      return;
    }

    setOrderSubmitting(true);
    setFeedback(null);

    try {
      const payload: any = {
        conversation_id: selectedId || undefined,
        customer_name: orderForm.customer_name.trim(),
        customer_cpf: orderForm.customer_cpf.trim(),
        customer_email: orderForm.customer_email.trim(),
        customer_phone: orderForm.customer_phone.trim(),
        delivery_address: orderForm.delivery_address.trim(),
        delivery_method: orderForm.delivery_method,
        shipping_fee: Number(orderForm.shipping_fee) || 0,
        discount: Number(orderForm.discount) || 0,
        payment_method: orderForm.payment_method,
        installments: Number(orderForm.installments) || 1,
        notes: orderForm.notes.trim(),
        send_whatsapp: orderForm.send_whatsapp,
        items: validItems.map(it => ({
          product_id: it.product_id || undefined,
          product_name: it.product_name.trim(),
          variant_name: it.variant_name?.trim() || undefined,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0
        }))
      };

      const result = await api.createCrmOrder(payload);
      setFeedback({ 
        type: 'success', 
        message: `Comanda ${result.order?.order_code || ''} gerada com sucesso! ${orderForm.send_whatsapp ? 'Recibo oficial disparado no WhatsApp.' : ''}` 
      });

      setShowOrderModal(false);
      setRightPanelTab('PEDIDOS');

      if (selectedId) {
        await fetchThread(selectedId, true);
        await fetchConversations(true);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao gerar comanda de venda' });
    } finally {
      setOrderSubmitting(false);
    }
  };

  const generateReceiptText = (order: any) => {
    const d = new Date(order.created_at || Date.now());
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const day = String(d.getDate()).padStart(2, '0');
    const month = monthNames[d.getMonth()] || String(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    let paymentLabel = 'Pix';
    if (order.payment_method === 'cartao_vista') paymentLabel = 'Cartão de Crédito à vista';
    else if (order.payment_method === 'cartao_parcelado') {
      const inst = order.installments || 1;
      const val = order.installment_amount ? ` (R$ ${Number(order.installment_amount).toFixed(2).replace('.', ',')}/mês)` : '';
      paymentLabel = `Cartão de Crédito em ${inst}x${val}`;
    } else if (order.payment_method === 'dinheiro') paymentLabel = 'Dinheiro';

    let deliveryLabel = 'Retirada Pessoalmente (Loja)';
    if (order.delivery_method === 'uber_flash') deliveryLabel = 'Uber Flash';
    else if (order.delivery_method === 'motoboy') deliveryLabel = 'Motoboy (Entrega Expressa)';
    else if (order.delivery_method === 'correios') deliveryLabel = 'Correios / Transportadora';

    let itemsText = '';
    if (order.items && order.items.length > 0) {
      itemsText = order.items.map((it: any) => {
        const vText = it.variant_name ? ` (*${it.variant_name}*)` : '';
        const priceFmt = `R$ ${Number(it.unit_price).toFixed(2).replace('.', ',')}`;
        return `📦 *${it.quantity}x ${it.product_name}*${vText}\n    Valor: ${priceFmt}`;
      }).join('\n\n');
    } else {
      itemsText = '📦 *1x Produto Diversos*\n    Valor: R$ ' + Number(order.total_amount).toFixed(2).replace('.', ',');
    }

    const freteText = order.shipping_fee > 0 ? `\n\n🚚 *Frete:* R$ ${Number(order.shipping_fee).toFixed(2).replace('.', ',')}` : '';

    return `🧾 *RECIBO DE VENDA E GARANTIA* 🧾

📅 *Data:* ${day}/${month}/${year} às ${hours}:${minutes}
🔢 *Código da Venda:* #${order.order_code}

🏢 *Expedido por:* Snack Store BH - Eletronics & Smartwatch's
📄 *CNPJ:* 32.404.968/0001-70 - Belo Horizonte/MG

👤 *DADOS DO CLIENTE*
*Nome:* ${order.customer_name || 'Cliente'}
*CPF:* ${order.customer_cpf || 'Não informado'}
*Telefone:* ${order.customer_phone || 'Não informado'}
*Endereço:* ${order.delivery_address || 'Retirada no Balcão'}

🛒 *PRODUTOS*
${itemsText}${freteText}

💰 *RESUMO DO PEDIDO*
*Total:* R$ ${Number(order.total_amount).toFixed(2).replace('.', ',')}
*Pagamento:* ${paymentLabel}
*Entrega:* ${deliveryLabel}

✨ *Agradecemos a preferência!*
Este é o seu recibo oficial de garantia e autenticidade.

📱 *Instagram:* @SNACKSTOREBH`;
  };

  const handleCopyReceiptToClipboard = (order: any) => {
    const text = generateReceiptText(order);
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setFeedback({ type: 'success', message: 'Recibo oficial copiado para a área de transferência!' });
    setTimeout(() => {
      setCopiedReceipt(false);
      setFeedback(null);
    }, 3000);
  };

  const handleResendReceiptWhatsApp = async (order: any) => {
    if (!selectedId) return;
    const text = generateReceiptText(order);
    await handleSendReply(text);
    setFeedback({ type: 'success', message: 'Recibo reenviado no WhatsApp com sucesso!' });
  };

  const handleDeleteOrder = async (orderId: number, orderCode: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a comanda #${orderCode}? Esta ação também removerá o lançamento do Controle Financeiro.`)) {
      return;
    }
    try {
      await api.deleteCrmOrder(orderId);
      setLeadOrders(prev => prev.filter(o => o.id !== orderId));
      setFeedback({ type: 'success', message: `Comanda #${orderCode} excluída com sucesso!` });
      if (selectedId) {
        const tl = await api.getCrmLeadTimeline(selectedId).catch(() => []);
        setLeadTimeline(tl || []);
        await fetchThread(selectedId, true);
        await fetchConversations(true);
      }
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao excluir comanda: ' + err.message });
    }
  };

  // ==========================================
  // MELHOR ENVIO / CÁLCULO DE FRETE HANDLERS
  // ==========================================

  const handleCalculateOrderShipping = async () => {
    let cepDestino = (orderForm.destination_cep || '').replace(/\D/g, '');
    if (!cepDestino) {
      const match = (orderForm.delivery_address || '').match(/\b\d{5}-?\d{3}\b/);
      if (match) {
        cepDestino = match[0].replace(/\D/g, '');
        setOrderForm(prev => ({ ...prev, destination_cep: cepDestino }));
      }
    }

    if (!cepDestino || cepDestino.length !== 8) {
      setShippingError('Informe um CEP de destino válido com 8 dígitos para calcular o frete');
      return;
    }

    setShippingLoading(true);
    setShippingError(null);

    try {
      const res = await api.calculateShipping({
        from_postal_code: orderForm.origin_cep || '30730130',
        to_postal_code: cepDestino,
        default_dimensions: {
          height: Number(orderForm.package_height) || 1,
          width: Number(orderForm.package_width) || 10,
          length: Number(orderForm.package_length) || 15,
          weight: Number(orderForm.package_weight) || 0.5,
        },
        products: orderForm.items.map((it, idx) => ({
          id: `item-${idx + 1}`,
          name: it.product_name || 'Produto',
          width: Number(orderForm.package_width) || 10,
          height: Number(orderForm.package_height) || 1,
          length: Number(orderForm.package_length) || 15,
          weight: Number(orderForm.package_weight) || 0.5,
          insurance_value: Math.max(10, it.unit_price || 50),
          quantity: Math.max(1, it.quantity || 1)
        }))
      });

      if (res.quotes && res.quotes.length > 0) {
        setShippingQuotes(res.quotes);
      } else {
        setShippingQuotes([]);
        setShippingError('Nenhuma opção de frete disponível para este CEP no momento.');
      }
    } catch (err: any) {
      setShippingError(err.message || 'Falha ao calcular frete no Melhor Envio');
      setShippingQuotes([]);
    } finally {
      setShippingLoading(false);
    }
  };

  const handleApplyShippingQuote = (quote: any) => {
    const isCorreios = quote.company?.name?.toLowerCase().includes('correios');
    const method = isCorreios ? 'correios' : 'outro';
    const carrierName = `${quote.company?.name} (${quote.name})`;
    setOrderForm(prev => ({
      ...prev,
      shipping_fee: Number(quote.custom_price || quote.price || 0),
      delivery_method: method,
      notes: prev.notes ? `${prev.notes} | Frete: ${carrierName}` : `Frete via ${carrierName} (Prazo: ${quote.custom_delivery_time} dias úteis)`
    }));
    setFeedback({
      type: 'success',
      message: `Frete ${carrierName} de R$ ${Number(quote.custom_price).toFixed(2).replace('.', ',')} aplicado com sucesso!`
    });
  };

  const handleOpenShippingQuickModal = () => {
    if (!activeThread?.conversation) return;
    const conv = activeThread.conversation;
    const addr = [conv.customer_address, conv.customer_city, conv.customer_state].filter(Boolean).join(' ');
    const match = addr.match(/\b\d{5}-?\d{3}\b/);
    const cep = match ? match[0].replace(/\D/g, '') : '';
    setShippingModalCep(cep);
    setShippingModalOrigin('30730130');
    setShippingModalCustomOrigin('');
    setShippingModalHeight(1);
    setShippingModalWidth(10);
    setShippingModalLength(15);
    setShippingModalWeight(0.5);
    setShippingModalQuotes([]);
    setShippingModalError(null);
    setShowShippingModal(true);
  };

  const handleCalculateModalShipping = async () => {
    const cepDestino = (shippingModalCep || '').replace(/\D/g, '');
    if (!cepDestino || cepDestino.length !== 8) {
      setShippingModalError('Informe um CEP de destino válido com 8 dígitos');
      return;
    }

    const cepOrigem = shippingModalOrigin === 'custom' 
      ? (shippingModalCustomOrigin || '').replace(/\D/g, '') 
      : shippingModalOrigin;

    if (!cepOrigem || cepOrigem.length !== 8) {
      setShippingModalError('Informe um CEP de origem válido com 8 dígitos');
      return;
    }

    setShippingModalLoading(true);
    setShippingModalError(null);

    try {
      const res = await api.calculateShipping({
        from_postal_code: cepOrigem,
        to_postal_code: cepDestino,
        default_dimensions: {
          height: Number(shippingModalHeight) || 1,
          width: Number(shippingModalWidth) || 10,
          length: Number(shippingModalLength) || 15,
          weight: Number(shippingModalWeight) || 0.5,
        }
      });

      if (res.quotes && res.quotes.length > 0) {
        setShippingModalQuotes(res.quotes);
      } else {
        setShippingModalQuotes([]);
        setShippingModalError('Nenhuma opção de frete encontrada para este CEP');
      }
    } catch (err: any) {
      setShippingModalError(err.message || 'Erro ao calcular frete no Melhor Envio');
      setShippingModalQuotes([]);
    } finally {
      setShippingModalLoading(false);
    }
  };

  const handleSendShippingQuoteToChat = async () => {
    if (!selectedId || shippingModalQuotes.length === 0) return;
    const formattedCep = shippingModalCep.replace(/(\d{5})(\d{3})/, '$1-$2');
    
    let originName = 'Padre Eustáquio / BH';
    if (shippingModalOrigin === '30110017') originName = 'Savassi / BH';
    else if (shippingModalOrigin === '30190110') originName = 'Savannah Mall (Barro Preto) / BH';
    else if (shippingModalOrigin === 'custom') originName = shippingModalCustomOrigin;

    const topQuotes = shippingModalQuotes.slice(0, 5);
    const quotesList = topQuotes.map(q => {
      const priceFmt = Number(q.custom_price || q.price).toFixed(2).replace('.', ',');
      const days = q.custom_delivery_time || q.delivery_time;
      return `• *${q.company.name} (${q.name})*: R$ ${priceFmt} (${days} dia${days !== 1 ? 's' : ''} úteis)`;
    }).join('\n');

    const messageText = `📦 *Opções de Frete para seu CEP ${formattedCep}:*

${quotesList}

📍 *Saída*: ${originName}
✨ Deseja que eu já prepare a sua comanda com alguma dessas opções?`;

    await handleSendReply(messageText);
    setFeedback({ type: 'success', message: 'Cotação de frete enviada no chat com sucesso!' });
    setShowShippingModal(false);
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
        api.getCrmLeadTimeline(targetId).then(tl => setLeadTimeline(tl || [])).catch(() => {});
      }
      fetchConversations(true);
    } catch (err: any) {
      console.error('Error updating status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const custom = statuses.find(s => s.slug === status || s.name.toLowerCase() === status.toLowerCase());
    if (custom) {
      return (
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-sm"
          style={{
            backgroundColor: `${custom.color}15`,
            borderColor: `${custom.color}35`,
            color: custom.color
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: custom.color }}></span>
          <span>{custom.name}</span>
        </span>
      );
    }
    switch (status) {
      case 'novo':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">Novo Lead</span>;
      case 'em_negociacao':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">Negociando</span>;
      case 'fechado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Venda Fechada</span>;
      case 'perdido':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">Perdido</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  const getPlatformBadge = (platform?: string) => {
    const p = (platform || '').toLowerCase();
    if (p === 'whatsapp') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>WhatsApp</span>
        </span>
      );
    }
    if (p === 'instagram') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-400"></span>
          <span>Instagram</span>
        </span>
      );
    }
    if (p === 'olx') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
          <span>OLX</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
        <span>Facebook</span>
      </span>
    );
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

  const handleSyncExtensions = async () => {
    setSyncingExtensions(true);
    try {
      const res = await api.syncCrmExtensions();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `✅ Extensão sincronizada em ${res.synced} servidores ativos! No Chrome dos servidores, basta recarregar a extensão ou a pasta Desktop > dashboard_crm.`
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'Não foi possível sincronizar as extensões nos servidores.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao sincronizar servidores: ${err.message}`
      });
    } finally {
      setSyncingExtensions(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleOpenInsightInBrowser = async () => {
    setOpeningInsightTab(true);
    const targetUrl = `https://www.instagram.com/accounts/insights/?timeframe=${insightTimeframe}`;
    try {
      const res = await api.openCrmTab({
        profile_id: selectedProfileId !== 'all' ? selectedProfileId : undefined,
        url: targetUrl
      });
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `🚀 Aba de Insights do Instagram aberta no navegador (${res.container || 'Chrome'})!`
        });
        if (selectedProfileId !== 'all' && onOpenVnc) {
          const prof = profiles.find(p => p.id === selectedProfileId);
          if (prof) onOpenVnc(prof);
        }
      } else {
        window.open(targetUrl, '_blank');
      }
    } catch (err) {
      window.open(targetUrl, '_blank');
    } finally {
      setOpeningInsightTab(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] text-slate-800 overflow-hidden w-full max-w-full font-sans">
      {/* Top Header Controls - Clean White SaaS */}
      <div className={`px-3 sm:px-6 py-2.5 border-b border-slate-200 bg-white items-center justify-between gap-3 shrink-0 shadow-xs ${
        selectedId !== null && currentTab === 'inbox' ? 'hidden lg:flex lg:flex-wrap' : 'flex flex-wrap'
      }`}>
        {/* Left branding & view switcher */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
                <span>CRM Comercial</span>
                <span className="hidden sm:inline">Omnichannel</span>
                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Ativo
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block">
                Central Integrada de Atendimento, Leads & Follow-ups
              </p>
            </div>
          </div>

          {/* View Mode Tabs (Inbox vs Kanban vs Insights) */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setCurrentTab('inbox')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'inbox'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Inbox</span>
              {unreadConversations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-black text-[9px] animate-pulse">
                  {unreadConversations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('kanban')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'kanban'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setCurrentTab('insights')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'insights'
                  ? 'bg-white text-pink-600 shadow-xs border border-pink-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-pink-500" />
              <span>Métricas</span>
            </button>
          </div>
        </div>

        {/* Global Filters & Polling Controls */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none flex-nowrap sm:flex-wrap">
          {/* Follow-ups Global Button with Counter */}
          <button
            onClick={() => setShowGlobalFollowupsModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            title="Abrir Central Geral de Follow-ups"
          >
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Follow-ups</span>
            {allFollowups.filter((f) => f.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[10px] shadow-xs">
                {allFollowups.filter((f) => f.status === 'pending').length}
              </span>
            )}
          </button>

          {/* Marketplace Filter Toggle */}
          <button
            onClick={() => setMarketplaceOnly(!marketplaceOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border shadow-xs ${
              marketplaceOnly
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
            title="Filtrar apenas mensagens de vendas de produtos (Marketplace & OLX)"
          >
            <Store className={`h-3.5 w-3.5 ${marketplaceOnly ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>{marketplaceOnly ? 'Somente Marketplace' : 'Todas as Conversas'}</span>
          </button>

          {/* Platform Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedPlatform('all')}
              className={`px-2 py-1 rounded-lg font-medium transition ${selectedPlatform === 'all' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedPlatform('facebook')}
              className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${selectedPlatform === 'facebook' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>Facebook</span>
            </button>
            <button
              onClick={() => {
                setSelectedPlatform('whatsapp');
                api.syncEvolutionWhatsApp().then(() => fetchConversations(true)).catch(() => {});
              }}
              className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${selectedPlatform === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => setSelectedPlatform('instagram')}
              className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${selectedPlatform === 'instagram' ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>Instagram</span>
            </button>
            <button
              onClick={() => setSelectedPlatform('olx')}
              className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${selectedPlatform === 'olx' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span>OLX</span>
            </button>
          </div>

          {/* Profile Select */}
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-white border border-slate-200 text-base sm:text-xs text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
          >
            <option value="all">Todos os Perfis</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Dynamic Lead Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 text-base sm:text-xs text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
          >
            <option value="all">Status (Todos)</option>
            {statuses.length > 0 ? (
              statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            ) : (
              <>
                <option value="novo">Novos Leads</option>
                <option value="em_negociacao">Em Negociação</option>
                <option value="fechado">Venda Fechada</option>
                <option value="perdido">Perdido</option>
              </>
            )}
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-white border border-slate-200 text-base sm:text-xs text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium shadow-xs"
          >
            <option value="all">Tags (Todas)</option>
            {availableTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-xl border transition shadow-xs ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'
            }`}
            title={soundEnabled ? 'Notificações sonoras ativas' : 'Som mutado'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Notification Center Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationCenter(!showNotificationCenter)}
              className={`p-1.5 rounded-xl border transition relative shadow-xs ${
                unreadConversations.length > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
              title="Central de Notificações de Novas Mensagens"
            >
              <Bell className="h-4 w-4" />
              {unreadConversations.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-emerald-500 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadConversations.length}
                </span>
              )}
            </button>

            {/* Notification Center Dropdown */}
            {showNotificationCenter && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Central de Mensagens</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                    {unreadConversations.length} não lidas
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                  {unreadConversations.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
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
                        className="pt-1.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition flex items-start gap-2.5"
                      >
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0 border border-slate-200">
                          {c.customer_name?.charAt(0) || 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 truncate">{c.customer_name}</span>
                            <span className="text-[9px] text-emerald-600 font-bold">Nova</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{c.last_message || 'Nova mensagem recebida'}</p>
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
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 shadow-xs ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
            title="Alternar sincronização automática a cada 5s"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            <span>{autoRefresh ? 'Auto 5s' : 'Pausado'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchConversations()}
            disabled={loadingList}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition shadow-xs"
            title="Atualizar agora"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Sync WhatsApp Evolution API Button */}
          <button
            onClick={handleSyncWhatsApp}
            disabled={syncingWhatsApp}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            title="Sincronização automática ativa via Webhook em tempo real e a cada 15s. Clique para forçar sincronização imediata."
          >
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <RefreshCw className={`h-3.5 w-3.5 ${syncingWhatsApp ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{syncingWhatsApp ? 'Sincronizando...' : 'WhatsApp Sync'}</span>
          </button>

          {/* Test n8n Webhook Button */}
          <button
            onClick={handleTestN8nWebhook}
            disabled={testingWebhook}
            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            title="Disparar teste para o webhook do n8n"
          >
            <span>📡</span>
            <span className="hidden lg:inline">{testingWebhook ? 'Testando...' : 'Testar n8n'}</span>
          </button>

          {/* Atualizar Servidores Ativos Button */}
          <button
            onClick={handleSyncExtensions}
            disabled={syncingExtensions}
            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            title="Atualizar arquivos da extensão em todos os servidores e navegadores Docker ativos (Desktop > dashboard_crm)"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingExtensions ? 'animate-spin text-purple-600' : ''}`} />
            <span className="hidden lg:inline">{syncingExtensions ? 'Atualizando...' : 'Atualizar Extensões'}</span>
          </button>

          {/* Download Extension Button */}
          <a
            href="/api/crm/extension/download"
            download="adsmanager-crm-extension.zip"
            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
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
          className={`mx-6 mt-2.5 p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-sm transition-all animate-fadeIn shrink-0 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-2 py-0.5 rounded hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN VIEW: INBOX vs KANBAN */}
      {currentTab === 'inbox' ? (
        /* INBOX & CHAT VIEW */
        <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
          {/* Left Column: Conversations List - Clean White Style */}
          <div className={`shrink-0 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white min-h-0 z-10 shadow-xs transition-all ${
            selectedId !== null ? 'hidden lg:flex w-80 md:w-96 min-w-[320px] max-w-[380px]' : 'flex w-full lg:w-80 lg:md:w-96 lg:min-w-[320px] lg:max-w-[380px]'
          }`}>
            {/* Header with Title, Lead Count & Select All */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  {marketplaceOnly ? 'Leads do Marketplace' : 'Todas as Conversas'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                  {conversations.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSelectAll}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    selectedIds.length > 0 && selectedIds.length === conversations.length
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                  title={selectedIds.length === conversations.length ? 'Desmarcar todos' : 'Selecionar todos'}
                >
                  {selectedIds.length > 0 && selectedIds.length === conversations.length ? (
                    <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  <span className="text-[10px]">Todos</span>
                </button>
                <button
                  onClick={() => fetchConversations()}
                  disabled={loadingList}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                  placeholder="Buscar cliente, produto ou mensagem..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400 transition"
                />
              </div>
            </div>

            {/* Conversations Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingList && conversations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                  Carregando conversas...
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-16 px-6 text-center space-y-4">
                  <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
                  <div className="text-xs text-slate-700 font-semibold">Nenhuma conversa encontrada</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {marketplaceOnly
                      ? 'Nenhum lead com produto detectado no momento.'
                      : 'Abra o Facebook, Instagram ou WhatsApp para sincronizar chats automaticamente.'}
                  </p>
                  {marketplaceOnly && (
                    <button
                      onClick={() => setMarketplaceOnly(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs hover:bg-slate-200"
                    >
                      Ver todos os chats
                    </button>
                  )}
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = selectedId === conv.id;
                  const isUnread = (conv.unread_count && conv.unread_count > 0) || conv.unread;
                  const isChecked = selectedIds.includes(conv.id);

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full text-left p-3 flex items-start gap-2.5 transition relative group cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 border-l-4 border-l-blue-600 shadow-xs'
                          : isUnread
                          ? 'bg-emerald-50/80 border-l-4 border-l-emerald-500'
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleToggleSelect(conv.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer shrink-0 mt-3"
                      />

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {conv.customer_avatar ? (
                          <img
                            src={conv.customer_avatar}
                            alt={conv.customer_name}
                            className={`h-10 w-10 rounded-full object-cover border ${
                              isUnread ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
                            }`}
                          />
                        ) : (
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs border ${
                            isUnread ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
                          }`}>
                            {conv.customer_name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                        )}
                        {/* Platform Icon Badge */}
                        <span
                          className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-xs ${
                            conv.platform === 'facebook'
                              ? 'bg-blue-600'
                              : conv.platform === 'whatsapp'
                              ? 'bg-emerald-600'
                              : conv.platform === 'instagram'
                              ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600'
                              : 'bg-purple-600'
                          }`}
                          title={`Canal: ${conv.platform}`}
                        >
                          {conv.platform === 'facebook'
                            ? 'f'
                            : conv.platform === 'whatsapp'
                            ? 'W'
                            : conv.platform === 'instagram'
                            ? 'IG'
                            : 'O'}
                        </span>
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-800'}`}>
                            {conv.customer_name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {new Date(conv.last_message_at || conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Product Tag */}
                        {conv.product_title && (
                          <div className="text-[11px] text-blue-600 font-medium truncate flex items-center gap-1 mb-1">
                            <ShoppingBag className="h-3 w-3 shrink-0" />
                            <span className="truncate">{conv.product_title}</span>
                          </div>
                        )}

                        {/* Last Message Snippet */}
                        <p className={`text-xs truncate mb-1.5 ${isUnread ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                          {conv.last_message || 'Nenhuma mensagem recente'}
                        </p>

                        {/* Tags list in conversation item */}
                        {conv.tags && conv.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {conv.tags.slice(0, 3).map((t: any) => (
                              <span
                                key={t.id}
                                style={{ backgroundColor: `${t.color}15`, color: t.color, borderColor: `${t.color}30` }}
                                className="text-[9px] px-1.5 py-0.2 rounded font-semibold border flex items-center gap-1"
                              >
                                {t.name}
                              </span>
                            ))}
                            {conv.tags.length > 3 && (
                              <span className="text-[9px] text-slate-400 font-medium">
                                +{conv.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer info: Status, Next Followup, Unread */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getStatusBadge(conv.lead_status || 'novo')}
                            {conv.next_followup && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1" title={conv.next_followup.notes || 'Follow-up agendado'}>
                                <Clock className="h-2.5 w-2.5 text-amber-600" />
                                {(() => {
                                  const raw = conv.next_followup.scheduled_at || conv.next_followup.due_at;
                                  const d = raw ? new Date(raw) : null;
                                  return d && !isNaN(d.getTime()) ? d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) : 'Agendado';
                                })()}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isUnread && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[10px] shadow-xs">
                                {conv.unread_count || 1}
                              </span>
                            )}
                            <button
                              onClick={(e) => handleDeleteConversation(conv.id, conv.customer_name, e)}
                              disabled={deletingId === conv.id}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition"
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

          {/* Center Column: Active Chat Thread - Clean White Design */}
          <div className={`min-w-0 flex flex-col bg-[#F8FAFC] min-h-0 flex-1 ${
            selectedId === null ? 'hidden lg:flex' : 'flex w-full'
          }`}>
            {activeThread ? (
              <>
                {/* Thread Header */}
                <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 shrink-0 shadow-xs">
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
                    {/* Mobile Back Button (WhatsApp Style) */}
                    <button
                      onClick={() => {
                        setSelectedId(null);
                        setActiveThread(null);
                      }}
                      className="lg:hidden p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition shrink-0"
                      title="Voltar para a lista de conversas"
                    >
                      <ArrowLeft className="h-5 w-5 text-slate-700" />
                    </button>

                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 border border-slate-200">
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
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {activeThread.conversation.customer_name}
                        </h2>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold text-white uppercase ${
                            activeThread.conversation.platform === 'facebook'
                              ? 'bg-blue-600'
                              : activeThread.conversation.platform === 'whatsapp'
                              ? 'bg-emerald-600'
                              : activeThread.conversation.platform === 'instagram'
                              ? 'bg-pink-600'
                              : 'bg-purple-600'
                          }`}
                        >
                          {activeThread.conversation.platform}
                        </span>
                      </div>
                      {activeThread.conversation.product_title && (
                        <p className="text-[11px] sm:text-xs text-blue-600 font-medium truncate flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3 shrink-0" />
                          <span className="truncate">{activeThread.conversation.product_title}</span>
                          {activeThread.conversation.product_price && (
                            <span className="text-emerald-600 font-bold ml-1">
                              ({activeThread.conversation.product_price})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Status Dropdown, Mobile Ficha Shortcut, Follow-up Shortcut, noVNC Link & Delete */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                    {/* Mobile Details / Comanda Toggle Button */}
                    <button
                      onClick={() => setMobileShowDetails(true)}
                      className="xl:hidden px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                      title="Ver Ficha do Lead & Emitir Comanda"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                      <span className="hidden xs:inline">Comanda</span>
                    </button>

                    {/* Status Dropdown */}
                    <select
                      value={activeThread.conversation.lead_status || 'novo'}
                      onChange={(e) => handleStatusChange(activeThread.conversation.id, e.target.value)}
                      className="bg-white border border-slate-200 text-base sm:text-xs text-slate-800 rounded-xl px-2 sm:px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium shadow-xs max-w-[120px] sm:max-w-none"
                    >
                      {statuses.length > 0 ? (
                        statuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            Status: {s.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="novo">Status: Novo Lead</option>
                          <option value="em_negociacao">Status: Negociando</option>
                          <option value="fechado">Status: Venda Fechada</option>
                          <option value="perdido">Status: Perdido</option>
                        </>
                      )}
                    </select>

                    {/* Quick +Followup Button in Chat Header */}
                    <button
                      onClick={() => setShowFollowupModal(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                      title="Agendar Follow-up para este cliente"
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span className="hidden sm:inline">+ Follow-up</span>
                    </button>

                    {/* Open in Browser VNC Button */}
                    {onOpenVnc && activeThread.conversation.profile_id && (
                      <button
                        onClick={() => {
                          const targetProfile = profiles.find((p) => p.id === activeThread.conversation.profile_id);
                          if (targetProfile) onOpenVnc(targetProfile);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition border border-slate-200 shadow-xs"
                        title="Abrir navegador noVNC desta conversa"
                      >
                        <Tv className="h-3.5 w-3.5 text-blue-600" />
                        <span className="hidden sm:inline">Abrir noVNC</span>
                      </button>
                    )}

                    {/* Delete Lead Button */}
                    <button
                      onClick={(e) => handleDeleteConversation(activeThread.conversation.id, activeThread.conversation.customer_name, e)}
                      disabled={deletingId === activeThread.conversation.id}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-medium flex items-center gap-1 transition shadow-xs"
                      title="Excluir este lead e histórico"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0 bg-[#F8FAFC]">
                  {loadingThread ? (
                    <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
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
                        <div className="py-20 text-center text-slate-400 text-xs">
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
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-tr-xs shadow-blue-500/10'
                                : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
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
                <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center gap-2 overflow-x-auto min-w-0 max-w-full shrink-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      Respostas:
                    </span>
                    <button
                      onClick={() => setShowQuickSettings(true)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                      title="Configurar Mensagens Rápidas"
                    >
                      <Settings className="h-3 w-3" />
                    </button>
                  </div>
                  {quickTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => setReplyText(template)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] whitespace-nowrap transition border border-slate-200 font-medium"
                      title="Clique para preencher a mensagem"
                    >
                      {template}
                    </button>
                  ))}
                </div>

                {/* Reply Input Bar */}
                <div className="p-4 border-t border-slate-200 bg-white flex items-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (rightPanelTab === 'CATALOGO') {
                        setRightPanelTab('RESUMO');
                      } else {
                        setRightPanelTab('CATALOGO');
                      }
                      setShowFloatingCatalog(true);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 ${
                      rightPanelTab === 'CATALOGO'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-purple-500/25'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                    }`}
                    title="Abrir Catálogo de Produtos para enviar fotos e ofertas no chat"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span className="hidden sm:inline">Catálogo</span>
                  </button>

                  <div className="flex-1 relative">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder="Digite sua resposta (dica: digite /catalogo para produtos)..."
                      rows={2}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition resize-none placeholder:text-slate-400 font-sans"
                    />
                    {(replyText.includes('/catalogo') || replyText.includes('/produto')) && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyText(prev => prev.replace('/catalogo', '').replace('/produto', '').trim());
                          setRightPanelTab('CATALOGO');
                          setShowFloatingCatalog(true);
                        }}
                        className="absolute right-3 top-3 px-2 py-1 rounded-lg bg-purple-600 text-white text-[10px] font-bold shadow-xs animate-pulse flex items-center gap-1"
                      >
                        <Package className="h-3 w-3" />
                        <span>Abrir Catálogo</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleSendReply()}
                    disabled={sendingReply || !replyText.trim()}
                    className="px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm shadow-blue-500/20 shrink-0"
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
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400">
                <MessageSquare className="h-12 w-12 text-slate-300" />
                <div className="text-sm font-semibold text-slate-600">Nenhuma conversa selecionada</div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Selecione um cliente na lista à esquerda para visualizar mensagens, gerenciar follow-ups e operar a venda.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Ficha Comercial Operacional do Cliente - 4 Tabs */}
          {activeThread && (
            <div className={`${
              mobileShowDetails
                ? 'fixed inset-0 z-50 bg-white flex flex-col min-h-0 w-full animate-in slide-in-from-bottom duration-200'
                : 'w-80 shrink-0 flex-shrink-0 min-w-[300px] border-l border-slate-200 bg-white flex-col min-h-0 hidden xl:flex shadow-xs'
            }`}>
              {/* Mobile Drawer Close Header */}
              {mobileShowDetails && (
                <div className="xl:hidden px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Ficha Comercial & Comanda
                  </span>
                  <button
                    onClick={() => setMobileShowDetails(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              {/* Client Top Header in Sidebar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-11 w-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm border border-slate-300 shrink-0">
                    {activeThread.conversation.customer_avatar ? (
                      <img src={activeThread.conversation.customer_avatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      activeThread.conversation.customer_name?.charAt(0) || 'C'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {activeThread.conversation.customer_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                      <span className="capitalize font-semibold text-blue-600">{activeThread.conversation.platform}</span>
                      <span>•</span>
                      <span className="truncate">{activeThread.conversation.customer_assigned_to || activeThread.conversation.profile_name || 'Sem atendente'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons (Barra de Ações Rápidas) */}
                <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-200/60 text-center">
                  <button
                    onClick={() => setRightPanelTab('RESUMO')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold flex flex-col items-center gap-0.5 transition"
                    title="Resumo Geral do Lead"
                  >
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <span>Resumo</span>
                  </button>
                  <button
                    onClick={() => setShowFollowupModal(true)}
                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-semibold flex flex-col items-center gap-0.5 transition"
                    title="Agendar Follow-up"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Follow-up</span>
                  </button>
                  <button
                    onClick={() => setShowAddTagPopover(!showAddTagPopover)}
                    className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-semibold flex flex-col items-center gap-0.5 transition"
                    title="Adicionar Tag"
                  >
                    <Tag className="h-3.5 w-3.5 text-purple-600" />
                    <span>Tag</span>
                  </button>
                  <button
                    onClick={() => setRightPanelTab('NOTAS')}
                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold flex flex-col items-center gap-0.5 transition"
                    title="Criar Nota Interna"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Nota</span>
                  </button>
                  <button
                    onClick={() => openLeadDetails(activeThread.conversation)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold flex flex-col items-center gap-0.5 transition"
                    title="Editar Todos os Dados do Lead"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-600" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>

              {/* Status & Tags Quick Bar */}
              <div className="px-4 py-3 border-b border-slate-100 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapa Comercial:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenShippingQuickModal}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs"
                      title="Cotar Fretes no Melhor Envio e Enviar no Chat"
                    >
                      <Truck className="h-3 w-3 text-blue-600" />
                      <span>Cotar Frete</span>
                    </button>
                    <button
                      onClick={() => setIsSupplierInquiryModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs"
                      title="Consultar Fornecedor em Massa"
                    >
                      <Box className="h-3 w-3 text-indigo-600" />
                      <span>Consultar Fornecedor</span>
                    </button>
                    <button
                      onClick={() => handleOpenCreateOrder()}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1.5 shadow-xs"
                      title="Abrir Novo Pedido / Comanda para este cliente"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      <span>+ Nova Comanda</span>
                    </button>
                    <div className="shrink-0">{getStatusBadge(activeThread.conversation.lead_status || 'novo')}</div>
                  </div>
                </div>

                {/* Tags list with inline delete + Add Tag Popover */}
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeThread.conversation.tags && activeThread.conversation.tags.length > 0 ? (
                      activeThread.conversation.tags.map((tag: any) => (
                        <span
                          key={tag.id}
                          style={{ backgroundColor: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}35` }}
                          className="text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 group/tag shadow-2xs"
                        >
                          <span>{tag.name}</span>
                          <button
                            onClick={() => handleRemoveLeadTag(tag.id)}
                            className="hover:opacity-80 text-[11px] leading-none ml-0.5 font-bold"
                            title="Remover tag do lead"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Nenhuma tag vinculada</span>
                    )}

                    {/* Toggle Add Tag Button */}
                    <button
                      onClick={() => setShowAddTagPopover(!showAddTagPopover)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 flex items-center gap-1 transition"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Tag</span>
                    </button>
                  </div>

                  {/* Add Tag Popover */}
                  {showAddTagPopover && (
                    <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-xs font-bold text-slate-800">Vincular Tag</span>
                        <button
                          onClick={() => setShowAddTagPopover(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Existing tags to click */}
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {availableTags.map((tag) => {
                          const isAlreadyLinked = activeThread.conversation.tags?.some((t: any) => t.id === tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => {
                                if (!isAlreadyLinked) handleAddLeadTag(tag.id);
                              }}
                              disabled={isAlreadyLinked}
                              className={`w-full text-left px-2 py-1 rounded-md text-xs font-medium flex items-center justify-between ${
                                isAlreadyLinked
                                  ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                <span>{tag.name}</span>
                              </span>
                              {isAlreadyLinked && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Create New Tag Inline */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Criar nova tag..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="color"
                          value={newTagColor}
                          onChange={(e) => setNewTagColor(e.target.value)}
                          className="h-6 w-6 rounded border border-slate-200 cursor-pointer p-0"
                          title="Escolher cor da tag"
                        />
                        <button
                          onClick={handleCreateAndAddTag}
                          disabled={!newTagName.trim()}
                          className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Tabs Switcher (Scrollable) */}
              <div className="flex items-center border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 shrink-0 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-1">
                <button
                  onClick={() => setRightPanelTab('RESUMO')}
                  className={`px-3 py-2.5 text-center transition border-b-2 shrink-0 ${
                    rightPanelTab === 'RESUMO'
                      ? 'border-blue-600 text-blue-600 bg-white font-bold'
                      : 'border-transparent hover:text-slate-800'
                  }`}
                >
                  Resumo
                </button>
                <button
                  onClick={() => setRightPanelTab('ATIVIDADES')}
                  className={`px-3 py-2.5 text-center transition border-b-2 shrink-0 ${
                    rightPanelTab === 'ATIVIDADES'
                      ? 'border-blue-600 text-blue-600 bg-white font-bold'
                      : 'border-transparent hover:text-slate-800'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setRightPanelTab('FOLLOW_UP')}
                  className={`px-3 py-2.5 text-center transition border-b-2 shrink-0 ${
                    rightPanelTab === 'FOLLOW_UP'
                      ? 'border-blue-600 text-blue-600 bg-white font-bold'
                      : 'border-transparent hover:text-slate-800'
                  }`}
                >
                  Follow-up ({leadFollowups.length})
                </button>
                <button
                  onClick={() => setRightPanelTab('NOTAS')}
                  className={`px-3 py-2.5 text-center transition border-b-2 shrink-0 ${
                    rightPanelTab === 'NOTAS'
                      ? 'border-blue-600 text-blue-600 bg-white font-bold'
                      : 'border-transparent hover:text-slate-800'
                  }`}
                >
                  Notas ({leadNotes.length})
                </button>
                <button
                  onClick={() => setRightPanelTab('CATALOGO')}
                  className={`px-3 py-2.5 text-center transition border-b-2 flex items-center justify-center gap-1 shrink-0 ${
                    rightPanelTab === 'CATALOGO'
                      ? 'border-purple-600 text-purple-700 bg-white font-bold'
                      : 'border-transparent hover:text-slate-800 text-purple-700'
                  }`}
                  title="Catálogo de Produtos para Vendas"
                >
                  <Package className="h-3.5 w-3.5 text-purple-600" />
                  <span>Catálogo</span>
                </button>
                <button
                  onClick={() => setRightPanelTab('PEDIDOS')}
                  className={`px-3 py-2.5 text-center transition border-b-2 flex items-center justify-center gap-1.5 shrink-0 ${
                    rightPanelTab === 'PEDIDOS'
                      ? 'border-emerald-600 text-emerald-700 bg-white font-bold'
                      : 'border-transparent hover:text-slate-800 text-emerald-700'
                  }`}
                  title="Comandas e Pedidos de Venda"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pedidos ({leadOrders.length})</span>
                </button>
              </div>

              {/* Sidebar Tab Body with Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-white">
                {/* TAB: RESUMO */}
                {rightPanelTab === 'RESUMO' && (
                  <div className="space-y-4">
                    {/* Next Follow-up Smart Card */}
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          Próximo Follow-up
                        </span>
                        {leadFollowups.find((f) => f.status === 'pending') && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-200/60 text-amber-800">
                            Pendente
                          </span>
                        )}
                      </div>

                      {(() => {
                        const nextF = leadFollowups.find((f) => f.status === 'pending');
                        if (nextF) {
                          const raw = nextF.scheduled_at || nextF.due_at;
                          const dueDate = raw ? new Date(raw) : null;
                          const isValid = dueDate && !isNaN(dueDate.getTime());
                          const isOverdue = isValid ? dueDate.getTime() < Date.now() : false;
                          const flType = nextF.followup_type || nextF.type || 'WhatsApp';
                          const dateFormatted = isValid
                            ? `${dueDate.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })} • ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Data a definir';

                          return (
                            <div className="space-y-2">
                              <div className="flex items-baseline justify-between">
                                <span className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {dateFormatted}
                                </span>
                                <span className="text-[10px] text-amber-700 font-semibold capitalize">
                                  {flType}
                                </span>
                              </div>
                              {nextF.notes && (
                                <p className="text-[11px] text-slate-600 italic line-clamp-2 bg-white/70 p-1.5 rounded border border-amber-200/50">
                                  "{nextF.notes}"
                                </p>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleCompleteFollowup(nextF.id)}
                                  className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Concluir</span>
                                </button>
                                <button
                                  onClick={() => setShowFollowupModal(true)}
                                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-medium transition"
                                >
                                  Reagendar
                                </button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="text-center py-2 space-y-1.5">
                            <p className="text-xs text-slate-500">Nenhum follow-up agendado</p>
                            <button
                              onClick={() => setShowFollowupModal(true)}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-2xs"
                            >
                              + Agendar Agora
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Commercial Smart Card */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-600" />
                          Visão Comercial
                        </span>
                        <button
                          onClick={() => handleOpenCreateOrder()}
                          className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition flex items-center gap-1"
                          title="Gerar comanda para este cliente"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          <span>Nova Comanda</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 block">Total em Pedidos</span>
                          <span className="font-bold text-emerald-600 text-sm">
                            {leadOrders.length > 0
                              ? `R$ ${leadOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0).toFixed(2).replace('.', ',')}`
                              : (activeThread.conversation.deal_value || 'R$ 0,00')}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 block">Pedidos Registrados</span>
                          <span className="font-bold text-slate-700 text-sm">
                            {leadOrders.length} pedido{leadOrders.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Product Negotiated Card */}
                    {activeThread.conversation.product_title && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Store className="h-3 w-3 text-blue-600" />
                          Produto em Negociação
                        </span>
                        <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1 shadow-2xs">
                          <div className="text-xs font-bold text-slate-900 line-clamp-2">
                            {activeThread.conversation.product_title}
                          </div>
                          {activeThread.conversation.product_price && (
                            <div className="text-sm font-black text-emerald-600">
                              {activeThread.conversation.product_price}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Dados de Contato
                      </span>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Nome do Cliente</span>
                          <span className="font-semibold text-slate-800">{activeThread.conversation.customer_name}</span>
                        </div>
                        {activeThread.conversation.customer_phone && (
                          <div>
                            <span className="text-[10px] text-slate-400 block">WhatsApp</span>
                            <a
                              href={`https://wa.me/${activeThread.conversation.customer_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {activeThread.conversation.customer_phone}
                            </a>
                          </div>
                        )}
                        {(activeThread.conversation.customer_city || activeThread.conversation.customer_state) && (
                          <div>
                            <span className="text-[10px] text-slate-400 block">Localização</span>
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {[activeThread.conversation.customer_city, activeThread.conversation.customer_state].filter(Boolean).join(' - ')}
                            </span>
                          </div>
                        )}
                        {activeThread.conversation.customer_address && (
                          <div>
                            <span className="text-[10px] text-slate-400 block">Endereço de Entrega</span>
                            <span className="text-slate-600">{activeThread.conversation.customer_address}</span>
                          </div>
                        )}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleOpenShippingQuickModal}
                            className="w-full py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <Truck className="h-3.5 w-3.5 text-blue-600" />
                            <span>Cotar Fretes (Melhor Envio)</span>
                          </button>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Primeiro Contato</span>
                          <span className="text-slate-600">
                            {new Date(activeThread.conversation.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Edit Lead Button */}
                    <button
                      onClick={() => openLeadDetails(activeThread.conversation)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Editar Informações Completas</span>
                    </button>
                  </div>
                )}

                {/* TAB: ATIVIDADES / TIMELINE */}
                {rightPanelTab === 'ATIVIDADES' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800">Timeline de Atividades</span>
                      <button
                        onClick={() => {
                          if (activeThread?.conversation?.id) {
                            setLoadingTimeline(true);
                            api.getCrmLeadTimeline(activeThread.conversation.id)
                              .then((tl) => setLeadTimeline(tl || []))
                              .finally(() => setLoadingTimeline(false));
                          }
                        }}
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${loadingTimeline ? 'animate-spin' : ''}`} />
                        Atualizar
                      </button>
                    </div>

                    {loadingTimeline ? (
                      <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                        Carregando timeline...
                      </div>
                    ) : leadTimeline.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Nenhum evento registrado nesta conversa ainda.
                      </div>
                    ) : (
                      <div className="relative pl-4 space-y-4 border-l-2 border-slate-200">
                        {leadTimeline.map((evt) => {
                          const isStatus = evt.event_type === 'LEAD_STATUS_CHANGED';
                          const isTag = evt.event_type.startsWith('TAG_');
                          const isNote = evt.event_type === 'NOTE_ADDED';
                          const isFollowup = evt.event_type.startsWith('FOLLOWUP_');

                          return (
                            <div key={evt.id} className="relative group">
                              {/* Timeline dot */}
                              <div className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                                isStatus
                                  ? 'bg-blue-600'
                                  : isTag
                                  ? 'bg-purple-600'
                                  : isFollowup
                                  ? 'bg-amber-500'
                                  : isNote
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`} />

                              <div className="text-xs">
                                <div className="flex items-baseline justify-between">
                                  <span className="font-bold text-slate-800">
                                    {evt.title || evt.event_type}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {evt.description && (
                                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                    {evt.description}
                                  </p>
                                )}
                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                  {new Date(evt.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                  {evt.author_name ? ` • por ${evt.author_name}` : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: FOLLOW-UP */}
                {rightPanelTab === 'FOLLOW_UP' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800">Follow-ups Agendados</span>
                      <button
                        onClick={() => setShowFollowupModal(true)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Novo</span>
                      </button>
                    </div>

                    {leadFollowups.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                        <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                        <p>Nenhum follow-up cadastrado para este cliente.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leadFollowups.map((f) => {
                          const isDone = f.status === 'completed';
                          const raw = f.scheduled_at || f.due_at;
                          const dueDate = raw ? new Date(raw) : null;
                          const isValid = dueDate && !isNaN(dueDate.getTime());
                          const isOverdue = !isDone && isValid && dueDate.getTime() < Date.now();
                          const flType = f.followup_type || f.type || 'WhatsApp';
                          const dateFormatted = isValid
                            ? `${dueDate.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Data a definir';

                          return (
                            <div
                              key={f.id}
                              className={`p-3 rounded-xl border transition shadow-2xs space-y-1.5 ${
                                isDone
                                  ? 'bg-slate-50 border-slate-200 opacity-60'
                                  : isOverdue
                                  ? 'bg-rose-50/80 border-rose-200'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 capitalize flex items-center gap-1.5">
                                  <Clock className={`h-3 w-3 ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`} />
                                  {flType}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isOverdue
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {isDone ? 'Concluído' : isOverdue ? 'Atrasado' : 'Agendado'}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-600 font-medium">
                                📅 {dateFormatted}
                              </div>

                              {f.notes && (
                                <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200/60">
                                  {f.notes}
                                </p>
                              )}

                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                                {!isDone && (
                                  <button
                                    onClick={() => handleCompleteFollowup(f.id)}
                                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>Concluir</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteFollowup(f.id)}
                                  className="text-[11px] text-slate-400 hover:text-rose-600"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: NOTAS INTERNAS */}
                {rightPanelTab === 'NOTAS' && (
                  <div className="space-y-3">
                    <div className="border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800">Notas Internas da Equipe</span>
                      <p className="text-[11px] text-slate-400">Estas anotações não são visíveis para o cliente.</p>
                    </div>

                    {/* New note box */}
                    <div className="space-y-1.5">
                      <textarea
                        value={newNoteInput}
                        onChange={(e) => setNewNoteInput(e.target.value)}
                        placeholder="Escreva uma nota interna (ex: cliente quer fechar após o dia 15)..."
                        rows={2}
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleCreateLeadNote}
                          disabled={savingNote || !newNoteInput.trim()}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 transition shadow-2xs"
                        >
                          {savingNote ? 'Salvando...' : 'Salvar Nota'}
                        </button>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-2 pt-2">
                      {leadNotes.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          Nenhuma nota interna registrada para este lead.
                        </div>
                      ) : (
                        leadNotes.map((n) => (
                          <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-700">{n.author_name || 'Atendente'}</span>
                              <div className="flex items-center gap-2">
                                <span>{new Date(n.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <button
                                  onClick={() => handleDeleteLeadNote(n.id)}
                                  className="hover:text-rose-600 transition"
                                  title="Excluir nota"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {n.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: CATÁLOGO DE PRODUTOS NO CHAT (FASE 4) */}
                {rightPanelTab === 'CATALOGO' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-bold text-slate-800">Catálogo no Chat</span>
                      </div>
                      <button
                        onClick={fetchCatalogData}
                        disabled={loadingCatalog}
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${loadingCatalog ? 'animate-spin' : ''}`} />
                        Atualizar
                      </button>
                    </div>

                    {/* Search & Category Filter */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          placeholder="Buscar produto ou SKU..."
                          className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                        />
                        {catalogSearch && (
                          <button
                            onClick={() => setCatalogSearch('')}
                            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                        <button
                          onClick={() => setCatalogCategoryFilter('all')}
                          className={`px-2 py-0.5 rounded-full whitespace-nowrap font-medium transition ${
                            catalogCategoryFilter === 'all'
                              ? 'bg-purple-600 text-white shadow-2xs font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Todos ({catalogProducts.length})
                        </button>
                        {catalogCategories.map((c) => {
                          const count = catalogProducts.filter((p) => String(p.category_id) === String(c.id)).length;
                          return (
                            <button
                              key={c.id}
                              onClick={() => setCatalogCategoryFilter(String(c.id))}
                              className={`px-2 py-0.5 rounded-full whitespace-nowrap font-medium transition ${
                                catalogCategoryFilter === String(c.id)
                                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {c.name} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Product List */}
                    {loadingCatalog ? (
                      <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
                        <span>Carregando catálogo...</span>
                      </div>
                    ) : filteredChatCatalogProducts.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                        <Package className="h-8 w-8 text-slate-300 mx-auto" />
                        <p>Nenhum produto encontrado.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredChatCatalogProducts.map((prod: any) => {
                          const hasVariants = prod.variants && prod.variants.length > 0;
                          const selectedVariant = selectedProductVariants[prod.id] || (hasVariants ? prod.variants[0] : null);
                          const activePrice = selectedVariant && selectedVariant.price ? Number(selectedVariant.price) : Number(prod.price);
                          const activeStock = selectedVariant && selectedVariant.stock !== undefined ? selectedVariant.stock : prod.stock;
                          const hasPromo = !selectedVariant && prod.promotional_price && Number(prod.promotional_price) < Number(prod.price);
                          const isCopied = copiedProductId === prod.id;

                          return (
                            <div
                              key={prod.id}
                              className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition shadow-2xs space-y-2.5"
                            >
                              {/* Product Header Info */}
                              <div className="flex gap-2.5 items-start">
                                <div className="h-12 w-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                                  {prod.main_image ? (
                                    <img src={prod.main_image} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                                      <Package className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    {prod.sku && (
                                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                                        {prod.sku}
                                      </span>
                                    )}
                                    {prod.brand && (
                                      <span className="text-[10px] text-slate-500 truncate font-medium">
                                        {prod.brand}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                                    {prod.name}
                                  </h4>
                                  <div className="flex items-baseline gap-1.5 mt-0.5">
                                    {hasPromo ? (
                                      <>
                                        <span className="text-xs font-bold text-emerald-600">
                                          R$ {Number(prod.promotional_price).toFixed(2).replace('.', ',')}
                                        </span>
                                        <span className="text-[10px] text-slate-400 line-through">
                                          R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs font-bold text-slate-900">
                                        R$ {Number(activePrice).toFixed(2).replace('.', ',')}
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-semibold px-1 py-0.2 rounded ml-auto ${
                                      activeStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {activeStock > 0 ? `${activeStock} un.` : 'Esgotado'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Variant Selector if present */}
                              {hasVariants && (
                                <div className="pt-0.5">
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5 flex items-center gap-1">
                                    <Layers className="h-2.5 w-2.5 text-purple-600" />
                                    Variação:
                                  </label>
                                  <select
                                    value={selectedVariant?.id || ''}
                                    onChange={(e) => {
                                      const v = prod.variants.find((item: any) => String(item.id) === e.target.value);
                                      setSelectedProductVariants((prev) => ({ ...prev, [prod.id]: v }));
                                    }}
                                    className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-800 font-medium focus:outline-none focus:border-purple-500"
                                  >
                                    {prod.variants.map((v: any) => (
                                      <option key={v.id} value={v.id}>
                                        {v.name} • R$ {Number(v.price || prod.price).toFixed(2).replace('.', ',')} ({v.stock} un.)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Action Buttons in 1 Click */}
                              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/60 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleInsertProductPitch(prod, selectedVariant, false)}
                                  className="py-1 px-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                                  title="Inserir texto comercial no campo de digitação"
                                >
                                  <Edit3 className="h-3 w-3 text-blue-600" />
                                  <span>Preencher</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleInsertProductPitch(prod, selectedVariant, true)}
                                  className="py-1 px-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                                  title="Enviar texto comercial agora no chat"
                                >
                                  <Send className="h-3 w-3" />
                                  <span>Enviar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSendProductPhoto(prod)}
                                  className="py-1 px-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                                  title="Enviar foto oficial do produto para o cliente"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  <span>Foto</span>
                                </button>
                              </div>

                              {/* Secondary Actions: Copy Pitch or View Media Gallery */}
                              <div className="flex items-center justify-between text-[10px] pt-0.5 px-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyProductInfo(prod, selectedVariant)}
                                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                                >
                                  {isCopied ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5" />}
                                  <span>{isCopied ? 'Copiado!' : 'Copiar dados'}</span>
                                </button>

                                {prod.media && prod.media.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveMediaGallery({ product: prod, media: prod.media })}
                                    className="text-purple-600 hover:underline flex items-center gap-1 font-semibold"
                                  >
                                    <ImageIcon className="h-2.5 w-2.5" />
                                    <span>+{prod.media.length} fotos</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: COMANDAS E PEDIDOS DE VENDA */}
                {rightPanelTab === 'PEDIDOS' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">Comandas & Pedidos ({leadOrders.length})</span>
                      </div>
                      <button
                        onClick={() => handleOpenCreateOrder()}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Nova Comanda</span>
                      </button>
                    </div>

                    {leadOrders.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                        <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto" />
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-700">Nenhum pedido gerado para este cliente.</p>
                          <p className="text-[11px] text-slate-500">
                            Abra uma comanda comercial com dados pré-preenchidos e recibo automático no WhatsApp.
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenCreateOrder()}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Abrir Primeira Comanda</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leadOrders.map((order: any) => {
                          const deliveryLabels: Record<string, string> = {
                            uber_flash: 'Uber Flash',
                            motoboy: 'Motoboy Express',
                            retirada: 'Retirada em Loja',
                            correios: 'Correios'
                          };
                          const paymentLabels: Record<string, string> = {
                            pix: 'PIX',
                            cartao_vista: 'Cartão à Vista',
                            cartao_parcelado: `Cartão ${order.installments || 1}x`,
                            dinheiro: 'Dinheiro'
                          };

                          return (
                            <div
                              key={order.id}
                              className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition shadow-2xs space-y-3"
                            >
                              {/* Order Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    #{order.order_code}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(order.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {order.status?.toUpperCase() || 'CONFIRMADO'}
                                </span>
                              </div>

                              {/* Items List */}
                              <div className="bg-white rounded-lg p-2.5 border border-slate-100 space-y-1.5 text-xs">
                                {order.items && order.items.length > 0 ? (
                                  order.items.map((it: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-slate-700">
                                      <span className="font-medium truncate pr-2">
                                        {it.quantity}x {it.product_name} {it.variant_name ? `(${it.variant_name})` : ''}
                                      </span>
                                      <span className="font-semibold text-slate-900 shrink-0">
                                        R$ {Number(it.total_price || (it.quantity * it.unit_price)).toFixed(2).replace('.', ',')}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-slate-500">1x Produto Geral</div>
                                )}

                                {order.shipping_fee > 0 && (
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                    <span>Frete ({deliveryLabels[order.delivery_method] || order.delivery_method}):</span>
                                    <span>R$ {Number(order.shipping_fee).toFixed(2).replace('.', ',')}</span>
                                  </div>
                                )}

                                <div className="flex items-baseline justify-between pt-1.5 border-t border-slate-200">
                                  <span className="font-bold text-slate-800">Total do Pedido:</span>
                                  <span className="font-extrabold text-emerald-600 text-sm">
                                    R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                              </div>

                              {/* Metadata Badges */}
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-semibold">
                                  {paymentLabels[order.payment_method] || order.payment_method}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                                  {deliveryLabels[order.delivery_method] || order.delivery_method}
                                </span>
                                {order.whatsapp_sent && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                                    <Check className="h-2.5 w-2.5" />
                                    <span>WhatsApp OK</span>
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setActiveOrderReceiptModal(order)}
                                  className="py-1.5 px-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold transition flex items-center justify-center gap-1 shadow-2xs text-[10px]"
                                  title="Visualizar recibo oficial"
                                >
                                  <FileText className="h-3 w-3 text-blue-600" />
                                  <span>Recibo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyReceiptToClipboard(order)}
                                  className="py-1.5 px-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition flex items-center justify-center gap-1 text-[10px]"
                                  title="Copiar texto do recibo"
                                >
                                  <Copy className="h-3 w-3 text-emerald-600" />
                                  <span>Copiar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrder(order.id, order.order_code)}
                                  className="py-1.5 px-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition flex items-center justify-center gap-1 text-[10px]"
                                  title="Excluir esta comanda e remover do financeiro"
                                >
                                  <Trash2 className="h-3 w-3 text-rose-600" />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : currentTab === 'kanban' ? (
        /* KANBAN / LIST FUNNEL VIEW */
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          {/* Sub-header: Kanban Board vs List View Toggle */}
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visualização:</span>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setKanbanMode('board')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    kanbanMode === 'board' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Kanban className="h-3.5 w-3.5" />
                  <span>Funil em Cartões</span>
                </button>
                <button
                  onClick={() => setKanbanMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    kanbanMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span>Lista Geral de Leads</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-medium flex items-center gap-3">
              <span>Total de Leads: <strong className="text-white">{conversations.length}</strong></span>
              <span>Não Lidos: <strong className="text-emerald-400">{unreadConversations.length}</strong></span>
            </div>
          </div>

          {kanbanMode === 'board' ? (
            /* BOARD VIEW (COLUMNS) */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Mobile Stage Selector Tabs (visível apenas em telas pequenas) */}
              <div className="flex md:hidden overflow-x-auto gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
                {KANBAN_STAGES.map((stage) => {
                  const stageCount = conversations.filter(
                    (c) => (c.lead_status || 'novo') === stage.id
                  ).length;
                  const isActive = activeMobileStage === stage.id;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => setActiveMobileStage(stage.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{stage.title}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-950/50 text-[10px]">
                        {stageCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-x-auto p-4 md:p-6 min-h-0 flex gap-5 snap-x">
                {KANBAN_STAGES.map((stage) => {
                  const stageLeads = conversations.filter(
                    (c) => (c.lead_status || 'novo') === stage.id
                  );

                  return (
                    <div
                      key={stage.id}
                      className={`w-full md:w-80 shrink-0 ${
                        activeMobileStage === stage.id ? 'flex' : 'hidden md:flex'
                      } flex-col bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl snap-center`}
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
                            const isChecked = selectedIds.includes(lead.id);

                            return (
                              <div
                                key={lead.id}
                                className={`p-3.5 rounded-xl bg-slate-950 border transition shadow-md hover:border-slate-700 space-y-3 ${
                                  isChecked ? 'border-blue-500/80 ring-1 ring-blue-500/40 bg-blue-950/10' :
                                  isUnread ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-slate-800'
                                }`}
                              >
                                {/* Card Top: Multi-Select Checkbox & Platform Badge */}
                                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
                                  <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => handleToggleSelect(lead.id, e)}
                                      className="h-3.5 w-3.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span>Selecionar</span>
                                  </label>
                                  {getPlatformBadge(lead.platform)}
                                </div>

                                {/* Customer info */}
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
                                        {lead.profile_name || 'Perfil'} • {new Date(lead.last_message_at || lead.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                              {/* Lead Notes Snippet if present */}
                              {lead.notes && (
                                <p className="text-[11px] text-amber-300/80 italic bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg line-clamp-2">
                                  "{lead.notes}"
                                </p>
                              )}

                              {/* Last message */}
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed bg-slate-900/30 p-2 rounded-lg">
                                {lead.last_message || 'Nenhuma mensagem recente'}
                              </p>

                              {/* Status Dropdown - Free transitions back and forward! */}
                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Etapa:</span>
                                <select
                                  value={lead.lead_status || 'novo'}
                                  onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                  className="flex-1 bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                                >
                                  <option value="novo">🔵 Novo Lead</option>
                                  <option value="em_negociacao">🟡 Em Negociação</option>
                                  <option value="fechado">🟢 Venda Fechada</option>
                                  <option value="perdido">🔴 Perdido</option>
                                </select>
                              </div>

                              {/* Fast Action Buttons Bar */}
                              <div className="flex items-center justify-between gap-1.5 pt-1">
                                <button
                                  onClick={() => {
                                    setSelectedId(lead.id);
                                    setCurrentTab('inbox');
                                  }}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold flex items-center justify-center gap-1 transition"
                                  title="Abrir bate-papo com este lead"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  <span>Chat</span>
                                </button>

                                <button
                                  onClick={(e) => openLeadDetails(lead, e)}
                                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition border border-slate-700"
                                  title="Anotações e detalhes do lead"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                                  <span>Notas</span>
                                </button>

                                <button
                                  onClick={(e) => handleDeleteConversation(lead.id, lead.customer_name, e)}
                                  disabled={deletingId === lead.id}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                  title="Excluir este lead permanentemente"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
            </div>
          ) : (
            /* LIST / TABLE VIEW */
            <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === conversations.length}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="p-3.5">Cliente & Origem</th>
                      <th className="p-3.5">Produto & Preço</th>
                      <th className="p-3.5">Status do Funil</th>
                      <th className="p-3.5">Contato / WhatsApp</th>
                      <th className="p-3.5">Observações</th>
                      <th className="p-3.5">Última Mensagem</th>
                      <th className="p-3.5 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {conversations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          Nenhum lead encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      conversations.map((lead) => {
                        const isUnread = (lead.unread_count && lead.unread_count > 0) || lead.unread;
                        const isChecked = selectedIds.includes(lead.id);

                        return (
                          <tr
                            key={lead.id}
                            className={`hover:bg-slate-800/40 transition ${
                              isChecked ? 'bg-blue-950/20' :
                              isUnread ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            {/* Checkbox de seleção */}
                            <td className="p-3.5 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleToggleSelect(lead.id, e)}
                                className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                              />
                            </td>

                            {/* Cliente */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 shrink-0 border border-slate-700">
                                  {lead.customer_name?.charAt(0) || 'C'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span className="truncate">{lead.customer_name}</span>
                                    {isUnread && (
                                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {getPlatformBadge(lead.platform)}
                                    <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                                      {lead.profile_name || 'Perfil'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Produto */}
                            <td className="p-3.5">
                              {lead.product_title ? (
                                <div className="space-y-0.5 max-w-xs">
                                  <div className="font-medium text-blue-400 truncate flex items-center gap-1">
                                    <ShoppingBag className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{lead.product_title}</span>
                                  </div>
                                  {lead.product_price && (
                                    <div className="text-emerald-400 font-bold text-[11px]">
                                      {lead.product_price}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 italic">Geral / Não informado</span>
                              )}
                            </td>

                            {/* Status Dropdown - Free bidirectional movement! */}
                            <td className="p-3.5">
                              <select
                                value={lead.lead_status || 'novo'}
                                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-base sm:text-xs font-bold text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                              >
                                <option value="novo">🔵 Novo Lead</option>
                                <option value="em_negociacao">🟡 Em Negociação</option>
                                <option value="fechado">🟢 Venda Fechada</option>
                                <option value="perdido">🔴 Perdido</option>
                              </select>
                            </td>

                            {/* WhatsApp / Telefone */}
                            <td className="p-3.5">
                              {lead.customer_phone ? (
                                <a
                                  href={`https://wa.me/${lead.customer_phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-400 hover:underline font-semibold flex items-center gap-1 text-xs"
                                >
                                  <Phone className="h-3 w-3" />
                                  <span>{lead.customer_phone}</span>
                                </a>
                              ) : (
                                <button
                                  onClick={(e) => openLeadDetails(lead, e)}
                                  className="text-slate-500 hover:text-slate-300 text-[11px] underline flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Adicionar</span>
                                </button>
                              )}
                            </td>

                            {/* Observações */}
                            <td className="p-3.5 max-w-xs">
                              {lead.notes ? (
                                <div
                                  onClick={(e) => openLeadDetails(lead, e)}
                                  className="cursor-pointer text-slate-300 italic text-[11px] truncate bg-slate-950 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700"
                                  title="Clique para editar as notas"
                                >
                                  "{lead.notes}"
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => openLeadDetails(lead, e)}
                                  className="text-slate-600 hover:text-slate-400 text-[11px] italic"
                                >
                                  + Inserir anotação
                                </button>
                              )}
                            </td>

                            {/* Última Mensagem */}
                            <td className="p-3.5 max-w-xs">
                              <p className="text-slate-400 truncate text-[11px]">
                                {lead.last_message || 'Sem mensagens'}
                              </p>
                              <span className="text-[10px] text-slate-600">
                                {new Date(lead.last_message_at || lead.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            {/* Ações */}
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedId(lead.id);
                                    setCurrentTab('inbox');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold flex items-center gap-1 transition"
                                  title="Abrir bate-papo"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  <span>Chat</span>
                                </button>

                                <button
                                  onClick={(e) => openLeadDetails(lead, e)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  title="Editar detalhes do lead"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                                </button>

                                <button
                                  onClick={(e) => handleDeleteConversation(lead.id, lead.customer_name, e)}
                                  disabled={deletingId === lead.id}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                  title="Excluir lead"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* INSIGHTS & METRICS VIEW */
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-y-auto p-6 space-y-6">
          {/* Top Banner: Instagram Insights */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/60 via-slate-900/80 to-pink-950/40 border border-purple-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-bold">
                  <BarChart3 className="h-3.5 w-3.5 text-pink-400" />
                  <span>Instagram Insights & Métricas</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Painel de Crescimento e Desempenho (30 Dias)
                </h2>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                  Monitore em tempo real o alcance de contas, taxa de engajamento, novos seguidores e volume de mensagens recebidas no seu Instagram Direct.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  onClick={fetchInsights}
                  disabled={loadingInsights}
                  className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition hover:text-white"
                  title="Recarregar métricas salvas"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingInsights ? 'animate-spin text-pink-400' : ''}`} />
                  <span>{loadingInsights ? 'Atualizando...' : 'Atualizar Métricas'}</span>
                </button>

                <button
                  onClick={handleOpenInsightInBrowser}
                  disabled={openingInsightTab}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition shadow-lg shadow-pink-600/30 ring-1 ring-pink-400/40 disabled:opacity-50 active:scale-95 cursor-pointer"
                  title="Abrir a URL https://www.instagram.com/accounts/insights/?timeframe=30 no navegador do perfil ativo"
                >
                  <Tv className="h-4 w-4" />
                  <span>{openingInsightTab ? 'Abrindo no Chrome...' : 'Abrir Insights no Navegador (noVNC)'}</span>
                </button>

                <a
                  href={`https://www.instagram.com/accounts/insights/?timeframe=${insightTimeframe}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Link Direto</span>
                </a>
              </div>
            </div>

            {/* Timeframe Selector Bar */}
            <div className="mt-6 pt-5 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Período de Análise:</span>
                <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
                  {[
                    { id: '7', label: '7 Dias' },
                    { id: '14', label: '14 Dias' },
                    { id: '30', label: '30 Dias (Padrão)' },
                    { id: '90', label: '90 Dias' },
                  ].map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setInsightTimeframe(tf.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition ${
                        insightTimeframe === tf.id
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-pink-500 animate-ping"></span>
                <span>URL Oficial: <code className="text-pink-300 font-mono">https://www.instagram.com/accounts/insights/?timeframe={insightTimeframe}</code></span>
                {realInsights?.synced_at && (
                  <span className="text-[10px] text-slate-500 ml-2">
                    (Sincronizado às {new Date(realInsights.synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </div>
            </div>
          </div>

          {(() => {
            const viewsVal = realInsights?.views || 8485;
            const viewersVal = realInsights?.viewers || 3219;
            const folViewsPct = realInsights?.followers_views_pct !== undefined ? Number(realInsights.followers_views_pct) : 22.2;
            const nonFolViewsPct = realInsights?.non_followers_views_pct !== undefined ? Number(realInsights.non_followers_views_pct) : 77.8;
            const storiesViewsPct = realInsights?.stories_views_pct !== undefined ? Number(realInsights.stories_views_pct) : 67.1;
            const postsViewsPct = realInsights?.posts_views_pct !== undefined ? Number(realInsights.posts_views_pct) : 22.9;
            const reelsViewsPct = realInsights?.reels_views_pct !== undefined ? Number(realInsights.reels_views_pct) : 10.0;

            const interactionsVal = realInsights?.interactions || 138;
            const accountsEngagedVal = realInsights?.accounts_engaged || 55;
            const folInterPct = realInsights?.followers_interactions_pct !== undefined ? Number(realInsights.followers_interactions_pct) : 61.6;
            const nonFolInterPct = realInsights?.non_followers_interactions_pct !== undefined ? Number(realInsights.non_followers_interactions_pct) : 38.4;
            const storiesInterPct = realInsights?.stories_interactions_pct !== undefined ? Number(realInsights.stories_interactions_pct) : 47.4;
            const postsInterPct = realInsights?.posts_interactions_pct !== undefined ? Number(realInsights.posts_interactions_pct) : 40.8;
            const reelsInterPct = realInsights?.reels_interactions_pct !== undefined ? Number(realInsights.reels_interactions_pct) : 11.8;

            const profileActVal = realInsights?.profile_activity || 339;
            const profileVisitsVal = realInsights?.profile_visits || 270;
            const linkTapsVal = realInsights?.external_link_taps || 69;
            const totalFollowersVal = realInsights?.total_followers || 1163;

            const activeTimes = realInsights?.active_times && realInsights.active_times.length > 0 ? realInsights.active_times : [
              { hour: '12a', count: 129 },
              { hour: '3a', count: 343 },
              { hour: '6a', count: 423 },
              { hour: '9a', count: 426 },
              { hour: '12p', count: 442 },
              { hour: '3p', count: 462 },
              { hour: '6p', count: 288 },
              { hour: '9p', count: 72 }
            ];

            const topViews = realInsights?.top_content_views && realInsights.top_content_views.length > 0 ? realInsights.top_content_views : [
              { views: 116, date: 'Sep 8' },
              { views: 103, date: 'Aug 25' },
              { views: 92, date: 'Aug 15' },
              { views: 76, date: 'Aug 24' },
              { views: 74, date: 'Aug 15' }
            ];

            const topInteractions = realInsights?.top_content_interactions && realInsights.top_content_interactions.length > 0 ? realInsights.top_content_interactions : [
              { interactions: 7, date: 'Aug 25' },
              { interactions: 4, date: 'Aug 24' },
              { interactions: 3, date: 'Sep 3' },
              { interactions: 3, date: 'Sep 3' },
              { interactions: 3, date: 'Aug 28' }
            ];

            const maxActive = Math.max(...activeTimes.map((t: any) => Number(t.count) || 0), 1);

            return (
              <div className="space-y-6">
                {/* 4 Primary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Views */}
                  <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-pink-500/40 transition shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Views (Visualizações)</span>
                      <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 group-hover:scale-110 transition">
                        <Eye className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">{viewsVal.toLocaleString('pt-BR')}</div>
                    <div className="mt-1 text-xs text-pink-300 font-semibold">
                      {viewersVal.toLocaleString('pt-BR')} contas alcançadas (Viewers)
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>👥 Seg.: <strong className="text-slate-200">{folViewsPct}%</strong></span>
                      <span>🌐 Não seg.: <strong className="text-slate-200">{nonFolViewsPct}%</strong></span>
                    </div>
                  </div>

                  {/* Card 2: Interactions */}
                  <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 transition shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interações</span>
                      <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition">
                        <Activity className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">{interactionsVal.toLocaleString('pt-BR')}</div>
                    <div className="mt-1 text-xs text-purple-300 font-semibold">
                      {accountsEngagedVal.toLocaleString('pt-BR')} contas com engajamento
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>👥 Seg.: <strong className="text-slate-200">{folInterPct}%</strong></span>
                      <span>🌐 Não seg.: <strong className="text-slate-200">{nonFolInterPct}%</strong></span>
                    </div>
                  </div>

                  {/* Card 3: Profile Activity */}
                  <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atividade do Perfil</span>
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition">
                        <Compass className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">{profileActVal.toLocaleString('pt-BR')}</div>
                    <div className="mt-1 text-xs text-blue-300 font-semibold">
                      {profileVisitsVal.toLocaleString('pt-BR')} visitas ao perfil
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>🔗 Toques Link Bio: <strong className="text-emerald-300">{linkTapsVal}</strong></span>
                    </div>
                  </div>

                  {/* Card 4: Total Followers */}
                  <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Seguidores</span>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition">
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">{totalFollowersVal.toLocaleString('pt-BR')}</div>
                    <div className="mt-1 text-xs text-emerald-300 font-semibold">
                      Base ativa de clientes e seguidores
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>💬 Direct Leads: <strong className="text-slate-200">{conversations.filter(c => c.platform === 'instagram').length} conversas</strong></span>
                    </div>
                  </div>
                </div>

                {/* Content Type Breakdown & Most Active Times */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Content Breakdown (Views & Interactions) */}
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-pink-400" />
                        <h3 className="text-sm font-bold text-white">Desempenho por Formato de Conteúdo</h3>
                      </div>
                      <span className="text-xs text-slate-500">Últimos {insightTimeframe} dias</span>
                    </div>

                    {/* Breakdown 1: Views */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Visualizações por Formato (Views)</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pink-500"></span> Stories</span>
                          <span className="font-bold text-white">{storiesViewsPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full" style={{ width: `${storiesViewsPct}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Publicações (Posts)</span>
                          <span className="font-bold text-white">{postsViewsPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${postsViewsPct}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Reels</span>
                          <span className="font-bold text-white">{reelsViewsPct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${reelsViewsPct}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown 2: Interactions */}
                    <div className="space-y-2 pt-4 border-t border-slate-800">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Interações por Formato (Engajamento)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                          <span className="text-[11px] text-pink-400 font-bold block">Stories</span>
                          <span className="text-base font-black text-white">{storiesInterPct}%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                          <span className="text-[11px] text-blue-400 font-bold block">Posts</span>
                          <span className="text-base font-black text-white">{postsInterPct}%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                          <span className="text-[11px] text-emerald-400 font-bold block">Reels</span>
                          <span className="text-base font-black text-white">{reelsInterPct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Most Active Times (Horários Mais Ativos) */}
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-400" />
                          <h3 className="text-sm font-bold text-white">Horários Mais Ativos dos Seguidores</h3>
                        </div>
                        <span className="text-xs text-emerald-400 font-bold">Pico às 3p (462)</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Distribuição do volume de público conectado nas principais faixas de horário do dia:
                      </p>

                      {/* Bar Chart Grid */}
                      <div className="grid grid-cols-8 gap-2 items-end h-32 pt-4 px-2 bg-slate-950/60 rounded-xl border border-slate-800">
                        {activeTimes.map((item: any, idx: number) => {
                          const heightPct = Math.max(15, Math.round((Number(item.count) / maxActive) * 100));
                          const isPeak = Number(item.count) >= 440;
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                              <span className="text-[9px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition">
                                {item.count}
                              </span>
                              <div
                                className={`w-full rounded-t-md transition-all ${
                                  isPeak
                                    ? 'bg-gradient-to-t from-pink-600 to-purple-500 shadow-md shadow-pink-500/40'
                                    : 'bg-slate-700 group-hover:bg-slate-500'
                                }`}
                                style={{ height: `${heightPct}%` }}
                                title={`${item.hour}: ${item.count} seguidores ativos`}
                              ></div>
                              <span className={`text-[10px] font-bold ${isPeak ? 'text-pink-400' : 'text-slate-400'}`}>
                                {item.hour}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top Content Highlights */}
                    <div className="pt-4 border-t border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-300 block">Top Conteúdos Recentes (Views / Interações):</span>
                      <div className="flex flex-wrap gap-2">
                        {topViews.slice(0, 3).map((tv: any, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-[11px] text-pink-300 font-medium">
                            👁️ {tv.views} views ({tv.date})
                          </span>
                        ))}
                        {topInteractions.slice(0, 2).map((ti: any, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 font-medium">
                            ⚡ {ti.interactions} interações ({ti.date})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Detailed Section: Instagram Leads & Live Sync Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Conversas Recentes do Instagram */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-pink-400" />
                  <h3 className="text-sm font-bold text-white">Últimas Conversas Sincronizadas do Instagram Direct</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedPlatform('instagram');
                    setCurrentTab('inbox');
                  }}
                  className="text-xs text-pink-400 hover:text-pink-300 font-semibold transition flex items-center gap-1"
                >
                  <span>Ver todas no Inbox</span>
                  <span>➜</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {conversations.filter(c => c.platform === 'instagram').length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Nenhuma conversa do Instagram sincronizada ainda. Abra o Instagram Direct no noVNC e clique em sincronizar.
                  </div>
                ) : (
                  conversations
                    .filter(c => c.platform === 'instagram')
                    .slice(0, 5)
                    .map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setSelectedId(conv.id);
                          setCurrentTab('inbox');
                        }}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-pink-500/30 hover:bg-slate-900/80 cursor-pointer transition flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {conv.customer_avatar ? (
                            <img src={conv.customer_avatar} alt={conv.customer_name} className="h-9 w-9 rounded-full object-cover shrink-0 border border-pink-500/30" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-slate-800 text-pink-400 font-black text-xs flex items-center justify-center shrink-0 border border-pink-500/30">
                              {conv.customer_name?.charAt(0) || 'I'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200 truncate">{conv.customer_name}</span>
                              {((conv.unread_count && conv.unread_count > 0) || conv.unread) && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{conv.last_message || 'Conversa iniciada'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(conv.lead_status || 'novo')}
                          <span className="text-[10px] text-slate-500">
                            {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Right 1 Col: Explanatory & Direct Instructions */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Como Funciona a Análise de Insights</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O Instagram fornece os relatórios detalhados de contas profissionais diretamente pela URL oficial de contas comerciais.
                </p>
                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-purple-300">
                    <span>💡 Sessão Segura e Automática</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Quando você clica em <strong>"Abrir Insights no Navegador"</strong>, o sistema abre a URL <code className="text-purple-300 font-mono">/accounts/insights/?timeframe={insightTimeframe}</code> na sessão já logada do seu navegador seguro no servidor Docker.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  onClick={handleOpenInsightInBrowser}
                  disabled={openingInsightTab}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                >
                  <Tv className="h-3.5 w-3.5" />
                  <span>Acessar no noVNC Agora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LEAD DETAILS & OBSERVATIONS - Clean White */}
      {detailsModalLead && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Editar Ficha do Lead
                  </h3>
                  <p className="text-xs text-slate-500">
                    {detailsModalLead.customer_name} • {detailsModalLead.product_title || 'Canal Direto'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Etapa do Funil Comercial:
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                >
                  {statuses.length > 0 ? (
                    statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="novo">🔵 Novo Lead</option>
                      <option value="em_negociacao">🟡 Em Negociação</option>
                      <option value="fechado">🟢 Venda Fechada</option>
                      <option value="perdido">🔴 Perdido</option>
                    </>
                  )}
                </select>
              </div>

              {/* Phone & Atendente */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    WhatsApp / Telefone:
                  </label>
                  <input
                    type="text"
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Atendente / Responsável:
                  </label>
                  <input
                    type="text"
                    value={modalAssignedTo}
                    onChange={(e) => setModalAssignedTo(e.target.value)}
                    placeholder="Nome do operador"
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Cidade & Estado */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cidade:
                  </label>
                  <input
                    type="text"
                    value={modalCity}
                    onChange={(e) => setModalCity(e.target.value)}
                    placeholder="Belo Horizonte"
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Estado (UF):
                  </label>
                  <input
                    type="text"
                    value={modalState}
                    onChange={(e) => setModalState(e.target.value)}
                    placeholder="MG"
                    maxLength={2}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Endereço Completo de Entrega:
                </label>
                <input
                  type="text"
                  value={modalAddress}
                  onChange={(e) => setModalAddress(e.target.value)}
                  placeholder="Rua, número, complemento, bairro"
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Deal Value */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Valor Acordado / Proposta:
                </label>
                <input
                  type="text"
                  value={modalDealValue}
                  onChange={(e) => setModalDealValue(e.target.value)}
                  placeholder="R$ 149,90"
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observações Gerais do Cliente:
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Informações relevantes sobre este cliente ou pedido..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setDetailsModalLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLeadDetails}
                disabled={savingLeadDetails}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs"
              >
                {savingLeadDetails ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>Salvar Informações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE FOLLOW-UP - Clean White */}
      {showFollowupModal && activeThread && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Agendar Follow-up
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cliente: {activeThread.conversation.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFollowupModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Quick Shortcuts */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Atalhos de Horário:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickFollowupDate(0, 15, 0)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                  >
                    Hoje às 15h
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFollowupDate(1, 10, 0)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                  >
                    Amanhã às 10h
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFollowupDate(2, 14, 30)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                  >
                    Em 2 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFollowupDate(3, 14, 30)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                  >
                    Em 3 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFollowupDate(7, 14, 30)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                  >
                    Em 7 dias
                  </button>
                </div>
              </div>

              {/* Date & Time Picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Data e Horário:
                </label>
                <input
                  type="datetime-local"
                  value={followupForm.scheduled_at}
                  onChange={(e) => setFollowupForm({ ...followupForm, scheduled_at: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Type & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tipo de Contato:
                  </label>
                  <select
                    value={followupForm.followup_type}
                    onChange={(e) => setFollowupForm({ ...followupForm, followup_type: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="WhatsApp">💬 WhatsApp</option>
                    <option value="Ligar">📞 Ligar</option>
                    <option value="Mensagem">✉️ Mensagem</option>
                    <option value="Pagamento">💰 Pagamento</option>
                    <option value="Pedido">📦 Pedido</option>
                    <option value="Orçamento">📄 Orçamento</option>
                    <option value="Retorno">🔄 Retorno</option>
                    <option value="Outro">📌 Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Prioridade:
                  </label>
                  <select
                    value={followupForm.priority}
                    onChange={(e) => setFollowupForm({ ...followupForm, priority: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="normal">⚪ Normal</option>
                    <option value="high">🟡 Alta</option>
                    <option value="urgent">🔴 Urgente</option>
                    <option value="low">🟢 Baixa</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observações do Follow-up:
                </label>
                <textarea
                  value={followupForm.notes}
                  onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })}
                  placeholder="Ex: Cobrar retorno sobre a proposta de miniaturas..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowFollowupModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFollowup}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Agendar Follow-up</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GLOBAL FOLLOW-UPS CENTER - Clean White */}
      {showGlobalFollowupsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Central de Follow-ups da Equipe
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {allFollowups.filter((f) => f.status === 'pending').length} pendentes
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe todos os retornos comerciais e cobranças agendadas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGlobalFollowupsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-500 shrink-0 gap-2">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'atrasados', label: 'Atrasados' },
                { id: 'amanha', label: 'Amanhã' },
                { id: 'semana', label: 'Esta Semana' },
                { id: 'todos', label: 'Todos Pendentes' },
                { id: 'concluidos', label: 'Concluídos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGlobalFollowupFilter(tab.id as any)}
                  className={`py-2.5 px-3 transition border-b-2 ${
                    globalFollowupFilter === tab.id
                      ? 'border-amber-600 text-amber-700 font-bold bg-white'
                      : 'border-transparent hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {(() => {
                const now = Date.now();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dayAfterTomorrow = new Date(today);
                dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
                const weekEnd = new Date(today);
                weekEnd.setDate(weekEnd.getDate() + 7);

                const filtered = allFollowups.filter((f) => {
                  const raw = f.scheduled_at || f.due_at;
                  const dueDate = raw ? new Date(raw) : new Date();
                  const isPending = f.status === 'pending';

                  if (globalFollowupFilter === 'concluidos') return f.status === 'completed';
                  if (!isPending) return false;

                  if (globalFollowupFilter === 'atrasados') return dueDate.getTime() < now;
                  if (globalFollowupFilter === 'hoje') return dueDate >= today && dueDate < tomorrow;
                  if (globalFollowupFilter === 'amanha') return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
                  if (globalFollowupFilter === 'semana') return dueDate >= today && dueDate <= weekEnd;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                      <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto" />
                      <p>Nenhum follow-up encontrado nesta categoria.</p>
                    </div>
                  );
                }

                return filtered.map((fl) => {
                  const isDone = fl.status === 'completed';
                  const raw = fl.scheduled_at || fl.due_at;
                  const dueDate = raw ? new Date(raw) : null;
                  const isValid = dueDate && !isNaN(dueDate.getTime());
                  const isOverdue = !isDone && isValid && dueDate.getTime() < now;
                  const flType = fl.followup_type || fl.type || 'WhatsApp';
                  const dateFormatted = isValid
                    ? `${dueDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} às ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Data a definir';

                  return (
                    <div
                      key={fl.id}
                      className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 shadow-xs ${
                        isDone
                          ? 'bg-slate-50 border-slate-200 opacity-70'
                          : isOverdue
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {fl.customer_name || 'Cliente'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-100 text-amber-800 capitalize">
                            {flType}
                          </span>
                          {isOverdue && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-rose-500 text-white">
                              Atrasado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3">
                          <span>
                            📅 {dateFormatted}
                          </span>
                          {fl.customer_phone && <span>📞 {fl.customer_phone}</span>}
                        </div>
                        {fl.notes && (
                          <p className="text-[11px] text-slate-600 italic mt-1 line-clamp-1">
                            "{fl.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isDone && (
                          <button
                            onClick={() => handleCompleteFollowup(fl.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                            title="Marcar como concluído"
                          >
                            <Check className="h-3 w-3" />
                            <span>Concluir</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (fl.conversation_id) {
                              setSelectedId(fl.conversation_id);
                              setCurrentTab('inbox');
                              setShowGlobalFollowupsModal(false);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition"
                          title="Abrir chat deste cliente"
                        >
                          Abrir Chat
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setShowGlobalFollowupsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK REPLIES CONFIGURATION */}
      {showQuickSettings && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Central de Respostas Rápidas
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure mensagens personalizadas para agilizar suas respostas manuais
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickSettings(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Add New Template Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Criar Nova Mensagem Rápida:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTemplateInput}
                    onChange={(e) => setNewTemplateInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTemplate();
                      }
                    }}
                    placeholder="Ex: Tenho sim! Podemos enviar via Sedex hoje mesmo..."
                    className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddTemplate}
                    disabled={!newTemplateInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Template List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Mensagens Salvas ({quickTemplates.length}):
                  </span>
                  <button
                    onClick={handleResetTemplates}
                    className="text-[11px] text-slate-500 hover:text-amber-400 underline"
                  >
                    Restaurar Padrões
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {quickTemplates.map((tmpl, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-200 line-clamp-2">{tmpl}</span>
                      <button
                        onClick={() => handleDeleteTemplate(idx)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                        title="Remover esta mensagem"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
              <button
                onClick={() => setShowQuickSettings(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar (Barra Flutuante de Ações em Massa) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl px-5 py-3 rounded-2xl text-xs text-white animate-fadeIn max-w-[95vw] overflow-x-auto">
          <span className="font-bold bg-blue-600/30 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/40 flex items-center gap-1.5 shrink-0">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{selectedIds.length} selecionados</span>
          </span>

          <div className="h-4 w-px bg-slate-700 shrink-0"></div>

          <span className="text-slate-400 font-medium hidden sm:inline shrink-0">Mover status:</span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleBulkStatus('novo')}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 font-semibold transition text-[11px]"
            >
              Novo
            </button>
            <button
              onClick={() => handleBulkStatus('em_negociacao')}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 font-semibold transition text-[11px]"
            >
              Negociação
            </button>
            <button
              onClick={() => handleBulkStatus('fechado')}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 font-semibold transition text-[11px]"
            >
              Fechado
            </button>
            <button
              onClick={() => handleBulkStatus('perdido')}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 font-semibold transition text-[11px]"
            >
              Perdido
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700 shrink-0"></div>

          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 text-[11px] shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Excluir</span>
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-medium transition text-[11px] shrink-0"
          >
            Desmarcar
          </button>
        </div>
      )}

      {/* Modal da Galeria de Mídias do Produto (Foto/Vídeo adicionais) */}
      {activeMediaGallery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scaleIn">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Galeria: {activeMediaGallery.product.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Clique em qualquer mídia para enviá-la instantaneamente na conversa ativa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMediaGallery(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeMediaGallery.media.map((m: any, idx: number) => {
                  const mediaUrl = m.url || m.file_path || m;
                  const isVideo = m.media_type === 'video' || String(mediaUrl).match(/\.(mp4|webm|mov)$/i);
                  return (
                    <div
                      key={m.id || idx}
                      className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-square flex flex-col justify-end"
                    >
                      {isVideo ? (
                        <video
                          src={mediaUrl}
                          className="w-full h-full object-cover"
                          controls={false}
                        />
                      ) : (
                        <img
                          src={mediaUrl}
                          alt={m.title || `Mídia ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      )}

                      {/* Overlay and send button */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <span className="text-[10px] font-semibold text-white bg-black/40 px-1.5 py-0.5 rounded self-start backdrop-blur-xs">
                          {isVideo ? 'Vídeo' : 'Foto'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeThread) {
                              alert('Selecione uma conversa para enviar a mídia.');
                              return;
                            }
                            handleSendReply(
                              `[${activeMediaGallery.product.name}] ${m.title || ''}`,
                              mediaUrl
                            );
                            setActiveMediaGallery(null);
                          }}
                          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <Send className="h-3 w-3" />
                          <span>Enviar no Chat</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{activeMediaGallery.media.length} itens disponíveis</span>
              <button
                type="button"
                onClick={() => setActiveMediaGallery(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Catalog Drawer for Mobile / Compact Screens */}
      {showFloatingCatalog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-slideLeft">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Catálogo de Produtos</h3>
                  <p className="text-[11px] text-slate-500">Ações rápidas de venda no chat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFloatingCatalog(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content: Search + Category filter + Product list */}
            <div className="p-3 border-b border-slate-100 space-y-2 bg-white">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar produto por nome, SKU, marca..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-base sm:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Categories scroll */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCatalogCategoryFilter('all')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition ${
                    catalogCategoryFilter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({catalogProducts.length})
                </button>
                {catalogCategories.map((cat: any) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCatalogCategoryFilter(String(cat.id))}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition ${
                      catalogCategoryFilter === String(cat.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/40">
              {loadingCatalog ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-purple-600" />
                  Carregando catálogo...
                </div>
              ) : filteredChatCatalogProducts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Nenhum produto encontrado.
                </div>
              ) : (
                filteredChatCatalogProducts.map((prod: any) => {
                  const selectedVariant = selectedProductVariants[prod.id] || prod.variants?.[0];
                  const hasVariants = prod.variants && prod.variants.length > 0;
                  const activePrice = selectedVariant?.price || prod.price;
                  const activeStock = selectedVariant?.stock !== undefined ? selectedVariant.stock : prod.stock;
                  const hasPromo = !!prod.promotional_price && Number(prod.promotional_price) > 0;
                  const isCopied = copiedProductId === prod.id;

                  return (
                    <div
                      key={prod.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-purple-200 hover:shadow-xs transition space-y-2"
                    >
                      <div className="flex gap-2.5">
                        <div className="h-14 w-14 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                          {(prod.main_image || prod.image_url) ? (
                            <img src={prod.main_image || prod.image_url} alt={prod.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 text-slate-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {prod.sku && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                                {prod.sku}
                              </span>
                            )}
                            {prod.brand && (
                              <span className="text-[10px] text-slate-500 truncate font-medium">
                                {prod.brand}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                            {prod.name}
                          </h4>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            {hasPromo ? (
                              <>
                                <span className="text-xs font-bold text-emerald-600">
                                  R$ {Number(prod.promotional_price).toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-[10px] text-slate-400 line-through">
                                  R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-slate-900">
                                R$ {Number(activePrice).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                            <span className={`text-[9px] font-semibold px-1 py-0.2 rounded ml-auto ${
                              activeStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {activeStock > 0 ? `${activeStock} un.` : 'Esgotado'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {hasVariants && (
                        <div className="pt-0.5">
                          <select
                            value={selectedVariant?.id || ''}
                            onChange={(e) => {
                              const v = prod.variants.find((item: any) => String(item.id) === e.target.value);
                              setSelectedProductVariants((prev) => ({ ...prev, [prod.id]: v }));
                            }}
                            className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-800 font-medium focus:outline-none focus:border-purple-500"
                          >
                            {prod.variants.map((v: any) => (
                              <option key={v.id} value={v.id}>
                                {v.name} • R$ {Number(v.price || prod.price).toFixed(2).replace('.', ',')} ({v.stock} un.)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            handleInsertProductPitch(prod, selectedVariant, false);
                            setShowFloatingCatalog(false);
                          }}
                          className="py-1 px-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Edit3 className="h-3 w-3 text-blue-600" />
                          <span>Preencher</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleInsertProductPitch(prod, selectedVariant, true);
                            setShowFloatingCatalog(false);
                          }}
                          className="py-1 px-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Send className="h-3 w-3" />
                          <span>Enviar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleSendProductPhoto(prod);
                            setShowFloatingCatalog(false);
                          }}
                          className="py-1 px-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <ImageIcon className="h-3 w-3" />
                          <span>Foto</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-0.5 px-0.5">
                        <button
                          type="button"
                          onClick={() => handleCopyProductInfo(prod, selectedVariant)}
                          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                        >
                          {isCopied ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5" />}
                          <span>{isCopied ? 'Copiado!' : 'Copiar dados'}</span>
                        </button>

                        {prod.media && prod.media.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMediaGallery({ product: prod, media: prod.media });
                              setShowFloatingCatalog(false);
                            }}
                            className="text-purple-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ImageIcon className="h-2.5 w-2.5" />
                            <span>+{prod.media.length} fotos</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMITIR COMANDA / PEDIDO DE VENDA */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Emitir Comanda / Pedido de Venda
                  </h3>
                  <p className="text-xs text-slate-500">
                    Snack Store BH • Edifício Savannah Mall (Barro Preto)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Section 1: Dados do Cliente */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span>Dados do Cliente</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={orderForm.customer_name}
                      onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                      placeholder="Ex: William Gomes Pacheco"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={orderForm.customer_phone}
                      onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                      placeholder="Ex: 31998592398"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">CPF do Cliente</label>
                    <input
                      type="text"
                      value={orderForm.customer_cpf}
                      onChange={(e) => setOrderForm({ ...orderForm, customer_cpf: e.target.value })}
                      placeholder="Ex: 299.986.358.61"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      value={orderForm.customer_email}
                      onChange={(e) => setOrderForm({ ...orderForm, customer_email: e.target.value })}
                      placeholder="Ex: cliente@email.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Endereço de Entrega Completo</label>
                    <input
                      type="text"
                      value={orderForm.delivery_address}
                      onChange={(e) => setOrderForm({ ...orderForm, delivery_address: e.target.value })}
                      placeholder="Ex: Rua dos Guajajaras, 40 - Centro, Belo Horizonte - MG"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Produtos da Comanda */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <Package className="h-3.5 w-3.5 text-purple-600" />
                    <span>Produtos da Comanda</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOrderItem}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Adicionar Item</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {orderForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-6">
                          <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">
                            Produto {idx + 1}
                          </label>
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => handleUpdateOrderItem(idx, 'product_name', e.target.value)}
                            placeholder="Nome ou descrição do produto..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-base sm:text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">Qtd</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateOrderItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-base sm:text-xs focus:outline-none focus:border-blue-500 text-center font-bold"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">Preço Unit. (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateOrderItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-base sm:text-xs focus:outline-none focus:border-blue-500 text-right font-bold"
                          />
                        </div>

                        <div className="md:col-span-1 flex items-end justify-center pt-3 md:pt-0">
                          {orderForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderItem(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Remover produto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Fast catalog selector pill */}
                      {catalogProducts.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pt-1 border-t border-slate-100 no-scrollbar">
                          <span className="text-slate-400 font-semibold shrink-0">Catálogo:</span>
                          {catalogProducts.slice(0, 5).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectCatalogForOrderItem(idx, p)}
                              className="px-2 py-0.5 rounded bg-white hover:bg-purple-50 text-purple-700 border border-slate-200 hover:border-purple-300 whitespace-nowrap font-medium transition"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Logística & Pagamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logística & Frete Automático */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      <span>Modo de Entrega & Frete</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Melhor Envio Oficial
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Método de Envio</label>
                    <select
                      value={orderForm.delivery_method}
                      onChange={(e: any) => setOrderForm({ ...orderForm, delivery_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="uber_flash">Uber Flash</option>
                      <option value="motoboy">Motoboy Express (BH e Região)</option>
                      <option value="retirada">Retirada Pessoalmente (Loja Física - Sala 55)</option>
                      <option value="correios">Correios (SEDEX / PAC)</option>
                      <option value="outro">Transportadora (Loggi, Jadlog, etc.)</option>
                    </select>
                  </div>

                  {/* Automated Shipping Calculator Box */}
                  <div className="p-3 rounded-xl bg-white border border-blue-100 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-blue-600" />
                        Cálculo Automático de Frete
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowDimensionsDrawer(!showDimensionsDrawer)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        {showDimensionsDrawer ? 'Ocultar Dimensões' : '1x10x15cm • 0.5kg ⚙'}
                      </button>
                    </div>

                    {/* Origin selector */}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Saída / Origem:</label>
                      <select
                        value={orderForm.origin_cep}
                        onChange={(e) => setOrderForm({ ...orderForm, origin_cep: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-base sm:text-xs font-semibold focus:outline-none focus:border-blue-500"
                      >
                        <option value="30730130">Saída 1: Padre Eustáquio (CEP 30730-130)</option>
                        <option value="30110017">Saída 2: Savassi / Centro (CEP 30110-017)</option>
                        <option value="30190110">Saída 3: Savannah Mall / Barro Preto (CEP 30190-110)</option>
                      </select>
                    </div>

                    {/* Destination CEP input + Calculate button */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={orderForm.destination_cep}
                          onChange={(e) => setOrderForm({ ...orderForm, destination_cep: e.target.value })}
                          placeholder="CEP do Cliente (ex: 01018-020)"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-base sm:text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCalculateOrderShipping}
                        disabled={shippingLoading}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                      >
                        {shippingLoading ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Calculando...</span>
                          </>
                        ) : (
                          <>
                            <span>Cotar Fretes</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Optional Drawer for dimensions */}
                    {showDimensionsDrawer && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-4 gap-1.5 text-[11px] animate-fadeIn">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase">Altura (cm)</label>
                          <input
                            type="number"
                            min="1"
                            value={orderForm.package_height}
                            onChange={(e) => setOrderForm({ ...orderForm, package_height: parseFloat(e.target.value) || 1 })}
                            className="w-full px-2 py-1 rounded bg-white border border-slate-200 text-center font-bold text-base sm:text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase">Largura (cm)</label>
                          <input
                            type="number"
                            min="10"
                            value={orderForm.package_width}
                            onChange={(e) => setOrderForm({ ...orderForm, package_width: parseFloat(e.target.value) || 10 })}
                            className="w-full px-2 py-1 rounded bg-white border border-slate-200 text-center font-bold text-base sm:text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase">Compr. (cm)</label>
                          <input
                            type="number"
                            min="15"
                            value={orderForm.package_length}
                            onChange={(e) => setOrderForm({ ...orderForm, package_length: parseFloat(e.target.value) || 15 })}
                            className="w-full px-2 py-1 rounded bg-white border border-slate-200 text-center font-bold text-base sm:text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase">Peso (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={orderForm.package_weight}
                            onChange={(e) => setOrderForm({ ...orderForm, package_weight: parseFloat(e.target.value) || 0.5 })}
                            className="w-full px-2 py-1 rounded bg-white border border-slate-200 text-center font-bold text-base sm:text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {shippingError && (
                      <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg font-medium">
                        {shippingError}
                      </p>
                    )}

                    {/* Quotes list */}
                    {shippingQuotes.length > 0 && (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          Opções Calculadas (Clique para aplicar):
                        </span>
                        {shippingQuotes.map((q) => (
                          <div
                            key={q.id}
                            onClick={() => handleApplyShippingQuote(q)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 cursor-pointer transition flex items-center justify-between gap-2 text-xs group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {q.company.picture ? (
                                <img src={q.company.picture} alt="" className="h-5 w-5 object-contain shrink-0" />
                              ) : (
                                <span className="h-5 w-5 rounded bg-slate-200 flex items-center justify-center text-[9px] font-bold shrink-0">
                                  📦
                                </span>
                              )}
                              <div className="truncate">
                                <span className="font-bold text-slate-900 group-hover:text-blue-700 block truncate">
                                  {q.company.name} ({q.name})
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {q.custom_delivery_time} dia{q.custom_delivery_time !== 1 ? 's' : ''} úteis
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-extrabold text-emerald-600 text-xs block">
                                R$ {Number(q.custom_price).toFixed(2).replace('.', ',')}
                              </span>
                              <span className="text-[9px] text-blue-600 font-semibold group-hover:underline">
                                Aplicar ✓
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual / Applied Shipping Fee Input */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Valor do Frete Cobrado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={orderForm.shipping_fee}
                      onChange={(e) => setOrderForm({ ...orderForm, shipping_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Pagamento */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Forma de Pagamento</span>
                  </div>
                  <div>
                    <select
                      value={orderForm.payment_method}
                      onChange={(e: any) => setOrderForm({ ...orderForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="pix">PIX (À Vista)</option>
                      <option value="cartao_vista">Cartão de Crédito (1x à vista)</option>
                      <option value="cartao_parcelado">Cartão de Crédito Parcelado</option>
                      <option value="dinheiro">Dinheiro na Entrega</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  {orderForm.payment_method === 'cartao_parcelado' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Parcelas</label>
                        <select
                          value={orderForm.installments}
                          onChange={(e) => setOrderForm({ ...orderForm, installments: parseInt(e.target.value, 10) || 1 })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none"
                        >
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <option key={n} value={n}>{n}x parcelas</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Valor Parcela</label>
                        <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold">
                          R$ {(orderTotalAmount / (orderForm.installments || 1)).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Desconto Comercial (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={orderForm.discount}
                      onChange={(e) => setOrderForm({ ...orderForm, discount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: WhatsApp Receipt Dispatch Toggle */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={orderForm.send_whatsapp}
                    onChange={(e) => setOrderForm({ ...orderForm, send_whatsapp: e.target.checked })}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="font-bold text-emerald-900 text-xs">
                    Disparar Recibo Oficial de Garantia no WhatsApp do Cliente Agora
                  </span>
                </label>
                <p className="text-[11px] text-emerald-700 pl-6.5">
                  Gera a mensagem completa com CNPJ, endereço da loja física no Barro Preto, dados do cliente, produtos, valores e garantia.
                </p>
              </div>

              {/* Financial Auto-sync Notice */}
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between text-[11px] text-blue-800">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                  <strong>Controle Financeiro:</strong> Registrará receita automaticamente no painel.
                </span>
                <span className="font-bold text-blue-900">
                  + R$ {orderTotalAmount.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div>
                <span className="text-slate-500 text-xs block font-medium">Total da Venda:</span>
                <span className="text-xl font-black text-emerald-600">
                  R$ {orderTotalAmount.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  disabled={orderSubmitting}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold transition text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={orderSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {orderSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Emitindo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirmar & Emitir Comanda</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR & COPIAR RECIBO OFICIAL */}
      {activeOrderReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Recibo Oficial de Garantia
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Código: #{activeOrderReceiptModal.order_code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrderReceiptModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed select-all overflow-x-auto shadow-inner border border-slate-800">
                {generateReceiptText(activeOrderReceiptModal)}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleCopyReceiptToClipboard(activeOrderReceiptModal)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Copy className="h-4 w-4" />
                <span>{copiedReceipt ? 'Copiado com Sucesso!' : 'Copiar Texto Completo'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResendReceiptWhatsApp(activeOrderReceiptModal)}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition text-xs flex items-center gap-1.5 border border-blue-200"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Reenviar no WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOrderReceiptModal(null)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold transition text-xs border border-slate-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COTAÇÃO RÁPIDA DE FRETE (MELHOR ENVIO) */}
      {showShippingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cotação de Frete (Melhor Envio)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Simule valores reais com transportadoras e envie no chat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShippingModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Saída / Origem */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Endereço de Saída (Origem):
                </label>
                <select
                  value={shippingModalOrigin}
                  onChange={(e) => setShippingModalOrigin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-base sm:text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="30730130">Saída 1: Padre Eustáquio (CEP 30730-130)</option>
                  <option value="30110017">Saída 2: Savassi / Centro (CEP 30110-017)</option>
                  <option value="30190110">Saída 3: Savannah Mall / Barro Preto (CEP 30190-110)</option>
                  <option value="custom">Outro CEP de Origem...</option>
                </select>
                {shippingModalOrigin === 'custom' && (
                  <input
                    type="text"
                    value={shippingModalCustomOrigin}
                    onChange={(e) => setShippingModalCustomOrigin(e.target.value)}
                    placeholder="Digite o CEP de origem (ex: 30190-110)"
                    className="w-full mt-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-base sm:text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                )}
              </div>

              {/* Destino (CEP do Cliente) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  CEP de Destino do Cliente:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shippingModalCep}
                    onChange={(e) => setShippingModalCep(e.target.value)}
                    placeholder="CEP (ex: 01018-020)"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-base sm:text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleCalculateModalShipping}
                    disabled={shippingModalLoading}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                  >
                    {shippingModalLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Calculando...</span>
                      </>
                    ) : (
                      <>
                        <Truck className="h-3.5 w-3.5" />
                        <span>Calcular Frete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dimensões do Pacote (Padrão 1x10x15cm, 0.5kg) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase">
                  <span>Dimensões do Pacote (Padrão)</span>
                  <span className="text-blue-600 font-semibold normal-case">Perfume / Smartwatch</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase">Altura (cm)</label>
                    <input
                      type="number"
                      min="1"
                      value={shippingModalHeight}
                      onChange={(e) => setShippingModalHeight(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-center font-bold text-base sm:text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase">Largura (cm)</label>
                    <input
                      type="number"
                      min="10"
                      value={shippingModalWidth}
                      onChange={(e) => setShippingModalWidth(parseFloat(e.target.value) || 10)}
                      className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-center font-bold text-base sm:text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase">Compr. (cm)</label>
                    <input
                      type="number"
                      min="15"
                      value={shippingModalLength}
                      onChange={(e) => setShippingModalLength(parseFloat(e.target.value) || 15)}
                      className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-center font-bold text-base sm:text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={shippingModalWeight}
                      onChange={(e) => setShippingModalWeight(parseFloat(e.target.value) || 0.5)}
                      className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-center font-bold text-base sm:text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Erro */}
              {shippingModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{shippingModalError}</span>
                </div>
              )}

              {/* Resultados da Cotação */}
              {shippingModalQuotes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Opções Encontradas ({shippingModalQuotes.length})
                    </span>
                    <span className="text-[11px] text-slate-500">Ordenado pelo menor valor</span>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {shippingModalQuotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs hover:border-blue-300 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {quote.company.picture ? (
                            <img src={quote.company.picture} alt="" className="h-6 w-6 object-contain shrink-0" />
                          ) : (
                            <span className="h-6 w-6 rounded bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                              📦
                            </span>
                          )}
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">
                              {quote.company.name} ({quote.name})
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Prazo: {quote.custom_delivery_time || quote.delivery_time} dia{quote.custom_delivery_time !== 1 ? 's' : ''} úteis
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-emerald-600 text-sm block">
                            R$ {Number(quote.custom_price || quote.price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowShippingModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold transition text-xs border border-slate-200"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleSendShippingQuoteToChat}
                disabled={shippingModalQuotes.length === 0}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                title="Enviar resumo comparativo de fretes no WhatsApp da conversa"
              >
                <Send className="h-4 w-4" />
                <span>Enviar Cotação no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

