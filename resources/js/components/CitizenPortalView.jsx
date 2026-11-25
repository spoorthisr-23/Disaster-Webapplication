import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  AlertCircle,
  Search, 
  MapPin, 
  Navigation, 
  Phone, 
  User, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Send, 
  Copy, 
  Check, 
  RefreshCw, 
  Truck, 
  HeartPulse, 
  LifeBuoy, 
  Home, 
  UtensilsCrossed,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export function CitizenPortalView({ onNavigate, initialTrackingCode = '' }) {
  const [activeTab, setActiveTab] = useState(initialTrackingCode ? 'track' : 'sos');
  
  // SOS Form State
  const [category, setCategory] = useState('rescue');
  const [peopleAffected, setPeopleAffected] = useState(1);
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [description, setDescription] = useState('');
  
  // Submission & Tracking State
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Tracking Search State
  const [searchCode, setSearchCode] = useState(initialTrackingCode || '');
  const [trackedRequest, setTrackedRequest] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  // Auto-fetch if initialTrackingCode is provided
  useEffect(() => {
    if (initialTrackingCode) {
      handleTrackSearch(initialTrackingCode);
    }
  }, [initialTrackingCode]);

  // Categories definition
  const categories = [
    {
      id: 'rescue',
      label: 'Evacuation & Rescue',
      icon: LifeBuoy,
      priority: 'critical',
      color: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400',
      activeColor: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30',
      badge: 'Critical Priority'
    },
    {
      id: 'medical',
      label: 'Emergency Medical',
      icon: HeartPulse,
      priority: 'critical',
      color: 'bg-red-50 text-red-700 border-red-200 hover:border-red-400',
      activeColor: 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/30',
      badge: 'Critical Priority'
    },
    {
      id: 'food_water',
      label: 'Food & Clean Water',
      icon: UtensilsCrossed,
      priority: 'high',
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
      activeColor: 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30',
      badge: 'High Priority'
    },
    {
      id: 'shelter',
      label: 'Temporary Shelter',
      icon: Home,
      priority: 'medium',
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
      activeColor: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30',
      badge: 'Standard Priority'
    }
  ];

  // Auto-calculated priority based on category and people count
  const calculatedPriority = (() => {
    if (category === 'medical' || category === 'rescue' || peopleAffected >= 10) return 'critical';
    if (category === 'food_water' || peopleAffected >= 4) return 'high';
    return 'medium';
  })();

  // 1-Tap Geolocation Capture
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const accuracy = Math.round(position.coords.accuracy);
        setCoordinates({ lat, lng, accuracy });
        
        // Append GPS coords to location field if empty or update prefix
        const gpsString = `Lat: ${lat}, Lng: ${lng} (±${accuracy}m GPS)`;
        if (!locationName) {
          setLocationName(gpsString);
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.message || 'Unable to retrieve location. Please type your landmark manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Submit SOS Distress Form
  const handleSubmitSos = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitSuccess(null);

    const payload = {
      request_type: category,
      description: description.trim() || `${category.toUpperCase()} emergency assistance requested`,
      location_name: locationName.trim() || (coordinates ? `Lat: ${coordinates.lat}, Lng: ${coordinates.lng}` : 'Unspecified Disaster Area'),
      people_affected: peopleAffected,
      priority: calculatedPriority,
      requester_name: requesterName.trim() || 'Citizen in Distress',
      requester_phone: requesterPhone.trim() || 'Not Provided',
      disaster_event_id: 1,
    };

    try {
      const res = await fetch('/api/emergency-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit SOS signal. Please retry.');
      }

      setSubmitSuccess({
        code: data.tracking_code || data.request?.request_number || 'REQ-2026-001',
        request: data.request,
      });

      // Clear form
      setDescription('');
      setRequesterName('');
      setRequesterPhone('');
      setLocationName('');
      setCoordinates(null);
    } catch (err) {
      alert(err.message || 'An error occurred while transmitting SOS signal.');
    } finally {
      setSubmitting(false);
    }
  };

  // Track Request Search
  const handleTrackSearch = async (codeToSearch) => {
    const code = (codeToSearch || searchCode).trim();
    if (!code) return;

    setTrackingLoading(true);
    setTrackingError(null);

    try {
      const res = await fetch(`/api/emergency-requests/track/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || `No emergency request found matching code: ${code}`);
      }

      setTrackedRequest(data.data);
    } catch (err) {
      setTrackingError(err.message);
      setTrackedRequest(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStepStatus = (stepIndex, currentStep) => {
    if (currentStep > stepIndex) return 'completed';
    if (currentStep === stepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white rounded-2xl p-6 sm:p-8 shadow-lg shadow-rose-900/10 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            24/7 Citizen Emergency Response Gateway
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            Public Citizen Emergency SOS &amp; Live Tracking
          </h1>
          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Need urgent rescue, medical assistance, or essential relief? Transmit a real-time distress signal directly to emergency response coordinators, or track your live rescue status with your tracking ticket.
          </p>

          {/* Quick Toggle Tabs */}
          <div className="flex flex-wrap items-center gap-2 mt-6">
            <button
              onClick={() => setActiveTab('sos')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
                activeTab === 'sos'
                  ? 'bg-white text-rose-700 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Broadcast SOS Signal</span>
            </button>

            <button
              onClick={() => setActiveTab('track')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-white text-blue-700 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Track Live Request Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: BROADCAST SOS SIGNAL                                           */}
      {/* ===================================================================== */}
      {activeTab === 'sos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main SOS Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#D8DEE8] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  Emergency Distress Broadcast
                </h2>
                <p className="text-xs text-[#5B6475]">
                  Instant dispatch to on-duty disaster response teams. Zero login required.
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
                Priority: {calculatedPriority.toUpperCase()}
              </div>
            </div>

            {/* Success Modal / Banner */}
            {submitSuccess && (
              <div className="mb-6 p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-base font-bold text-emerald-950">
                        Distress Signal Received &amp; Queued!
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Status: Pending Dispatch
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1">
                      Emergency response units have been alerted. Keep this tracking code to monitor field dispatch progress:
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                      <div className="text-xs font-mono font-black text-[#172033] tracking-widest text-lg px-2">
                        {submitSuccess.code}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(submitSuccess.code)}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchCode(submitSuccess.code);
                          setActiveTab('track');
                          handleTrackSearch(submitSuccess.code);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#172033] hover:bg-black text-white text-xs font-bold transition cursor-pointer"
                      >
                        <span>View Live Timeline</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitSos} className="space-y-6">
              {/* Category Selector Grid */}
              <div>
                <label className="block text-xs font-bold text-[#172033] uppercase tracking-wider mb-2.5">
                  1. Select Emergency Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-4 rounded-xl border-2 text-left transition flex items-start gap-3.5 cursor-pointer ${
                          isSelected ? cat.activeColor : cat.color
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-white'} shrink-0`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm leading-tight">{cat.label}</div>
                          <div className={`text-[11px] mt-1 font-semibold ${isSelected ? 'text-white/80' : 'opacity-80'}`}>
                            {cat.badge}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location with Dual Mode */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[#172033] uppercase tracking-wider">
                    2. Location &amp; Landmark *
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={gpsLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                    <span>{gpsLoading ? 'Detecting GPS...' : '📍 Auto-Detect My Current GPS'}</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <MapPin className="w-4 h-4 text-rose-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Near St. Mary Church, 2nd Cross, Flood Zone B, Ward 4"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8DEE8] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm text-[#172033]"
                  />
                </div>

                {coordinates && (
                  <div className="mt-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>GPS Acquired: {coordinates.lat}, {coordinates.lng} (Accuracy: ±{coordinates.accuracy}m)</span>
                  </div>
                )}
                {gpsError && (
                  <div className="mt-2 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                    {gpsError}
                  </div>
                )}
              </div>

              {/* People Affected & Requester Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* People Count */}
                <div>
                  <label className="block text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">
                    People Affected
                  </label>
                  <div className="flex items-center border border-[#D8DEE8] rounded-xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setPeopleAffected(Math.max(1, peopleAffected - 1))}
                      className="px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-700 transition cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center font-bold text-sm text-[#172033]">
                      {peopleAffected}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPeopleAffected(peopleAffected + 1)}
                      className="px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-700 transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">
                    Your Name (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="e.g. John Doe / Family"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D8DEE8] focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm text-[#172033]"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">
                    Contact Phone *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={requesterPhone}
                      onChange={(e) => setRequesterPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D8DEE8] focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm text-[#172033]"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">
                  Emergency Situation Details (Water Level, Injuries, Special Care)
                </label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe trapped location, elderly or infant care needs, rising flood water level, or urgent medical supplies needed..."
                  className="w-full p-3 rounded-xl border border-[#D8DEE8] focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm text-[#172033]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold text-base shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Broadcasting SOS Signal to Dispatchers...</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-5 h-5" />
                    <span>🚨 Broadcast Immediate SOS Distress Signal</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Help & Emergency Hotlines Sidebar */}
          <div className="space-y-6">
            {/* Direct Emergency Call Cards */}
            <div className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-xs">
              <h3 className="font-bold text-sm text-[#172033] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-rose-600" />
                24/7 National Emergency Hotlines
              </h3>
              <div className="space-y-3">
                <a
                  href="tel:112"
                  className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-rose-900">National Emergency Support</div>
                    <div className="text-[11px] text-rose-700">Police, Fire &amp; Medical First-Responders</div>
                  </div>
                  <div className="text-base font-black text-rose-700 font-mono">112</div>
                </a>

                <a
                  href="tel:108"
                  className="flex items-center justify-between p-3 rounded-xl bg-red-50/70 hover:bg-red-100/80 border border-red-200 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-red-900">Disaster Ambulance Service</div>
                    <div className="text-[11px] text-red-700">Critical Trauma &amp; Triage Evacuation</div>
                  </div>
                  <div className="text-base font-black text-red-700 font-mono">108</div>
                </a>

                <a
                  href="tel:1070"
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-amber-900">State Disaster Management HQ</div>
                    <div className="text-[11px] text-amber-700">Flood, Cyclone &amp; Relief Coordination</div>
                  </div>
                  <div className="text-base font-black text-amber-700 font-mono">1070</div>
                </a>
              </div>
            </div>

            {/* Field Responder Triage Info */}
            <div className="bg-blue-50/70 rounded-2xl border border-blue-200 p-6">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm mb-2">
                <ShieldAlert className="w-4 h-4 text-blue-700" />
                <span>How Your SOS Is Handled</span>
              </div>
              <ul className="text-xs text-blue-900/80 space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">1.</span>
                  <span>Signal instantly broadcasts into the Disaster Command Center dispatch queue.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">2.</span>
                  <span>Nearest active NGO (such as Red Cross) and Field Shelter receive geo-coordinates.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">3.</span>
                  <span>A response team is dispatched with medical kits, rations, and rescue boats.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: LIVE REQUEST TRACKING                                         */}
      {/* ===================================================================== */}
      {activeTab === 'track' && (
        <div className="space-y-6">
          {/* Search Box Card */}
          <div className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-xs">
            <h2 className="text-base font-bold text-[#172033] mb-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Live Emergency Ticket Telemetry
            </h2>
            <p className="text-xs text-[#5B6475] mb-4">
              Enter your tracking code or ticket number to view real-time field responder dispatch and status updates.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrackSearch();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Enter Tracking Code, e.g. REQ-2026-001 or ID"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8DEE8] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-[#172033]"
                />
              </div>

              <button
                type="submit"
                disabled={trackingLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {trackingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Querying TiDB...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Track Live Status</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Chips */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#5B6475]">Try Demo Codes:</span>
              {['REQ-2026-001', 'REQ-2026-002', 'REQ-2026-003', 'REQ-2026-004'].map((demoCode) => (
                <button
                  type="button"
                  key={demoCode}
                  onClick={() => {
                    setSearchCode(demoCode);
                    handleTrackSearch(demoCode);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#172033] font-mono text-xs font-semibold transition cursor-pointer"
                >
                  {demoCode}
                </button>
              ))}
            </div>

            {trackingError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{trackingError}</span>
              </div>
            )}
          </div>

          {/* Tracked Ticket Live Results */}
          {trackedRequest && (
            <div className="bg-white rounded-2xl border border-[#D8DEE8] p-6 sm:p-8 shadow-xs space-y-8 animate-in fade-in duration-200">
              {/* Ticket Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-[#172033]">
                      {trackedRequest.request_number || `REQ-${trackedRequest.id}`}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      trackedRequest.priority === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : trackedRequest.priority === 'high'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {trackedRequest.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#172033]">
                    {trackedRequest.request_type ? trackedRequest.request_type.toUpperCase().replace('_', ' ') : 'EMERGENCY RELIEF'}
                  </h3>
                  <p className="text-xs text-[#5B6475] mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>{trackedRequest.location_name}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTrackSearch(trackedRequest.request_number || trackedRequest.id)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-[#172033] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Refresh Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(trackedRequest.request_number || trackedRequest.id)}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-[#172033] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                    <span>{copiedCode ? 'Copied' : 'Share Code'}</span>
                  </button>
                </div>
              </div>

              {/* 4-Step Visual Progress Stepper */}
              <div>
                <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider mb-6">
                  Live Dispatch &amp; Response Progress
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                  {[
                    {
                      step: 1,
                      title: 'Signal Logged',
                      desc: 'Ticket registered in MySQL database',
                      icon: CheckCircle2,
                    },
                    {
                      step: 2,
                      title: 'Ops Verified',
                      desc: 'Assessed by HQ Command Center',
                      icon: ShieldAlert,
                    },
                    {
                      step: 3,
                      title: 'Responders En Route',
                      desc: 'Field team dispatched with supplies',
                      icon: Truck,
                    },
                    {
                      step: 4,
                      title: 'Relief Delivered',
                      desc: 'Citizen safe & confirmed assisted',
                      icon: Check,
                    },
                  ].map((s) => {
                    const status = getStepStatus(s.step, trackedRequest.current_step || 1);
                    const StepIcon = s.icon;

                    return (
                      <div
                        key={s.step}
                        className={`p-4 rounded-xl border transition relative ${
                          status === 'completed'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : status === 'current'
                            ? 'bg-blue-50 border-blue-300 text-blue-950 ring-2 ring-blue-500/20'
                            : 'bg-gray-50/60 border-gray-200 text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            status === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : status === 'current'
                              ? 'bg-blue-600 text-white animate-pulse'
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            {status === 'completed' ? <Check className="w-4 h-4 stroke-[3]" /> : s.step}
                          </div>
                          <div className="font-bold text-xs leading-tight">{s.title}</div>
                        </div>
                        <p className="text-[11px] leading-snug opacity-80">
                          {s.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/60">
                  <div className="text-[11px] text-[#5B6475] font-semibold uppercase">Citizen Requester</div>
                  <div className="font-bold text-sm text-[#172033] mt-0.5">{trackedRequest.requester_name || 'Anonymous'}</div>
                  <div className="text-xs text-gray-500">{trackedRequest.requester_phone || 'No phone'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/60">
                  <div className="text-[11px] text-[#5B6475] font-semibold uppercase">People Affected</div>
                  <div className="font-bold text-sm text-[#172033] mt-0.5">{trackedRequest.people_affected || 1} Persons</div>
                  <div className="text-xs text-gray-500">Group size for relief allocation</div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/60">
                  <div className="text-[11px] text-[#5B6475] font-semibold uppercase">Assigned Shelter Hub</div>
                  <div className="font-bold text-sm text-[#172033] mt-0.5">{trackedRequest.shelter_name || 'Central Command Center'}</div>
                  <div className="text-xs text-gray-500">{trackedRequest.shelter_location || 'Designated Dispatch'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/60">
                  <div className="text-[11px] text-[#5B6475] font-semibold uppercase">Logged Timestamp</div>
                  <div className="font-bold text-sm text-[#172033] mt-0.5">
                    {trackedRequest.created_at ? new Date(trackedRequest.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {trackedRequest.created_at ? new Date(trackedRequest.created_at).toLocaleDateString() : 'Today'}
                  </div>
                </div>
              </div>

              {/* Description Card */}
              {trackedRequest.description && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-[#172033]">
                  <span className="font-bold text-[#5B6475] uppercase text-[10px] block mb-1">
                    Distress Situation Notes:
                  </span>
                  {trackedRequest.description}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CitizenPortalView;
