import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar.js';
import { ProfilesPage } from './pages/ProfilesPage.js';
import { ProfileDetailPage } from './pages/ProfileDetailPage.js';
import { ProxiesPage } from './pages/ProxiesPage.js';

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
        <div className="min-h-screen bg-background flex flex-col selection:bg-blue-600 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<ProfilesPage />} />
              <Route path="/profiles/:id" element={<ProfileDetailPage />} />
              <Route path="/proxies" element={<ProxiesPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
