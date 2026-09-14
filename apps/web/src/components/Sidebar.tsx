import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Globe, 
  Layers, 
  Puzzle, 
  FolderKanban, 
  Activity, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Package,
  DollarSign,
  X,
  FolderOpen
} from 'lucide-react';
import { api } from '../services/api.js';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [health, setHealth] = useState<{ status: string; database: boolean; docker: boolean } | null>(null);

  useEffect(() => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [location.pathname]);

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
    { name: 'CRM & Chats (Inbox)', path: '/crm', icon: MessageSquare, badge: null },
    { name: 'Catálogo de Produtos', path: '/catalog', icon: Package, badge: null },
    { name: 'Controle Financeiro', path: '/finance', icon: DollarSign, badge: 'Novo' },
    { name: 'Controle de Proxies', path: '/proxies', icon: Globe, badge: null },
    { name: 'Extensões do Google', path: '/extensions', icon: Puzzle, badge: null },
    { name: 'FTP / Arquivos', path: '/files', icon: FolderOpen, badge: null },
    { name: 'Grupos & Campanhas', path: '/groups', icon: FolderKanban, badge: null },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static md:translate-x-0 h-screen shrink-0 flex-shrink-0 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shadow-2xl md:shadow-sm ${
          collapsed ? 'md:w-20' : 'md:w-64'
        } ${
          mobileOpen ? 'translate-x-0 w-72 max-w-[85vw]' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header / Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 min-w-[40px] rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Globe className="h-5 w-5 text-white" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-base text-slate-900 tracking-tight leading-tight">
                  Ads<span className="text-blue-600">Manager</span>
                </span>
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  Multi-login Pro <span className="text-blue-600 font-bold">v1.2</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Mobile close toggle */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nav List */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className={`text-[10px] uppercase tracking-wider font-bold text-slate-400 px-3 mb-2 ${collapsed && !mobileOpen ? 'text-center' : ''}`}>
            {collapsed && !mobileOpen ? '•••' : 'Menu Principal'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
                title={collapsed && !mobileOpen ? item.name : undefined}
              >
                <Icon className={`h-5 w-5 min-w-[20px] transition ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}`} />
                {(!collapsed || mobileOpen) && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
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
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          {(!collapsed || mobileOpen) ? (
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Activity className="h-3.5 w-3.5 text-blue-600" />
                  Status da VPS
                </span>
                {health?.status === 'ok' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                ) : health ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Alerta
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Verificando...</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] border-t border-slate-100">
                <div className="text-slate-500">
                  Docker:{' '}
                  <span className={health?.docker ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                    {health?.docker ? 'OK' : 'Off'}
                  </span>
                </div>
                <div className="text-slate-500">
                  Postgres:{' '}
                  <span className={health?.database ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                    {health?.database ? 'OK' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Status da VPS">
              <span
                className={`h-3 w-3 rounded-full ${
                  health?.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};


