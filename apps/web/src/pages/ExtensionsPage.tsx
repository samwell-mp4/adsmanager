import React, { useState, useEffect, useRef } from 'react';
import {
  Puzzle,
  ShieldCheck,
  ExternalLink,
  Zap,
  Upload,
  FolderArchive,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api.js';

const EXTENSIONS_CATALOG = [
  {
    id: 'cookie-editor',
    name: 'Cookie-Editor',
    desc: 'Visualizar, editar, importar e exportar cookies da aba atual com facilidade. Essencial para multilogin e contingência.',
    category: 'Sessão & Contas',
    icon: '🍪',
    rating: '4.8 ★',
    users: '1M+ usuários',
    storeUrl: 'https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm',
  },
  {
    id: 'ublock-origin',
    name: 'uBlock Origin',
    desc: 'Bloqueador eficiente de anúncios e rastreadores. Economiza banda da VPS e acelera a renderização das páginas no Chromium.',
    category: 'Desempenho',
    icon: '🛡️',
    rating: '4.9 ★',
    users: '10M+ usuários',
    storeUrl: 'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm',
  },
  {
    id: 'user-agent-switcher',
    name: 'User-Agent Switcher and Manager',
    desc: 'Altera o cabeçalho User-Agent para disfarçar o navegador como mobile (Android/iPhone) ou outros sistemas operacionais.',
    category: 'Anti-Detect',
    icon: '📱',
    rating: '4.7 ★',
    users: '2M+ usuários',
    storeUrl: 'https://chromewebstore.google.com/detail/user-agent-switcher-and-m/bhchdcejhohfmigjafbampogmaanbfkg',
  },
  {
    id: 'webrtc-control',
    name: 'WebRTC Control',
    desc: 'Bloqueia o vazamento de IP real da máquina ou da VPS que pode ocorrer através de requisições de áudio/vídeo WebRTC.',
    category: 'Segurança & Privacidade',
    icon: '🔒',
    rating: '4.6 ★',
    users: '300k+ usuários',
    storeUrl: 'https://chromewebstore.google.com/detail/webrtc-control/fjkehfaokpmhgfgajdadinnimglaffpn',
  },
  {
    id: 'proxy-switchyomega',
    name: 'Proxy SwitchyOmega',
    desc: 'Ferramenta completa para gerenciar e alternar proxies de maneira automática ou manual diretamente dentro da navegação.',
    category: 'Rede & Proxies',
    icon: '⚡',
    rating: '4.8 ★',
    users: '1M+ usuários',
    storeUrl: 'https://chromewebstore.google.com/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif',
  },
  {
    id: 'canvas-fingerprint-defender',
    name: 'Canvas Defender',
    desc: 'Adiciona ruído persistente à API de Canvas do navegador para evitar que sistemas anti-fraude rastreiem a GPU da VPS.',
    category: 'Anti-Detect',
    icon: '🎨',
    rating: '4.5 ★',
    users: '100k+ usuários',
    storeUrl: 'https://chromewebstore.google.com/detail/canvas-defender/obdbgpmndkafggiclhlmfdnfbeogapnp',
  },
];

export const ExtensionsPage: React.FC = () => {
  const [globalExtensions, setGlobalExtensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadGlobalExtensions();
  }, []);

  const loadGlobalExtensions = async () => {
    setLoading(true);
    try {
      const data = await api.getGlobalExtensions();
      setGlobalExtensions(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
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
        const res = await api.uploadGlobalExtension(file.name, base64);
        if (res.success) {
          setUploadSuccess(`Extensão "${res.data?.name || file.name}" carregada com sucesso no repositório!`);
          await loadGlobalExtensions();
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
      setUploadError('Erro ao ler o arquivo.');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteGlobal = async (extId: string) => {
    try {
      await api.deleteGlobalExtension(extId);
      await loadGlobalExtensions();
    } catch (e: any) {
      setUploadError('Erro ao excluir: ' + e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Puzzle className="h-7 w-7 text-purple-400" />
            Catálogo & Upload de Extensões (.ZIP)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Envie as extensões do seu próprio navegador em arquivo .zip ou escolha extensões prontas para contingência.
          </p>
        </div>

        <button
          onClick={() => setShowHowTo(!showHowTo)}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-2 transition"
        >
          <HelpCircle className="h-4 w-4 text-purple-400" />
          Como exportar extensão em .zip?
        </button>
      </div>

      {/* How to export guide accordion */}
      {showHowTo && (
        <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200 space-y-3 animate-fadeIn">
          <div className="font-bold text-sm text-purple-300 flex items-center gap-2">
            <FolderArchive className="h-4 w-4 text-purple-400" />
            Como pegar qualquer extensão do seu Google Chrome em .ZIP:
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
            <li>No seu Google Chrome, digite <code className="bg-slate-900 px-1.5 py-0.5 rounded font-mono text-purple-300">chrome://extensions</code> na barra de endereços.</li>
            <li>Ative o botão <strong>Modo do desenvolvedor</strong> no canto superior direito.</li>
            <li>Você verá o <strong>ID</strong> de cada extensão ou o caminho do diretório instalado.</li>
            <li>Compacte a pasta da extensão em um arquivo <strong>.zip</strong> (certifique-se de que o arquivo <code className="bg-slate-900 px-1 py-0.5 rounded font-mono">manifest.json</code> esteja dentro do zip).</li>
            <li>Arraste o arquivo .zip para o campo de upload abaixo ou envie diretamente no perfil desejado!</li>
          </ol>
        </div>
      )}

      {/* Upload .ZIP Dropzone Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-purple-400" />
              Enviar Nova Extensão (.ZIP) do seu Computador
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              O sistema descompacta o arquivo e valida o manifest.json do Chromium automaticamente.
            </p>
          </div>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition flex flex-col items-center justify-center text-center gap-2 ${
            uploading
              ? 'border-purple-500/50 bg-purple-500/10 opacity-70'
              : 'border-slate-800 hover:border-purple-500/50 bg-slate-950/40 hover:bg-purple-950/10'
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
              {uploading ? 'Processando e descompactando arquivo .zip...' : 'Arraste ou clique para selecionar arquivo .zip'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Formatos aceitos: arquivos .zip contendo manifest.json
            </div>
          </div>
        </div>

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

        {/* Uploaded custom extensions list */}
        {globalExtensions.length > 0 && (
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Extensões Próprias Enviadas ({globalExtensions.length}):</span>
              <button onClick={loadGlobalExtensions} className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {globalExtensions.map((ext) => (
                <div
                  key={ext.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 truncate">
                    <div className="font-bold text-xs text-white truncate">{ext.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">v{ext.version}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteGlobal(ext.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                    title="Excluir do Repositório"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex items-center gap-3 text-sm text-purple-200">
        <Zap className="h-5 w-5 text-purple-400 shrink-0" />
        <span>
          Você também pode enviar extensões .zip exclusivas para cada perfil clicando no botão <strong>🧩 Extensões</strong> diretamente na linha do perfil!
        </span>
      </div>

      {/* Recommended Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          Extensões Recomendadas para Contingência & Tráfego
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {EXTENSIONS_CATALOG.map((ext) => (
            <div
              key={ext.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg shadow-black/20"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{ext.icon}</div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-slate-700">
                    {ext.category}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{ext.name}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="text-amber-400 font-semibold">{ext.rating}</span>
                    <span>•</span>
                    <span>{ext.users}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{ext.desc}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Compatível
                </span>
                <a
                  href={ext.storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  Chrome Web Store <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
