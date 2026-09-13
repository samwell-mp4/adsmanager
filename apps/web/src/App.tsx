import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="h-screen w-screen bg-background flex selection:bg-blue-600 selection:text-white overflow-hidden">
          <Sidebar />
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

