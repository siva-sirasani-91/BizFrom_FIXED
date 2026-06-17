/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Building2, 
  Users2, 
  FileSpreadsheet, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Plus, 
  HelpCircle, 
  ArrowRight,
  MousePointerClick
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: (mode: "login" | "register") => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  // Mini interactive showcase state
  const [demoFields, setDemoFields] = React.useState([
    { label: "Customer Name", type: "text" },
    { label: "Phone Number", type: "text" },
    { label: "Plant Name", type: "select", options: ["Rose", "Peace Lily", "Bonsai"] }
  ]);
  const [newLabel, setNewLabel] = React.useState("");

  const addDemoField = () => {
    if (!newLabel.trim()) return;
    setDemoFields([...demoFields, { label: newLabel, type: "text" }]);
    setNewLabel("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Floating Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-50/80 border-b border-slate-200/60 leading-none">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-600/35">
              <Building2 className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-display font-medium text-lg text-slate-900 tracking-tight block">BizForm SaaS</span>
              <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">Enterprise Suite</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#demo" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center space-x-4">
            <button 
              id="landing-btn-login"
              onClick={() => onGetStarted("login")} 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button 
              id="landing-btn-register"
              onClick={() => onGetStarted("register")} 
              className="relative group overflow-hidden bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Register Free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-140 h-140 bg-indigo-200/25 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> No-Code Customer Form SaaS
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-display font-semibold text-slate-900 tracking-tight leading-1.12">
            Build Elegant Customer Forms<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent"> Collect Dynamic Records Instantly</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-slate-600 text-md sm:text-lg leading-relaxed">
            Configure dynamic fields like Google Forms, load structures automatically for your business, log operations securely, and view rich financial charts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              id="hero-btn-primary"
              onClick={() => onGetStarted("register")}
              className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-xl text-md font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 group cursor-pointer"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#demo"
              className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl text-md font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              Watch Interactive Demo
            </a>
          </div>
        </div>
      </section>

      {/* Stats Board */}
      <section className="bg-white border-y border-slate-200 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { metric: "10K+", desc: "Active Businesses" },
            { metric: "1.2M+", desc: "Records Collected" },
            { metric: "₹90Cr+", desc: "SaaS Transaction Volume" },
            { metric: "99.99%", desc: "Durable Uptime guaranteed" }
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-1">
              <span className="block text-3xl font-display font-semibold text-slate-900">{stat.metric}</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Live Interactive Builder Sandbox (Demo section) */}
      <section id="demo" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600">Interactive Playground</span>
          <h2 className="text-3xl font-display font-medium text-slate-950 tracking-tight">Try the Dynamic Client Form Builder</h2>
          <p className="max-w-xl mx-auto text-slate-600 text-sm">
            See how the platform dynamically updates questions. Add custom query fields below to simulate how the customers page loads structures in real time.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Builder controls */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <span className="font-display font-medium text-md text-slate-900">1. Modify Form Schema</span>
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-500 block">Existing Field Structure</label>
                <div className="space-y-2">
                  {demoFields.map((field, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                      <span>{field.label} ({field.type})</span>
                      <button 
                        onClick={() => setDemoFields(demoFields.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-medium text-slate-500 block">Add custom question field</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g., Aadhaar, Soil Substrate"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={addDemoField}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Append
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 text-xs text-slate-400 font-medium flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-indigo-500 animate-bounce" /> Add cards to see form generator output on the right!
            </div>
          </div>

          {/* Right panel: Live Generated Form Interface preview */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-md text-slate-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-mono text-xs text-emerald-500 uppercase tracking-wider font-bold">Generated Client UI</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Live Preview: Siva Nursery</span>
              </div>

              {/* Dynamic form preview */}
              <div className="space-y-6 pt-8 max-w-lg">
                {demoFields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 block tracking-tight">{field.label}</label>
                    {field.type === "select" ? (
                      <select className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-lg text-xs leading-tight">
                        {field.options?.map((opt, oIdx) => (
                          <option key={oIdx}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        disabled 
                        placeholder={`Input requested value for ${field.label}...`}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-500 px-4 py-2.5 rounded-lg text-xs leading-tight focus:outline-none" 
                      />
                    )}
                  </div>
                ))}

                <button 
                  disabled 
                  className="w-full bg-indigo-600/40 text-indigo-400 py-3 rounded-lg text-xs font-semibold border border-indigo-500/20 cursor-not-allowed"
                >
                  Submit Dynamic Record
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 text-[10px] font-mono text-slate-500">
              The structure map saves to our database instantly when customized in the Business Page.
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grids */}
      <section id="features" className="bg-white border-t border-slate-200 py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600">Enterprise Capabilities</span>
            <h2 className="text-3xl font-display font-medium text-slate-950">Packed With Production-Ready Business Logic</h2>
            <p className="max-w-2xl mx-auto text-slate-600 text-sm">
              We focus on absolute database integrity. Updates to form models will never wipe previous collections or historical tables.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl flex items-center justify-center">
                <Users2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-medium text-md text-slate-900">Dynamic CRM Records</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add, search, edit, and delete customer logs dynamically. Search scans deep matches inside custom variable maps instantly.
              </p>
            </div>

            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-display font-medium text-md text-slate-900">Recharts Visual Analytics</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bar, Line, and donut charts map cash-to-online transaction matrices and trace seasonal signup spikes on a month-by-month basis.
              </p>
            </div>

            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-display font-medium text-md text-slate-900">Real Document Export</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate and download formatted PDF invoices and dynamic Excel sheets representing sales and customer files from active storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-slate-50 border-t border-slate-200 py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600">Clear Pricing</span>
            <h2 className="text-3xl font-display font-medium text-slate-950">Simple Plans for Growth</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* Free Plan */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Standard Tier</span>
                <span className="text-4xl font-display font-semibold text-slate-900">₹0 <span className="text-sm font-sans font-normal text-slate-500">/ forever</span></span>
                <p className="text-xs text-slate-600 leading-relaxed">Perfect for local single-store nursery owners starting customized data storage and customer logging.</p>
                <ul className="space-y-3 pt-4 text-xs font-medium text-slate-700">
                  <li className="flex items-center gap-2">✓ Create up to 2 Businesses</li>
                  <li className="flex items-center gap-2">✓ Design dynamic form structure</li>
                  <li className="flex items-center gap-2">✓ Record payment history (Cash / Online)</li>
                </ul>
              </div>
              <button 
                onClick={() => onGetStarted("register")}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Sign Up Now
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl p-8 flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-[10px] text-white px-3 py-1 font-mono uppercase tracking-widest rounded-bl-lg">Popular</div>
              <div className="space-y-4">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest block">Pro SaaS Access</span>
                <span className="text-4xl font-display font-semibold text-white">₹1,499 <span className="text-sm font-sans font-normal text-slate-400">/ month</span></span>
                <p className="text-xs text-slate-400 leading-relaxed">Integrated for scaling nurseries, multi-chain stores, and professional merchants needing visual trends.</p>
                <ul className="space-y-3 pt-4 text-xs font-medium text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited Businesses</li>
                  <li className="flex items-center gap-2">✓ Dynamic customized search variables</li>
                  <li className="flex items-center gap-2">✓ Recharts visual monthly trend matrices</li>
                  <li className="flex items-center gap-2">✓ PDF & Excel report downloading</li>
                  <li className="flex items-center gap-2">✓ Direct Support ticketing system</li>
                </ul>
              </div>
              <button 
                onClick={() => onGetStarted("register")}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                Go Pro Today
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs font-medium text-slate-500 gap-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs">B</div>
            <span className="font-display font-medium text-slate-900 text-sm">BizForm SaaS Suite</span>
          </div>
          <div>© 2026 BizForm SaaS Suite. All rights reserved. Built with precision.</div>
          <div className="flex items-center space-x-6">
            <a href="#demo" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#demo" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#demo" className="hover:text-slate-900 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
