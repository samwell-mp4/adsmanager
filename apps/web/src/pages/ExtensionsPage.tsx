import React from 'react';
import { Puzzle, ShieldCheck, ExternalLink, Zap } from 'lucide-react';

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
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Puzzle className="h-7 w-7 text-purple-400" />
            Catálogo de Extensões do Google
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Extensões otimizadas para contingência, anti-detect, importação de cookies e economia de tráfego.
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex items-center gap-3 text-sm text-purple-200">
        <Zap className="h-5 w-5 text-purple-400 shrink-0" />
        <span>
          Você pode vincular estas extensões individualmente a qualquer perfil através do botão <strong>🧩 Extensões</strong> na tabela de Perfis de Navegador.
        </span>
      </div>

      {/* Grid */}
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
  );
};
