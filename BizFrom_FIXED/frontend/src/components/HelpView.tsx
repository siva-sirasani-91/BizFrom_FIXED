/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  HelpCircle, 
  Plus, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  MessageSquareCode, 
  ChevronDown, 
  LifeBuoy
} from "lucide-react";
import { SupportTicket, SupportFAQ } from "../types";

export default function HelpView() {
  const isTelugu = typeof window !== "undefined" && window.localStorage.getItem("app_lang") === "te";

  // FAQs Static library - specific to BizForm customization and settings
  const faqs: SupportFAQ[] = [
    {
      id: "faq_1",
      question: isTelugu 
        ? "ఫారమ్ నిర్మాణాలను సవరించడం వల్ల నా మునుపటి కస్టమర్ రికార్డులు తొలగించబడతాయా?"
        : "Will editing form structures delete my historical customer records?",
      answer: isTelugu
        ? "లేదు, బిజ్‌ఫారమ్‌లో బలమైన డేటాబేస్ స్కీమా వేరుచేసే నియమాలు ఉన్నాయి. మీ అనుకూల ఫారమ్‌లలో ఫీల్డ్ నిర్వచనాలను మార్చడం, పేరు మార్చడం లేదా తొలగించడం వల్ల నా మునుపటి కస్టమర్ రికార్డులు ఎప్పటికీ తొలగించబడవు. అవి సక్రియ నిల్వలో సురక్షితంగా సేవ్ చేయబడతాయి."
        : "No, BizForm has strong database schema separation rules. Changing, renaming, or deleting field definitions on your custom forms will NEVER delete previous dynamic customer rows. They persist safely in active storage.",
      category: isTelugu ? "డేటాబేస్ సమగ్రత" : "Database Integrity"
    },
    {
      id: "faq_2",
      question: isTelugu
        ? "డ్రాప్‌డౌన్ మెనులను అనుకూలీకరించదగిన ఎంపికలతో ఎలా కాన్ఫిగర్ చేయాలి?"
        : "How do I configure dropdown menus with customizable select options?",
      answer: isTelugu
        ? "ఫారమ్ బిల్డర్‌లో, 'సెలెక్ట్ డ్రాప్‌డౌన్' ఇన్‌పుట్ రకాన్ని ఎంచుకోండి. ఒక డైనమిక్ ఎంపికల టెక్స్ట్ బాక్స్ కనిపిస్తుంది. మీ ఎంపికల విలువలను కామాలతో వేరు చేసి రాయండి (ఉదా: గులాబీ, బోన్సాయ్, మట్టి). డ్రాప్‌డౌన్ స్వయంచాలకంగా ప్రదర్శించబడుతుంది."
        : "In the Form Builder, choose the 'Select Dropdown' input type. A dynamic options text box will appear. Enter your selections values as comma-separated labels (e.g., Rose, Bonsai, soil). The dropdown will render automatically.",
      category: isTelugu ? "ఫారమ్ బిల్డర్" : "Form Builder"
    },
    {
      id: "faq_3",
      question: isTelugu
        ? "ఆఫ్‌లైన్ నగదు లావాదేవీలు మరియు ఆన్‌లైన్ గేట్‌వేలను ఎలా ధృవీకరించాలి?"
        : "How can I verify offline Cash transactions versus credit card Gateways?",
      answer: isTelugu
        ? "చెక్అవుట్ చేస్తున్నప్పుడు, 'ఆన్‌లైన్ గేట్‌వే' లేదా 'నగదు' ఎంపికను ఎంచుకోండి. మీరు ఆన్‌లైన్ ఎంచుకుంటే, లావాదేవీ ఐడిని నమోదు చేయండి. చార్ట్‌లు స్వయంచాలకంగా వీటిని నివేదికలలో గీసి చూపుతాయి."
        : "When checking out, toggle the clearance method 'Online Gateway' or 'Cash'. If you select Online, enter the transaction ID. Recharts automatically graphs these in reports, sorting your digital-to-cash ratios.",
      category: isTelugu ? "చెల్లింపులు" : "Payments"
    },
    {
      id: "faq_4",
      question: isTelugu
        ? "ఆర్కైవ్ చేయబడిన నర్సరీ నిర్మాణాలు పూర్తిగా తొలగించబడతాయా?"
        : "Are archived nursery structures permanently deleted?",
      answer: isTelugu
        ? "లేదు! భారతీయ వ్యాపార ప్రమాణాల ప్రకారం, మీరు ప్రొఫైల్‌లను శాశ్వతంగా తొలగించలేరు. మీరు వాటిని ప్రస్తుత ఫారమ్‌ల నుండి దాచడానికి ఆర్కైవ్ చేయవచ్చు మరియు ఎప్పుడైనా పునరుద్ధరించవచ్చు."
        : "No! BizForm aligns with Indian merchant standard rules. You can never permanently wipe active business profiles through normal dashboard panels. You can archive them to hide them from current forms, and restore them anytime.",
      category: isTelugu ? "స్టోర్లు" : "Stores"
    }
  ];

  // Active expanded FAQ index
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>("faq_1");

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitError, setSubmitError] = useState("");

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tickets");
      if (res.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const data = res.ok ? await res.json() : null;
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Support failed to retrieve dynamic tickets list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setSubmitError("Please fill out both the ticket subject and description.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitMsg("");

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to catalog support ticket.");
      }

      setSubmitMsg("Ticket raised! Our engineering team will review details shortly.");
      setSubject("");
      setDescription("");
      await fetchTickets();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      <div className="pb-4 border-b border-slate-100 space-y-1 text-left">
        <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight font-sans">
          {isTelugu ? "కార్పొరేట్ సహాయ కేంద్రం" : "Corporate Helpdesk"}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {isTelugu 
            ? "డైనమిక్ డేటా పారామితులపై తక్షణ పరిష్కారాలను కనుగొనండి లేదా డేటాబేస్ నిపుణులతో కనెక్ట్ కావడానికి సాంకేతిక టికెట్ దాఖలు చేయండి."
            : "Find instant resolutions on dynamic data parameters, or file a technical ticket to connect with database experts."}
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Interative FAQ Accordion */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-left space-y-6">
          <h2 className="font-display font-semibold text-sm text-slate-950 pb-3 border-b border-slate-100 flex items-center gap-1.5">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            <span>{isTelugu ? "తరచుగా అడిగే ప్రశ్నలు (FAQs)" : "Frequently Asked Questions"}</span>
          </h2>

          <div className="space-y-3">
            {faqs.map((faq) => {
              const isExpanded = expandedFAQ === faq.id;
              return (
                <div 
                  key={faq.id} 
                  className="border border-slate-200 rounded-xl overflow-hidden transition-all bg-slate-50/15"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFAQ(isExpanded ? null : faq.id)}
                    className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-slate-850 hover:bg-slate-50 transition-colors leading-relaxed cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase tracking-widest">{faq.category}</span>
                      <span className="block mt-0.5">{faq.question}</span>
                    </div>
                    <ChevronDown className={`w-4.5 h-4.5 text-slate-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-1 bg-white border-t border-slate-100 text-xs text-slate-600 leading-relaxed animate-fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Raise dynamic support ticket form & Live history log */}
        <div className="lg:col-span-5 space-y-6 text-left">
          
          {/* Ticket raising form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <h2 className="font-display font-semibold text-sm text-slate-950 flex items-center gap-1.5 leading-none">
              <LifeBuoy className="w-4.5 h-4.5 text-indigo-505 text-indigo-600" />
              <span>{isTelugu ? "మద్దతు టికెట్ సృష్టించండి (Raise Ticket)" : "Raise Support Ticket"}</span>
            </h2>

            {submitMsg && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-700 text-xs font-semibold animate-bounce">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{submitMsg}</span>
              </div>
            )}

            {submitError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-150 rounded-lg text-red-700 text-xs font-semibold animate-bounce">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleRaiseTicket} className="space-y-4">
              <div className="space-y-1.5 flex flex-col items-start">
                <label className="text-xs font-semibold text-slate-500">Problem Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Dropdown options not saving"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 font-medium focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-505"
                />
              </div>

              <div className="space-y-1.5 flex flex-col items-start">
                <label className="text-xs font-semibold text-slate-500">Explain the bug in detail</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain steps to reproduce..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white text-xs text-slate-800 rounded-lg h-22 resize-none focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Dispatch Tech Ticket</span>
              </button>
            </form>
          </div>

          {/* Raised Support Ticket histories status log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-display font-semibold text-slate-900 text-xs">Raised Tickets History</h3>
            
            {loading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" strokeWidth={2.5} />
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No active desk tickets raised under this user profile.</p>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {tickets.map((t) => (
                  <div key={t.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start justify-between gap-4 text-left">
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-900 block leading-tight">{t.subject}</span>
                      <span className="text-[10px] text-slate-400 font-mono block uppercase">ID: {t.id} | {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>

                    <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                      t.status === "Open" 
                        ? "bg-indigo-50 text-indigo-600" 
                        : t.status === "In Progress"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
