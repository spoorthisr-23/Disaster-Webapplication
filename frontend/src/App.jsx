import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { DisasterEventsView } from './components/DisasterEventsView';
import { EmergencyRequestsView } from './components/EmergencyRequestsView';
import { IncidentReportsView } from './components/IncidentReportsView';
import { ResourcesView } from './components/ResourcesView';
import { DistributionsView } from './components/DistributionsView';
import { SheltersView } from './components/SheltersView';
import { VolunteersView } from './components/VolunteersView';
import { OrganizationDashboardView } from './components/OrganizationDashboardView';
import { CitizenPortalView } from './components/CitizenPortalView';
import { LoginView } from './components/LoginView';

export function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      const u = stored ? JSON.parse(stored) : null;
      return u?.role === 'organization' ? 'organization' : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isAuthView, setIsAuthView] = useState(() => {
    return window.location.pathname === '/login';
  });

  // Toggle sidebar and persist user preference in localStorage
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Listen to popstate for back/forward browser button navigation
  useEffect(() => {
    const handlePopState = () => {
      setIsAuthView(window.location.pathname === '/login');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenLogin = () => {
    setIsAuthView(true);
    window.history.pushState({}, '', '/login');
  };

  const handleCloseLogin = () => {
    setIsAuthView(false);
    window.history.pushState({}, '', '/');
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setIsAuthView(false);
    window.history.pushState({}, '', '/');
    if (loggedInUser?.role === 'organization') {
      setActiveTab('organization');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setUser(null);
      setIsAuthView(true);
      window.history.pushState({}, '', '/login');
    }
  };

  // Standalone, clean full-screen Login page without navbar/tabs
  if (isAuthView && !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} onCancel={handleCloseLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033] flex font-sans antialiased">
      {/* 1. Left Sidebar Navigation (Desktop Collapsible & Mobile Drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setIsAuthView(false);
          setActiveTab(tab);
          if (window.location.pathname === '/login') {
            window.history.pushState({}, '', '/');
          }
        }}
        user={user}
        onLogout={handleLogout}
        onOpenLogin={handleOpenLogin}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={handleToggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopHeader
          activeTab={activeTab}
          user={user}
          onLogout={handleLogout}
          onOpenLogin={handleOpenLogin}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
          {activeTab === 'citizen' && <CitizenPortalView onNavigate={setActiveTab} />}
          {activeTab === 'organization' && <OrganizationDashboardView onNavigate={setActiveTab} />}
          {activeTab === 'events' && <DisasterEventsView />}
          {activeTab === 'requests' && <EmergencyRequestsView />}
          {activeTab === 'incidents' && <IncidentReportsView />}
          {activeTab === 'resources' && <ResourcesView />}
          {activeTab === 'distributions' && <DistributionsView />}
          {activeTab === 'shelters' && <SheltersView />}
          {activeTab === 'volunteers' && <VolunteersView />}
        </main>

        <footer className="bg-white border-t border-[#D8DEE8] py-4 mt-auto text-xs text-[#5B6475] text-center">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-semibold text-[#172033]">
              Disaster Relief and Emergency Management System
            </p>
            <p className="mt-0.5 text-[11px]">
              Connected to Live MySQL Database (<code>disaster_relief_db</code>) &amp; Edge API Backend
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
