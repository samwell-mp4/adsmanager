import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Layers, Shield, Activity } from 'lucide-react';
import { api } from '../services/api.js';

export const Navbar: React.FC = () => {
  const location = useLocation();
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

  const navLinks = [
    { name: 'Perfis de Navegador', path: '/', icon: Layers },
    { name: 'Gerenciador de Proxies', path: '/proxies', icon: Shield },
  ];

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">Browser<span className="text-blue-500">Manager</span></span>
              <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">v1.0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surfaceLight'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Health indicator */}
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-surfaceLight border border-border">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Infra:</span>
            {health?.status === 'ok' ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Online
              </span>
            ) : health ? (
              <span className="text-rose-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Degradado
              </span>
            ) : (
              <span className="text-slate-500">Conectando...</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
