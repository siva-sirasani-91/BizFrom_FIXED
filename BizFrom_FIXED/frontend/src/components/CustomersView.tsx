/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Building2, 
  UserSquare, 
  Loader2, 
  CheckCircle, 
  Coins, 
  CreditCard, 
  PlusCircle, 
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { Business, FormField } from "../types";

const API_BASE_URL = typeof window !== "undefined" && window.location.hostname === "localhost" 
  ? "http://localhost:3000" 
  : "https://bizfrom-fixed.onrender.com";

interface CustomersViewProps {
  userId: string;
  onRecordAdded?: () => void;
}

export default function CustomersView({ userId, onRecordAdded }: CustomersViewProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  
  // Loading & confirmation states
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Answers dataset state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  // Payments dataset state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Online">("Cash");
  const [transactionId, setTransactionId] = useState("");

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/businesses`);
      if (res.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const data = res.ok ? await res.json() : null;
      const activeOnes = Array.isArray(data) ? data.filter((b: any) => b.status === "active") : [];
      setBusinesses(activeOnes);

      if (activeOnes.length > 0) {
        setSelectedBiz(activeOnes[0]);
        loadBusinessForm(activeOnes[0].id);
      }
    } catch (err) {
      console.error("Customers page failed to download stores:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessForm = async (bizId: string) => {
    try {
      setFormLoading(true);
      setSubmitMsg("");
      setSubmitError("");
      
      const res = await fetch(`${API_BASE_URL}/api/forms/${bizId}`);
      const data = await res.json();
      setFormFields(data.fields || []);
      
      // Initialize an empty answers dictionary
      const initialAnswers: Record<string, any> = {};
      (data.fields || []).forEach((field: FormField) => {
        if (field.type === "boolean") {
          initialAnswers[field.name] = false;
        } else if (field.type === "table") {
          initialAnswers[field.name] = [];
        } else {
          initialAnswers[field.name] = "";
        }
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error("Failed to load customer dynamic form layout:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleValueChange = (fieldName: string, value: any) => {
    setAnswers({
      ...answers,
      [fieldName]: value
    });
  };

  const handleAddTableRow = (fieldName: string, columns: any[]) => {
    const currentRows = Array.isArray(answers[fieldName]) ? answers[fieldName] : [];
    const newEmptyRow: Record<string, any> = {};
    columns.forEach(col => {
      newEmptyRow[col.name] = col.type === "number" ? "" : "";
    });
    handleValueChange(fieldName, [...currentRows, newEmptyRow]);
  };

  const handleUpdateTableRowValue = (fieldName: string, rowIndex: number, colName: string, value: any) => {
    const currentRows = Array.isArray(answers[fieldName]) ? [...answers[fieldName]] : [];
    if (currentRows[rowIndex]) {
      currentRows[rowIndex] = {
        ...currentRows[rowIndex],
        [colName]: value
      };
      handleValueChange(fieldName, currentRows);
    }
  };

  const handleDeleteTableRow = (fieldName: string, rowIndex: number) => {
    const currentRows = Array.isArray(answers[fieldName]) ? answers[fieldName] : [];
    const updatedRows = currentRows.filter((_: any, idx: number) => idx !== rowIndex);
    handleValueChange(fieldName, updatedRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz) return;

    setSubmitting(true);
    setSubmitMsg("");
    setSubmitError("");

    // Simple frontend validation for required dynamic fields
    for (const field of formFields) {
      if (field.required) {
        const value = answers[field.name];
        if (field.type === "table") {
          if (!Array.isArray(value) || value.length === 0) {
            setSubmitError(`The field "${field.label}" requires at least one row entries.`);
            setSubmitting(false);
            return;
          }
        } else {
          if (value === undefined || value === null || String(value).trim() === "") {
            setSubmitError(`The field "${field.label}" is required.`);
            setSubmitting(false);
            return;
          }
        }
      }
    }

    try {
      const payload = {
        businessId: selectedBiz.id,
        data: answers,
        paymentAmount: Number(paymentAmount) || 0,
        paymentMethod,
        transactionId: paymentMethod === "Online" ? transactionId : undefined
      };

      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Customer record ingestion failed.");
      }

      setSubmitMsg(`Success: Dynamic client record log finalized!`);
      
      // Reset input fields
      const resetAnswers: Record<string, any> = {};
      formFields.forEach((f) => {
        resetAnswers[f.name] = f.type === "boolean" ? false : (f.type === "table" ? [] : "");
      });
      setAnswers(resetAnswers);
      setPaymentAmount("");
      setTransactionId("");
      setPaymentMethod("Cash");

      if (onRecordAdded) {
        onRecordAdded();
      }
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [userId]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      <div className="pb-4 border-b border-slate-100 space-y-1 text-left">
        <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight font-sans">Customer Register Intake</h1>
        <p className="text-xs text-slate-500 font-medium">Select a dynamic business portfolio, instantly load customizable customer questionnaires, and submit transactional sales records.</p>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Booting dynamic form renderer...</span>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Business selector & Payment fields */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Business selector card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 text-left">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Step 1: Active Store Selection</label>
              <div className="space-y-2">
                {businesses.length === 0 ? (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold">
                    No active corporate profiles found. Please create an active business profile in the business dashboard tab.
                  </div>
                ) : (
                  <div className="relative">
                    <Building2 className="absolute top-1/2 -translate-y-1/2 left-3.5 text-slate-400 w-4.5 h-4.5" />
                    <select
                      value={selectedBiz?.id || ""}
                      onChange={(e) => {
                        const target = businesses.find(b => b.id === e.target.value);
                        if (target) {
                          setSelectedBiz(target);
                          loadBusinessForm(target.id);
                        }
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 cursor-pointer appearance-none"
                    >
                      {businesses.map((biz) => (
                        <option key={biz.id} value={biz.id}>
                          {biz.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Payment options card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 text-left">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Step 2: Collect Payment Info</label>
              
              <div className="space-y-4">
                {/* Payment numerical amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Checkout Amount (INR)</label>
                  <div className="relative">
                    <Coins className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                    <input
                      type="number"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 1490"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white text-xs rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Cash vs Online Radio Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 block">Payment Method *</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="Cash"
                        checked={paymentMethod === "Cash"}
                        onChange={() => setPaymentMethod("Cash")}
                        className="border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Cash Payment</span>
                    </label>
                    <label className="flex items-center space-x-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="Online"
                        checked={paymentMethod === "Online"}
                        onChange={() => setPaymentMethod("Online")}
                        className="border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Online Payment</span>
                    </label>
                  </div>
                </div>

                {/* Custom transaction input (Visible only if online) */}
                {paymentMethod === "Online" && (
                  <div className="space-y-1.5 animate-fade-in text-left">
                    <label className="text-xs font-semibold text-slate-500">Transaction ID (Optional)</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter Transaction ID"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white text-xs font-mono rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right panel: Dynamic form solver */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            
            {formLoading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-400">Loading form questions automatically...</span>
              </div>
            ) : !selectedBiz ? (
              <div className="py-24 text-center text-xs text-slate-400 font-semibold">
                Please create a nursery metadata portfolio above before launching checkout pages.
              </div>
            ) : (
              <>
                {/* Schema Header */}
                <div className="pb-4 border-b border-slate-100 flex items-center space-x-2 text-left">
                  <div className="w-8 h-8 rounded-lg bg-indigo-55 bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <UserSquare className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-slate-900 text-sm">Intake Form</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono mt-0.5">Assigned to: {selectedBiz.name}</p>
                  </div>
                </div>

                {/* Submitting messages banner */}
                {submitMsg && (
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-700 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{submitMsg}</span>
                  </div>
                )}

                {submitError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-150 rounded-lg text-red-700 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                  {/* Render fields dynamically */}
                  {formFields.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl uppercase tracking-wider font-mono">
                      No custom fields added yet. Go to the Business Page to append custom labels.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formFields.map((field) => {
                        const val = answers[field.name];
                        return (
                          <div key={field.id} className="space-y-1.5 text-left">
                            {field.type !== "table" && (
                              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                <span>{field.label}</span>
                                {field.required && <span className="text-red-500 font-bold">*</span>}
                              </label>
                            )}

                            {/* Render different components according to element type */}
                            {field.type === "table" ? (
                              <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl text-left">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>{field.label}</span>
                                    {field.required && <span className="text-red-500 font-bold">*</span>}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleAddTableRow(field.name, field.columns || [])}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    <span>Add Row</span>
                                  </button>
                                </div>

                                {(!answers[field.name] || answers[field.name].length === 0) ? (
                                  <div className="text-xs text-slate-400 italic text-center py-6 bg-white rounded-lg border border-slate-200">
                                    No rows added yet. Click "+ Add Row" to begin.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse bg-white rounded-lg overflow-hidden border border-slate-200">
                                      <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200">
                                          {(field.columns || []).map((col: any) => (
                                            <th key={col.id} className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                              {col.label} {col.type === "number" ? "(Num)" : "(Str)"}
                                            </th>
                                          ))}
                                          <th className="p-2 w-10"></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {answers[field.name].map((row: any, rIdx: number) => (
                                          <tr key={rIdx} className="border-b last:border-none border-slate-200">
                                            {(field.columns || []).map((col: any) => (
                                              <td key={col.id} className="p-2">
                                                <input
                                                  type={col.type === "number" ? "number" : "text"}
                                                  placeholder={col.label}
                                                  value={row[col.name] !== undefined ? row[col.name] : ""}
                                                  onChange={(e) => handleUpdateTableRowValue(
                                                    field.name,
                                                    rIdx,
                                                    col.name,
                                                    col.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
                                                  )}
                                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/10 text-xs"
                                                />
                                              </td>
                                            ))}
                                            <td className="p-2 text-center">
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteTableRow(field.name, rIdx)}
                                                className="p-1 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-xs font-bold cursor-pointer"
                                                title="Delete Row"
                                              >
                                                ×
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ) : field.type === "select" ? (
                              <select
                                required={field.required}
                                value={val || ""}
                                onChange={(e) => handleValueChange(field.name, e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="">-- Choose Option --</option>
                                {field.options?.map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === "boolean" ? (
                              <div className="flex items-center">
                                <label className="inline-flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={val || false}
                                    onChange={(e) => handleValueChange(field.name, e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-505 w-4.5 h-4.5"
                                  />
                                  <span>Yes, confirm this condition</span>
                                </label>
                              </div>
                            ) : field.type === "date" ? (
                              <input
                                type="date"
                                required={field.required}
                                value={val || ""}
                                onChange={(e) => handleValueChange(field.name, e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                              />
                            ) : field.type === "number" ? (
                              <input
                                type="number"
                                required={field.required}
                                value={val || ""}
                                onChange={(e) => handleValueChange(field.name, e.target.value)}
                                placeholder={`Enter numeric ${field.label}...`}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <input
                                type="text"
                                required={field.required}
                                value={val || ""}
                                onChange={(e) => handleValueChange(field.name, e.target.value)}
                                placeholder={`Enter ${field.label}...`}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Submission controls */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Real Database Log</span>
                    <button
                      type="submit"
                      disabled={submitting || formFields.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-sm shadow-indigo-650/15"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4.5 h-4.5" />}
                      <span>Submit Ingestion Form</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
