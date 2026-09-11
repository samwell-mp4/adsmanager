import React, { useState } from 'react';
import { X, Layers, Monitor, Globe, Shield } from 'lucide-react';
import { BrowserProxy, CreateProfileDTO } from '../types/index.js';

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProfileDTO) => Promise<void>;
  proxies: BrowserProxy[];
}

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  proxies,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupName, setGroupName] = useState('Default');
  const [resolution, setResolution] = useState('1920x1080');
  const [locale, setLocale] = useState('pt-BR');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [proxyId, setProxyId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, digite um nome para o perfil.');
      return;
    }

    const [w, h] = resolution.split('x').map(Number);

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name,
        description: description || undefined,
        group_name: groupName,
        screen_width: w,
        screen_height: h,
        locale,
        timezone,
        proxy_id: proxyId ? Number(proxyId) : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao criar o perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surfaceLight/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Criar Novo Perfil</h2>
              <p className="text-xs text-slate-400">Configure os parâmetros do navegador isolado</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome do Perfil *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Perfil Facebook Principal"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Descrição (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Conta anunciante com 2FA habilitado"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Grupo
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Facebook, Instagram, Clientes"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-blue-400" />
                Proxy
              </label>
              <select
                value={proxyId}
                onChange={(e) => setProxyId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Sem Proxy (Conexão Direta)</option>
                {proxies.map((px) => (
                  <option key={px.id} value={px.id}>
                    {px.name} ({px.type.toUpperCase()} - {px.host}:{px.port})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Monitor className="h-3.5 w-3.5 text-blue-400" />
                Resolução de Tela
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="1920x1080">1920 x 1080 (Full HD)</option>
                <option value="1366x768">1366 x 768 (Laptop)</option>
                <option value="1280x720">1280 x 720 (HD)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                Idioma
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="pt-BR">Português (Brasil) - pt-BR</option>
                <option value="en-US">English (United States) - en-US</option>
                <option value="es-ES">Español - es-ES</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Fuso Horário (Timezone)
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Ex: America/Sao_Paulo"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surfaceLight border border-border text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition text-sm flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {loading ? 'Criando Perfil...' : 'Criar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
