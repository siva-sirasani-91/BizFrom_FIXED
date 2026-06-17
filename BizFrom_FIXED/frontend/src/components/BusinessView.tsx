/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Building2, 
  Plus, 
  Archive, 
  RefreshCcw, 
  Trash2, 
  Save, 
  CheckCircle, 
  Sparkles, 
  Phone, 
  MapPin, 
  FolderEdit, 
  FolderDot,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Business, FormField, FieldType, TableColumn } from "../types";

interface BusinessViewProps {
  userId: string;
  selectedBizId?: string; // option to skip to business
  onFormSavedNotice?: () => void;
}

export default function BusinessView({ userId, selectedBizId, onFormSavedNotice }: BusinessViewProps) {
  // Businesses list and selected active business for Form Building
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBiz, setActiveBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter/Tabs for Business lists: "active" | "archived"
  const [businessTab, setBusinessTab] = useState<"active" | "archived">("active");

  // Create Business Form fields
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bizName, setBizName] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizNotes, setBizNotes] = useState("");
  const [modalError, setModalError] = useState("");

  // Form Builder state for the selected active business
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderMsg, setBuilderMsg] = useState("");
  const [builderError, setBuilderError] = useState("");

  // Adding physical field variables (individual field edit card)
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState(""); // comma-separated options for select dropdown

  // States for repeating table column definition
  const [newColumns, setNewColumns] = useState<TableColumn[]>([]);
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<"text" | "number">("text");

  const handleAddColumn = () => {
    if (!newColLabel.trim()) {
      return;
    }
    const colName = newColLabel
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/\s+/g, "")
      .trim() || `col_${Math.random().toString(36).substring(2, 5)}`;

    const newCol: TableColumn = {
      id: "col_" + Math.random().toString(36).substring(2, 9),
      name: colName,
      label: newColLabel,
      type: newColType
    };

    setNewColumns([...newColumns, newCol]);
    setNewColLabel("");
    setNewColType("text");
  };

  const handleDeleteColumn = (colId: string) => {
    setNewColumns(newColumns.filter(c => c.id !== colId));
  };

  const fetchBusinesses = async (autoSelectId?: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/businesses?userId=${userId}`);
      if (res.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const data = res.ok ? await res.json() : null;
      const bizArray = Array.isArray(data) ? data : [];
      setBusinesses(bizArray);

      if (bizArray.length > 0) {
        // Decide which business to focus on
        const target = autoSelectId 
          ? bizArray.find((b: any) => b.id === autoSelectId) 
          : (bizArray.find((b: any) => b.status === "active") || bizArray[0]);
        
        if (target) {
          setActiveBiz(target);
          loadBusinessForm(target.id);
        }
      }
    } catch (err) {
      console.error("Failed to load businesses list:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessForm = async (bizId: string) => {
    try {
      setBuilderLoading(true);
      setBuilderMsg("");
      setBuilderError("");
      const res = await fetch(`/api/forms/${bizId}`);
      const data = await res.json();
      setFormFields(data.fields || []);
    } catch (err) {
      console.error("Failed to load business form structure:", err);
    } finally {
      setBuilderLoading(false);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) {
      setModalError("Business name is mandatory.");
      return;
    }

    try {
      setModalError("");
     const res = await fetch("https://bizfrom-fixed.onrender.com/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: bizName,
          phone: bizPhone,
          address: bizAddress,
          notes: bizNotes
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Creation parameters failed.");
      }

      // Hide modal, clear inputs, refresh businesses with focus on the new one!
      setShowCreateModal(false);
      setBizName("");
      setBizPhone("");
      setBizAddress("");
      setBizNotes("");
      
      await fetchBusinesses(data.id);
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleToggleArchive = async (biz: Business, shouldArchive: boolean) => {
    try {
      const res = await fetch(`/api/businesses/${biz.id}/archive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: shouldArchive })
      });
      if (res.ok) {
        await fetchBusinesses(activeBiz?.id === biz.id ? undefined : activeBiz?.id);
      }
    } catch (err) {
      console.error("Archive status toggle failed:", err);
    }
  };

  // FORM BUILDER ACTIONS

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      setBuilderError("Please input an descriptive field label (e.g. Garden Location).");
      return;
    }

    if (newFieldType === "table" && newColumns.length === 0) {
      setBuilderError("Please add at least one column for the repeating table.");
      return;
    }

    setBuilderError("");
    setBuilderMsg("");

    // Generate property identifier (camelCase alphanumeric)
    const propertyName = newFieldLabel
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/\s+/g, "")
      .trim();

    const newField: FormField = {
      id: "f_" + Math.random().toString(36).substring(2, 9),
      name: propertyName || "customField",
      label: newFieldLabel,
      type: newFieldType,
      required: newFieldRequired,
      options: newFieldType === "select" 
        ? newFieldOptions.split(",").map(o => o.trim()).filter(Boolean)
        : undefined,
      columns: newFieldType === "table" ? [...newColumns] : undefined
    };

    setFormFields([...formFields, newField]);

    // Reset building fields inputs
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions("");
    setNewColumns([]);
    setNewColLabel("");
    setNewColType("text");
  };

  const handleDeleteField = (fieldId: string) => {
    setBuilderMsg("");
    setFormFields(formFields.filter(f => f.id !== fieldId));
  };

  const handleSaveFormSchema = async () => {
    if (!activeBiz) return;
    setBuilderLoading(true);
    setBuilderMsg("");
    setBuilderError("");

    try {
      const res = await fetch(`/api/forms/${activeBiz.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to commit schema to DB.");
      }

      setBuilderMsg("Customer template form layout compiled & saved successfully (no records wiped).");
      if (onFormSavedNotice) {
        onFormSavedNotice();
      }
    } catch (err: any) {
      setBuilderError(err.message);
    } finally {
      setBuilderLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses(selectedBizId);
  }, [userId, selectedBizId]);

  const filteredBusinesses = businesses.filter(b => b.status === businessTab);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight">Business & Form Studio</h1>
          <p className="text-xs text-slate-500 font-medium">Add physical nursery directories, configure custom schemas like Google Forms, and link dynamic client sheets.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Register New Business
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Hydrating business list...</span>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Businesses Manager */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="space-y-3">
              <h2 className="font-display font-semibold text-sm text-slate-950">1. Select Portfolio</h2>
              
              {/* Category tabs: Active / Archived */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBusinessTab("active")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                    businessTab === "active" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Active Stores
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessTab("archived")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                    businessTab === "archived" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Archived Registry
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredBusinesses.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl space-y-2">
                  <FolderDot className="w-10 h-10 mx-auto text-slate-300" />
                  <span>No corporate records found matching this status.</span>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                  {filteredBusinesses.map((biz) => {
                    const isSelected = activeBiz?.id === biz.id;
                    return (
                      <div 
                        key={biz.id} 
                        onClick={() => {
                          setActiveBiz(biz);
                          loadBusinessForm(biz.id);
                        }}
                        className={`p-4 border rounded-xl cursor-pointer text-left transition-all relative group flex flex-col gap-3 ${
                          isSelected 
                            ? "bg-slate-50 border-slate-300 ring-2 ring-indigo-500/10 scale-[1.01]" 
                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="font-display font-medium text-slate-950 block text-xs">{biz.name}</span>
                            <span className="text-[10px] font-mono font-medium text-slate-400 block tracking-wider uppercase">ID: {biz.id}</span>
                          </div>
                          
                          {/* Archive toggle: Satisfies "Never permanently delete businesses from the UI" */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(biz, biz.status === "active");
                            }}
                            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900 font-semibold rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                            title={biz.status === "active" ? "Archive" : "Restore"}
                          >
                            <Archive className="w-3 h-3" />
                            <span>{biz.status === "active" ? "Archive" : "Restore"}</span>
                          </button>
                        </div>

                        {/* Secondary metrics details */}
                        <div className="space-y-1.5 text-[10px] text-slate-500 font-semibold">
                          {biz.phone && (
                            <div className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0 text-slate-400" /> <span>{biz.phone}</span></div>
                          )}
                          {biz.address && (
                            <div className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0 text-slate-400" /> <span className="line-clamp-1">{biz.address}</span></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Form Builder editor */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            {!activeBiz ? (
              <div className="py-24 text-center text-xs text-slate-400 font-semibold space-y-2">
                <Building2 className="w-12 h-12 text-slate-350 mx-auto" />
                <span>Select or create a business profile first to generate a customer form structure.</span>
              </div>
            ) : (
              <>
                {/* Active header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 block tracking-wider">Form Editor</span>
                    <h3 className="font-display font-medium text-slate-950 text-sm">Custom Intake Form: <strong className="text-indigo-600 underline font-semibold">{activeBiz.name}</strong></h3>
                  </div>
                  
                  <button
                    onClick={handleSaveFormSchema}
                    disabled={builderLoading}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    {builderLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Form Schema</span>
                  </button>
                </div>

                {/* Notifications */}
                {builderMsg && (
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-700 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{builderMsg}</span>
                  </div>
                )}

                {builderError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-150 rounded-lg text-red-700 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{builderError}</span>
                  </div>
                )}

                {/* Current configured fields listing */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">Active Field Elements</h4>
                  
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {formFields.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6">Your dynamic form currently has no elements. Append elements below.</p>
                    ) : (
                      <div className="space-y-2">
                        {formFields.map((field) => (
                          <div key={field.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-4 group">
                            <div className="space-y-0.5 text-left">
                              <span className="font-semibold text-slate-900 block">{field.label} {field.required && <strong className="text-red-500 font-bold">*</strong>}</span>
                              <span className="text-[10px] text-slate-400 font-mono block uppercase">
                                Variable: <span className="font-semibold text-slate-500">{field.name}</span> | Type: {field.type}
                                {field.options && field.options.length > 0 && ` [${field.options.join(", ")}]`}
                              </span>
                              {field.type === "table" && field.columns && field.columns.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {field.columns.map((col) => (
                                    <span key={col.id} className="inline-flex text-[9px] font-mono px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">
                                      {col.label} ({col.type})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleDeleteField(field.id)}
                              className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Delete Field"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Field creator builder card */}
                <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4 text-left">
                  <h4 className="text-[11px] font-display font-semibold text-slate-900 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Configure Field Element</span>
                  </h4>

                  <div className="grid sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-8 space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">Field Label / Question Name</label>
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        placeholder="e.g. Nursery Batch, Fertilizer Treatment"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-205 focus:outline-none focus:border-indigo-505 text-xs rounded-lg text-slate-800"
                      />
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">Field Input Type</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-205 focus:outline-none text-xs rounded-lg text-slate-800"
                      >
                        <option value="text">Short Text</option>
                        <option value="number">Number Value</option>
                        <option value="select">Select Dropdown</option>
                        <option value="date">Date Picker</option>
                        <option value="boolean">Boolean Toggle (Yes/No)</option>
                        <option value="table">Repeating Table</option>
                      </select>
                    </div>
                  </div>

                  {/* Dropdown options config (Only visible if type is select) */}
                  {newFieldType === "select" && (
                    <div className="space-y-1.5 animate-fade-in text-left">
                      <label className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">Dropdown Selections (Comma Separated)</label>
                      <input
                        type="text"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        placeholder="Rose, Hibiscus, Orchid, Bonsai"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-205 focus:outline-none text-xs rounded-lg text-slate-800"
                      />
                    </div>
                  )}

                  {/* Table columns config (Only visible if type is table) */}
                  {newFieldType === "table" && (
                    <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-xl text-left">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block">Configure Repeating Table Columns</span>
                      
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-6 space-y-1">
                          <label className="text-[9.5px] font-semibold text-slate-500 block uppercase">Column Name</label>
                          <input
                            type="text"
                            value={newColLabel}
                            onChange={(e) => setNewColLabel(e.target.value)}
                            placeholder="e.g. Worker Name, Packets"
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-205 focus:outline-none focus:border-indigo-505 text-xs rounded-lg text-slate-800"
                          />
                        </div>
                        <div className="col-span-4 space-y-1">
                          <label className="text-[9.5px] font-semibold text-slate-500 block uppercase">Column Type</label>
                          <select
                            value={newColType}
                            onChange={(e) => setNewColType(e.target.value as "text" | "number")}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-205 focus:outline-none text-xs rounded-lg text-slate-800"
                          >
                            <option value="text">Short Text</option>
                            <option value="number">Number Value</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <button
                            type="button"
                            onClick={handleAddColumn}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Display configured columns */}
                      {newColumns.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          <span className="text-[9px] font-semibold text-slate-400 block uppercase">Columns to generate:</span>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {newColumns.map((col) => (
                              <span key={col.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-150 rounded-lg text-[10.5px] font-medium text-indigo-700">
                                <span>{col.label} ({col.type === "number" ? "Number" : "Text"})</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteColumn(col.id)}
                                  className="text-indigo-400 hover:text-red-500 text-xs font-bold leading-none cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No columns added yet. Type a name and click Add.</p>
                      )}
                    </div>
                  )}

                  {/* Settings row */}
                  <div className="flex items-center justify-between pb-2">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFieldRequired}
                        onChange={(e) => setNewFieldRequired(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Make this field MANDATORY for checkout submission</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddField}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-3.5 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Append Field</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 text-left pt-2 leading-relaxed">
                  * Dynamic structures are mapped dynamically! When customers open checkout pages, the corresponding client template schema is rendered automatically. No tables are wiped.
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* CREATE BUSINESS PORTFOLIO MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in text-left">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xl max-w-md w-full space-y-6">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 text-md">Register Corporate Store</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Define business profile to bind custom forms</p>
              </div>
            </div>

            {modalError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold animate-bounce">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Business Name *</label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Sree Balaji Nursery"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white text-xs rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Contact Telephone Number</label>
                <input
                  type="tel"
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  placeholder="e.g. 9154920493"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white text-xs rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Corporate Address</label>
                <input
                  type="text"
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  placeholder="e.g. 10th Cross, Nellore Main Town, AP"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white text-xs rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Internal Notes</label>
                <textarea
                  value={bizNotes}
                  onChange={(e) => setBizNotes(e.target.value)}
                  placeholder="Notes about location or logistics"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white text-xs rounded-lg text-slate-800 h-18 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
