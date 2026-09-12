import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Globe, 
  Layers, 
  Shield, 
  Puzzle, 
  FolderKanban, 
  Activity, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api.js';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [health, setHealth] = useState<{ status: string; database: boolean; docker: boolean } | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const h = await api.getHealth();
        setHealth(h);
      } catch {
        setHealth({ status: 'error', database: false, docker: false });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Perfis de Navegador', path: '/', icon: Layers, badge: null },
    { name: 'CRM & Chats (Inbox)', path: '/crm', icon: MessageSquare, badge: 'Novo' },
    { name: 'Gerenciador de Proxies', path: '/proxies', icon: Shield, badge: null },
    { name: 'Extensões do Google', path: '/extensions', icon: Puzzle, badge: null },
    { name: 'Grupos & Campanhas', path: '/groups', icon: FolderKanban, badge: null },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-[#0b132b] border-r border-slate-800 transition-all duration-300 z-50 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header / Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 min-w-[40px] rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Globe className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-base text-white tracking-tight leading-tight">
                Ads<span className="text-blue-400">Manager</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                Multi-login Pro <span className="text-cyan-400 font-bold">v1.2</span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className={`text-[11px] uppercase tracking-wider font-semibold text-slate-500 px-3 mb-2 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? '•••' : 'Navegação'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon className={`h-5 w-5 min-w-[20px] transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Infra Health Widget */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
                Status da VPS
              </span>
              {health?.status === 'ok' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              ) : health ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Degradado
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Conectando...</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] border-t border-slate-800/60">
              <div className="text-slate-400">
                Docker:{' '}
                <span className={health?.docker ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                  {health?.docker ? 'OK' : 'Off'}
                </span>
              </div>
              <div className="text-slate-400">
                Postgres:{' '}
                <span className={health?.database ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {health?.database ? 'OK' : 'Off'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Status da VPS">
            <span
              className={`h-3 w-3 rounded-full ${
                health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
