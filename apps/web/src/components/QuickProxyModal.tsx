import React, { useState, useEffect } from 'react';
import { X, Shield, Check, Plus, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { api } from '../services/api.js';
import { BrowserProxy } from '../types/index.js';

interface QuickProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  profileName: string;
  currentProxyId: number | null;
  onProxyChanged: () => void;
}

export const QuickProxyModal: React.FC<QuickProxyModalProps> = ({
  isOpen,
  onClose,
  profileId,
  profileName,
  currentProxyId,
  onProxyChanged,
}) => {
  const [proxies, setProxies] = useState<BrowserProxy[]>([]);
  const [selectedProxyId, setSelectedProxyId] = useState<number | null>(currentProxyId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [creatingRaw, setCreatingRaw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedProxyId(currentProxyId);
      setError(null);
      setRawInput('');
      fetchProxies();
    }
  }, [isOpen, currentProxyId]);

  const fetchProxies = async () => {
    setLoading(true);
    try {
      const data = await api.getProxies();
      setProxies(data || []);
    } catch (e: any) {
      setError(`Erro ao carregar proxies: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.changeProxy(profileId, selectedProxyId);
      onProxyChanged();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndSelectRaw = async () => {
    if (!rawInput.trim()) return;
    setCreatingRaw(true);
    setError(null);
    try {
      const newProxy = await api.createProxy({
        name: '',
        host: '',
        port: 0,
        type: 'http',
        raw: rawInput.trim(),
        test_now: true,
      });
      await fetchProxies();
      setSelectedProxyId(newProxy.id);
      setRawInput('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingRaw(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Troca Rápida de Proxy</h2>
              <p className="text-xs text-slate-400">
                Perfil: <span className="text-blue-400 font-semibold">{profileName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Paste Proxy input */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800/80 bg-slate-950/30 space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Colar Proxy Novo (host:port:user:pass):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="ex: residencial-us.ipbr.pro:9000:user:senha"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
            />
            <button
              onClick={handleCreateAndSelectRaw}
              disabled={creatingRaw || !rawInput.trim()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {creatingRaw ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Adicionar
            </button>
          </div>
        </div>

        {/* Proxy List */}
        <div className="p-6 flex-1 overflow-y-auto space-y-2">
          <div className="text-xs font-semibold text-slate-400 mb-2">Selecione o proxy para este perfil:</div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              Carregando proxies...
            </div>
          ) : (
            <>
              {/* Option: Direct Connection (No Proxy) */}
              <div
                onClick={() => setSelectedProxyId(null)}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  selectedProxyId === null
                    ? 'bg-blue-600/10 border-blue-500/50 text-white shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm">Sem Proxy (Conexão Direta)</div>
                  <div className="text-xs text-slate-500">Usa a internet nativa da VPS</div>
                </div>
                {selectedProxyId === null && <Check className="h-5 w-5 text-blue-400" />}
              </div>

              {/* Proxies */}
              {proxies.map((p) => {
                const isSelected = selectedProxyId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProxyId(p.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/50 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-1 truncate max-w-[340px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{p.name}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {p.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate">
                        {p.host}:{p.port}
                        {p.last_ip && <span className="text-slate-500 ml-2">(IP: {p.last_ip})</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {p.latency_ms && (
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {p.latency_ms}ms
                        </span>
                      )}
                      {isSelected && <Check className="h-5 w-5 text-blue-400" />}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? 'Salvando...' : 'Aplicar ao Perfil'}
          </button>
        </div>
      </div>
    </div>
  );
};
