import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { StatusBadge } from './StatusBadge';
import { 
  LayoutDashboard,
  Package,
  HeartHandshake,
  Home,
  Share2,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Building2,
  RefreshCw,
  Plus,
  Edit3,
  CheckCircle2,
  Clock,
  Truck,
  Users,
  Box,
  MapPin,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export function OrganizationDashboardView({ onNavigate }) {
  const [currentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [availableOrgs, setAvailableOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      const u = stored ? JSON.parse(stored) : null;
      return u?.organization_id || 1;
    } catch {
      return 1;
    }
  });

  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  // Modals for staff management
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [volunteerActivity, setVolunteerActivity] = useState('');
  const [volunteerStatus, setVolunteerStatus] = useState('assigned');
  const [savingVolunteer, setSavingVolunteer] = useState(false);

  const [selectedResource, setSelectedResource] = useState(null);
  const [newStockQty, setNewStockQty] = useState('');
  const [savingResource, setSavingResource] = useState(false);

  // Modals for registering supplies, shelter occupancy, and dispatches
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [newResourceData, setNewResourceData] = useState({
    item_name: '',
    category: 'Food & Nutrition',
    quantity_available: 100,
    unit: 'units',
    warehouse_location: '',
  });
  const [savingNewResource, setSavingNewResource] = useState(false);

  const [updatingSosId, setUpdatingSosId] = useState(null);
  const [sosFilter, setSosFilter] = useState('all');

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchData, setDispatchData] = useState({
    request_id: '',
    resource_id: '',
    quantity_distributed: 10,
    distributed_by_volunteer_id: '',
    delivery_status: 'in_progress',
    notes: '',
  });
  const [savingDispatch, setSavingDispatch] = useState(false);

  // Fetch live dashboard telemetry
  const loadDashboard = async (orgId = selectedOrgId) => {
    try {
      setError(null);
      const data = await api.getOrganizationDashboard(orgId);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load organization dashboard:', err);
      setError(err?.message || 'Failed to load organization dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      api.getOrganizations().then((orgs) => {
        if (Array.isArray(orgs) && orgs.length > 0) {
          setAvailableOrgs(orgs);
        }
      }).catch(() => {});
    }
    loadDashboard(selectedOrgId);
  }, [selectedOrgId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // Handle volunteer assignment
  const handleAssignVolunteer = async (e) => {
    e.preventDefault();
    if (!selectedVolunteer || !volunteerActivity.trim()) return;

    setSavingVolunteer(true);
    try {
      await api.assignVolunteer(selectedVolunteer.volunteer_id, {
        activity: volunteerActivity.trim(),
        status: volunteerStatus,
      });
      setSelectedVolunteer(null);
      setVolunteerActivity('');
      await loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to assign volunteer');
    } finally {
      setSavingVolunteer(false);
    }
  };

  // Handle resource stock update
  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!selectedResource || newStockQty === '') return;

    setSavingResource(true);
    try {
      await api.updateOrgResource(selectedResource.resource_id, {
        quantity_available: parseInt(newStockQty, 10),
      });
      setSelectedResource(null);
      setNewStockQty('');
      await loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to update stock');
    } finally {
      setSavingResource(false);
    }
  };

  // Handle register new resource
  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!newResourceData.item_name.trim()) return;

    setSavingNewResource(true);
    try {
      await api.createOrgResource({
        ...newResourceData,
        quantity_available: parseInt(newResourceData.quantity_available, 10) || 0,
        warehouse_location: newResourceData.warehouse_location.trim() || `${dashboardData?.organization?.name || 'Central'} Depot`,
      });
      setShowAddResourceModal(false);
      setNewResourceData({
        item_name: '',
        category: 'Food & Nutrition',
        quantity_available: 100,
        unit: 'units',
        warehouse_location: '',
      });
      await loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to register new resource');
    } finally {
      setSavingNewResource(false);
    }
  };

  // Handle update emergency request status
  const handleUpdateSosStatus = async (id, newStatus) => {
    setUpdatingSosId(id);
    try {
      await api.updateEmergencyRequestStatus(id, newStatus);
      await loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to update emergency request status');
    } finally {
      setUpdatingSosId(null);
    }
  };

  const handleOpenDispatchForRequest = (req) => {
    setDispatchData((prev) => ({
      ...prev,
      request_id: `REQ-${req.id}`,
      notes: `Fulfilling emergency distress call #${req.id} from ${req.requester_name || 'Citizen'} (${req.request_type || 'Relief assistance'})`,
    }));
    setShowDispatchModal(true);
  };

  // Handle create distribution dispatch
  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchData.resource_id) {
      alert('Please select a resource item to dispatch.');
      return;
    }

    setSavingDispatch(true);
    try {
      await api.createDispatch({
        ...dispatchData,
        request_id: dispatchData.request_id.trim() || `REQ-${Date.now().toString().slice(-4)}`,
        resource_id: parseInt(dispatchData.resource_id, 10),
        quantity_distributed: parseInt(dispatchData.quantity_distributed, 10) || 1,
        distributed_by_volunteer_id: dispatchData.distributed_by_volunteer_id ? parseInt(dispatchData.distributed_by_volunteer_id, 10) : null,
      });
      setShowDispatchModal(false);
      setDispatchData({
        request_id: '',
        resource_id: '',
        quantity_distributed: 10,
        distributed_by_volunteer_id: '',
        delivery_status: 'in_progress',
        notes: '',
      });
      await loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to log distribution dispatch');
    } finally {
      setSavingDispatch(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-white rounded-2xl border border-[#D8DEE8] shadow-xs">
        <RefreshCw className="w-8 h-8 text-[#1D4ED8] animate-spin mb-4" />
        <h3 className="text-base font-bold text-[#172033]">Connecting to Operations Command</h3>
        <p className="text-xs text-[#5B6475] mt-1">Retrieving live database telemetry for your organization...</p>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 shadow-xs text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#172033]">Unable to Load Organization Portal</h3>
        <p className="text-xs text-[#5B6475] mt-1.5 mb-6">{error || 'Data unavailable.'}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold rounded-lg shadow transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const organization = dashboardData?.organization || {};
  const statistics = dashboardData?.statistics || {};
  const inventory = dashboardData?.inventory || { low_stock_count: 0, all_items: [] };
  const volunteers = dashboardData?.volunteers || { available: 0, total: 0, roster: [] };
  const camps_and_shelters = dashboardData?.camps_and_shelters || dashboardData?.shelters || {
    total_camps: 0,
    total_capacity: 0,
    current_occupancy: 0,
    available_spaces: 0,
    full_camps: 0,
    shelters: [],
  };
  const distributions = dashboardData?.distributions || {
    total_distributions: 0,
    pending_deliveries: 0,
    in_progress_deliveries: 0,
    completed_deliveries: 0,
    recent_ledger: [],
  };
  const recent_activities = dashboardData?.recent_activities || dashboardData?.recent_activity || [];
  const emergencyRequests = dashboardData?.emergency_requests || [];

  const pendingSosCount = (dashboardData?.emergency_requests || []).filter(
    (r) => r.status === 'pending' || r.status === 'new'
  ).length || (statistics?.pending_requests ?? 0);

  const sidebarLinks = [
    { id: 'overview', label: 'Main Overview', icon: LayoutDashboard },
    { 
      id: 'requests', 
      label: 'Citizen SOS Queue', 
      icon: AlertTriangle, 
      badge: pendingSosCount > 0 ? `${pendingSosCount} pending` : null 
    },
    { id: 'inventory', label: 'Resource Inventory', icon: Package, badge: (inventory?.low_stock_count ?? 0) > 0 ? `${inventory.low_stock_count} low` : null },
    { id: 'volunteers', label: 'Volunteer Roster', icon: HeartHandshake, badge: volunteers?.available ?? 0 },
    { id: 'distributions', label: 'Distribution Ledger', icon: Share2 },
    { id: 'activities', label: 'Recent Activities', icon: Activity },
  ];

  const statCards = [
    { label: 'Total Emergency Requests', value: statistics.total_emergency_requests, sub: 'Assigned to organization', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Pending Requests', value: statistics.pending_requests, sub: 'Awaiting field action', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Active Operations', value: statistics.active_operations, sub: 'Approved dispatches & on-duty', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed Requests', value: statistics.completed_requests, sub: 'Fulfilled & resolved', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Available Resources', value: statistics.available_resources.toLocaleString(), sub: 'Warehouse units in stock', icon: Box, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Resources Distributed', value: statistics.total_resources_distributed.toLocaleString(), sub: 'Dispatched to victims', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Volunteers', value: statistics.active_volunteers, sub: 'Available or deployed', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'People Assisted', value: statistics.total_people_assisted.toLocaleString(), sub: 'Direct beneficiaries', icon: ShieldCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Admin Organization Switcher */}
      {currentUser?.role === 'admin' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              🛡️
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-950">Administrator Command View</h4>
              <p className="text-[11px] text-blue-700">Switch between registered relief organizations to monitor live capacity:</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="org-select" className="text-xs font-semibold text-blue-900 shrink-0">Active Hub:</label>
            <select
              id="org-select"
              value={selectedOrgId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedOrgId(id);
                loadDashboard(id);
              }}
              className="bg-white border border-blue-300 text-blue-900 font-semibold rounded-xl px-3 py-1.5 text-xs shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {availableOrgs.length > 0 ? (
                availableOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    🏥 {org.name} ({org.type?.toUpperCase()})
                  </option>
                ))
              ) : (
                <option value={1}>🏥 International Red Cross Relief Hub (NGO)</option>
              )}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* =====================================================================
            260px LEFT SIDEBAR NAVIGATION MENU (as requested)
            ===================================================================== */}
      <aside className="w-full lg:w-[260px] lg:shrink-0 bg-white rounded-2xl border border-[#D8DEE8] p-4 shadow-xs sticky top-20">
        {/* Organization Brand Header */}
        <div className="pb-4 mb-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-[#172033] truncate" title={organization.name}>
                {organization.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  {organization.type}
                </span>
                <span className="text-[11px] text-[#5B6475] truncate">
                  {organization.area}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Menu Items */}
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeSection === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveSection(link.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-[#5B6475] hover:text-[#172033] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#5B6475]'}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#172033]'
                  }`}>
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="mt-6 pt-4 border-t border-[#F1F5F9] text-[11px] text-[#5B6475] space-y-2">
          <div className="flex items-center justify-between">
            <span>Reg:</span>
            <span className="font-mono font-medium text-[#172033]">{organization.registration_number}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#D8DEE8] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#172033] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live Telemetry</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          MAIN DASHBOARD CANVAS (Right Side)
          ===================================================================== */}
      <main className="flex-1 w-full space-y-8 min-w-0">
        {/* Top Header Banner */}
        <div className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172033]">
                {sidebarLinks.find((l) => l.id === activeSection)?.label || 'Organization Operations'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-[#5B6475] mt-1">
              Field Operations Command Center for <strong className="text-[#172033]">{organization.name}</strong> • Isolated to {organization.area}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                activeSection === 'all'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-[#D8DEE8] text-[#5B6475] hover:text-[#172033]'
              }`}
            >
              View Full Report
            </button>
          </div>
        </div>

        {/* 1. MAIN DASHBOARD 8 STATISTICS CARDS */}
        {(activeSection === 'overview' || activeSection === 'all') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                1. Core Mission Statistics
              </h2>
              <span className="text-xs text-[#5B6475]">Calculated from verified database tables</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-[#D8DEE8] p-4 shadow-xs flex flex-col justify-between hover:border-[#1D4ED8] transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#5B6475]">{card.label}</span>
                      <div className={`p-1.5 rounded-lg ${card.bg}`}>
                        <Icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-extrabold text-[#172033] tracking-tight">
                        {card.value}
                      </div>
                      <div className="text-[11px] text-[#5B6475] mt-0.5">
                        {card.sub}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Priority Callouts in Main Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Quick Incoming Distress Calls Preview */}
              <div className="bg-white rounded-xl border border-rose-200/80 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                    <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                      Priority Distress Signals ({pendingSosCount} Pending)
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveSection('requests')}
                    className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View SOS Queue</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {emergencyRequests.filter((r) => r.status === 'pending' || r.status === 'new').length === 0 ? (
                  <div className="py-4 text-center text-xs text-[#5B6475] flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>No pending emergency distress calls awaiting dispatch.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {emergencyRequests
                      .filter((r) => r.status === 'pending' || r.status === 'new')
                      .slice(0, 2)
                      .map((req) => (
                        <div key={req.id} className="p-2.5 rounded-lg bg-rose-50/40 border border-rose-200/50 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-rose-700">#REQ-{req.id}</span>
                              <span className="font-semibold text-[#172033] truncate">{req.requester_name || 'Citizen'}</span>
                            </div>
                            <p className="text-[11px] text-[#5B6475] truncate mt-0.5">{req.location_name || 'Field site'} • {req.people_affected || 1} people</p>
                          </div>
                          <button
                            onClick={() => handleUpdateSosStatus(req.id, 'in_progress')}
                            disabled={updatingSosId === req.id}
                            className="shrink-0 px-2.5 py-1 rounded bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-[11px] font-semibold transition cursor-pointer"
                          >
                            Dispatch
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Designated Shelters Reference Card (Read-Only) */}
              <div className="bg-white rounded-xl border border-[#D8DEE8] p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-teal-600" />
                    <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                      Regional Shelters Reference (Admin Managed)
                    </h3>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {camps_and_shelters.available_spaces} Spaces Free
                  </span>
                </div>

                <div className="space-y-2">
                  {camps_and_shelters.shelters.slice(0, 2).map((shelter) => {
                    const percent = Math.min(100, Math.round((shelter.current_occupancy / shelter.capacity) * 100));
                    return (
                      <div key={shelter.shelter_id} className="p-2.5 rounded-lg bg-slate-50 border border-gray-100 text-xs">
                        <div className="flex items-center justify-between font-semibold text-[#172033]">
                          <span>{shelter.shelter_name}</span>
                          <span className="text-[11px] font-normal text-[#5B6475]">{shelter.area}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden mt-1.5">
                          <div
                            className={`h-full ${percent >= 100 ? 'bg-rose-600' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#5B6475] mt-1">
                          <span>{shelter.current_occupancy} / {shelter.capacity} occupants ({percent}%)</span>
                          <span>Contact: {shelter.contact_person || 'Field In-Charge'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. CITIZEN SOS & EMERGENCY TRIAGE QUEUE */}
        {(activeSection === 'requests' || activeSection === 'all') && (
          <section className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  2. Citizen SOS &amp; Emergency Triage Queue
                </h2>
                <p className="text-xs text-[#5B6475] mt-0.5">
                  Direct citizen distress signals awaiting NGO response, volunteer dispatch, or relief allocation in {organization.area}.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {['all', 'pending', 'in_progress', 'completed'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSosFilter(tab)}
                    className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                      sosFilter === tab
                        ? 'bg-white text-[#172033] shadow-xs'
                        : 'text-[#5B6475] hover:text-[#172033]'
                    }`}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Counters Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] text-[#5B6475]">Total SOS Requests</span>
                <p className="text-lg font-bold text-[#172033] mt-1">{emergencyRequests.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60">
                <span className="text-[11px] text-rose-700 font-semibold">Awaiting Dispatch</span>
                <p className="text-lg font-bold text-rose-800 mt-1">
                  {emergencyRequests.filter((r) => r.status === 'pending' || r.status === 'new').length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
                <span className="text-[11px] text-blue-700 font-semibold">Field Team Dispatched</span>
                <p className="text-lg font-bold text-blue-800 mt-1">
                  {emergencyRequests.filter((r) => r.status === 'in_progress' || r.status === 'approved').length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                <span className="text-[11px] text-emerald-700 font-semibold">Resolved &amp; Safe</span>
                <p className="text-lg font-bold text-emerald-800 mt-1">
                  {emergencyRequests.filter((r) => r.status === 'completed' || r.status === 'fulfilled').length}
                </p>
              </div>
            </div>

            {/* Emergency Request Cards Grid */}
            {emergencyRequests.filter((r) => {
              if (sosFilter === 'all') return true;
              if (sosFilter === 'pending') return r.status === 'pending' || r.status === 'new';
              if (sosFilter === 'in_progress') return r.status === 'in_progress' || r.status === 'approved';
              if (sosFilter === 'completed') return r.status === 'completed' || r.status === 'fulfilled';
              return true;
            }).length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#172033]">No requests matching this filter</h4>
                <p className="text-xs text-[#5B6475] mt-1">All citizen signals in this category have been processed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyRequests
                  .filter((r) => {
                    if (sosFilter === 'all') return true;
                    if (sosFilter === 'pending') return r.status === 'pending' || r.status === 'new';
                    if (sosFilter === 'in_progress') return r.status === 'in_progress' || r.status === 'approved';
                    if (sosFilter === 'completed') return r.status === 'completed' || r.status === 'fulfilled';
                    return true;
                  })
                  .map((req) => {
                    const isPending = req.status === 'pending' || req.status === 'new';
                    const isInProgress = req.status === 'in_progress' || req.status === 'approved';
                    const isCompleted = req.status === 'completed' || req.status === 'fulfilled';

                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-xl border transition space-y-3 ${
                          isPending
                            ? 'bg-rose-50/20 border-rose-200'
                            : isInProgress
                            ? 'bg-blue-50/20 border-blue-200'
                            : 'bg-emerald-50/15 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#1D4ED8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              #REQ-{req.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                req.priority === 'critical'
                                  ? 'bg-rose-100 text-rose-800'
                                  : req.priority === 'high'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {req.priority || 'NORMAL'} PRIORITY
                            </span>
                          </div>
                          <StatusBadge status={req.status} />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold text-[#172033]">
                            <span>{req.requester_name || 'Citizen in Distress'}</span>
                            <span className="text-[#5B6475] font-normal flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {req.people_affected || 1} people
                            </span>
                          </div>
                          {req.requester_phone && (
                            <a
                              href={`tel:${req.requester_phone}`}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{req.requester_phone}</span>
                            </a>
                          )}
                        </div>

                        <div className="text-xs text-[#5B6475] bg-white p-2.5 rounded-lg border border-gray-100 space-y-1">
                          <div className="font-semibold text-[#172033] flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{req.location_name || 'Field Location Not Specified'}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 line-clamp-2">
                            {req.description || `${req.request_type || 'Relief'} requested.`}
                          </p>
                        </div>

                        {/* Action Buttons Toolbar */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                          <button
                            onClick={() => handleOpenDispatchForRequest(req)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Log Aid Delivery</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <button
                                disabled={updatingSosId === req.id}
                                onClick={() => handleUpdateSosStatus(req.id, 'in_progress')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold transition cursor-pointer disabled:opacity-50"
                              >
                                {updatingSosId === req.id ? 'Updating...' : 'Dispatch Team'}
                              </button>
                            )}

                            {!isCompleted && (
                              <button
                                disabled={updatingSosId === req.id}
                                onClick={() => handleUpdateSosStatus(req.id, 'completed')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Safe</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {/* 3. RESOURCE INVENTORY SECTION */}
        {(activeSection === 'inventory' || activeSection === 'all') && (
          <section className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" />
                  3. Warehouse Inventory &amp; Stock Levels
                </h2>
                <p className="text-xs text-[#5B6475] mt-0.5">
                  Real-time stock ledger owned and managed by your organization.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                  Total Stock: {inventory.total_available_stock.toLocaleString()} units
                </span>
                <button
                  onClick={() => setShowAddResourceModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Supply</span>
                </button>
              </div>
            </div>

            {/* Quick 5-Category Counter Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-[11px] text-[#5B6475] font-medium">Food Packets</p>
                <p className="text-lg font-bold text-[#172033] mt-1">{inventory.food_packets.toLocaleString()}</p>
                <span className="text-[10px] text-emerald-600 font-medium">Rations &amp; Meals</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-[11px] text-[#5B6475] font-medium">Water Bottles</p>
                <p className="text-lg font-bold text-[#172033] mt-1">{inventory.water_bottles.toLocaleString()}</p>
                <span className="text-[10px] text-blue-600 font-medium">10L Packs &amp; Bottles</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-[11px] text-[#5B6475] font-medium">First Aid Kits</p>
                <p className="text-lg font-bold text-[#172033] mt-1">{inventory.first_aid_kits.toLocaleString()}</p>
                <span className="text-[10px] text-rose-600 font-medium">Emergency Triage</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-[11px] text-[#5B6475] font-medium">Medicine Kits</p>
                <p className="text-lg font-bold text-[#172033] mt-1">{inventory.medicine_kits.toLocaleString()}</p>
                <span className="text-[10px] text-indigo-600 font-medium">Clinical Supplies</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-[11px] text-[#5B6475] font-medium">Blankets</p>
                <p className="text-lg font-bold text-[#172033] mt-1">{inventory.blankets.toLocaleString()}</p>
                <span className="text-[10px] text-amber-600 font-medium">Thermal Warmth</span>
              </div>
            </div>

            {/* Low-Stock and Out-of-Stock Alert Banners */}
            {inventory.low_stock_count > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Low-Stock Alert:</span> {inventory.low_stock_count} item(s) are below 100 units. Please request warehouse replenishment:
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {inventory.low_stock_items.map((item) => (
                      <span key={item.resource_id} className="px-2 py-0.5 rounded bg-white font-mono font-medium text-amber-800 border border-amber-300">
                        {item.item_name} ({item.quantity_available} {item.unit})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Inventory Stock Table with Adjustment Action */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FC] text-[#5B6475] border-b border-gray-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Resource Item</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Warehouse Depot</th>
                    <th className="px-4 py-3">Quantity In Stock</th>
                    <th className="px-4 py-3">Stock Health</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventory.all_items.map((item) => {
                    const isLow = item.quantity_available > 0 && item.quantity_available < 100;
                    const isOut = item.quantity_available <= 0;
                    return (
                      <tr key={item.resource_id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-[#172033]">
                          {item.item_name}
                        </td>
                        <td className="px-4 py-3 text-[#5B6475]">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 text-[#5B6475] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{item.warehouse_location}</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[#172033]">
                          {item.quantity_available.toLocaleString()} {item.unit}
                        </td>
                        <td className="px-4 py-3">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              OUT OF STOCK
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              OPTIMAL
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedResource(item);
                              setNewStockQty(item.quantity_available);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#172033] font-medium transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-gray-500" />
                            <span>Adjust</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 4. VOLUNTEER MANAGEMENT SECTION */}
        {(activeSection === 'volunteers' || activeSection === 'all') && (
          <section className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-blue-600" />
                  4. Volunteer Roster &amp; Task Assignments
                </h2>
                <p className="text-xs text-[#5B6475] mt-0.5">
                  Assign available first responders to emergency relief activities in {organization.area}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {volunteers.available} Ready for Deployment
                </span>
              </div>
            </div>

            {/* Volunteer Status Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] text-[#5B6475]">Total Volunteers</span>
                <p className="text-lg font-bold text-[#172033] mt-1">{volunteers.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                <span className="text-[11px] text-emerald-700 font-semibold">Available</span>
                <p className="text-lg font-bold text-emerald-800 mt-1">{volunteers.available}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
                <span className="text-[11px] text-blue-700 font-semibold">Assigned</span>
                <p className="text-lg font-bold text-blue-800 mt-1">{volunteers.assigned}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/60">
                <span className="text-[11px] text-indigo-700 font-semibold">On Duty</span>
                <p className="text-lg font-bold text-indigo-800 mt-1">{volunteers.on_duty}</p>
              </div>
            </div>

            {/* Volunteers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FC] text-[#5B6475] border-b border-gray-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Volunteer Name</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Specialized Skills</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Current Assignment</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {volunteers.roster.map((vol) => (
                    <tr key={vol.volunteer_id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-semibold text-[#172033]">
                        {vol.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#5B6475]">
                        {vol.phone}
                      </td>
                      <td className="px-4 py-3 text-[#5B6475] max-w-[200px] truncate" title={vol.skills}>
                        {vol.skills}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          vol.assignment_status === 'on_duty'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : vol.assignment_status === 'assigned'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {vol.assignment_status || (vol.is_available ? 'AVAILABLE' : 'OFFLINE')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5B6475]">
                        {vol.current_activity || <span className="text-gray-400 italic">None</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedVolunteer(vol);
                            setVolunteerActivity(vol.current_activity || '');
                            setVolunteerStatus(vol.assignment_status || 'assigned');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-medium transition cursor-pointer"
                        >
                          <span>Assign</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 5. DISTRIBUTION LEDGER SUMMARY */}
        {(activeSection === 'distributions' || activeSection === 'all') && (
          <section className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  5. Distribution Deliveries &amp; Ledger
                </h2>
                <p className="text-xs text-[#5B6475] mt-0.5">
                  Tracking relief dispatches and field delivery lifecycles.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {distributions.total_distributions} Dispatches Handled
                </span>
                <button
                  onClick={() => setShowDispatchModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Dispatch</span>
                </button>
              </div>
            </div>

            {/* Distribution Status Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60">
                <span className="text-[11px] text-amber-700 font-semibold">Pending Deliveries</span>
                <p className="text-lg font-bold text-amber-800 mt-1">{distributions.pending_deliveries}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/60">
                <span className="text-[11px] text-blue-700 font-semibold">In Progress (Dispatched)</span>
                <p className="text-lg font-bold text-blue-800 mt-1">{distributions.in_progress_deliveries}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                <span className="text-[11px] text-emerald-700 font-semibold">Completed Deliveries</span>
                <p className="text-lg font-bold text-emerald-800 mt-1">{distributions.completed_deliveries}</p>
              </div>
            </div>

            {/* Distribution Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FC] text-[#5B6475] border-b border-gray-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Dispatch Ticket</th>
                    <th className="px-4 py-3">Request Ref</th>
                    <th className="px-4 py-3">Supplies Dispatched</th>
                    <th className="px-4 py-3">Delivery Status</th>
                    <th className="px-4 py-3">Distributed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {distributions.recent_ledger.map((dist) => (
                    <tr key={dist.distribution_id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#1D4ED8]">
                        DIST-{dist.distribution_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#5B6475]">
                        {dist.request_id}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#172033]">
                        {dist.quantity_distributed} × {dist.resource ? dist.resource.item_name : dist.item_name || 'Supplies'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          dist.delivery_status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : dist.delivery_status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {dist.delivery_status || 'COMPLETED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5B6475]">
                        {dist.distributed_at ? new Date(dist.distributed_at).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 6. RECENT ACTIVITIES FEED */}
        {(activeSection === 'activities' || activeSection === 'all') && (
          <section className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-600" />
                6. Real-Time Operations Audit Trail
              </h2>
              <span className="text-xs text-[#5B6475]">Unified activity events</span>
            </div>

            <div className="space-y-3">
              {recent_activities.length === 0 ? (
                <p className="text-xs text-center text-[#5B6475] py-6">No recent organization activity logged.</p>
              ) : (
                recent_activities.map((act) => (
                  <div key={act.id} className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/50 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#172033]">{act.title}</span>
                        <StatusBadge status={act.status} />
                      </div>
                      <p className="text-xs text-[#5B6475]">{act.description}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* =====================================================================
          MODAL: Assign Volunteer Task
          ===================================================================== */}
      {selectedVolunteer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-[#172033]">
              Assign Task to {selectedVolunteer.name}
            </h3>
            <p className="text-xs text-[#5B6475] mt-1">
              Skills: {selectedVolunteer.skills} • {selectedVolunteer.assigned_area}
            </p>

            <form onSubmit={handleAssignVolunteer} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Relief Activity / Assignment Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean water distribution at North Community Camp"
                  value={volunteerActivity}
                  onChange={(e) => setVolunteerActivity(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Assignment Status
                </label>
                <select
                  value={volunteerStatus}
                  onChange={(e) => setVolunteerStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="assigned">Assigned (Dispatched)</option>
                  <option value="on_duty">On Duty (Active in field)</option>
                  <option value="completed">Completed (Mission done)</option>
                  <option value="available">Available (Standby)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedVolunteer(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVolunteer}
                  className="px-4 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold shadow transition"
                >
                  {savingVolunteer ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: Adjust Resource Stock
          ===================================================================== */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-[#172033]">
              Adjust Stock: {selectedResource.item_name}
            </h3>
            <p className="text-xs text-[#5B6475] mt-1">
              Location: {selectedResource.warehouse_location}
            </p>

            <form onSubmit={handleUpdateStock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Quantity Available ({selectedResource.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedResource(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingResource}
                  className="px-4 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold shadow transition"
                >
                  {savingResource ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================================
          MODAL: Register New Supply Item
          ===================================================================== */}
      {showAddResourceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-[#172033]">
              Register New Relief Supply
            </h3>
            <p className="text-xs text-[#5B6475] mt-1">
              Add new inventory owned and stored by {organization.name}.
            </p>

            <form onSubmit={handleCreateResource} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Protein Energy Biscuits"
                  value={newResourceData.item_name}
                  onChange={(e) => setNewResourceData({ ...newResourceData, item_name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Category *
                  </label>
                  <select
                    value={newResourceData.category}
                    onChange={(e) => setNewResourceData({ ...newResourceData, category: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Food & Nutrition">Food &amp; Nutrition</option>
                    <option value="Water & Hydration">Water &amp; Hydration</option>
                    <option value="First Aid">First Aid</option>
                    <option value="Medical Supplies">Medical Supplies</option>
                    <option value="Bedding & Blankets">Bedding &amp; Blankets</option>
                    <option value="General Supplies">General Supplies</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Unit Type *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="packets, bottles, kits..."
                    value={newResourceData.unit}
                    onChange={(e) => setNewResourceData({ ...newResourceData, unit: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Initial Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newResourceData.quantity_available}
                    onChange={(e) => setNewResourceData({ ...newResourceData, quantity_available: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Warehouse Depot
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Central Depot, Hub A"
                    value={newResourceData.warehouse_location}
                    onChange={(e) => setNewResourceData({ ...newResourceData, warehouse_location: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddResourceModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewResource}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow transition"
                >
                  {savingNewResource ? 'Registering...' : 'Register Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* =====================================================================
          MODAL: Create Distribution Dispatch Ticket
          ===================================================================== */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-[#172033]">
              Dispatch Relief Supplies
            </h3>
            <p className="text-xs text-[#5B6475] mt-1">
              Create a logged dispatch ticket from your warehouse stock.
            </p>

            <form onSubmit={handleCreateDispatch} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Emergency Request Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REQ-2026-001 or Emergency Site Alpha"
                  value={dispatchData.request_id}
                  onChange={(e) => setDispatchData({ ...dispatchData, request_id: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Select Resource Item *
                  </label>
                  <select
                    required
                    value={dispatchData.resource_id}
                    onChange={(e) => setDispatchData({ ...dispatchData, resource_id: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Item --</option>
                    {inventory.all_items.map((r) => (
                      <option key={r.resource_id} value={r.resource_id}>
                        {r.item_name} ({r.quantity_available} avail)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Quantity to Dispatch *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={dispatchData.quantity_distributed}
                    onChange={(e) => setDispatchData({ ...dispatchData, quantity_distributed: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Assigned Volunteer
                  </label>
                  <select
                    value={dispatchData.distributed_by_volunteer_id}
                    onChange={(e) => setDispatchData({ ...dispatchData, distributed_by_volunteer_id: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- None (Direct Transfer) --</option>
                    {volunteers.roster.map((v) => (
                      <option key={v.volunteer_id} value={v.volunteer_id}>
                        {v.name} ({v.skills})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Delivery Status
                  </label>
                  <select
                    value={dispatchData.delivery_status}
                    onChange={(e) => setDispatchData({ ...dispatchData, delivery_status: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="in_progress">In Progress (Dispatched)</option>
                    <option value="pending">Pending (Queued)</option>
                    <option value="completed">Completed (Delivered)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Dispatch Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivered via Relief Convoy 2 to community center"
                  value={dispatchData.notes}
                  onChange={(e) => setDispatchData({ ...dispatchData, notes: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDispatch}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition"
                >
                  {savingDispatch ? 'Logging...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
