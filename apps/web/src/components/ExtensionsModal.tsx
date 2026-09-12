import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Puzzle,
  Upload,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  FolderArchive,
  Zap,
  Bot,
} from 'lucide-react';
import { api } from '../services/api.js';

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  profileName: string;
}

const POPULAR_EXTENSIONS = [
  {
    id: 'cookie-editor',
    name: 'Cookie-Editor',
    desc: 'Exportar, importar e modificar cookies em tempo real. Essencial para contingência de contas.',
    badge: 'Recomendado',
    icon: '🍪',
    storeUrl: 'https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm',
  },
  {
    id: 'ublock-origin',
    name: 'uBlock Origin',
    desc: 'Bloqueador eficiente de scripts e anúncios pesados. Reduz consumo de CPU e banda da VPS.',
    badge: 'Desempenho',
    icon: '🛡️',
    storeUrl: 'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm',
  },
  {
    id: 'webrtc-control',
    name: 'WebRTC Control',
    desc: 'Proteção contra vazamento de IP real local por WebRTC ao usar proxies.',
    badge: 'Segurança',
    icon: '🔒',
    storeUrl: 'https://chromewebstore.google.com/detail/webrtc-control/fjkmfdakngfdfgahhlmbkghedihmluge',
  },
  {
    id: 'user-agent-switcher',
    name: 'User-Agent Switcher',
    desc: 'Alterne User-Agents e assinaturas de navegadores para evitar fingerprinting.',
    badge: 'Antidetect',
    icon: '🎭',
    storeUrl: 'https://chromewebstore.google.com/detail/user-agent-switcher-and-m/bhchmgapggofkgkkndjhmgknnndmigid',
  },
  {
    id: 'proxy-switchyomega',
    name: 'Proxy SwitchyOmega',
    desc: 'Gerenciador avançado de regras e rotas de proxies múltiplos.',
    badge: 'Rede',
    icon: '⚡',
    storeUrl: 'https://chromewebstore.google.com/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif',
  },
];

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  isOpen,
  onClose,
  profileId,
  profileName,
}) => {
  const [tab, setTab] = useState<'custom' | 'catalog'>('custom');
  const [activeExtensions, setActiveExtensions] = useState<string[]>(['cookie-editor', 'webrtc-control']);
  const [customExtensions, setCustomExtensions] = useState<any[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customId, setCustomId] = useState('');
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomExtensions();
      setUploadSuccess(null);
      setUploadError(null);
    }
  }, [isOpen, profileId]);

  const loadCustomExtensions = async () => {
    setLoadingCustom(true);
    try {
      const data = await api.getProfileExtensions(profileId);
      setCustomExtensions(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingCustom(false);
    }
  };

  const [installingOfficial, setInstallingOfficial] = useState(false);

  const handleInstallOfficial = async () => {
    setInstallingOfficial(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const res = await api.installOfficialExtension(profileId);
      setUploadSuccess(res.message || 'Extensão Oficial Ads Manager CRM instalada com sucesso neste perfil!');
      await loadCustomExtensions();
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao instalar extensão oficial.');
    } finally {
      setInstallingOfficial(false);
    }
  };

  if (!isOpen) return null;

  const isCrmInstalled = customExtensions.some((e) => e.id === 'adsmanager_crm' || e.id === '__crm_collector' || e.isOfficial);

  const toggleExtension = (id: string) => {
    if (activeExtensions.includes(id)) {
      setActiveExtensions(activeExtensions.filter((e) => e !== id));
    } else {
      setActiveExtensions([...activeExtensions, id]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadError('Por favor, selecione um arquivo no formato .zip.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await api.uploadProfileExtension(profileId, file.name, base64);
        if (res.success) {
          setUploadSuccess(`Extensão "${res.data?.name || file.name}" instalada com sucesso!`);
          await loadCustomExtensions();
        } else {
          setUploadError('Falha ao descompactar a extensão.');
        }
      } catch (err: any) {
        setUploadError(err.message || 'Erro ao fazer upload da extensão.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setUploadError('Erro ao ler o arquivo selecionado.');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteCustomExtension = async (extId: string) => {
    try {
      await api.deleteProfileExtension(profileId, extId);
      await loadCustomExtensions();
    } catch (e: any) {
      setUploadError('Erro ao excluir extensão: ' + e.message);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Puzzle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Extensões do Google Chrome</h2>
              <p className="text-xs text-slate-400">
                Perfil: <span className="text-blue-400 font-semibold">{profileName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-4">
          <button
            onClick={() => setTab('custom')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              tab === 'custom'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="h-4 w-4" />
            Enviar Própria (.zip)
            {customExtensions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                {customExtensions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('catalog')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              tab === 'catalog'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Puzzle className="h-4 w-4" />
            Catálogo & Web Store
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {tab === 'custom' ? (
            <div className="space-y-4">
              {/* 1-Click Official Ads Manager CRM Extension Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/50 via-indigo-950/40 to-slate-900 border-2 border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-blue-500/5">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
                    <Bot className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Extensão Oficial Ads Manager CRM</span>
                      {isCrmInstalled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Instalada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 border border-blue-500/30 text-blue-300">
                          Disponível
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Sincroniza chats do Facebook Marketplace e OLX com o CRM. O arquivo .zip também está salvo em <code className="text-blue-300 font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded">/tmp/adsmanager-crm-extension.zip</code>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleInstallOfficial}
                  disabled={installingOfficial}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition shrink-0 disabled:opacity-60 active:scale-95"
                >
                  {installingOfficial ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Instalando no Perfil...
                    </>
                  ) : isCrmInstalled ? (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Reinstalar / Atualizar
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 text-amber-300" />
                      Ativar com 1 Clique
                    </>
                  )}
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition flex flex-col items-center justify-center text-center gap-2 ${
                  uploading
                    ? 'border-purple-500/50 bg-purple-500/10 opacity-70'
                    : 'border-slate-800 hover:border-purple-500/50 bg-slate-950/30 hover:bg-purple-950/10'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {uploading ? (
                    <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {uploading ? 'Descompactando e instalando extensão...' : 'Clique para enviar arquivo .ZIP da extensão'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Selecione o arquivo .zip da extensão (ex: baixada do seu navegador ou empacotada).
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20 mt-1">
                  Suporta arquivos .zip com manifest.json
                </span>
              </div>

              {/* Status Messages */}
              {uploadSuccess && (
                <div className="p-3.5 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3.5 rounded-xl text-xs flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Installed Custom Extensions List */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Extensões Próprias Instaladas neste Perfil:</span>
                  <button
                    onClick={loadCustomExtensions}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingCustom ? 'animate-spin' : ''}`} /> Atualizar
                  </button>
                </div>

                {loadingCustom ? (
                  <div className="py-6 text-center text-xs text-slate-500">Carregando extensões...</div>
                ) : customExtensions.length === 0 ? (
                  <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-950/30 text-center text-xs text-slate-500">
                    Nenhuma extensão .zip instalada ainda. Arraste ou clique no botão acima para enviar uma extensão.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customExtensions.map((ext) => (
                      <div
                        key={ext.id}
                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{ext.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              v{ext.version}
                            </span>
                            {ext.isOfficial && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                <Bot className="h-3 w-3" /> Oficial CRM
                              </span>
                            )}
                            {ext.hasManifest && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Manifest OK
                              </span>
                            )}
                          </div>
                          {ext.description && (
                            <p className="text-xs text-slate-400 line-clamp-1">{ext.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteCustomExtension(ext.id)}
                          className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition"
                          title="Remover Extensão"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instructions Tip */}
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Carregamento Automático:</strong> Ao iniciar este perfil, o Google Chrome carrega automaticamente
                  todas as extensões descompactadas desta pasta via <code className="bg-purple-950 px-1 py-0.5 rounded font-mono text-[11px]">--load-extension</code>.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Extensões Pré-Configuradas Recomendadas:
              </div>

              {POPULAR_EXTENSIONS.map((ext) => {
                const isInstalled = activeExtensions.includes(ext.id);
                return (
                  <div
                    key={ext.id}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                      isInstalled
                        ? 'bg-purple-950/20 border-purple-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="text-2xl mt-0.5">{ext.icon}</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{ext.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            {ext.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-md">{ext.desc}</p>
                        <a
                          href={ext.storeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 hover:underline inline-flex items-center gap-1 pt-0.5"
                        >
                          Ver na Chrome Web Store <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExtension(ext.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                        isInstalled
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isInstalled ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                      {isInstalled ? 'Ativada' : 'Instalar'}
                    </button>
                  </div>
                );
              })}

              {/* Chrome Web Store by ID */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-blue-400" />
                  Instalar por ID da Chrome Web Store:
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="Ex: cjpalhdlnbpafiamejdnhcphjbkeiagm"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (customId.trim() && !activeExtensions.includes(customId.trim())) {
                        setActiveExtensions([...activeExtensions, customId.trim()]);
                        setCustomId('');
                      }
                    }}
                    disabled={!customId.trim()}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50 transition"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 flex items-center gap-2 shadow-lg shadow-purple-600/25 transition"
          >
            {saved ? <Check className="h-3.5 w-3.5" /> : null}
            {saved ? 'Configurações Salvas!' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};
