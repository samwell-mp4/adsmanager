import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Square, RotateCw, ExternalLink, Shield, 
  Terminal, Globe, Clock, HardDrive, Maximize2 
} from 'lucide-react';
import { api } from '../services/api.js';
import { BrowserProfile, BrowserProxy, BrowserEvent } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const ProfileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profileId = Number(id);

  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [proxies, setProxies] = useState<BrowserProxy[]>([]);
  const [events, setEvents] = useState<BrowserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Playwright CDP navigation states
  const [targetUrl, setTargetUrl] = useState('https://api.ipify.org?format=json');
  const [cdpResult, setCdpResult] = useState<any>(null);
  const [cdpLoading, setCdpLoading] = useState(false);
  const [pagesList, setPagesList] = useState<any[]>([]);

  // Proxy switch
  const [selectedProxyId, setSelectedProxyId] = useState<string>('');

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [p, pxs, evts] = await Promise.all([
        api.getProfile(profileId),
        api.getProxies(),
        api.getProfileEvents(profileId),
      ]);
      setProfile(p);
      setProxies(pxs);
      setEvents(evts);
      setSelectedProxyId(p.proxy_id ? String(p.proxy_id) : '');
    } catch (err: any) {
      console.error('Error loading profile detail:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const handleStart = async () => {
    try {
      setActionLoading(true);
      await api.startProfile(profileId);
      await loadProfile();
    } catch (err: any) {
      alert(`Falha ao iniciar perfil: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setActionLoading(true);
      await api.stopProfile(profileId);
      await loadProfile();
    } catch (err: any) {
      alert(`Falha ao parar perfil: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    try {
      setActionLoading(true);
      await api.restartProfile(profileId);
      await loadProfile();
    } catch (err: any) {
      alert(`Falha ao reiniciar perfil: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeProxy = async (newProxyIdStr: string) => {
    const newId = newProxyIdStr ? Number(newProxyIdStr) : null;
    setSelectedProxyId(newProxyIdStr);

    if (profile?.status === 'running') {
      const confirmRestart = confirm(
        'Alterar o proxy exige reiniciar o navegador para aplicar as novas configurações de rede. Deseja reiniciar agora?'
      );
      if (!confirmRestart) return;
    }

    try {
      setActionLoading(true);
      await api.changeProxy(profileId, newId);
      await loadProfile();
    } catch (err: any) {
      alert(`Erro ao alterar proxy: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCdpNavigate = async () => {
    if (!targetUrl) return;
    try {
      setCdpLoading(true);
      setCdpResult(null);
      const res = await api.navigateProfile(profileId, targetUrl);
      setCdpResult(res);
      await handleListPages();
    } catch (err: any) {
      setCdpResult({ error: err.message });
    } finally {
      setCdpLoading(false);
    }
  };

  const handleListPages = async () => {
    try {
      const pages = await api.getProfilePages(profileId);
      setPagesList(pages);
    } catch (err: any) {
      console.error('List pages failed:', err.message);
    }
  };

  if (loading && !profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        Carregando detalhes do perfil...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-rose-400 font-semibold text-lg">Perfil não encontrado.</div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl"
        >
          Voltar para Perfis
        </button>
      </div>
    );
  }

  const isRunning = profile.status === 'running';
  const vncUrl = profile.novnc_port
    ? `${window.location.protocol}//${window.location.host}/vnc/${profile.novnc_port}/vnc.html?autoconnect=true&resize=scale`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2.5 rounded-xl bg-surfaceLight border border-border text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{profile.name}</h1>
              <StatusBadge status={profile.status} />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">UUID: {profile.uuid}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isRunning && vncUrl && (
            <button
              onClick={() => window.open(vncUrl, '_blank')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir noVNC
            </button>
          )}

          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Iniciar Navegador
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              Parar Navegador
            </button>
          )}

          <button
            onClick={handleRestart}
            disabled={actionLoading}
            className="p-2.5 rounded-xl bg-surfaceLight border border-border text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Reiniciar"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid: Overview & Live View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Overview info */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
              Configurações do Perfil
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-slate-400">Grupo</span>
                <span className="text-white font-medium">{profile.group_name}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-slate-400">Resolução</span>
                <span className="text-white font-medium">{profile.screen_width} x {profile.screen_height}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-slate-400">Idioma & Timezone</span>
                <span className="text-white font-medium text-right text-xs">
                  {profile.locale}<br />
                  <span className="text-slate-400">{profile.timezone}</span>
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-slate-400">Porta noVNC</span>
                <span className="text-blue-400 font-mono">{profile.novnc_port ? `:${profile.novnc_port}` : 'Desconectado'}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-slate-400">Porta CDP</span>
                <span className="text-cyan-400 font-mono">{profile.cdp_port ? `:${profile.cdp_port}` : 'Desconectado'}</span>
              </div>

              <div className="py-2 border-b border-border/50">
                <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                  Volume Persistente (Host)
                </div>
                <div className="font-mono text-[11px] text-slate-300 bg-surfaceLight p-2 rounded-lg break-all">
                  {profile.chrome_data_path}
                </div>
              </div>
            </div>

            {/* Proxy Selector Box */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-400" />
                Proxy Associado
              </label>
              <select
                value={selectedProxyId}
                onChange={(e) => handleChangeProxy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Sem Proxy (Conexão Direta)</option>
                {proxies.map((px) => (
                  <option key={px.id} value={px.id}>
                    {px.name} ({px.type.toUpperCase()} - {px.host}:{px.port})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Alterar o proxy preserva 100% dos cookies e histórico do perfil.
              </p>
            </div>
          </div>

          {/* Playwright & CDP Automation Card */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              Automação Playwright (CDP)
            </h2>
            <p className="text-xs text-slate-400">
              Navegue ou inspecione a sessão ativa do navegador sem criar processos paralelos.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">URL Alvo</label>
                <input
                  type="text"
                  disabled={!isRunning}
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-xl bg-surfaceLight border border-border text-white text-xs font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCdpNavigate}
                  disabled={!isRunning || cdpLoading}
                  className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {cdpLoading ? 'Navegando...' : 'Navegar via CDP'}
                </button>
                <button
                  onClick={handleListPages}
                  disabled={!isRunning}
                  className="py-2 px-3 rounded-xl bg-surfaceLight border border-border text-slate-300 hover:text-white text-xs transition disabled:opacity-50"
                >
                  Listar Abas
                </button>
              </div>

              {cdpResult && (
                <div className="p-3 rounded-xl bg-slate-900 border border-border text-xs font-mono text-cyan-300 overflow-x-auto">
                  <pre>{JSON.stringify(cdpResult, null, 2)}</pre>
                </div>
              )}

              {pagesList.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Abas Abertas:</span>
                  {pagesList.map((pg, i) => (
                    <div key={i} className="p-2 rounded-lg bg-surfaceLight text-xs">
                      <div className="text-white font-medium truncate">{pg.title || 'Sem título'}</div>
                      <div className="text-slate-400 text-[10px] font-mono truncate">{pg.url}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column (2 cols): Embedded Live noVNC Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col h-[640px]">
            {/* Live header */}
            <div className="px-5 py-3.5 border-b border-border bg-surfaceLight/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-white">Visualizador noVNC (Sessão Ao Vivo)</span>
              </div>
              {isRunning && vncUrl && (
                <button
                  onClick={() => window.open(vncUrl, '_blank')}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Tela Cheia
                </button>
              )}
            </div>

            {/* Stream iframe or Placeholder */}
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {isRunning && vncUrl ? (
                <iframe
                  src={vncUrl}
                  title="Remote Browser Session"
                  className="w-full h-full border-0"
                  allow="fullscreen"
                />
              ) : (
                <div className="text-center space-y-3 p-8">
                  <div className="h-14 w-14 rounded-2xl bg-surfaceLight flex items-center justify-center mx-auto text-slate-600">
                    <Globe className="h-7 w-7" />
                  </div>
                  <div className="text-slate-400 font-medium text-sm">O navegador remoto está desligado</div>
                  <p className="text-xs text-slate-600 max-w-sm">
                    Inicie o perfil para ativar o display virtual Xvfb, carregar a sessão persistente e conectar a transmissão visual noVNC.
                  </p>
                  <button
                    onClick={handleStart}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
                  >
                    <Play className="h-4 w-4" />
                    Iniciar Agora
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Audit Events History */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              Histórico de Eventos do Perfil
            </h3>
            {events.length === 0 ? (
              <div className="text-xs text-slate-500 py-4">Nenhum evento registrado ainda.</div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2">
                {events.map((evt) => (
                  <div key={evt.id} className="p-3 rounded-xl bg-surfaceLight/50 border border-border/50 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-semibold text-blue-400 font-mono text-[11px] mr-2">
                        {evt.type}
                      </span>
                      <span className="text-slate-300">{evt.message}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap ml-4">
                      {new Date(evt.created_at).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
