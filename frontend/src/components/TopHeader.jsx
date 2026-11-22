import React from 'react';
import {
  Menu,
  Building2,
  ShieldCheck,
  LogOut,
  LogIn,
  ChevronRight,
} from 'lucide-react';

export function TopHeader({
  activeTab,
  user,
  onLogout,
  onOpenLogin,
  onOpenMobileSidebar,
}) {
  const isAdmin = user?.role === 'admin';
  const isOrg = user?.role === 'organization';

  const tabLabels = {
    dashboard: 'Operations Dashboard',
    citizen: 'Citizen SOS & Tracking',
    organization: 'Organization Command Hub',
    events: 'Disaster Events',
    requests: 'Emergency Requests',
    incidents: 'Incident Reports',
    resources: 'Resources & Warehouse',
    distributions: 'Distribution Ledger',
    shelters: 'Shelters & Relief Camps',
    volunteers: 'Volunteer Relief Force',
  };

  const activeTitle = tabLabels[activeTab] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#D8DEE8] h-16 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
      {/* Left: Mobile Drawer Trigger + Breadcrumb Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button only (hidden on desktop) */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          title="Open Menu"
          className="md:hidden p-2 rounded-xl text-[#5B6475] hover:text-[#172033] hover:bg-slate-100 transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Title */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-medium text-[#5B6475]">
            Command Center
          </span>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-gray-400" />
          <h2 className="text-sm sm:text-base font-bold text-[#172033]">
            {activeTitle}
          </h2>
        </div>
      </div>

      {/* Right: Live DB Status + Profile & Logout */}
      <div className="flex items-center gap-3">
        {/* Live DB Badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Live DB</span>
        </span>

        {/* User Identity & Logout */}
        {user ? (
          <div className="flex items-center gap-2.5 pl-3 border-l border-[#D8DEE8]">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs ${
                  isAdmin ? 'bg-blue-600' : 'bg-emerald-600'
                }`}
              >
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#172033] leading-tight truncate max-w-[140px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-[#5B6475] leading-none mt-0.5 truncate max-w-[140px]">
                  {isAdmin ? 'Admin' : user.organization?.name || 'Field Coordinator'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default TopHeader;
