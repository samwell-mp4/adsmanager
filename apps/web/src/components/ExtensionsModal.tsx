import React, { useState } from 'react';
import { X, Puzzle, Check, Download, ExternalLink, ShieldCheck, Plus } from 'lucide-react';

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
    desc: 'Visualizar, editar, importar e exportar cookies da aba atual com facilidade.',
    author: 'Cookie-Editor',
    badge: 'Essencial',
    icon: '🍪',
    storeUrl: 'https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm',
  },
  {
    id: 'ublock-origin',
    name: 'uBlock Origin',
    desc: 'Bloqueador eficiente de anúncios e rastreadores que acelera o carregamento.',
    author: 'Raymond Hill',
    badge: 'Popular',
    icon: '🛡️',
    storeUrl: 'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm',
  },
  {
    id: 'user-agent-switcher',
    name: 'User-Agent Switcher',
    desc: 'Emula diferentes dispositivos (Android, iPhone, Mac, Windows) e navegadores.',
    author: 'Ray',
    badge: 'Anti-Detect',
    icon: '📱',
    storeUrl: 'https://chromewebstore.google.com/detail/user-agent-switcher-and-m/bhchdcejhohfmigjafbampogmaanbfkg',
  },
  {
    id: 'webrtc-control',
    name: 'WebRTC Control',
    desc: 'Desativa o vazamento de IP real da VPS ou da máquina através de chamadas WebRTC.',
    author: 'Russell',
    badge: 'Segurança',
    icon: '🔒',
    storeUrl: 'https://chromewebstore.google.com/detail/webrtc-control/fjkehfaokpmhgfgajdadinnimglaffpn',
  },
  {
    id: 'proxy-switchyomega',
    name: 'Proxy SwitchyOmega',
    desc: 'Alternância flexível de configurações de proxy HTTP/SOCKS dentro do Chromium.',
    author: 'FelisCatus',
    badge: 'Rede',
    icon: '⚡',
    storeUrl: 'https://chromewebstore.google.com/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif',
  },
];

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  isOpen,
  onClose,
  profileId: _profileId,
  profileName,
}) => {
  const [activeExtensions, setActiveExtensions] = useState<string[]>(['cookie-editor', 'webrtc-control']);
  const [customId, setCustomId] = useState('');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const toggleExtension = (id: string) => {
    if (activeExtensions.includes(id)) {
      setActiveExtensions(activeExtensions.filter((e) => e !== id));
    } else {
      setActiveExtensions([...activeExtensions, id]);
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
                Perfil: <span className="text-blue-400 font-semibold">{profileName}</span> ({activeExtensions.length} ativas)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-blue-950/20 border-b border-blue-900/30 text-xs text-blue-300 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>
            Extensões ativadas são carregadas automaticamente na inicialização do Chromium e permanecem persistidas no perfil.
          </span>
        </div>

        {/* Extensions List */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
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

          {/* Custom Extension Input */}
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
            {saved ? 'Extensões Salvas!' : 'Salvar no Perfil'}
          </button>
        </div>
      </div>
    </div>
  );
};
