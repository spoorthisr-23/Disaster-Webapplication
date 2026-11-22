import React from 'react';
import {
  PanelLeft,
  LayoutDashboard,
  Building2,
  Package,
  Share2,
  Home,
  HeartHandshake,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  FileText,
  LogOut,
  LogIn,
  ShieldCheck,
  X,
} from 'lucide-react';

export function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenLogin,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) {
  const isAdmin = user?.role === 'admin';
  const isOrg = user?.role === 'organization';

  // Section-based navigation items
  const orgNavGroups = [
    {
      title: 'COMMAND HUB',
      items: [
        { id: 'organization', label: 'Organization Command Hub', icon: Building2 },
        { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'FIELD LOGISTICS',
      items: [
        { id: 'resources', label: 'Resources & Warehouse', icon: Package },
        { id: 'distributions', label: 'Distribution Ledger', icon: Share2 },
        { id: 'shelters', label: 'Shelters Reference', icon: Home },
        { id: 'volunteers', label: 'Volunteer Relief Force', icon: HeartHandshake },
      ],
    },
    {
      title: 'SITUATIONAL FEED',
      items: [
        { id: 'events', label: 'Disaster Events', icon: ShieldAlert },
      ],
    },
  ];

  const standardNavGroups = [
    {
      title: 'COMMAND CENTER',
      items: [
        { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
        { id: 'citizen', label: 'Citizen SOS & Tracking', icon: AlertOctagon, isSos: true },
        { id: 'organization', label: 'Organization Portal', icon: Building2 },
      ],
    },
    {
      title: 'INCIDENTS & EMERGENCIES',
      items: [
        { id: 'events', label: 'Disaster Events', icon: ShieldAlert },
        { id: 'requests', label: 'Emergency Requests', icon: AlertTriangle },
        { id: 'incidents', label: 'Incident Reports', icon: FileText },
      ],
    },
    {
      title: 'RELIEF OPERATIONS',
      items: [
        { id: 'resources', label: 'Resources Inventory', icon: Package },
        { id: 'distributions', label: 'Distribution Ledger', icon: Share2 },
        { id: 'shelters', label: 'Emergency Shelters', icon: Home },
        { id: 'volunteers', label: 'Volunteer Relief Force', icon: HeartHandshake },
      ],
    },
  ];

  const navGroups = isOrg ? orgNavGroups : standardNavGroups;

  const handleSelect = (id) => {
    setActiveTab(id);
    if (isMobileOpen && setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-[#D8DEE8] transition-all duration-300 ease-in-out md:static shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header: Logo + Collapse Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#F1F5F9] shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h4l2 2 2.5-8 3 14 2.5-8H21" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <h1 className="text-sm font-bold text-[#172033] leading-tight truncate">
                  Disaster Relief
                </h1>
                <p className="text-[11px] text-[#5B6475] font-medium leading-tight truncate">
                  Emergency Ops
                </p>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button [ | ] */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden md:flex p-1.5 rounded-lg text-[#5B6475] hover:text-[#172033] hover:bg-slate-100 transition cursor-pointer"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (Scrollable without horizontal overflow) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-bold text-[#8896AB] tracking-wider uppercase">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                if (item.isSos) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      title={item.label}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCollapsed ? 'justify-center px-0' : ''
                      } ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500/20'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-rose-600 animate-pulse'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    title={item.label}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isCollapsed ? 'justify-center px-0' : ''
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-[#5B6475] hover:text-[#172033] hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#5B6475]'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer: User Card + Live DB Status */}
        <div className="p-3 border-t border-[#F1F5F9] bg-[#FAFBFD] shrink-0 space-y-2">
          {/* Live DB indicator */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-2 py-1 text-[11px] text-[#5B6475]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Cloud MySQL
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Ready
              </span>
            </div>
          ) : (
            <div className="flex justify-center py-1" title="Live Database Connected">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}

          {/* User Profile Capsule */}
          {user ? (
            <div
              className={`flex items-center gap-2 p-2 rounded-xl bg-white border border-[#D8DEE8] ${
                isCollapsed ? 'justify-center p-2' : 'justify-between'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 text-xs shadow-xs ${
                    isAdmin ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}
                  title={user.name}
                >
                  {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#172033] truncate leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-[#5B6475] truncate mt-0.5">
                      {isAdmin ? 'System Administrator' : user.organization?.name || 'Field Coordinator'}
                    </p>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out"
                  className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              title="Sign In to Portal"
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer ${
                isCollapsed ? 'px-0' : 'px-3'
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Sign In</span>}
            </button>
          )}

          {/* Collapsed mode logout icon */}
          {isCollapsed && user && (
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              className="w-full flex items-center justify-center py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
