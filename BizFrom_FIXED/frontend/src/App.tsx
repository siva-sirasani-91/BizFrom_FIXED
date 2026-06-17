/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, 
  LayoutDashboard, 
  UserCircle, 
  FolderEdit, 
  Coins, 
  Users2, 
  FilePieChart, 
  HelpCircle, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Sparkles,
  ArrowUpRight,
  Search,
  Command
} from "lucide-react";

import { UserProfile } from "./types";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import DashboardView from "./components/DashboardView";
import ProfileView from "./components/ProfileView";
import BusinessView from "./components/BusinessView";
import CustomersView from "./components/CustomersView";
import RecordsView from "./components/RecordsView";
import ReportsView from "./components/ReportsView";
import HelpView from "./components/HelpView";
import SettingsView from "./components/SettingsView";

// ======================== GLOBAL FETCH INTERCEPTOR CENTRALIZED IN MAIN.TSX ========================
// Note: The global fetch interceptor has been robustly centralized in /src/main.tsx using
// Object.defineProperty to support iframe environments and avoid window.fetch read-only getter restrictions.

// ======================== FORMATTING UTILITIES FOR SEARCH DETAILS ========================
function getRecordAmount(cust: any): number {
  if (!cust) return 0;
  
  let onlineAmount = 0;
  let offlineAmount = 0;

  const method = String(cust.paymentMethod || "Cash").toLowerCase();
  const isOnlineMethod = method.includes("online") || method.includes("upi") || method.includes("bank") || method.includes("card");

  if (cust.data && typeof cust.data === "object") {
    const exclusionKeywords = [
      "phone", "mobile", "contact", "aadhar", "aadhaar", "pincode", "zipcode", "post", "pin", "vehicle"
    ];

    const paymentKeys = [
      "amount", "advance", "balance", "fee", "cost", "total", "price", "bill", "salary", "rate", 
      "payment", "amountpaid", "amount_paid", "charges", "charges_paid", "pay"
    ];

    Object.entries(cust.data).forEach(([key, val]) => {
      const keyLower = key.toLowerCase();
      if (exclusionKeywords.some(k => keyLower.includes(k))) return;

      if (Array.isArray(val)) {
        val.forEach((row: any) => {
          if (row && typeof row === "object") {
            Object.entries(row).forEach(([rk, rv]) => {
              const rkLower = rk.toLowerCase();
              if (exclusionKeywords.some(k => rkLower.includes(k))) return;

              const num = Number(rv);
              if (!isNaN(num) && rv !== "" && rv !== null && rv !== undefined && typeof rv !== "boolean") {
                if (rkLower.includes("online")) {
                  onlineAmount += num;
                } else if (rkLower.includes("offline") || rkLower.includes("cash") || rkLower.includes("offlineamount") || rkLower.includes("offline_amount")) {
                  offlineAmount += num;
                } else if (paymentKeys.some(pk => rkLower.includes(pk))) {
                  if (isOnlineMethod) {
                    onlineAmount += num;
                  } else {
                    offlineAmount += num;
                  }
                }
              }
            });
          }
        });
      } else {
        const num = Number(val);
        if (!isNaN(num) && val !== "" && val !== null && val !== undefined && typeof val !== "boolean") {
          if (keyLower.includes("online")) {
            onlineAmount += num;
          } else if (keyLower.includes("offline") || keyLower.includes("cash") || keyLower.includes("offlineamount") || keyLower.includes("offline_amount")) {
            offlineAmount += num;
          } else if (paymentKeys.some(pk => keyLower.includes(pk))) {
            if (isOnlineMethod) {
              onlineAmount += num;
            } else {
              offlineAmount += num;
            }
          }
        }
      }
    });
  }

  if (onlineAmount === 0 && offlineAmount === 0) {
    return Number(cust.paymentAmount) || 0;
  }

  return onlineAmount + offlineAmount;
}

