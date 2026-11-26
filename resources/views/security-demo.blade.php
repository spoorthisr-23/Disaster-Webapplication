<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blade Security Demonstration - Panel Presentation</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800 p-6 md:p-10 font-sans">
    <div class="max-w-4xl mx-auto space-y-8">
        
        <!-- Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">
                    Live Panel Demonstration
                </span>
                <h1 class="text-2xl font-bold mt-2 text-slate-900">Laravel Blade Security & Architecture Demo</h1>
                <p class="text-sm text-slate-500 mt-1">Demonstrating built-in XSS Sanitization and CSRF Request Validation</p>
            </div>
            <div class="text-right hidden sm:block">
                <span class="text-xs text-slate-400 block">Session ID</span>
                <span class="text-xs font-mono font-medium text-slate-600">{{ substr(session()->getId(), 0, 16) }}...</span>
            </div>
        </div>

        <!-- DEMO 1: XSS SANITIZATION -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                    <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                        Cross-Site Scripting (XSS) Prevention
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Test how Blade neutralizes malicious user input</p>
                </div>
                <span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">&#123;&#123; $data &#125;&#125;</span>
            </div>

            <!-- Form -->
            <form method="GET" action="/security-demo" class="space-y-3">
                <label class="block text-xs font-semibold text-slate-700">Enter sample user input or attack payload:</label>
                <div class="flex gap-2">
                    <input 
                        type="text" 
                        name="xss_input" 
                        value="{{ request('xss_input', '<script>alert(\"XSS Attack!\")</script>') }}" 
                        placeholder="Type HTML or JS tag..."
                        class="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                        Test Render
                    </button>
                </div>
                <div class="flex gap-2 text-xs">
                    <span class="text-slate-400">Quick Test Payloads:</span>
                    <a href="/security-demo?xss_input=%3Cscript%3Ealert(%22XSS%22)%3C%2Fscript%3E" class="text-indigo-600 hover:underline">&lt;script&gt; tag</a>
                    <span class="text-slate-300">•</span>
                    <a href="/security-demo?xss_input=%3Cimg+src%3Dx+onerror%3Dalert(%22Hacked!%22)%3E" class="text-indigo-600 hover:underline">&lt;img onerror&gt; tag</a>
                    <span class="text-slate-300">•</span>
                    <a href="/security-demo?xss_input=%3Cb%3EBold+Safe+Text%3C%2Fb%3E" class="text-indigo-600 hover:underline">&lt;b&gt;bold&lt;/b&gt; tag</a>
                </div>
            </form>

            @if(request()->has('xss_input'))
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <!-- Safe Blade Output -->
                <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div class="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-2">
                        <span>✅ Blade Safe Output &#123;&#123; $input &#125;&#125;</span>
                        <span class="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded text-[10px]">Protected</span>
                    </div>
                    <div class="p-3 bg-white rounded-lg border border-emerald-100 font-mono text-xs text-slate-800 break-all">
                        {{ request('xss_input') }}
                    </div>
                    <p class="text-[11px] text-emerald-700 mt-2">
                        Blade automatically converted characters to entities (e.g. <code>&amp;lt;script&amp;gt;</code>). The browser renders it safely as text without executing the script!
                    </p>
                </div>

                <!-- Compiled Code Explanation -->
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div class="text-xs font-semibold text-slate-700 mb-2">
                        🔍 What Laravel Executed in the Background
                    </div>
                    <pre class="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">echo htmlspecialchars(
    $input, 
    ENT_QUOTES, 
    'UTF-8'
);</pre>
                    <p class="text-[11px] text-slate-500 mt-2">
                        Compiled file path: <span class="font-mono text-[10px]">storage/framework/views/*.php</span>
                    </p>
                </div>
            </div>
            @endif
        </div>

        <!-- DEMO 2: CSRF PROTECTION -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                    <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                        Cross-Site Request Forgery (CSRF) Protection
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Compare a verified request vs an unauthorized / forged request</p>
                </div>
                <span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">@csrf</span>
            </div>

            @if(session('csrf_success'))
            <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span><strong>CSRF Verification Succeeded!</strong> {{ session('csrf_success') }}</span>
            </div>
            @endif

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Safe Form WITH @csrf -->
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-bold text-slate-800">Normal Form (with @csrf)</span>
                            <span class="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">Legitimate User</span>
                        </div>
                        <p class="text-xs text-slate-500 mb-3">
                            Includes Laravel's secret session token generated by <code>@csrf</code>.
                        </p>

                        <!-- Form with CSRF -->
                        <form method="POST" action="/security-demo/csrf-test">
                            @csrf
                            <div class="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono mb-3 space-y-1">
                                <span class="text-slate-400 block text-[10px]">Embedded Hidden Field:</span>
                                <span class="text-blue-600 block break-all">&lt;input type="hidden" name="_token" value="{{ substr(csrf_token(), 0, 20) }}..."&gt;</span>
                            </div>
                            <button type="submit" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-sm">
                                Submit Legitimate Request
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Attack Form WITHOUT @csrf -->
                <div class="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-bold text-red-900">Forged Request (no @csrf)</span>
                            <span class="text-[10px] bg-red-200 text-red-800 font-semibold px-2 py-0.5 rounded">Attack Simulation</span>
                        </div>
                        <p class="text-xs text-red-700 mb-3">
                            Simulates an external attacker making a request without knowledge of the user's secret session token.
                        </p>

                        <!-- Form without CSRF -->
                        <form method="POST" action="/security-demo/csrf-test">
                            <!-- NO CSRF TOKEN -->
                            <div class="bg-white p-3 rounded-lg border border-red-200 text-xs font-mono mb-3 text-red-500">
                                ❌ No _token included in POST body
                            </div>
                            <button type="submit" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition shadow-sm">
                                Submit Forged Request (Expect 419)
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Panel Takeaways -->
        <div class="bg-indigo-900 text-white rounded-2xl p-6 shadow-sm">
            <h3 class="text-sm font-bold uppercase tracking-wider text-indigo-300">Key Presentation Talking Points for the Panel</h3>
            <ul class="mt-3 space-y-2 text-xs text-indigo-100 list-disc list-inside">
                <li><strong>Defense-in-Depth</strong>: Blade protects data at the presentation layer (XSS) and protocol layer (CSRF) automatically.</li>
                <li><strong>Developer Convenience</strong>: Developers do not need to remember manual sanitization functions; <code>&#123;&#123; &#125;&#125;</code> and <code>@csrf</code> are enabled by default.</li>
                <li><strong>Zero Runtime Overhead</strong>: Blade compiles to standard native PHP cache files once, ensuring maximum speed.</li>
            </ul>
        </div>

    </div>
</body>
</html>
