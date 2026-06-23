/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  ShieldAlert, 
  BellRing, 
  FileLock2, 
  Database, 
  Trash2, 
  LogOut, 
  CheckCircle,
  HelpCircle,
  LucideIcon,
  Languages,
  Loader2,
  RefreshCw
} from "lucide-react";
import { UserProfile } from "../types";

const API_BASE_URL = typeof window !== "undefined" && window.location.hostname === "localhost" 
  ? "http://localhost:3000" 
  : "https://bizfrom-fixed.onrender.com";

interface SettingsViewProps {
  user: UserProfile;
  onLogout: () => void;
  language?: "en" | "te";
  onLanguageChange?: (lang: "en" | "te") => void;
}

export default function SettingsView({ user, onLogout, language = "en", onLanguageChange }: SettingsViewProps) {
  const isTelugu = language === "te";

  // Alert toggles
  const [phoneAlerts, setPhoneAlerts] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(false);
  const [doubleOTP, setDoubleOTP] = useState(false);
  const [dailyBackup, setDailyBackup] = useState(true);

  const [notif, setNotif] = useState("");

  // Recycle Bin state
  const [activeSubTab, setActiveSubTab] = useState<"general" | "recycleBin">("general");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<any[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recordToConfirmPermanent, setRecordToConfirmPermanent] = useState<any | null>(null);

  const fetchDeletedRecords = async () => {
    setLoadingDeleted(true);
    try {
      const bRes = await fetch(`${API_BASE_URL}/api/businesses`);
      if (bRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const bDataRaw = bRes.ok ? await bRes.json() : null;
      const bData = Array.isArray(bDataRaw) ? bDataRaw : [];
      setBusinesses(bData);
      const bizIds = bData.map((b: any) => b.id);

      const cRes = await fetch(`${API_BASE_URL}/api/customers`);
      if (cRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const cDataRaw = cRes.ok ? await cRes.json() : null;
      const cData = Array.isArray(cDataRaw) ? cDataRaw : [];

      const deleted = cData.filter((r: any) => r.deletedAt && bizIds.includes(r.businessId));
      setDeletedRecords(deleted);
    } catch (err) {
      console.error("Failed to fetch deleted records:", err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  useEffect(() => {
    fetchDeletedRecords();
  }, []);

  const calculateDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const timeDiff = now.getTime() - deletedDate.getTime();
    const daysElapsed = timeDiff / (1000 * 60 * 60 * 24);
    const daysRemaining = 30 - Math.floor(daysElapsed);
    return Math.max(0, daysRemaining);
  };

  const handleRestoreRecord = async (recordId: string) => {
    setRestoringId(recordId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${recordId}/restore`, {
        method: "POST"
      });
      if (res.ok) {
        setNotif(isTelugu ? "రికార్డ్ విజయవంతంగా పునరుద్ధరించబడింది." : "Record restored back to active records successfully.");
        setTimeout(() => setNotif(""), 4000);
        await fetchDeletedRecords();
      } else {
        alert(isTelugu ? "పునరుద్ధరణ విఫలమైంది." : "Failed to restore record.");
      }
    } catch (err) {
      console.error("Failed to restore customer record:", err);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeletePermanently = async (recordId: string) => {
    setDeletingId(recordId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${recordId}?permanent=true`, {
        method: "DELETE"
      });
      if (res.ok) {
        setNotif(isTelugu ? "రికార్డ్ శాశ్వతంగా తొలగించబడింది." : "Record database entry permanently deleted.");
        setTimeout(() => setNotif(""), 4000);
        await fetchDeletedRecords();
      } else {
        alert(isTelugu ? "శాశ్వత తొలగింపు విఫలమైంది." : "Failed to permanently delete record.");
      }
    } catch (err) {
      console.error("Failed to delete permanently:", err);
    } finally {
      setDeletingId(null);
      setRecordToConfirmPermanent(null);
    }
  };

  const handleToggleOption = (label: string, callback: React.Dispatch<React.SetStateAction<boolean>>, currentVal: boolean) => {
    callback(!currentVal);
    const updatedStatus = !currentVal ? 
      (isTelugu ? "ప్రారంభించబడింది" : "ENABLED") : 
      (isTelugu ? "నిలిపివేయబడింది" : "DISABLED");
    setNotif(isTelugu 
      ? `సెట్టింగ్ నవీకరించబడింది: "${label}" ${updatedStatus} చేయబడింది.`
      : `Setting updated: "${label}" toggled to ${updatedStatus}.`
    );
    setTimeout(() => setNotif(""), 2500);
  };

  const i18n = {
    title: isTelugu ? "వ్యవస్థ సెట్టింగులు" : "SaaS System Settings",
    desc: isTelugu 
      ? "డేటాబేస్ బ్యాకప్ షెడ్యూల్‌లు, ఎస్ఎమ్ఎస్ నోటిఫికేషన్ రిజిస్ట్రీలు, రెండు అంచెల OTP భద్రత మరియు క్రియాశీల ఆధారాలను నిర్వహించండి."
      : "Manage database backup schedules, SMS notification registries, double OTP security, and terminate active credentials.",
    securityHeader: isTelugu ? "భద్రతా ప్యానెల్ సెట్టింగులు" : "Security Panel Setting",
    twoFactorTitle: isTelugu ? "రెండు అంచెల ధృవీకరణ" : "Double-Factor Authentication Override",
    twoFactorDesc: isTelugu 
      ? "కొత్త వ్యాపార ప్రొఫైల్ సృష్టి కోసం తప్పనిసరిగా ధృవీకరించబడిన 6-అంకెల OTP కోడ్‌లు ఉండాలి."
      : "Require verified 6-digit OTP codes for new business profile creation.",
    backupTitle: isTelugu ? "ఆటోమేటిక్ రోజువారీ బ్యాకప్‌లు" : "Automatic Schema Daily Backups",
    backupDesc: isTelugu
      ? "స్కీమా నిర్మాణం నష్టపోకుండా ఉండేందుకు బ్యాక్‌గ్రౌండ్ JSON ఆడిట్‌లను ఏర్పాటు చేయండి."
      : "Establish background JSON audits to prevent schema structure loss.",
    alertsHeader: isTelugu ? "రియల్ టైమ్ హెచ్చరికల పోర్టల్" : "Real-time Alerts Portal",
    smsTitle: isTelugu ? "కస్టమర్ ఎస్ఎమ్ఎస్ అలర్ట్‌లు" : "Client SMS Checkout alerts",
    smsDesc: isTelugu 
      ? "కస్టమర్‌లు చెక్ అవుట్ చేసినప్పుడు ఆటోమేటిక్‌గా టెలిఫోన్ లాగ్‌లను పంపండి."
      : "Dispatch telephone logs automatically when checking out customers.",
    emailTitle: isTelugu ? "యజమాని ఈమెయిల్ రసీదుల ఫార్వార్డింగ్" : "Owner Email Receipts forwarding",
    emailDesc: isTelugu
      ? "సేకరణ వివరాలను ప్రతిరోజూ కార్పొరేట్ ఈమెయిల్ ప్రొఫైల్‌కు ఫార్వార్డ్ చేయండి."
      : "Forward collection ledgers to corporate email lists daily.",
    activeStatus: isTelugu ? "క్రియాశీల స్థితి" : "Active Status",
    enterpriseTitle: isTelugu ? "ఎంటర్‌ప్రైజ్ ప్రో యాక్సెస్" : "Enterprise Pro Access",
    registeredProfile: isTelugu ? "నమోదిత ప్రొఫైల్:" : "Registered profile:",
    dbDict: isTelugu ? "డేటాబేస్ డిక్షనరీ:" : "DATABASE DICTIONARY:",
    persistenceStr: isTelugu ? "నిల్వ స్థితి:" : "PERSISTENCE:",
    statusActive: isTelugu ? "సక్రియం" : "Active",
    statusConnected: isTelugu ? "కనెక్ట్ చేయబడింది" : "Connected",
    authTerminals: isTelugu ? "టెర్మినల్స్ సెషన్స్" : "Authorize Terminals",
    logoutBtn: isTelugu ? "సెషన్ నుండి లాగ్ అవుట్ అవ్వండి" : "Log Out of Session"
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 text-left">
      
      <div className="pb-4 border-b border-slate-100 space-y-1">
        <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight font-sans">{i18n.title}</h1>
        <p className="text-xs text-slate-500 font-medium font-sans">{i18n.desc}</p>
      </div>

      {notif && (
        <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-150 rounded-lg text-indigo-700 text-xs font-semibold animate-bounce">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab("general")}
          className={`px-4 py-2.5 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer ${
            activeSubTab === "general"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          {isTelugu ? "సాధారణ సెట్టింగులు" : "General Settings"}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab("recycleBin");
            fetchDeletedRecords();
          }}
          className={`px-4 py-2.5 font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === "recycleBin"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isTelugu ? "రీసైకిల్ బిన్" : "Recycle Bin"}</span>
          {deletedRecords.length > 0 && (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {deletedRecords.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === "general" ? (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left main config deck */}
          <div className="lg:col-span-8 space-y-6">

            {/* Language Preference Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="font-display font-semibold text-sm text-slate-950 flex items-center gap-1.5 leading-none">
                <Languages className="w-4.5 h-4.5 text-indigo-600" />
                <span>{isTelugu ? "భాషా ప్రాధాన్యత (Language Preference)" : "Language Preference"}</span>
              </h2>

              <div className="text-xs text-slate-605 text-slate-600 space-y-3">
                <p className="font-medium text-slate-500">
                  {isTelugu 
                    ? "అప్లికేషన్ యొక్క ప్రధాన ఇంటర్‌ఫేస్ మరియు నివేదికల కోసం ఒక ప్రాధాన్య భాషను ఎంచుకోండి."
                    : "Choose a preferred language for the application's visual interface and report headers."}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onLanguageChange && onLanguageChange("en")}
                    className={`px-4 py-3 border rounded-xl font-bold flex flex-col items-start gap-1 transition-all cursor-pointer ${
                      !isTelugu 
                        ? "border-indigo-600 bg-indigo-50/45 text-slate-900 shadow-xs scale-[1.01]" 
                        : "border-slate-200 hover:bg-slate-50 text-slate-505 text-slate-500"
                    }`}
                  >
                    <span className="text-xs">English</span>
                    <span className="text-[10px] text-slate-450 font-normal">SaaS Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLanguageChange && onLanguageChange("te")}
                    className={`px-4 py-3 border rounded-xl font-bold flex flex-col items-start gap-1 transition-all cursor-pointer ${
                      isTelugu 
                        ? "border-indigo-600 bg-indigo-50/45 text-slate-900 shadow-xs scale-[1.01]" 
                        : "border-slate-200 hover:bg-slate-50 text-slate-505 text-slate-500"
                    }`}
                  >
                    <span className="text-xs">తెలుగు (Telugu)</span>
                    <span className="text-[10px] text-slate-450 font-normal">ప్రధాన ప్రాధాన్యత</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Security Panel */}
            <div className="bg-white border border-slate-195 border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="font-display font-semibold text-sm text-slate-950 flex items-center gap-1.5 leading-none">
                <ShieldAlert className="w-4.5 h-4.5 text-indigo-600" />
                <span>{i18n.securityHeader}</span>
              </h2>

              <div className="divide-y divide-slate-100 text-xs text-slate-600">
                {/* Double OTP verification safety switch */}
                <div className="py-4 flex items-center justify-between first:pt-0 gap-4">
                  <div className="space-y-0.5 text-left">
                    <span className="font-semibold text-slate-900 block">{i18n.twoFactorTitle}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">{i18n.twoFactorDesc}</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleToggleOption(i18n.twoFactorTitle, setDoubleOTP, doubleOTP)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      doubleOTP ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                      doubleOTP ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* Automatic secure database backup switch */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 text-left">
                    <span className="font-semibold text-slate-900 block">{i18n.backupTitle}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">{i18n.backupDesc}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleOption(i18n.backupTitle, setDailyBackup, dailyBackup)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      dailyBackup ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                      dailyBackup ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* SMS / Notifications alert registry */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="font-display font-semibold text-sm text-slate-950 flex items-center gap-1.5 leading-none">
                <BellRing className="w-4.5 h-4.5 text-indigo-600" />
                <span>{i18n.alertsHeader}</span>
              </h2>

              <div className="divide-y divide-slate-100 text-xs text-slate-600">
                {/* Phone alerts checkbox */}
                <div className="py-4 flex items-center justify-between first:pt-0 gap-4">
                  <div className="space-y-0.5 text-left">
                    <span className="font-semibold text-slate-900 block">{i18n.smsTitle}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">{i18n.smsDesc}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleOption(i18n.smsTitle, setPhoneAlerts, phoneAlerts)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      phoneAlerts ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                      phoneAlerts ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* Email checkout alert switches */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 text-left">
                    <span className="font-semibold text-slate-900 block">{i18n.emailTitle}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">{i18n.emailDesc}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleOption(i18n.emailTitle, setEmailReceipts, emailReceipts)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      emailReceipts ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                      emailReceipts ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right side subscriptions overview panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Subscription plan card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-slate-300 space-y-4">
              <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-indigo-400 block">{i18n.activeStatus}</span>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-white text-md">{i18n.enterpriseTitle}</h3>
                <p className="text-[11px] text-slate-400 font-semibold leading-tight">{i18n.registeredProfile} <strong className="text-white font-medium">{user.email}</strong></p>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[10px] font-semibold text-slate-400 space-y-1.5 font-mono">
                <div className="flex items-center justify-between">
                  <span>{i18n.dbDict}</span>
                  <span className="text-white">{i18n.statusActive}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{i18n.persistenceStr}</span>
                  <span className="text-emerald-505 text-emerald-500 font-extrabold uppercase animate-pulse">{i18n.statusConnected}</span>
                </div>
              </div>
            </div>

            {/* Session termination button deck */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-display font-semibold text-slate-900 text-xs">{i18n.authTerminals}</h3>
              
              <div className="space-y-2">
                {/* Real clear-state log-out safety control */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100/60 text-red-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-150"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{i18n.logoutBtn}</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* Recycle Bin Panel Layout */
        <div className="space-y-6 animate-fade-in">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {isTelugu ? "రీసైకిల్ బిన్" : "Deleted Records Database"}
              </h2>
              <p className="text-xs text-slate-500">
                {isTelugu 
                  ? "తొలగించిన 30 రోజుల వరకు ఈ రికార్డులు ఉంచబడతాయి, ఆపై స్వయంచాలకంగా శాశ్వతంగా తొలగించబడతాయి." 
                  : "We keep deleted records for exactly 30 days. After 30 days, they are automatically permanently cleared."}
              </p>
            </div>
            <button
              type="button"
              disabled={loadingDeleted}
              onClick={fetchDeletedRecords}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDeleted ? "animate-spin" : ""}`} />
              <span>{isTelugu ? "తాజా చేయి" : "Refresh"}</span>
            </button>
          </div>

          {/* Last 5 days before deletion alarm banners */}
          {(() => {
            const criticalRecords = deletedRecords.filter((r) => {
              const days = calculateDaysRemaining(r.deletedAt);
              return days > 0 && days <= 5;
            });

            if (criticalRecords.length === 0) return null;

            return (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-2 animate-pulse">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{isTelugu ? "డేటా శాశ్వత తొలగింపు హెచ్చరిక" : "PERMANENT DELETION WARNING"}</span>
                </div>
                <div className="font-semibold text-[11px]">
                  {isTelugu 
                    ? "కింది రికార్డులు ఐదు రోజులలోపు స్వయంచాలక శాశ్వత తొలగింపుకు సిద్ధంగా ఉన్నాయి:" 
                    : "The following records are in their final 5 days of custody and will be permanently pruned soon. Please restore any required records immediately:"}
                </div>
                <ul className="list-disc list-inside space-y-1 ml-1 text-[11.5px]">
                  {criticalRecords.map((r) => {
                    const name = r.data.customerName || r.data.customerNameUpper || r.data.customer_name || r.data.name || "Unknown Customer";
                    const pDays = calculateDaysRemaining(r.deletedAt);
                    return (
                      <li key={r.id}>
                        <span className="font-bold">{name}</span>: {isTelugu ? `${pDays} రోజులు మాత్రమే మిగిలి ఉన్నాయి` : `${pDays} day${pDays > 1 ? "s" : ""} remaining`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

          {/* Records Table and Lists */}
          {loadingDeleted && deletedRecords.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold">{isTelugu ? "తొలగించబడిన రికార్డులను లోడ్ చేస్తోంది..." : "Retrieving deleted records cache..."}</span>
            </div>
          ) : deletedRecords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl py-16 px-6 text-center shadow-xs">
              <div className="mx-auto w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                <Trash2 className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                {isTelugu ? "రీసైకిల్ బిన్ ఖాళీగా ఉంది" : "Recycle Bin is Empty"}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {isTelugu 
                  ? "ప్రస్తుతం రీసైకిల్ బిన్ లో ఎటువంటి తొలగించబడిన రికార్డులు లేవు." 
                  : "No client logs have been soft-deleted recently. Your active databases are fully intact."}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="px-6 py-4 font-bold">{isTelugu ? "కస్టమర్ పేరు" : "Customer Name"}</th>
                      <th className="px-6 py-4 font-bold">{isTelugu ? "వ్యాపారం" : "Business Registry"}</th>
                      <th className="px-6 py-4 font-bold">{isTelugu ? "ఫోన్ నెంబర్" : "Phone Number"}</th>
                      <th className="px-6 py-4 font-bold">{isTelugu ? "తొలగించిన తేదీ" : "Deleted Date"}</th>
                      <th className="px-6 py-4 font-bold">{isTelugu ? "మిగిలి ఉన్న రోజులు" : "Days Remaining"}</th>
                      <th className="px-6 py-4 font-bold text-right">{isTelugu ? "చర్యలు" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {deletedRecords.map((record) => {
                      const customerName = record.data.customerName || record.data.customerNameUpper || record.data.customer_name || record.data.name || "Unknown Customer";
                      const phone = record.data.phone || record.data.phone_number || record.data.customerPhone || record.data.mobile || record.data.contact || "—";
                      const recordBiz = businesses.find((b) => b.id === record.businessId);
                      const nurseryName = recordBiz?.name || "Unknown Registry";
                      const deletedDateStr = new Date(record.deletedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      });
                      const daysRemaining = calculateDaysRemaining(record.deletedAt);
                      const isCritical = daysRemaining <= 5;

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{customerName}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg font-medium text-[10px]">
                              {nurseryName}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-medium">{phone}</td>
                          <td className="px-6 py-4 text-slate-500 font-medium">{deletedDateStr}</td>
                          <td className="px-6 py-4">
                            {isCritical ? (
                              <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-md animate-pulse">
                                <span>{isTelugu ? `${daysRemaining} రోజులు` : `${daysRemaining} days remaining`}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                                <span>{isTelugu ? `${daysRemaining} రోజులు` : `${daysRemaining} days remaining`}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                disabled={restoringId === record.id}
                                onClick={() => handleRestoreRecord(record.id)}
                                className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-150/60 disabled:opacity-50 text-indigo-700 font-bold text-[11px] rounded-xl cursor-pointer transition-colors"
                              >
                                {restoringId === record.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                                ) : null}
                                {isTelugu ? "పునరుద్ధరించు" : "Restore"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRecordToConfirmPermanent(record)}
                                className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-[11px] rounded-xl cursor-pointer transition-colors"
                              >
                                {isTelugu ? "శాశ్వతంగా తొలగించు" : "Delete Permanently"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Permanent Deletion Confirmation Modal */}
      {recordToConfirmPermanent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in text-left">
          <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6 animate-pulse" aria-hidden="true" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-semibold leading-6 text-slate-950">
                {isTelugu ? "శాశ్వతంగా తొలగించండి" : "Delete Record Permanently?"}
              </h3>
              <p className="text-xs text-slate-500">
                {isTelugu 
                  ? "ఈ చర్యను రద్దు చేయలేము. ఈ కస్టమర్ రికార్డ్ డేటాబేస్ నుండి శాశ్వతంగా అదృశ్యమౌతుంది." 
                  : "Are you sure you want to permanently delete this customer record from the databases? This action is absolute and cannot be undone."}
              </p>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-500 font-medium">
                {isTelugu ? "కస్టమర్ పేరు: " : "Customer Name: "}
                <strong>
                  {recordToConfirmPermanent.data.customerName || recordToConfirmPermanent.data.customerNameUpper || recordToConfirmPermanent.data.customer_name || recordToConfirmPermanent.data.name || "Unknown Customer"}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordToConfirmPermanent(null)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                {isTelugu ? "రద్దు చేయి" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={deletingId === recordToConfirmPermanent.id}
                onClick={() => handleDeletePermanently(recordToConfirmPermanent.id)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                {deletingId === recordToConfirmPermanent.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isTelugu ? "శాశ్వతంగా తొలగించు" : "Delete Forever"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
