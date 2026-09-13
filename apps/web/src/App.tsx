import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Menu, Globe } from 'lucide-react';
import { Sidebar } from './components/Sidebar.js';
import { ProfilesPage } from './pages/ProfilesPage.js';
import { ProfileDetailPage } from './pages/ProfileDetailPage.js';
import { ProxiesPage } from './pages/ProxiesPage.js';
import { ExtensionsPage } from './pages/ExtensionsPage.js';
import { GroupsPage } from './pages/GroupsPage.js';
import { CrmPage } from './pages/CrmPage.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { FinancePage } from './pages/FinancePage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="h-screen w-screen bg-background flex flex-col md:flex-row selection:bg-blue-600 selection:text-white overflow-hidden">
          {/* Mobile Top Navbar (Visible only on < md) */}
          <header className="md:hidden h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition"
                aria-label="Abrir Menu"
              >
                <Menu className="h-5 w-5 text-slate-800" />
              </button>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-xs">
                  <Globe className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-sm text-slate-900 tracking-tight">
                  Ads<span className="text-blue-600">Manager</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
          </header>

          <Sidebar
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
            <Routes>
              <Route path="/" element={<div className="h-full overflow-y-auto"><ProfilesPage /></div>} />
              <Route path="/crm" element={<CrmPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/profiles/:id" element={<div className="h-full overflow-y-auto"><ProfileDetailPage /></div>} />
              <Route path="/proxies" element={<div className="h-full overflow-y-auto"><ProxiesPage /></div>} />
              <Route path="/extensions" element={<div className="h-full overflow-y-auto"><ExtensionsPage /></div>} />
              <Route path="/groups" element={<div className="h-full overflow-y-auto"><GroupsPage /></div>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;


