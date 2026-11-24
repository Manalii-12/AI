import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import NotificationDrawer from './components/NotificationDrawer';
import RootCauseModal from './components/RootCauseModal';
import VoiceAssistantOverlay from './components/VoiceAssistantOverlay';

// Pages
import Dashboard from './pages/Dashboard';
import AiIntelligence from './pages/AiIntelligence';
import AiActionCenter from './pages/AiActionCenter';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Inventory from './pages/Inventory';
import Dispatch from './pages/Dispatch';
import Complaints from './pages/Complaints';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import Simulator from './pages/Simulator';
import Employees from './pages/Employees';

import { getAiInsights } from './api';

export default function App() {
  const getInitialPage = () => {
    const path = window.location.pathname.replace(/^\//, '');
    const validPages = [
      'dashboard', 'ai-intel', 'action-center', 'orders', 'customers',
      'payments', 'inventory', 'dispatch', 'complaints', 'products',
      'suppliers', 'simulator', 'employees'
    ];
    if (validPages.includes(path)) return path;
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (validPages.includes(hash)) return hash;
    return 'dashboard';
  };

  const [activePage, setActivePage] = useState(getInitialPage);
  const [activeRole, setActiveRole] = useState('Owner/Admin');
  const [insights, setInsights] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [modalInsight, setModalInsight] = useState(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Sync active page with URL history
  const handlePageChange = (page) => {
    setActivePage(page);
    if (window.location.pathname !== `/${page}`) {
      window.history.pushState(null, '', `/${page}`);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '') || 'dashboard';
      setActivePage(path);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchInsights = async () => {
    try {
      const res = await getAiInsights({ status: 'ACTIVE' });
      setInsights(res.data);
    } catch (err) {
      console.error('Failed to poll insights:', err);
    }
  };

  useEffect(() => {
    fetchInsights();
    // Proactive background poller every 60 seconds
    const interval = setInterval(fetchInsights, 60000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = insights.filter((i) => i.severity === 'CRITICAL').length;

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateTo={handlePageChange}
            onSelectInsight={(ins) => setModalInsight(ins)}
          />
        );
      case 'ai-intel':
        return (
          <AiIntelligence
            onNavigateTo={handlePageChange}
            onSelectInsight={(ins) => setModalInsight(ins)}
          />
        );
      case 'action-center':
        return (
          <AiActionCenter
            onSelectInsight={(ins) => setModalInsight(ins)}
          />
        );
      case 'orders':
        return <Orders />;
      case 'customers':
        return <Customers />;
      case 'payments':
        return <Payments />;
      case 'inventory':
        return <Inventory />;
      case 'dispatch':
        return <Dispatch />;
      case 'complaints':
        return <Complaints />;
      case 'products':
        return <Products />;
      case 'suppliers':
        return <Suppliers />;
      case 'simulator':
        return <Simulator />;
      case 'employees':
        return (
          <Employees
            activeRole={activeRole}
            setActiveRole={setActiveRole}
          />
        );
      default:
        return <Dashboard onNavigateTo={handlePageChange} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F4F8F5] text-[#244B39] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={handlePageChange}
        activeRiskCount={criticalCount}
        onOpenVoice={() => setIsVoiceOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar */}
        <Navbar
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          unreadAlertCount={insights.length}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onRefreshData={fetchInsights}
          onToggleVoice={() => setIsVoiceOpen(!isVoiceOpen)}
          isVoiceOpen={isVoiceOpen}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-[#F4F8F5]">
          <div className="max-w-7xl mx-auto">
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* Voice-First AI Assistant Overlay */}
      <VoiceAssistantOverlay
        isOpen={isVoiceOpen}
        onToggleOpen={() => setIsVoiceOpen(!isVoiceOpen)}
        onNavigateTo={handlePageChange}
      />

      {/* Notification Center Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        insights={insights}
        onSelectInsight={(ins) => {
          setIsNotificationOpen(false);
          setModalInsight(ins);
        }}
      />

      {/* 5-Step Root Cause Investigation Modal */}
      {modalInsight && (
        <RootCauseModal
          insight={modalInsight}
          onClose={() => setModalInsight(null)}
          onActionSuccess={() => {
            fetchInsights();
          }}
        />
      )}
    </div>
  );
}
