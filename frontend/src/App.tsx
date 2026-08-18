import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Navbar, type TabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ComposeEmailModal } from './components/ComposeEmailModal';
import { ToastContainer } from './components/ui/ToastContainer';

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!isAuthenticated) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCompose={() => setIsComposeOpen(true)}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        <DashboardView
          key={refreshTrigger}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCompose={() => setIsComposeOpen(true)}
          onCountsUpdate={(scheduled, sent) => {
            setScheduledCount(scheduled);
            setSentCount(sent);
          }}
        />
      </main>

      {/* Compose Campaign Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};

export default App;
