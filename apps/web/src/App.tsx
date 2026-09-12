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
        <div className="min-h-screen bg-background flex selection:bg-blue-600 selection:text-white">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-y-auto max-h-screen">
            <Routes>
              <Route path="/" element={<ProfilesPage />} />
              <Route path="/crm" element={<CrmPage />} />
              <Route path="/profiles/:id" element={<ProfileDetailPage />} />
              <Route path="/proxies" element={<ProxiesPage />} />
              <Route path="/extensions" element={<ExtensionsPage />} />
              <Route path="/groups" element={<GroupsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

