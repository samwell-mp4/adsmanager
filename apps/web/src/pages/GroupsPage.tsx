import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, Play, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api.js';
import { BrowserProfile } from '../types/index.js';

export const GroupsPage: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [customGroups, setCustomGroups] = useState<string[]>(['Default', 'Facebook Ads', 'Google Ads', 'Contingência']);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getProfiles();
      setProfiles(data || []);
      const existingGroups = Array.from(new Set(data.map((p) => p.group_name || 'Default')));
      setCustomGroups((prev) => Array.from(new Set([...prev, ...existingGroups])));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    if (!customGroups.includes(newGroupName.trim())) {
      setCustomGroups([...customGroups, newGroupName.trim()]);
    }
    setNewGroupName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <FolderKanban className="h-7 w-7 text-cyan-400" />
            Grupos & Campanhas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize suas contas por clientes, plataformas de anúncios ou esteiras de aquecimento.
          </p>
        </div>

        {/* Create Group Form */}
        <form onSubmit={handleCreateGroup} className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nome do novo grupo..."
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48"
          />
          <button
            type="submit"
            disabled={!newGroupName.trim()}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar Grupo
          </button>
        </form>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Carregando grupos e perfis...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customGroups.map((group) => {
            const groupProfiles = profiles.filter((p) => (p.group_name || 'Default') === group);
            const runningCount = groupProfiles.filter((p) => p.status === 'running').length;

            return (
              <div
                key={group}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg shadow-black/20"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-base text-white">{group}</h3>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {groupProfiles.length} perfis
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-500 text-[11px] block">Em Execução</span>
                      <span className="font-bold text-emerald-400 text-sm flex items-center gap-1 mt-0.5">
                        <Play className="h-3 w-3 fill-current" /> {runningCount}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-500 text-[11px] block">Parados</span>
                      <span className="font-bold text-slate-300 text-sm flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" /> {groupProfiles.length - runningCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <Link
                    to={`/?group=${encodeURIComponent(group)}`}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    Ver Perfis deste Grupo <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
