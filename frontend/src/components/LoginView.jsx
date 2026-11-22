import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Lock, 
  Mail, 
  AlertCircle, 
  RefreshCw,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export function LoginView({ onLoginSuccess, onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleQuickFill = (fillEmail) => {
    setEmail(fillEmail);
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Invalid credentials. Please verify your email and password.');
      }

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }

      setSuccessMsg(`Welcome back, ${data.user.name}! Redirecting to Command Portal...`);

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        } else {
          window.location.href = '/';
        }
      }, 700);

    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#D8DEE8] p-8 shadow-xl">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l2 2 2.5-8 3 14 2.5-8H21"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
              Disaster Relief Management
            </h1>
            <p className="text-xs font-semibold text-[#5B6475] uppercase tracking-wider mt-0.5">
              Emergency Operations Command
            </p>
          </div>
          <p className="text-xs text-[#5B6475] pt-1">
            Sign in to your <span className="font-semibold text-blue-700">Organization (NGO / Hospital)</span> or <span className="font-semibold text-[#172033]">Admin</span> account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="coordinator@redcross.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="rounded-xl bg-blue-50/70 p-3 text-[11px] text-[#5B6475] border border-blue-100 flex items-start gap-2">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-blue-900 block font-semibold">Organization Portal Gateway</strong>
              Dedicated access for humanitarian NGOs, shelter managers, and field coordinators.
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Authenticating with live DB...</span>
              </>
            ) : (
              <>
                <span>Sign In to Command Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Demo Email */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-[#5B6475] mb-2.5 text-center">
            Select Role Email (Enter assigned password):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('coordinator@redcross.org')}
              className="p-2 text-xs rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-800 font-semibold transition text-left cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <div className="truncate">
                <div className="font-bold text-[11px]">🏥 Red Cross</div>
                <div className="text-[10px] text-blue-600/80 truncate">Field Coordinator</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('admin@disaster-relief.org')}
              className="p-2 text-xs rounded-xl border border-gray-200 hover:bg-gray-50 text-[#172033] font-medium transition text-left cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <div className="truncate">
                <div className="font-bold text-[11px]">🛡️ Administrator</div>
                <div className="text-[10px] text-gray-400 truncate">HQ Command</div>
              </div>
            </button>
          </div>
        </div>

        {/* Return to Dashboard */}
        {onCancel && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Return to Public Operations Dashboard</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginView;
