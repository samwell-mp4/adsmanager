import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Play, Square, RotateCw, ExternalLink, Trash2, 
  Layers, Shield, Eye, RefreshCw 
} from 'lucide-react';
import { api } from '../services/api.js';
import { BrowserProfile, BrowserProxy, CreateProfileDTO } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { CreateProfileModal } from '../components/CreateProfileModal.js';

export const ProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [proxies, setProxies] = useState<BrowserProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profData, proxData] = await Promise.all([
        api.getProfiles(),
        api.getProxies(),
      ]);
      setProfiles(profData);
      setProxies(proxData);
    } catch (err: any) {
      console.error('Failed loading data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // refresh status periodically
    return () => clearInterval(interval);
  }, []);

  const handleCreateProfile = async (data: CreateProfileDTO) => {
    await api.createProfile(data);
    await loadData();
  };

  const handleStart = async (id: number) => {
    try {
      setActionLoadingId(id);
      await api.startProfile(id);
      await loadData();
    } catch (err: any) {
      alert(`Falha ao iniciar perfil: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStop = async (id: number) => {
    try {
      setActionLoadingId(id);
      await api.stopProfile(id);
      await loadData();
    } catch (err: any) {
      alert(`Falha ao parar perfil: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestart = async (id: number) => {
    try {
      setActionLoadingId(id);
      await api.restartProfile(id);
      await loadData();
    } catch (err: any) {
      alert(`Falha ao reiniciar perfil: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este perfil? Todos os dados associados serão removidos.')) return;
    try {
      setActionLoadingId(id);
      await api.deleteProfile(id);
      await loadData();
    } catch (err: any) {
      alert(`Falha ao excluir perfil: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenVnc = (novncPort: number | null) => {
    if (!novncPort) return;
    const url = `${window.location.protocol}//${window.location.host}/vnc/${novncPort}/vnc.html?autoconnect=true&resize=scale&path=vnc/${novncPort}/websockify`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Layers className="h-7 w-7 text-blue-500" />
            Perfis de Navegador
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie instâncias isoladas do Chromium com volumes persistentes e proxies dedicados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-surfaceLight border border-border text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Atualizar lista"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
          >
            <Plus className="h-4 w-4" />
            Novo Perfil
          </button>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
        {loading && profiles.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            Carregando perfis de navegador...
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="h-16 w-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
              <Layers className="h-8 w-8" />
            </div>
            <div className="text-white font-medium">Nenhum perfil cadastrado ainda</div>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Crie seu primeiro perfil remoto isolado para navegar manualmente via noVNC ou automatizar com Playwright.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
            >
              <Plus className="h-4 w-4" />
              Criar Primeiro Perfil
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surfaceLight/50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Nome & Grupo</th>
                  <th className="py-3.5 px-4">Proxy</th>
                  <th className="py-3.5 px-4">Resolução</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Portas</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {profiles.map((profile) => {
                  const isActionLoading = actionLoadingId === profile.id;
                  const isRunning = profile.status === 'running';

                  return (
                    <tr key={profile.id} className="hover:bg-surfaceLight/30 transition">
                      <td className="py-4 px-4 font-mono text-xs text-slate-500">
                        #{profile.id}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">
                          <Link to={`/profiles/${profile.id}`} className="hover:text-blue-400 transition">
                            {profile.name}
                          </Link>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-surfaceLight text-slate-300 font-mono text-[10px]">
                            {profile.group_name}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-500">{profile.uuid.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {profile.proxy ? (
                          <div>
                            <div className="text-xs font-medium text-slate-200 flex items-center gap-1">
                              <Shield className="h-3 w-3 text-emerald-400" />
                              {profile.proxy.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {profile.proxy.type.toUpperCase()} • {profile.proxy.host}:{profile.proxy.port}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Conexão Direta</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-300">
                        {profile.screen_width}x{profile.screen_height}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={profile.status} />
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-400">
                        {isRunning ? (
                          <div className="space-y-0.5">
                            <div>noVNC: <span className="text-blue-400">:{profile.novnc_port}</span></div>
                            <div>CDP: <span className="text-cyan-400">:{profile.cdp_port}</span></div>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Open noVNC */}
                          {isRunning && (
                            <button
                              onClick={() => handleOpenVnc(profile.novnc_port)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition"
                              title="Abrir noVNC em nova aba"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir
                            </button>
                          )}

                          {/* Start / Stop Toggle */}
                          {!isRunning ? (
                            <button
                              onClick={() => handleStart(profile.id)}
                              disabled={isActionLoading || profile.status === 'starting'}
                              className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition disabled:opacity-50"
                              title="Iniciar Perfil"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStop(profile.id)}
                              disabled={isActionLoading || profile.status === 'stopping'}
                              className="p-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/30 transition disabled:opacity-50"
                              title="Parar Perfil"
                            >
                              <Square className="h-4 w-4" />
                            </button>
                          )}

                          {/* Restart */}
                          <button
                            onClick={() => handleRestart(profile.id)}
                            disabled={isActionLoading}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition disabled:opacity-50"
                            title="Reiniciar Perfil"
                          >
                            <RotateCw className="h-4 w-4" />
                          </button>

                          {/* View details */}
                          <Link
                            to={`/profiles/${profile.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition"
                            title="Detalhes e Automação"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(profile.id)}
                            disabled={isActionLoading}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition disabled:opacity-50"
                            title="Excluir Perfil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProfile}
        proxies={proxies}
      />
    </div>
  );
};
