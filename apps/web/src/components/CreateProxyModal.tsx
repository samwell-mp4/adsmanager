import React, { useState } from 'react';
import { X, Shield, Server, Lock, User } from 'lucide-react';
import { CreateProxyDTO, ProxyType } from '../types/index.js';

interface CreateProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProxyDTO) => Promise<void>;
}

export const CreateProxyModal: React.FC<CreateProxyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<ProxyType>('http');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim() || !port) {
      setError('Nome, Host e Porta são obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name,
        host,
        port: parseInt(port, 10),
        username: username || undefined,
        password: password || undefined,
        type,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao cadastrar proxy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surfaceLight/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cadastrar Novo Proxy</h2>
              <p className="text-xs text-slate-400">HTTP, HTTPS ou SOCKS5 com autenticação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Identificação / Nome *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Proxy Residencial Brasil #1"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProxyType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks5">SOCKS5</option>
                <option value="socks4">SOCKS4</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Server className="h-3.5 w-3.5 text-emerald-400" />
                Host / IP *
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="proxy.example.com ou 192.168.1.5"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Porta *
            </label>
            <input
              type="number"
              required
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="Ex: 8080 ou 1080"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Usuário (Opcional)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                Senha (Opcional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-surfaceLight transition text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Proxy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
