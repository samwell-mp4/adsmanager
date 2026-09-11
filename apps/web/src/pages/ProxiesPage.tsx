import React, { useEffect, useState } from 'react';
import { Plus, Shield, RefreshCw, Trash2, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { api } from '../services/api.js';
import { BrowserProxy, CreateProxyDTO } from '../types/index.js';
import { CreateProxyModal } from '../components/CreateProxyModal.js';

export const ProxiesPage: React.FC = () => {
  const [proxies, setProxies] = useState<BrowserProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ id: number; message: string; success: boolean } | null>(null);

  const loadProxies = async () => {
    try {
      setLoading(true);
      const data = await api.getProxies();
      setProxies(data);
    } catch (err: any) {
      console.error('Failed loading proxies:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProxies();
  }, []);

  const handleCreateProxy = async (data: CreateProxyDTO) => {
    await api.createProxy(data);
    await loadProxies();
  };

  const handleDeleteProxy = async (id: number) => {
    if (!confirm('Deseja excluir este proxy?')) return;
    try {
      await api.deleteProxy(id);
      await loadProxies();
    } catch (err: any) {
      alert(`Falha ao excluir: ${err.message}`);
    }
  };

  const handleTestProxy = async (id: number) => {
    try {
      setTestingId(id);
      setTestFeedback(null);
      const res = await api.testProxy(id);
      setTestFeedback({
        id,
        message: res.success ? `IP: ${res.ip} (${res.latency_ms}ms)` : (res.error || 'Falha de conexão'),
        success: res.success,
      });
      await loadProxies();
    } catch (err: any) {
      setTestFeedback({ id, message: err.message, success: false });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="h-7 w-7 text-emerald-500" />
            Gerenciador de Proxies
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cadastre e teste proxies HTTP, HTTPS e SOCKS5 para isolamento de IP por perfil
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProxies}
            className="p-2.5 rounded-xl bg-surfaceLight border border-border text-slate-300 hover:text-white transition"
            title="Atualizar lista"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Proxy
          </button>
        </div>
      </div>

      {/* Proxies Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
        {loading && proxies.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            Carregando proxies...
          </div>
        ) : proxies.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8" />
            </div>
            <div className="text-white font-medium">Nenhum proxy cadastrado</div>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Cadastre proxies residenciais ou de datacenter para associá-los aos seus perfis de navegador.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition"
            >
              <Plus className="h-4 w-4" />
              Cadastrar Primeiro Proxy
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surfaceLight/50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Nome</th>
                  <th className="py-3.5 px-4">Tipo & Endpoint</th>
                  <th className="py-3.5 px-4">Autenticação</th>
                  <th className="py-3.5 px-4">IP Detectado</th>
                  <th className="py-3.5 px-4">Latência</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {proxies.map((px) => {
                  const isTesting = testingId === px.id;

                  return (
                    <tr key={px.id} className="hover:bg-surfaceLight/30 transition">
                      <td className="py-4 px-4 font-semibold text-white">
                        {px.name}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-surfaceLight border border-border text-slate-300 font-mono text-[10px] uppercase mr-2">
                          {px.type}
                        </span>
                        <span className="font-mono text-xs text-slate-300">
                          {px.host}:{px.port}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                        {px.username ? (
                          <span className="text-slate-300">user: {px.username}</span>
                        ) : (
                          <span className="text-slate-600">Sem autenticação</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs">
                        {px.last_ip ? (
                          <span className="text-emerald-400">{px.last_ip}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono">
                        {px.latency_ms ? (
                          <span className="text-blue-400 flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {px.latency_ms} ms
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {px.status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </span>
                        )}
                        {px.status === 'error' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" />
                            Falhou
                          </span>
                        )}
                        {px.status === 'untested' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <Clock className="h-3 w-3" />
                            Não testado
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTestProxy(px.id)}
                            disabled={isTesting}
                            className="px-3 py-1.5 rounded-lg bg-surfaceLight border border-border hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            <Zap className={`h-3.5 w-3.5 text-amber-400 ${isTesting ? 'animate-spin' : ''}`} />
                            {isTesting ? 'Testando...' : 'Testar Conexão'}
                          </button>

                          <button
                            onClick={() => handleDeleteProxy(px.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Test Feedback */}
                        {testFeedback && testFeedback.id === px.id && (
                          <div className={`text-[11px] mt-1.5 ${testFeedback.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {testFeedback.message}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateProxyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProxy}
      />
    </div>
  );
};