function formatObjectKey(key: string, parentLabel?: string): string {
  const kLower = key.toLowerCase();
  if (kLower === "type" && parentLabel) {
    const cleanParent = parentLabel.trim();
    if (!cleanParent.toLowerCase().includes("type")) {
      return `${cleanParent} Type`;
    }
  }
  
  let s = key.replace(/([A-Z])/g, " $1");
  s = s.replace(/_/g, " ");
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function isArrayOfObjects(val: any): boolean {
  return Array.isArray(val) && val.length > 0 && val.every(item => item !== null && typeof item === "object" && !Array.isArray(item));
}

function renderValue(val: any, parentLabel?: string): React.ReactNode {
  if (val === null || val === undefined) {
    return <em className="text-slate-350 font-normal">N/A</em>;
  }

  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  if (isArrayOfObjects(val)) {
    const keysMap: Record<string, boolean> = {};
    val.forEach((item: any) => {
      if (item && typeof item === "object") {
        Object.keys(item).forEach(k => {
          keysMap[k] = true;
        });
      }
    });
    const keys = Object.keys(keysMap);

    return (
      <div className="overflow-x-auto my-2 w-full">
        <table className="min-w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden bg-white">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
              {keys.map(k => (
                <th key={k} className="p-2 border-r last:border-r-0 border-slate-200">{formatObjectKey(k, parentLabel)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {val.map((row: any, rIdx: number) => (
              <tr key={rIdx} className="border-b last:border-none border-slate-200 hover:bg-slate-50 font-medium">
                {keys.map(k => {
                  const cellVal = row[k];
                  const isNum = typeof cellVal === "number";
                  return (
                    <td key={k} className={`p-2 border-r last:border-r-0 border-slate-200 text-slate-900 ${isNum ? "font-mono font-semibold" : ""}`}>
                      {cellVal !== undefined && cellVal !== null && cellVal !== "" 
                        ? (typeof cellVal === "object" ? JSON.stringify(cellVal) : String(cellVal))
                        : <span className="text-slate-300">-</span>
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-slate-400 font-mono">[]</span>;
    return val.map(item => typeof item === "object" ? JSON.stringify(item) : String(item)).join(", ");
  }

  if (typeof val === "object") {
    const entries = Object.entries(val);
    if (entries.length === 0) return <span className="text-slate-400 font-mono">{"{}"}</span>;

    return (
      <div className="space-y-1.5 p-2.5 bg-white border border-slate-200 rounded-xl my-1 text-left w-full inline-block">
        {entries.map(([k, v]) => {
          const displayKey = formatObjectKey(k, parentLabel);
          const kLower = k.toLowerCase();
          let displayVal: React.ReactNode = "";

          if (v === null || v === undefined) {
            displayVal = "-";
          } else if (typeof v === "object") {
            displayVal = renderValue(v, displayKey);
          } else {
            if (typeof v === "number" && (kLower.includes("amount") || kLower.includes("price") || kLower.includes("fee") || kLower.includes("cost") || kLower.includes("rate") || kLower === "payment")) {
              displayVal = <span className="font-mono font-bold text-emerald-700">₹{v.toLocaleString("en-IN")}</span>;
            } else if (typeof v === "boolean") {
              displayVal = v ? "Yes" : "No";
            } else {
              displayVal = String(v);
            }
          }

          return (
            <div key={k} className="flex justify-between items-center text-xs border-b last:border-none border-slate-100/60 pb-1 last:pb-0">
              <span className="text-slate-500 font-semibold mr-4 shrink-0">{displayKey} :</span>
              <span className="text-slate-900 font-bold max-w-xs">{displayVal}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return String(val);
}

function renderValueInDetails(f: { name: string; label: string; type?: string }, val: any): React.ReactNode {
  if (val === null || val === undefined) {
    return <em className="text-slate-350 font-normal">N/A</em>;
  }

  if (f.type === "table") {
    const rows = Array.isArray(val) ? val : [];
    if (rows.length === 0) {
      return <p className="text-xs text-slate-400 italic">No entry rows recorded.</p>;
    }

    return renderValue(rows, f.label);
  }

  if (isArrayOfObjects(val)) {
    return renderValue(val, f.label);
  }

  if (typeof val === "object") {
    return renderValue(val, f.label);
  }

  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  return String(val);
}


export default function App() {
  // Session caching
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isValidatingSession, setIsValidatingSession] = useState(
    () => typeof window !== "undefined" && (!!localStorage.getItem("bizform_user_session") || !!localStorage.getItem("bizform_session_token"))
  );
  
  // Navigation tabs: "landing" | "auth" | dashboard sub-tabs
  const [appMode, setAppMode] = useState<"landing" | "auth" | "app">("landing");
  const [authFormTab, setAuthFormTab] = useState<"login" | "register">("login");
  
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Language selection state
  const [language, setLanguage] = useState<"en" | "te">(() => {
    return (localStorage.getItem("app_lang") as "en" | "te") || "en";
  });

  // Jump shortcuts variables helper
  const [selectedBizForForm, setSelectedBizForForm] = useState<string>("");

  // Global search states
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [globalResults, setGlobalResults] = useState<{ results: any[] }>({ results: [] });
  const [searchFilter, setSearchFilter] = useState<"all" | "businesses" | "customers" | "workers">("all");
  const [selectedSearchResult, setSelectedSearchResult] = useState<any | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trigger search on query change
  useEffect(() => {
    if (!user) return;
    if (!globalQuery.trim()) {
      setGlobalResults({ results: [] });
      setSelectedSearchResult(null);
      setSearching(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/search/global?userId=${user.id}&q=${encodeURIComponent(globalQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setGlobalResults(data);
          
          console.log(`[Global Search Debug] Search query entered: "${globalQuery}"`);
          console.log(`[Global Search Debug] Total searchable records loaded: ${data.totalSearchable || 0}`);
          console.log(`[Global Search Debug] Number of results found: ${data.results?.length || 0}`);

          if (data.results && data.results.length > 0) {
            setSelectedSearchResult(data.results[0]);
          } else {
            setSelectedSearchResult(null);
          }
        }
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [globalQuery, user]);

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(prev => !prev);
        setSelectedSearchResult(null);
      } else if (e.key === "Escape") {
        setGlobalSearchOpen(false);
        setSelectedSearchResult(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Autofocus search input when opened
  useEffect(() => {
    if (globalSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [globalSearchOpen]);

  // Hydrate session from localStorage on startup and validate with backend
  useEffect(() => {
    const cached = localStorage.getItem("bizform_user_session");
    const cachedToken = localStorage.getItem("bizform_session_token");
    if (cached || cachedToken) {
      try {
        if (cached) {
          const u = JSON.parse(cached);
          setUser(u);
        }
        // Verify token with backend securely before transitioning to "app" mode
        fetch("/api/auth/validate-session")
          .then((res) => {
            if (!res.ok) {
              throw new Error("Invalid session on backend");
            }
            return res.json();
          })
          .then((data) => {
            if (data.valid && data.user) {
              setUser(data.user);
              localStorage.setItem("bizform_user_session", JSON.stringify(data.user));
              if (data.user.token) {
                localStorage.setItem("bizform_session_token", data.user.token);
              }
              setAppMode("app");
            } else {
              handleLogout();
            }
          })
          .catch((err) => {
            console.warn("Session validation failed, logging out.", err);
            handleLogout();
          })
          .finally(() => {
            setIsValidatingSession(false);
          });
      } catch (err) {
        console.error("Session parse error: Wiping cached profile.", err);
        localStorage.removeItem("bizform_user_session");
        localStorage.removeItem("bizform_session_token");
        setIsValidatingSession(false);
      }
    } else {
      setIsValidatingSession(false);
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("Global unauthorized event caught. Redirecting to landing page.");
      handleLogout();
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem("bizform_user_session", JSON.stringify(profile));
    if (profile && (profile as any).token) {
      localStorage.setItem("bizform_session_token", (profile as any).token);
    }
    setAppMode("app");
    setActiveTab("dashboard");
  };

  const handleLogout = async () => {
    setUser(null);
    localStorage.removeItem("bizform_user_session");
    localStorage.removeItem("bizform_session_token");
    setAppMode("landing");
    setActiveTab("dashboard");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignored
    }
  };

  const handleGetStarted = (mode: "login" | "register") => {
    setAuthFormTab(mode);
    setAppMode("auth");
  };

  const menuItems = [
    { id: "dashboard", label: language === "te" ? "డ్యాష్‌బోర్డ్ హబ్" : "Dashboard Hub", icon: LayoutDashboard },
    { id: "business", label: language === "te" ? "కస్టమ్ ఫారమ్ బిల్డర్" : "Custom Form Builder", icon: FolderEdit },
    { id: "customers", label: language === "te" ? "కస్టమర్ రిజిస్టర్లు" : "Customer Registers", icon: Coins },
    { id: "records", label: language === "te" ? "రికార్డుల డేటాబేస్" : "Records Database", icon: Users2 },
    { id: "reports", label: language === "te" ? "ఆర్థిక నివేదికలు" : "Financial Reports", icon: FilePieChart },
    { id: "help", label: language === "te" ? "సహాయ కేంద్రం" : "Corporate Helpdesk", icon: HelpCircle },
    { id: "profile", label: language === "te" ? "యజమాని ప్రొఫైల్" : "Owner Profile", icon: UserCircle },
    { id: "settings", label: language === "te" ? "వ్యవస్థ సెట్టింగులు" : "System Settings", icon: SettingsIcon }
  ];

  if (isValidatingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">
            {language === "te" ? "సెషన్‌ను ధృవీకరిస్తోంది..." : "Authenticating session safely..."}
          </p>
        </div>
      </div>
    );
  }

  if (appMode === "landing") {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  if (appMode === "auth") {
    return (
      <AuthPage 
        initialMode={authFormTab} 
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={() => setAppMode("landing")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans selection:bg-indigo-500 selection:text-white leading-none">
      
      {/* 1. DESKTOP PERMANENT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-68 bg-slate-900 text-slate-350 border-r border-slate-800 shrink-0">
        
        {/* Brand Header */}
        <div className="p-6 h-18 border-b border-slate-800 flex items-center space-x-3 text-left">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-600/35">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-semibold text-white tracking-tight block text-sm">BizForm Suite</span>
            <span className="text-[9px] font-mono font-bold text-indigo-400 block tracking-widest uppercase">Admin Panel</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                id={`sidebar-tab-${item.id}`}
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== "business") {
                    setSelectedBizForForm(""); // reset skipping link
                  }
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left text-xs font-semibold leading-tight transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-[1.02]" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer context panel */}
        {user && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-left">
            <div className="flex items-center space-x-3">
              <img 
                src={user.profilePhoto} 
                alt="user avatar" 
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover border border-slate-700/50" 
              />
              <div className="space-y-0.5 min-w-0">
                <span className="font-display font-medium text-white block text-xs truncate leading-normal">{user.name}</span>
                <span className="text-[10px] text-slate-500 block truncate">{user.email}</span>
              </div>
            </div>
            
            {/* Quick logout link */}
            <button 
              onClick={handleLogout}
              className="mt-3.5 w-full bg-slate-800 hover:bg-red-950 hover:text-red-400 border border-slate-700/30 text-slate-400 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === "te" ? "సైన్ అవుట్" : "Sign Out of Suite"}</span>
            </button>
          </div>
        )}
      </aside>

      {/* 2. MAIN APPLICATION COLUMN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Horizontal Navigation bar */}
        <header className="sticky top-0 z-40 bg-white/50 backdrop-blur-md border-b border-slate-200/60 h-18 shrink-0">
          <div className="px-6 h-full flex items-center justify-between">
            
            {/* Left elements: menu togglers */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden cursor-pointer"
              >
                <Menu className="w-5.5 h-5.5" />
              </button>

              {/* Breadcrumbs / Page Context indicator */}
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 select-none">
                <span className="font-display text-slate-800 font-medium">
                  {language === "te" ? "బిజ్‌ఫారమ్ అప్లికేషన్" : "BizForm Application"}
                </span>
                <span>/</span>
                <span className="text-indigo-600 capitalize font-bold bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-full text-[10px]">
                  {language === "te" ? (
                    activeTab === "dashboard" ? "డ్యాష్‌బోర్డ్" :
                    activeTab === "business" ? "కస్టమ్ ఫారమ్" :
                    activeTab === "customers" ? "కస్టమర్" :
                    activeTab === "records" ? "రికార్డులు" :
                    activeTab === "reports" ? "ఆర్థిక నివేదికలు" :
                    activeTab === "help" ? "సహాయ కేంద్రం" :
                    activeTab === "profile" ? "ప్రొఫైల్" :
                    activeTab === "settings" ? "సెట్టింగులు" : activeTab
                  ) : activeTab.replace("-", " ")}
                </span>
              </div>
            </div>

            {/* Desktop Global Search trigger input */}
            <div className="hidden md:flex items-center flex-1 max-w-sm mx-8">
              <button
                onClick={() => { setGlobalSearchOpen(true); setSelectedSearchResult(null); }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-100/60 hover:bg-slate-100/90 border border-slate-200/60 hover:border-slate-300 rounded-full text-slate-450 hover:text-slate-500 text-[11.5px] font-medium transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center space-x-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === "te" ? "రికార్డులు, ఫోన్, అమౌంట్ శోధించండి..." : "Search registers, phone, ledger..."}</span>
                </div>
                <div className="flex items-center space-x-1 bg-white border border-slate-300/50 rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 select-none">
                  <Command className="w-2 text-slate-400" />
                  <span>K</span>
                </div>
              </button>
            </div>

            {/* Right actions: quick triggers and links */}
            <div className="flex items-center space-x-4">
              {/* Mobile Search Icon Button */}
              <button
                onClick={() => { setGlobalSearchOpen(true); setSelectedSearchResult(null); }}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100/95 hover:bg-slate-200/90 rounded-full md:hidden cursor-pointer"
                title="Global Search"
              >
                <Search className="w-4 h-4" />
              </button>



              {/* User badge */}
              {user && (
                <div className="flex items-center space-x-2 select-none">
                  <span className="text-xs font-bold text-slate-800 hidden md:block">{user.name}</span>
                  <img src={user.profilePhoto} referrerPolicy="no-referrer" alt="avatar" className="w-8 h-8 rounded-full border border-slate-200" />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main core children views space */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8 max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" && <DashboardView user={user!} onNavigate={setActiveTab} setSelectedBizForForm={setSelectedBizForForm} />}
          {activeTab === "profile" && <ProfileView user={user!} onProfileUpdate={(updated) => { setUser(updated); localStorage.setItem("bizform_user_session", JSON.stringify(updated)); }} />}
          {activeTab === "business" && <BusinessView userId={user!.id} selectedBizId={selectedBizForForm} onFormSavedNotice={() => console.log("Form saved notice hook")} />}
          {activeTab === "customers" && <CustomersView userId={user!.id} />}
          {activeTab === "records" && <RecordsView userId={user!.id} initialBizId={selectedBizForForm} onClearInitialBizId={() => setSelectedBizForForm("")} />}
          {activeTab === "reports" && <ReportsView userId={user!.id} user={user!} language={language} />}
          {activeTab === "help" && <HelpView />}
          {activeTab === "settings" && <SettingsView user={user!} onLogout={handleLogout} language={language} onLanguageChange={setLanguage} />}
        </main>
      </div>

      {/* GLOBAL SEARCH SPOTLIGHT MODAL */}
      {globalSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-10 sm:pt-16 px-4 animate-fade-in">
          {/* Backdrop dismiss */}
          <div className="absolute inset-0" onClick={() => { setGlobalSearchOpen(false); setSelectedSearchResult(null); }} />

          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] z-10 animate-scale-up">
            
            {/* Search Input Box */}
            <div className="flex items-center gap-3 px-4 border-b border-slate-200 bg-slate-50/50">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={language === "te" ? "రిజిస్టర్లు, ఫోన్, లెక్కింపు లేదా అనుకూల ఫీల్డ్‌లను శోధించండి..." : "Search registers, owners, customer names, phone, worker tables..."}
                value={globalQuery}
                onChange={(e) => {
                  setGlobalQuery(e.target.value);
                  setSelectedSearchResult(null);
                }}
                className="w-full text-slate-900 bg-transparent py-4 text-sm focus:outline-none placeholder-slate-400 font-medium"
              />
              {globalQuery && (
                <button 
                  onClick={() => { setGlobalQuery(""); setGlobalResults({ results: [] }); setSelectedSearchResult(null); }} 
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-205 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="flex gap-1.5 items-center bg-white border border-slate-200/80 rounded-lg px-2 py-0.5 text-[9.5px] font-mono font-bold text-slate-400 select-none">
                <span>ESC</span>
              </div>
            </div>

            {/* Category / Search Filters bar */}
            {globalQuery.trim() && !searching && (
              <div className="flex gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setSearchFilter("all")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer leading-none shrink-0 ${
                    searchFilter === "all" ? "bg-indigo-650 bg-indigo-600 text-white shadow-xs" : "bg-white hover:bg-slate-100/90 text-slate-600 border border-slate-200"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSearchFilter("businesses")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer leading-none shrink-0 ${
                    searchFilter === "businesses" ? "bg-indigo-650 bg-indigo-600 text-white shadow-xs" : "bg-white hover:bg-slate-100/90 text-slate-600 border border-slate-200"
                  }`}
                >
                  Businesses
                </button>
                <button
                  type="button"
                  onClick={() => setSearchFilter("customers")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer leading-none shrink-0 ${
                    searchFilter === "customers" ? "bg-indigo-650 bg-indigo-600 text-white shadow-xs" : "bg-white hover:bg-slate-100/90 text-slate-600 border border-slate-200"
                  }`}
                >
                  Customers
                </button>
                <button
                  type="button"
                  onClick={() => setSearchFilter("workers")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer leading-none shrink-0 ${
                    searchFilter === "workers" ? "bg-indigo-650 bg-indigo-600 text-white shadow-xs" : "bg-white hover:bg-slate-100/90 text-slate-600 border border-slate-200"
                  }`}
                >
                  Workers / Table Columns
                </button>
              </div>
            )}

            {/* Results Grid Core */}
            {selectedSearchResult?.type === "worker" ? (
              /* WORKER FULL WIDTH DISPLAY - EXACT TABLE AND TOTALS */
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white animate-fade-in text-left">
                {(() => {
                  const columnsToDisplay: any[] = [];
                  const colNamesSeen = new Set<string>();

                  selectedSearchResult.analyticsRows.forEach((ar: any) => {
                    (ar.columns || []).forEach((col: any) => {
                      if (!colNamesSeen.has(col.name)) {
                        colNamesSeen.add(col.name);
                        columnsToDisplay.push(col);
                      }
                    });
                  });

                  // Filter out worker identifier column to match instructions and get actual dynamic columns
                  const colsToRender = columnsToDisplay.filter((col: any) => {
                    const cn = col.name.toLowerCase();
                    const cl = col.label.toLowerCase();
                    if (
                      cn.includes("worker") || cn.includes("labour") || cn.includes("staff") || cn.includes("helper") || cn.includes("driver") || cn.includes("employee") ||
                      cl.includes("worker") || cl.includes("labour") || cl.includes("staff") || cl.includes("helper") || cl.includes("driver") || cl.includes("employee")
                    ) {
                      return false;
                    }
                    return true;
                  });

                  const colTotals: Record<string, number> = {};
                  colsToRender.forEach((col: any) => {
                    const isNumeric = col.type === "number" || 
                      col.name.toLowerCase().includes("amount") || 
                      col.name.toLowerCase().includes("packets") || 
                      col.name.toLowerCase().includes("trips") || 
                      col.name.toLowerCase().includes("qty") || 
                      col.name.toLowerCase().includes("salary") || 
                      col.name.toLowerCase().includes("advance") || 
                      col.name.toLowerCase().includes("bill") || 
                      col.name.toLowerCase().includes("rate");

                    if (isNumeric) {
                      let sum = 0;
                      selectedSearchResult.analyticsRows.forEach((ar: any) => {
                        const val = Number(ar.rowData?.[col.name]);
                        if (!isNaN(val) && ar.rowData?.[col.name] !== undefined && ar.rowData?.[col.name] !== null && ar.rowData?.[col.name] !== "") {
                          sum += val;
                        }
                      });
                      colTotals[col.name] = sum;
                    }
                  });

                  const uniqueCustsCount = new Set(selectedSearchResult.analyticsRows.map((r: any) => r.customerName)).size;

                  return (
                    <div className="space-y-6">
                      
                      {/* Grid Data Table */}
                      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
                        <table className="min-w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                              <th className="p-3 border-r border-slate-200 font-bold whitespace-nowrap">Customer Name</th>
                              <th className="p-3 border-r border-slate-200 font-bold whitespace-nowrap">Worker Name</th>
                              {colsToRender.map((col: any) => (
                                <th key={col.name} className="p-3 border-r last:border-r-0 border-slate-200 font-bold whitespace-nowrap">
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {selectedSearchResult.analyticsRows.map((ar: any, rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-slate-50 font-medium text-slate-800 transition-colors">
                                <td 
                                  onClick={() => {
                                    const custResult = {
                                      type: "customer",
                                      id: ar.recordId,
                                      businessId: selectedSearchResult.businessId,
                                      businessName: selectedSearchResult.businessName,
                                      customerName: ar.customerName,
                                      matchedField: `Worker Entry (${selectedSearchResult.workerName})`,
                                      matchedValue: selectedSearchResult.workerName,
                                      record: ar.record
                                    };
                                    setSelectedSearchResult(custResult);
                                  }}
                                  className="p-3 border-r border-slate-200 text-indigo-600 hover:underline cursor-pointer font-bold"
                                >
                                  {ar.customerName}
                                </td>
                                <td className="p-3 border-r border-slate-200 text-slate-600 font-normal">
                                  {selectedSearchResult.workerName}
                                </td>
                                {colsToRender.map((col: any) => {
                                  const val = ar.rowData?.[col.name];
                                  const isNum = typeof val === "number" || (!isNaN(Number(val)) && val !== "");
                                  return (
                                    <td key={col.name} className={`p-3 border-r last:border-r-0 border-slate-200 ${isNum ? "font-mono font-bold text-slate-900" : "font-normal text-slate-700"}`}>
                                      {val !== undefined && val !== null && val !== "" ? String(val) : <span className="text-slate-300">-</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals table directly below */}
                      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
                        <table className="min-w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                              <th className="p-3 border-r border-slate-200 font-bold whitespace-nowrap">Total Customers</th>
                              {colsToRender.map((col: any) => {
                                if (colTotals[col.name] !== undefined) {
                                  return (
                                    <th key={col.name} className="p-3 border-r last:border-r-0 border-slate-200 font-bold whitespace-nowrap">
                                      Total {col.label}
                                    </th>
                                  );
                                }
                                return null;
                              })}
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            <tr className="font-bold text-slate-950 font-extrabold">
                              <td className="p-3 border-r border-slate-200 font-mono text-sm">
                                {uniqueCustsCount}
                              </td>
                              {colsToRender.map((col: any) => {
                                if (colTotals[col.name] !== undefined) {
                                  const isPrice = col.name.toLowerCase().includes("amount") || col.name.toLowerCase().includes("salary") || col.name.toLowerCase().includes("advance") || col.name.toLowerCase().includes("bill") || col.name.toLowerCase().includes("rate") || col.name.toLowerCase().includes("fee") || col.name.toLowerCase().includes("price") || col.name.toLowerCase().includes("cost");
                                  return (
                                    <td key={col.name} className={`p-3 border-r last:border-r-0 border-slate-200 font-mono text-sm ${isPrice ? "text-emerald-700" : "text-slate-900"}`}>
                                      {isPrice ? "₹" : ""}{colTotals[col.name].toLocaleString("en-IN")}
                                    </td>
                                  );
                                }
                                return null;
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              
              {/* Left Column: List of Results (md:col-span-5) */}
              <div className="col-span-1 md:col-span-5 flex flex-col overflow-y-auto p-4 space-y-3 bg-slate-50/20">
                
                {searching && (
                  <div className="flex items-center justify-center py-16 space-x-2">
                    <span className="animate-spin text-indigo-600 font-bold">●</span>
                    <span className="text-xs text-slate-500 font-semibold">{language === "te" ? "శోధిస్తోంది..." : "Scanning databases..."}</span>
                  </div>
                )}

                {/* Initial Blank Page guidelines */}
                {!globalQuery.trim() && (
                  <div className="text-center py-20 px-4 space-y-2.5 select-none">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                      <Search className="w-5 h-5 animate-pulse" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">{language === "te" ? "గ్లోబల్ సెర్చ్ సెంటర్" : "Universal Search Board"}</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-normal">
                      {language === "te" 
                        ? "కస్టమర్ పేరు, ఫోన్ నంబర్లు, కస్టమ్ ఫారమ్ పట్టికల కాలమ్స్, జీతాలు, వర్కర్స్ తక్షణమే శోధించండి." 
                        : "Query custom business models, owners, customer files, cell values, and repeating table rows instantly."
                      }
                    </p>
                  </div>
                )}

                {/* Query is present but match array is empty */}
                {globalQuery.trim() && !searching && (globalResults.results || []).length === 0 && (
                  <div className="text-center py-20 px-4 select-none">
                    <p className="text-xs font-semibold text-slate-400 italic">
                      {language === "te" ? "ఏ ఫలితాలు కనుగొనబడలేదు." : "No matching fields, tables, or database registers found."}
                    </p>
                  </div>
                )}

                {/* Render Filtered Results */}
                {globalQuery.trim() && !searching && (globalResults.results || []).length > 0 && (() => {
                  const filtered = (globalResults.results || []).filter(item => {
                    if (searchFilter === "all") return true;
                    if (searchFilter === "businesses") return item.type === "business";
                    if (searchFilter === "customers") return item.type === "customer";
                    if (searchFilter === "workers") return item.type === "worker";
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-16 px-4 select-none">
                        <p className="text-xs font-semibold text-slate-400 italic">
                          No results match the selection.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest pl-1 block">
                        Search Results ({filtered.length})
                      </span>
                      <div className="space-y-2.5">
                        {filtered.map((item, idx) => {
                          const isSelected = selectedSearchResult?.id === item.id && selectedSearchResult?.matchedField === item.matchedField;
                          return (
                            <div
                              key={`${item.id}-${idx}`}
                              onClick={() => setSelectedSearchResult(item)}
                              className={`p-3.5 border rounded-xl flex flex-col text-left cursor-pointer transition-all ${
                                isSelected 
                                  ? "bg-slate-900 border-slate-900 text-white scale-[1.015] shadow-lg shadow-slate-900/10" 
                                  : "bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between pb-1 border-b border-slate-100/55 mb-1.5">
                                <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${isSelected ? "text-indigo-300" : "text-indigo-600"}`}>
                                  {item.type === "business" ? "Business Asset" : item.type === "worker" ? "Worker Analytics" : "Customer Record"}
                                </span>
                                {item.type === "customer" && (
                                  <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                                    ₹{getRecordAmount(item.record).toLocaleString("en-IN")}
                                  </span>
                                )}
                                {item.type === "worker" && (
                                  <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-teal-300" : "text-teal-600"}`}>
                                    {item.analyticsRows?.length || 0} entries
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 pr-1 space-y-0.5">
                                <div className="text-xs font-bold leading-tight truncate">
                                  {item.type === "business" ? item.businessName : item.type === "worker" ? item.workerName : item.customerName}
                                </div>
                                <div className={`text-[10px] leading-none ${isSelected ? "text-slate-400" : "text-slate-450 text-slate-400"} font-medium`}>
                                  Registry: <span className="font-semibold">{item.businessName}</span>
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] space-y-0.5">
                                <span className={`text-[8.5px] font-bold uppercase tracking-wider block ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                                  Matched Field: <span className={isSelected ? "text-white" : "text-slate-800 font-bold"}>{item.matchedField}</span>
                                </span>
                                <div className={`font-mono text-[11px] leading-tight font-medium ${isSelected ? "text-slate-200" : "text-slate-700"} truncate`}>
                                  &ldquo;{item.matchedValue}&rdquo;
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Right Column: Record Detail Inspector (md:col-span-7) */}
              <div className="col-span-1 md:col-span-7 flex flex-col overflow-y-auto p-5 sm:p-6 bg-slate-50/70">
                {!selectedSearchResult ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2.5 select-none">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
                      <Command className="w-5.5 h-5.5 text-slate-400 animate-pulse" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{language === "te" ? "రికార్డును సమీక్షించండి" : "Select Search Entry for Details"}</span>
                    <p className="text-[10.5px] text-slate-400 max-w-xs leading-normal">
                      {language === "te" 
                        ? "పూర్తి కస్టమర్ రికార్డులు, కస్టమ్ రిజిస్టర్లు, జీతం, వర్కర్ టేబుల్స్ లేదా యజమాని సంప్రదింపు సమాచారం తక్షణమే లోడ్ చేయడానికి ఏదైనా రికార్డును ఎంచుకోండి." 
                        : "Click any matching search item in the left viewport to inspect its complete profile, forms, numeric totals, and database registry structures."
                      }
                    </p>
                  </div>
                ) : (
                  /* SELECTED SEARCH RESULT PANEL */
                  <div className="space-y-5 text-left">
                    {selectedSearchResult.type === "customer" ? (
                      /* CUSTOMER RESULT DETAILED INSPECTOR */
                      <div className="space-y-5">
                        
                        {/* Heading Card */}
                        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[9px] font-mono tracking-widest font-extrabold text-indigo-400 uppercase block">Customer Record Details</span>
                              <h3 className="text-lg font-display font-bold leading-tight tracking-tight mt-1">{selectedSearchResult.customerName}</h3>
                            </div>
                            <span className="text-[9.5px] font-mono bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg font-bold shadow-xs">
                              ID: {selectedSearchResult.id}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-2.5 text-[10.5px] text-slate-300 border-t border-slate-800/40">
                            <div>
                              <span className="text-[9px] text-slate-450 text-slate-400 font-bold block uppercase tracking-wider">Parent Register</span>
                              <span className="font-semibold text-white">{selectedSearchResult.businessName}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-455 text-slate-400 font-bold block uppercase tracking-wider">Created Date</span>
                              <span className="font-semibold text-white">{new Date(selectedSearchResult.record.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Complete Customer Profile Details */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
                          <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Primary Profile Details</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                            <div className="space-y-1">
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Customer Name</span>
                              <span className="text-slate-900 block">{selectedSearchResult.customerName}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Phone Number</span>
                              <span className="text-slate-900 font-mono block">
                                {selectedSearchResult.record.data.phone || selectedSearchResult.record.data.phone_number || selectedSearchResult.record.data.customerPhone || "N/A"}
                              </span>
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Address Location</span>
                              <span className="text-slate-900 block font-normal text-[11.5px] leading-relaxed">
                                {selectedSearchResult.record.data.address || selectedSearchResult.record.data.address_details || selectedSearchResult.record.data.location || "N/A"}
                              </span>
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Notes / Care / Remarks</span>
                              <p className="text-slate-700 font-normal leading-relaxed text-[11px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg italic">
                                {selectedSearchResult.record.data.notes || selectedSearchResult.record.data.remarks || selectedSearchResult.record.data.description || "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Payment Details Section */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                          <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Payment Details</h4>
                          <div className="grid grid-cols-3 gap-3 text-xs text-left">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">Total Bill Amount</span>
                              <span className="text-sm font-extrabold text-slate-900 font-mono block mt-1.5">
                                ₹{getRecordAmount(selectedSearchResult.record).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">Checkout Method</span>
                              <span className={`text-[11px] font-extrabold block mt-1.5 uppercase ${
                                selectedSearchResult.record.paymentMethod === "Online" ? "text-emerald-700" : "text-amber-700"
                              }`}>
                                {selectedSearchResult.record.paymentMethod}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">Transaction Ref</span>
                              <span className="text-[10.5px] font-mono font-bold text-slate-700 block mt-2 truncate" title={selectedSearchResult.record.transactionId}>
                                {selectedSearchResult.record.transactionId || "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dynamic custom form fields & all repeating tables */}
                        <div className="space-y-2.5">
                          <h4 className="text-[10px] font-mono font-bold uppercase text-slate-450 tracking-widest pl-1 block">Form Fields & Repeating Tables</h4>
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-200">
                            {selectedSearchResult.record.formFields && selectedSearchResult.record.formFields.length > 0 ? (
                              selectedSearchResult.record.formFields.map((f: any) => {
                                const val = selectedSearchResult.record.data[f.name];

                                if (f.type === "table") {
                                  // Repeating Tables custom block
                                  const rows = Array.isArray(val) ? val : [];
                                  const columns = f.columns || [];

                                  // Calculating numeric aggregates / columns sums
                                  const totalRowCount = rows.length;
                                  const columnSums: Record<string, number> = {};

                                  rows.forEach((row: any) => {
                                    if (row && typeof row === "object") {
                                      Object.entries(row).forEach(([colKey, colVal]) => {
                                        const parsedNum = Number(colVal);
                                        if (!isNaN(parsedNum) && colVal !== null && colVal !== undefined && colVal !== "") {
                                          columnSums[colKey] = (columnSums[colKey] || 0) + parsedNum;
                                        }
                                      });
                                    }
                                  });

                                  return (
                                    <div key={f.id} className="p-4 space-y-4 text-left">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                                        <span className="text-xs font-extrabold text-slate-905 text-slate-900 uppercase tracking-tight">{f.label}</span>
                                        <span className="text-[9.5px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full uppercase">
                                          Repeating Table
                                        </span>
                                      </div>

                                      {rows.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No entry rows recorded inside this repeating custom table.</p>
                                      ) : (
                                        <div className="space-y-3">
                                          <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                            <table className="min-w-full text-[11px] text-left border-collapse">
                                              <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-[9.5px] uppercase font-bold text-slate-500">
                                                  {columns.map((col: any) => (
                                                    <th key={col.id || col.name} className="p-2 border-r last:border-none border-slate-200 font-extrabold text-slate-700">
                                                      {col.label}
                                                    </th>
                                                  ))}
                                                  {columns.length === 0 && rows[0] && Object.keys(rows[0]).map((k) => (
                                                    <th key={k} className="p-2 border-r last:border-none border-slate-200 font-extrabold text-slate-700">
                                                      {formatObjectKey(k)}
                                                    </th>
                                                  ))}
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-200 bg-white">
                                                {rows.map((row: any, rIdx: number) => {
                                                  const itemCols = columns.length > 0 ? columns.map((col: any) => col.name) : Object.keys(row);
                                                  return (
                                                    <tr key={rIdx} className="hover:bg-slate-50/50 font-medium text-slate-800">
                                                      {itemCols.map((cName: string) => {
                                                        const isNum = typeof row[cName] === "number" || (!isNaN(Number(row[cName])) && row[cName] !== "");
                                                        return (
                                                          <td key={cName} className={`p-2 border-r last:border-none border-slate-200 text-slate-800 ${isNum ? "font-mono font-semibold" : ""}`}>
                                                            {row[cName] !== undefined && row[cName] !== null && row[cName] !== "" ? String(row[cName]) : <span className="text-slate-300">-</span>}
                                                          </td>
                                                        );
                                                      })}
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>

                                          {/* DYNAMIC TOTALS DECK COUPLING FOR NUMERICAL COLUMNS AND GRID ENTRIES */}
                                          <div className="space-y-2.5 bg-indigo-50/30 border border-indigo-100/60 p-4 rounded-xl text-left">
                                            <div className="text-[9.5px] uppercase tracking-wider font-extrabold text-indigo-700 leading-none pb-2 border-b border-indigo-100/40">
                                              DYNAMIC TOTALS & ROWS SUMS
                                            </div>
                                            <div className="flex flex-wrap gap-2.5 pt-1">
                                              
                                              {/* Total table entries / workers */}
                                              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-3xs hover:shadow-2xs transition-shadow">
                                                <span className="text-[9.5px] font-bold text-slate-500 uppercase">
                                                  Total {f.label.toLowerCase().includes("worker") || f.label.toLowerCase().includes("labour") ? "Workers" : f.label} =
                                                </span>
                                                <strong className="text-indigo-905 text-indigo-950 font-bold text-xs">{totalRowCount}</strong>
                                              </div>

                                              {/* Loop through each column numerical sum */}
                                              {Object.entries(columnSums).map(([colKey, sumValue]) => {
                                                const colObj = columns.find((c: any) => c.name === colKey);
                                                const label = colObj ? colObj.label : formatObjectKey(colKey);
                                                const colLower = colKey.toLowerCase();
                                                const isPrice = colLower.includes("amount") || colLower.includes("price") || colLower.includes("fee") || colLower.includes("cost") || colLower.includes("rate") || colLower === "payment" || colLower.includes("salary") || colLower.includes("advance") || colLower.includes("commission") || colLower.includes("bill");

                                                return (
                                                  <div key={colKey} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-3xs hover:shadow-2xs transition-shadow">
                                                    <span className="text-[9.5px] font-bold text-slate-500 uppercase">
                                                      Total {label} =
                                                    </span>
                                                    <strong className={`font-bold text-xs font-mono ${isPrice ? "text-emerald-700 font-semibold" : "text-slate-900"}`}>
                                                      {isPrice ? "₹" : ""}{sumValue.toLocaleString("en-IN")}
                                                    </strong>
                                                  </div>
                                                );
                                              })}

                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else {
                                  // Plain custom field (Skip standard fields to prevent repetition)
                                  const standardKeys = ["customerName", "customer_name", "name", "phone", "phone_number", "customerPhone", "address", "address_details", "location", "notes", "remarks", "description"];
                                  if (standardKeys.includes(f.name)) return null;

                                  return (
                                    <div key={f.id} className="p-3 bg-white flex justify-between items-center gap-4 text-xs font-semibold">
                                      <span className="text-slate-500">{f.label}</span>
                                      <strong className={`text-slate-900 text-right ${f.type === "number" ? "font-mono" : ""}`}>
                                        {val === true ? "Yes" : val === false ? "No" : val !== undefined && val !== null && val !== "" ? String(val) : <em className="text-slate-300 font-normal">—</em>}
                                      </strong>
                                    </div>
                                  );
                                }
                              })
                            ) : (
                              <div className="p-6 text-xs text-slate-400 italic text-center">
                                No custom fields built for this business form structures yet.
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    ) : selectedSearchResult.type === "worker" ? (
                      /* WORKER RESULT DETAILED INSPECTOR */
                      <div className="space-y-5 animate-fade-in text-left">
                        
                        {/* Heading Card */}
                        <div className="bg-gradient-to-r from-teal-950 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[9px] font-mono tracking-widest font-extrabold text-teal-300 uppercase block">Worker Analytics Report</span>
                              <h3 className="text-xl font-display font-medium leading-tight tracking-tight mt-1">{selectedSearchResult.workerName}</h3>
                            </div>
                            <span className="text-[9.5px] font-mono bg-indigo-650 bg-indigo-600 text-white px-2.5 py-1 rounded font-bold shadow-xs">
                              {selectedSearchResult.analyticsRows?.length || 0} Entries
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-2.5 text-[10.5px] text-slate-300 border-t border-slate-800/40">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Parent Register</span>
                              <span className="font-semibold text-white">{selectedSearchResult.businessName}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Matched Role</span>
                              <span className="font-semibold text-teal-300 font-mono text-[11px]">{selectedSearchResult.matchedField}</span>
                            </div>
                          </div>
                        </div>

                        {/* DISPLAY TABLE */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-3.5">
                          <div className="p-4 pb-0 flex items-center justify-between">
                            <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Worker Ledgers & Assignments</h4>
                            <span className="text-[10px] font-semibold text-indigo-600">Click row to open details</span>
                          </div>
                          
                          {(() => {
                            const columnsToDisplay: any[] = [];
                            const colNamesSeen = new Set<string>();

                            selectedSearchResult.analyticsRows.forEach((ar: any) => {
                              (ar.columns || []).forEach((col: any) => {
                                if (!colNamesSeen.has(col.name)) {
                                  colNamesSeen.add(col.name);
                                  columnsToDisplay.push(col);
                                }
                              });
                            });

                            // Filter out worker identifier column to match instructions
                            const colsToRender = columnsToDisplay.filter((col: any) => {
                              const cn = col.name.toLowerCase();
                              const cl = col.label.toLowerCase();
                              if (
                                cn.includes("worker") || cn.includes("labour") || cn.includes("staff") || cn.includes("helper") || cn.includes("driver") || cn.includes("employee") ||
                                cl.includes("worker") || cl.includes("labour") || cl.includes("staff") || cl.includes("helper") || cl.includes("driver") || cl.includes("employee")
                              ) {
                                return false;
                              }
                              return true;
                            });

                            const colTotals: Record<string, number> = {};
                            colsToRender.forEach((col: any) => {
                              const isNumeric = col.type === "number" || 
                                col.name.toLowerCase().includes("amount") || 
                                col.name.toLowerCase().includes("packets") || 
                                col.name.toLowerCase().includes("trips") || 
                                col.name.toLowerCase().includes("qty") || 
                                col.name.toLowerCase().includes("salary") || 
                                col.name.toLowerCase().includes("advance") || 
                                col.name.toLowerCase().includes("bill") || 
                                col.name.toLowerCase().includes("rate");

                              if (isNumeric) {
                                let sum = 0;
                                selectedSearchResult.analyticsRows.forEach((ar: any) => {
                                  const val = Number(ar.rowData?.[col.name]);
                                  if (!isNaN(val) && ar.rowData?.[col.name] !== undefined && ar.rowData?.[col.name] !== null && ar.rowData?.[col.name] !== "") {
                                    sum += val;
                                  }
                                });
                                colTotals[col.name] = sum;
                              }
                            });

                            const uniqueCustsCount = new Set(selectedSearchResult.analyticsRows.map((r: any) => r.customerName)).size;

                            return (
                              <div className="space-y-4 text-left">
                                <div className="overflow-x-auto px-4">
                                  <table className="min-w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                                        <th className="p-2.5 font-bold border-r border-slate-200">Customer Name</th>
                                        <th className="p-2.5 font-bold border-r border-slate-200">Date</th>
                                        {colsToRender.map((col: any) => (
                                          <th key={col.name} className="p-2.5 font-bold border-r border-slate-200">
                                            {col.label}
                                          </th>
                                        ))}
                                        <th className="p-2.5 font-bold border-slate-200">Payment Type</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                      {selectedSearchResult.analyticsRows.map((ar: any, rIdx: number) => (
                                        <tr 
                                          key={rIdx} 
                                          onClick={() => {
                                            const custResult = {
                                              type: "customer",
                                              id: ar.recordId,
                                              businessId: selectedSearchResult.businessId,
                                              businessName: selectedSearchResult.businessName,
                                              customerName: ar.customerName,
                                              matchedField: `Worker Entry (${selectedSearchResult.workerName})`,
                                              matchedValue: selectedSearchResult.workerName,
                                              record: ar.record
                                            };
                                            setSelectedSearchResult(custResult);
                                          }}
                                          className="hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer transition-colors"
                                        >
                                          <td className="p-2.5 border-r border-slate-200 text-indigo-600 hover:underline">
                                            {ar.customerName}
                                          </td>
                                          <td className="p-2.5 border-r border-slate-200 text-slate-500 font-normal">
                                            {ar.date}
                                          </td>
                                          {colsToRender.map((col: any) => {
                                            const val = ar.rowData?.[col.name];
                                            const isNum = typeof val === "number" || (!isNaN(Number(val)) && val !== "");
                                            return (
                                              <td key={col.name} className={`p-2.5 border-r border-slate-200 ${isNum ? "font-mono font-bold text-slate-900" : "font-normal text-slate-700"}`}>
                                                {val !== undefined && val !== null && val !== "" ? String(val) : <span className="text-slate-300">-</span>}
                                              </td>
                                            );
                                          })}
                                          <td className="p-2.5 text-slate-700 font-medium">
                                            <span className={`px-2 py-0.5 rounded text-[9.5px] uppercase font-bold leading-none ${
                                              ar.paymentMethod === "Online" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                                            }`}>
                                              {ar.paymentMethod || "Cash"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* SHOW TOTALS */}
                                <div className="p-4 pt-3 border-t border-slate-200 bg-slate-50/60 rounded-b-xl">
                                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider mb-2.5 pl-1">
                                    Worker Analytics Summary Totals
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center animate-fade-in">
                                    <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-3xs">
                                      <span className="text-[9.5px] font-bold text-slate-400 block uppercase leading-none">Total Customers</span>
                                      <strong className="text-slate-900 font-extrabold text-sm block mt-2 font-mono">{uniqueCustsCount}</strong>
                                    </div>
                                    {colsToRender.map((col: any) => {
                                      if (colTotals[col.name] !== undefined) {
                                        const isPrice = col.name.toLowerCase().includes("amount") || col.name.toLowerCase().includes("salary") || col.name.toLowerCase().includes("advance") || col.name.toLowerCase().includes("bill") || col.name.toLowerCase().includes("rate") || col.name.toLowerCase().includes("fee") || col.name.toLowerCase().includes("cost") || col.name.toLowerCase().includes("price");
                                        return (
                                          <div key={col.name} className="bg-white border border-slate-200 p-3 rounded-xl shadow-3xs">
                                            <span className="text-[9.5px] font-bold text-slate-450 block uppercase leading-none truncate" title={`Total ${col.label}`}>
                                              Total {col.label}
                                            </span>
                                            <strong className={`font-extrabold text-sm block mt-2 font-mono ${isPrice ? "text-emerald-700" : "text-slate-905"}`}>
                                              {isPrice ? "₹" : ""}{colTotals[col.name].toLocaleString("en-IN")}
                                            </strong>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      /* BUSINESS RESULT DETAILED INSPECTOR */
                      <div className="space-y-5">
                        
                        {/* Heading Box */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-2xl p-5 shadow-sm space-y-2">
                          <span className="text-[9.5px] font-mono tracking-widest font-extrabold text-indigo-200 uppercase block">Registered Business Match</span>
                          <h3 className="text-xl font-display font-bold leading-tight tracking-tight mt-1">{selectedSearchResult.businessName}</h3>
                          <p className="text-[11.5px] text-indigo-100 font-medium leading-relaxed">
                            {selectedSearchResult.business.notes || "This represents an active client customer ledger registers portal configured within the subscription."}
                          </p>
                        </div>

                        {/* Business details card block */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-3.5 text-xs font-semibold">
                          <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Business profile</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Tel / Contact Number</span>
                              <span className="text-slate-900 font-mono block">{selectedSearchResult.business.phone || "—"}</span>
                            </div>
                            <div>
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">HQ Address Location</span>
                              <span className="text-slate-900 block font-normal leading-relaxed text-[11px]">
                                {selectedSearchResult.business.address || "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Owner detail information block */}
                        <div className="bg-white border border-slate-205 border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-3.5 text-xs font-semibold">
                          <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Business Owner Details</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Owner Name</span>
                              <span className="text-slate-900 block">{selectedSearchResult.ownerDetails?.name || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Registered Email</span>
                              <span className="text-slate-900 font-mono block">{selectedSearchResult.ownerDetails?.email || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Owner Phone</span>
                              <span className="text-slate-900 font-mono block">{selectedSearchResult.ownerDetails?.phone || "—"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Business activity metrics stats */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-3.5">
                          <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Business Registry Statistics</h4>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total Active Customers</span>
                              <strong className="text-slate-900 font-extrabold text-xl block mt-1 font-mono">
                                {selectedSearchResult.businessStats?.totalCustomers ?? 0}
                              </strong>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total Customer Records Count</span>
                              <strong className="text-slate-900 font-extrabold text-xl block mt-1 font-mono">
                                {selectedSearchResult.businessStats?.totalRecords ?? 0}
                              </strong>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Navigation hyper shortcut button */}
                    <div className="pt-2 text-center text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBizForForm(selectedSearchResult.businessId);
                          setActiveTab("records");
                          setGlobalSearchOpen(false);
                        }}
                        className="w-full bg-indigo-600 text-white rounded-xl py-3.5 hover:bg-indigo-700 font-bold tracking-normal transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Open Complete Customer Ledger Grid</span>
                        <ArrowUpRight className="w-4 h-4 text-white" />
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MOBILE MENU UTILITY SIDEBAR DRAWERS */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
          />
          
          <aside className="relative flex flex-col w-64 max-w-xs bg-slate-900 text-slate-300 h-full shadow-2xl z-50 animate-fade-in text-left">
            
            {/* Close button top right */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Brand Logo Header */}
            <div className="p-6 h-18 border-b border-slate-800 flex items-center space-x-2 select-none">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
              <span className="font-display font-semibold text-white text-md">BizForm SaaS</span>
            </div>

            {/* Nav list */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                      if (item.id !== "business") {
                        setSelectedBizForForm(""); // reset skipping link
                      }
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-left text-xs font-semibold leading-tight cursor-pointer ${
                      isSelected 
                        ? "bg-indigo-600 text-white" 
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer avatar details */}
            {user && (
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-left">
                <div className="flex items-center space-x-3">
                  <img src={user.profilePhoto} referrerPolicy="no-referrer" alt="avatar" className="w-8 h-8 rounded-lg object-cover border border-slate-700/50" />
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-display font-medium text-white block text-xs truncate leading-none">{user.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{user.email}</span>
                  </div>
                </div>
                <button 
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="mt-3 w-full bg-slate-800 hover:bg-slate-75 hover:bg-red-950 hover:text-red-400 border border-slate-700/30 text-slate-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

    </div>
  );
}
