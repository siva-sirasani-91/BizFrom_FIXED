/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { 
  Building2, 
  Users2, 
  Coins, 
  Layers, 
  Plus, 
  ArrowRight, 
  Clock, 
  Search, 
  TrendingUp, 
  BookmarkCheck,
  Zap,
  CreditCard
} from "lucide-react";
import { UserProfile, CustomerRecord, Business } from "../types";

export function getRecordAmount(cust: any): number {
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

interface DashboardViewProps {
  user: UserProfile;
  onNavigate: (tab: string) => void;
  setSelectedBizForForm?: (bizId: string) => void; // helper to skip directly to other screens
}

export default function DashboardView({ user, onNavigate, setSelectedBizForForm }: DashboardViewProps) {
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    totalCustomers: 0,
    totalCollection: 0,
    cashCollection: 0,
    onlineCollection: 0
  });

  const [recentCustomers, setRecentCustomers] = useState<CustomerRecord[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch report aggregates
      const repRes = await fetch("/api/reports/overall");
      if (repRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const repData = repRes.ok ? await repRes.json() : {};

      // Fetch customer records
      const custRes = await fetch("/api/customers");
      if (custRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const custDataRaw = custRes.ok ? await custRes.json() : null;
      const custData = Array.isArray(custDataRaw) ? custDataRaw.filter((c: any) => !c.deletedAt) : [];

      // Fetch businesses
      const bRes = await fetch(`/api/businesses?userId=${user.id}`);
      if (bRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const bDataRaw = bRes.ok ? await bRes.json() : null;
      const bData = Array.isArray(bDataRaw) ? bDataRaw : [];

      setStats({
        totalBusinesses: bData.length,
        activeBusinesses: bData.filter((b: any) => b.status === "active").length,
        totalCustomers: custData.length,
        totalCollection: repData.totalCollection || 0,
        cashCollection: repData.cashCollection || 0,
        onlineCollection: repData.onlineCollection || 0
      });

      setRecentCustomers(custData.slice(0, 5));
      setBusinesses(bData.slice(0, 3));
    } catch (err) {
      console.error("Dashboard failed to retrieve live server database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user.id]);

  const isTelugu = typeof window !== "undefined" && window.localStorage.getItem("app_lang") === "te";

  const i18n = {
    greeting: isTelugu ? `హలో, ${user.name}!` : `Howdy, ${user.name}!`,
    subGreeting: isTelugu 
      ? "ఇక్కడ మీ నర్సరీ మరియు రిటైల్ ఖాతాల యొక్క ఏకీకృత డైరెక్టరీ సారాంశం ఉంది." 
      : "Here's a unified directory summary of your nursery and retail accounts.",
    activeState: isTelugu ? "రియల్ టైమ్ యాక్టివ్ స్టేట్" : "Real-time Active State",
    loading: isTelugu ? "వ్యాపార వివరాలను లోడ్ చేస్తోంది..." : "Loading business details...",
    totalBusinesses: isTelugu ? "మొత్తం వ్యాపారాలు" : "Total Businesses",
    activeStores: isTelugu ? "యాక్టివ్ స్టోర్లు" : "Active Stores",
    customerRecords: isTelugu ? "కస్టమర్ రికార్డులు" : "Customer Records",
    dynamicDataset: isTelugu ? "డైనమిక్ డేటాసెట్ ఇన్‌పుట్‌లు నమోదు చేయబడ్డాయి" : "Dynamic dataset inputs logged",
    totalCollection: isTelugu ? "మొత్తం సేకరణ" : "Total Collection",
    avgOrder: isTelugu ? "సగటు ఆర్డర్" : "Average order",
    paymentMix: isTelugu ? "చెల్లింపు విధానం" : "Payment Mix",
    cash: isTelugu ? "నగదు" : "Cash",
    online: isTelugu ? "ఆన్‌లైన్" : "Online",
    rapidActions: isTelugu ? "త్వరిత చర్యల ప్యానెల్" : "Rapid Actions Panel",
    quickShortcuts: isTelugu ? "త్వరిత షార్ట్‌కట్‌లు" : "Quick Shortcuts",
    shortcutsDesc: isTelugu 
      ? "యాక్టివ్ టెంప్లేట్‌ల లోపల కార్యకలాపాలను తక్షణమే అమలు చేయండి" 
      : "Instantly execute operations inside active templates",
    bizSetup: isTelugu ? "వ్యాపార సెటప్" : "Business Setup",
    createStore: isTelugu ? "స్టోర్ సృష్టించండి →" : "Create Store →",
    regClient: isTelugu ? "కస్టమర్‌ను నమోదు చేయండి" : "Register Dynamic Client",
    fillForm: isTelugu ? "ఫారమ్ నింపండి →" : "Fill Out Form →",
    fieldSchema: isTelugu ? "ఫీల్డ్ స్కీమా" : "Field Schema",
    cfgBuilders: isTelugu ? "బిల్డర్‌లను కాన్ఫిగర్ చేయండి →" : "Configure Builders →",
    dataExports: isTelugu ? "డేటా ఎగుమతులు" : "Data Exports",
    pdfReports: isTelugu ? "PDF మరియు ఎక్సెల్ నివేదికలు →" : "PDF & Excel Reports →",
    recentRegs: isTelugu ? "ఇటీవలి కస్టమర్ రిజిస్ట్రేషన్లు" : "Recent Customer Registrations",
    realtimeSub: isTelugu ? "మీ యాక్టివ్ స్టోర్లలో రియల్ టైమ్ డైనమిక్ సమర్పణలు." : "Real-time dynamic submissions across your active stores.",
    viewAll: isTelugu ? "అన్నీ చూడండి" : "View All",
    noCust: isTelugu ? "యాక్టివ్ డేటాబేస్ నుండి కస్టమర్ రికార్డులు లభించలేదు." : "No customer records returned from active database files.",
    purchased: isTelugu ? "కొనుగోలు చేసినవి" : "Purchased",
    aadhaarStores: isTelugu ? "ఆధార్ స్టోర్స్ కాన్ఫిగరేషన్" : "Aadhaar Stores Configuration",
    verifyCorp: isTelugu ? "మీ రిజిస్టర్డ్ కార్పొరేట్ కాన్గ్రిలేషన్‌లను క్రింద ధృవీకరించండి." : "Verify your registered corporate configurations below.",
    configure: isTelugu ? "కాన్ఫిగర్ చేయండి" : "Configure",
    noBiz: isTelugu ? "ఈ ప్రొఫైల్ క్రింద యాక్టివ్ వ్యాపారాలు నమోదు చేయబడలేదు." : "No active businesses registered under this profile.",
    stableStorage: isTelugu ? "స్థిరమైన నిల్వ కనెక్షన్" : "Stable Storage Connection"
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* Top Banner Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight">
            {i18n.greeting}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {i18n.subGreeting}
          </p>
        </div>
        
        {/* Dynamic UTC indicator */}
        <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200/50 px-3.5 py-1.5 rounded-xl font-mono text-[10px] text-slate-600 font-semibold uppercase tracking-wider self-start md:self-auto">
          <Clock className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
          <span>{i18n.activeState}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">{i18n.loading}</span>
        </div>
      ) : (
        <>
          {/* Main counts widgets */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Businesses metric */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">{i18n.totalBusinesses}</span>
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="block text-2xl font-display font-semibold text-slate-900">{stats.totalBusinesses}</span>
                <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                  {i18n.activeStores}: <strong className="text-emerald-600">{stats.activeBusinesses}</strong>
                </span>
              </div>
            </div>

            {/* Customers metric */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">{i18n.customerRecords}</span>
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Users2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="block text-2xl font-display font-semibold text-slate-900">{stats.totalCustomers}</span>
                <span className="text-[10px] font-semibold text-slate-400 block mt-1">{i18n.dynamicDataset}</span>
              </div>
            </div>

            {/* Total collections */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">{i18n.totalCollection}</span>
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="block text-2xl font-display font-semibold text-slate-900">₹{stats.totalCollection.toLocaleString("en-IN")}</span>
                <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                  {i18n.avgOrder}: <strong className="text-slate-600">₹{(stats.totalCustomers > 0 ? Math.round(stats.totalCollection / stats.totalCustomers) : 0).toLocaleString("en-IN")}</strong>
                </span>
              </div>
            </div>

            {/* Online vs Cash */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">{i18n.paymentMix}</span>
                <div className="w-10 h-10 bg-purple-50 border border-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <span>{i18n.cash}:</span> 
                  <strong className="text-slate-950 font-mono text-xs">₹{stats.cashCollection.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>{i18n.online}:</span> 
                  <strong className="text-indigo-600 font-mono text-xs">₹{stats.onlineCollection.toLocaleString("en-IN")}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions row */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-2xl p-6 shadow-md text-white text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-1 text-xs text-indigo-400 font-mono tracking-wider font-bold uppercase">
                  <Zap className="w-4.5 h-4.5 fill-indigo-400 animate-bounce" /> {i18n.rapidActions}
                </div>
                <h3 className="font-display font-semibold text-sm text-white">{i18n.quickShortcuts}</h3>
                <p className="text-slate-400 text-xs">{i18n.shortcutsDesc}</p>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 lg:max-w-4xl text-left">
                <button 
                  onClick={() => onNavigate("business")}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 p-3.5 rounded-xl text-left transition-colors cursor-pointer"
                >
                  <span className="block text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wide">{i18n.bizSetup}</span>
                  <span className="font-display font-medium text-xs text-white block mt-1">{i18n.createStore}</span>
                </button>

                <button 
                  onClick={() => onNavigate("customers")}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 p-3.5 rounded-xl text-left transition-colors cursor-pointer"
                >
                  <span className="block text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wide">{i18n.regClient}</span>
                  <span className="font-display font-medium text-xs text-white block mt-1">{i18n.fillForm}</span>
                </button>

                <button 
                  onClick={() => onNavigate("business")}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 p-3.5 rounded-xl text-left transition-colors cursor-pointer"
                >
                  <span className="block text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wide">{i18n.fieldSchema}</span>
                  <span className="font-display font-medium text-xs text-white block mt-1">{i18n.cfgBuilders}</span>
                </button>

                <button 
                  onClick={() => onNavigate("reports")}
                  className="bg-indigo-600 hover:bg-indigo-700 p-3.5 rounded-xl text-left transition-all cursor-pointer shadow-sm shadow-indigo-600/15"
                >
                  <span className="block text-[11px] font-mono text-indigo-200 font-bold uppercase tracking-wide">{i18n.dataExports}</span>
                  <span className="font-display font-medium text-xs text-white block mt-1">{i18n.pdfReports}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 text-left">
            
            {/* Recent Customers list (Left column) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <h3 className="font-display font-medium text-slate-900 text-sm">{i18n.recentRegs}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{i18n.realtimeSub}</p>
                  </div>
                  <button 
                    onClick={() => onNavigate("records")}
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer animate-pulse-subtle"
                  >
                    {i18n.viewAll} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {recentCustomers.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-medium space-y-2">
                      <BookmarkCheck className="w-10 h-10 text-slate-300 mx-auto" />
                      <span>{i18n.noCust}</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {recentCustomers.map((cust) => {
                        const name = cust.data.customerName || cust.data.customerNameUpper || cust.data.customer_name || cust.data.name || "Unnamed Customer";
                        const paymentVal = getRecordAmount(cust);
                        return (
                          <div key={cust.id} className="py-3 flex items-center justify-between text-xs gap-4 first:pt-0 last:pb-0">
                            <div className="space-y-0.5 text-left max-w-[65%]">
                              <span className="font-semibold text-slate-900 block truncate">{name}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(cust.data)
                                  .filter(([key]) => {
                                    const kL = key.toLowerCase();
                                    return !kL.includes("name");
                                  })
                                  .slice(0, 3)
                                  .map(([key, val]) => {
                                    if (val === null || val === undefined || val === "") return null;
                                    let formattedVal = typeof val === "object" ? (Array.isArray(val) ? `${val.length} items` : "Object") : String(val);
                                    if (typeof val === "boolean") {
                                      formattedVal = val ? "Yes" : "No";
                                    }
                                    return (
                                      <span key={key} className="inline-block text-[9px] bg-slate-50 text-slate-500 border border-slate-200 px-1 py-0.5 rounded font-semibold whitespace-nowrap">
                                        <span className="text-slate-400 capitalize mr-1">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                                        {formattedVal}
                                      </span>
                                    );
                                  })}
                              </div>
                            </div>
                            <div className="text-right space-y-0.5 shrink-0">
                              <span className="font-bold text-slate-900 block">₹{paymentVal.toLocaleString("en-IN")}</span>
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                cust.paymentMethod === "Cash" ? "bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-600"
                              }`}>
                                {cust.paymentMethod === "Cash" ? i18n.cash : i18n.online}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Business list statuses (Right column) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <h3 className="font-display font-medium text-slate-900 text-sm">{i18n.aadhaarStores}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{i18n.verifyCorp}</p>
                  </div>
                  <button 
                    onClick={() => onNavigate("business")}
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {i18n.configure} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {businesses.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-medium space-y-2">
                      <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                      <span>{i18n.noBiz}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {businesses.map((biz) => (
                        <div key={biz.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs gap-4 text-left">
                          <div className="space-y-0.5 text-left">
                            <span className="font-semibold text-slate-800 block">{biz.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono block uppercase">ID: {biz.id}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              biz.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            }`}>
                              {biz.status === "active" ? (isTelugu ? "క్రియాశీలం" : "Active") : (isTelugu ? "సంగ్రహించినది" : "Archived")}
                            </span>
                            
                            {/* Short jump trigger */}
                            {setSelectedBizForForm && (
                              <button 
                                onClick={() => {
                                  setSelectedBizForForm(biz.id);
                                  onNavigate("business");
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Edit Form Schema"
                              >
                                <Plus className="w-4.5 h-4.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" /> {i18n.stableStorage}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
