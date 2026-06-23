/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Building2, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  Loader2, 
  Calendar, 
  RefreshCcw, 
  UserSquare, 
  FileSpreadsheet,
  AlertCircle,
  X,
  CreditCard,
  Coins,
  PlusCircle
} from "lucide-react";
import { CustomerRecord, Business, FormField } from "../types";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

const API_BASE_URL = typeof window !== "undefined" && window.location.hostname === "localhost" 
  ? "http://localhost:3000" 
  : "https://bizfrom-fixed.onrender.com";

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

function renderRecordValue(val: any, parentLabel?: string): React.ReactNode {
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
      <div className="overflow-x-auto my-2 w-full border border-slate-200 rounded-lg">
        <table className="min-w-full text-xs text-left border-collapse bg-white">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 select-none">
              {keys.map(k => (
                <th key={k} className="p-2.5 border-r last:border-r-0 border-slate-200 font-extrabold">{formatObjectKey(k, parentLabel)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {val.map((row: any, rIdx: number) => (
              <tr key={rIdx} className="border-b last:border-none border-slate-100 hover:bg-slate-50 font-medium">
                {keys.map(k => {
                  const cellVal = row[k];
                  const isNum = typeof cellVal === "number";
                  return (
                    <td key={k} className={`p-2.5 border-r last:border-r-0 border-slate-200 text-slate-900 ${isNum ? "font-mono font-semibold" : ""}`}>
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
    if (entries.length === 0) return <span className="text-slate-450 font-mono">{"{}"}</span>;

    return (
      <div className="space-y-1.5 p-3 bg-white border border-slate-200 rounded-xl my-1 text-left w-full inline-block">
        {entries.map(([k, v]) => {
          const displayKey = formatObjectKey(k, parentLabel);
          const kLower = k.toLowerCase();
          let displayVal: React.ReactNode = "";

          if (v === null || v === undefined) {
            displayVal = "-";
          } else if (typeof v === "object") {
            displayVal = renderRecordValue(v, displayKey);
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

interface RecordsViewProps {
  userId: string;
  initialBizId?: string;
  onClearInitialBizId?: () => void;
}

export default function RecordsView({ userId, initialBizId, onClearInitialBizId }: RecordsViewProps) {
  // Database datasets
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [records, setRecords] = useState<CustomerRecord[]>([]);

  // Search & Filtering inputs
  const [selectedBizId, setSelectedBizId] = useState("");

  // Sync initialBizId when passed from global search
  useEffect(() => {
    if (initialBizId) {
      setSelectedBizId(initialBizId);
    }
  }, [initialBizId]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal inspection modes
  const [activeInspectRecord, setActiveInspectRecord] = useState<CustomerRecord | null>(null);
  const [inspectFormFields, setInspectFormFields] = useState<FormField[]>([]);

  useEffect(() => {
    if (activeInspectRecord) {
      fetch(`/api/forms/${activeInspectRecord.businessId}`)
        .then(res => res.json())
        .then(data => {
          setInspectFormFields(data.fields || []);
        })
        .catch(err => {
          console.error("Failed to load schema for inspect modal", err);
        });
    } else {
      setInspectFormFields([]);
    }
  }, [activeInspectRecord]);
  
  // Modal Edit mode states
  const [activeEditRecord, setActiveEditRecord] = useState<CustomerRecord | null>(null);
  const [editFormFields, setEditFormFields] = useState<FormField[]>([]);
  const [editAnswers, setEditAnswers] = useState<Record<string, any>>({});
  const [editPayment, setEditPayment] = useState("");
  const [editMethod, setEditMethod] = useState<"Cash" | "Online">("Cash");
  const [editTransaction, setEditTransaction] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const handleEditAddTableRow = (fieldName: string, columns: any[]) => {
    const currentRows = Array.isArray(editAnswers[fieldName]) ? editAnswers[fieldName] : [];
    const newEmptyRow: Record<string, any> = {};
    columns.forEach(col => {
      newEmptyRow[col.name] = col.type === "number" ? "" : "";
    });
    setEditAnswers({
      ...editAnswers,
      [fieldName]: [...currentRows, newEmptyRow]
    });
  };

  const handleEditUpdateTableRowValue = (fieldName: string, rowIndex: number, colName: string, value: any) => {
    const currentRows = Array.isArray(editAnswers[fieldName]) ? [...editAnswers[fieldName]] : [];
    if (currentRows[rowIndex]) {
      currentRows[rowIndex] = {
        ...currentRows[rowIndex],
        [colName]: value
      };
      setEditAnswers({
        ...editAnswers,
        [fieldName]: currentRows
      });
    }
  };

  const handleEditDeleteTableRow = (fieldName: string, rowIndex: number) => {
    const currentRows = Array.isArray(editAnswers[fieldName]) ? editAnswers[fieldName] : [];
    const updatedRows = currentRows.filter((_: any, idx: number) => idx !== rowIndex);
    setEditAnswers({
      ...editAnswers,
      [fieldName]: updatedRows
    });
  };

  // Trash & Move to Trash Confirmation States
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiltersAndRecords = async () => {
    try {
      setLoading(true);
      // Load nurseries
      const bRes = await fetch(`${API_BASE_URL}/api/businesses`);
      if (bRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const bDataRaw = bRes.ok ? await bRes.json() : null;
      const bData = Array.isArray(bDataRaw) ? bDataRaw : [];
      setBusinesses(bData.filter((b: any) => b.status === "active"));

      // Load records matching current search parameters
      let url = `${API_BASE_URL}/api/customers?`;
      if (selectedBizId) {
        url += `businessId=${selectedBizId}&`;
      }
      if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}&`;
      }
      const rRes = await fetch(url);
      if (rRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      const rDataRaw = rRes.ok ? await rRes.json() : null;
      const rData = Array.isArray(rDataRaw) ? rDataRaw : [];
      setRecords(rData.filter((r: any) => !r.deletedAt));
    } catch (err) {
      console.error("Failed to load spreadsheet records form server:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualDelete = (recordId: string) => {
    setRecordToDelete(recordId);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers/${recordToDelete}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRecords(records.filter(r => r.id !== recordToDelete));
        setSuccessMessage("Record moved to Recycle Bin successfully.");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error("Deletion parameters rejected:", err);
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };

  const openEditModal = async (record: CustomerRecord) => {
    setActiveEditRecord(record);
    setEditError("");
    
    try {
      // 1. Fetch form structure for this business
      const schemaRes = await fetch(`/api/forms/${record.businessId}`);
      const schemaData = await schemaRes.json();
      setEditFormFields(schemaData.fields || []);
      
      // 2. Populate editing outputs
      setEditAnswers({ ...record.data });
      setEditPayment(String(record.paymentAmount));
      setEditMethod(record.paymentMethod);
      setEditTransaction(record.transactionId || "");
    } catch (err) {
      console.error("Failed to configure dynamic edit schema:", err);
    }
  };

  const handleExportSingleCustomerInvoicePDF = (customer: CustomerRecord) => {
    const doc = new jsPDF("p", "pt", "a4");
    
    // Resolve correct business nursery name
    const recordBiz = businesses.find((b) => b.id === customer.businessId);
    const nurseryName = recordBiz?.name || "Nursery Customer Registry";
    const customerName = customer.data.customerName || customer.data.customerNameUpper || customer.data.customer_name || customer.data.name || "Unknown Customer";

    // Matching Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("Customer Record Invoice", 40, 50);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`ID: ${customer.id}`, 40, 64);

    doc.setDrawColor(241, 245, 249); // border-slate-100
    doc.line(40, 76, 555, 76);

    let yPos = 100;

    // Helper to capitalize/format keys
    const formatObjectKeyInPDF = (keyName: string) => {
      let s = keyName.replace(/([A-Z])/g, " $1");
      s = s.replace(/_/g, " ");
      return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    };

    // Helper to handle general drawing page-breaks
    const ensureSpace = (heightNeeded: number) => {
      if (yPos + heightNeeded > 750) {
        doc.addPage();
        yPos = 50;
        return true;
      }
      return false;
    };

    // Prepare fields exactly matching entries inside customer.data
    const fieldsToDraw: { label: string; key: string; val: any; isComplex: boolean }[] = [];
    Object.entries(customer.data).forEach(([key, val]) => {
      const label = key.replace(/([A-Z])/g, " $1").trim();
      const isComplex = val !== null && val !== undefined && typeof val === "object";
      fieldsToDraw.push({ label, key, val, isComplex });
    });

    let pendingSimple: typeof fieldsToDraw[0] | null = null;

    const drawSimpleItem = (item: typeof fieldsToDraw[0], x: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(item.label.toUpperCase(), x, yPos);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59); // Slate-800
      
      const rawVal = item.val;
      let displayStr = "-";
      if (rawVal === true) displayStr = "Confirmed/Yes";
      else if (rawVal === false) displayStr = "Declined/No";
      else if (rawVal !== undefined && rawVal !== null && rawVal !== "") {
        displayStr = String(rawVal);
      }
      
      const splitText = doc.splitTextToSize(displayStr, 230);
      doc.text(splitText, x, yPos + 12);
    };

    fieldsToDraw.forEach((item) => {
      if (!item.isComplex) {
        if (pendingSimple) {
          ensureSpace(35);
          drawSimpleItem(pendingSimple, 40);
          drawSimpleItem(item, 300);
          yPos += 35;
          pendingSimple = null;
        } else {
          pendingSimple = item;
        }
      } else {
        // Draw any pending simple item first
        if (pendingSimple) {
          ensureSpace(35);
          drawSimpleItem(pendingSimple, 40);
          yPos += 35;
          pendingSimple = null;
        }

        // Draw complex item
        if (isArrayOfObjects(item.val)) {
          // Table layout
          const val = item.val as any[];
          const keysMap: Record<string, boolean> = {};
          val.forEach((row: any) => {
            if (row && typeof row === "object") {
              Object.keys(row).forEach(k => { keysMap[k] = true; });
            }
          });
          const keys = Object.keys(keysMap);
          const colWidth = Math.floor(515 / Math.max(1, keys.length));
          const tableHeaderHeight = 18;
          const rowHeight = 16;
          const totalTableHeight = 12 + tableHeaderHeight + (val.length * rowHeight) + 15;

          ensureSpace(totalTableHeight < 150 ? totalTableHeight : 100);

          // Render Label first
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(item.label.toUpperCase(), 40, yPos);
          yPos += 10;

          // Header
          doc.setFillColor(241, 245, 249);
          doc.rect(40, yPos, 515, tableHeaderHeight, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          keys.forEach((k, idx) => {
            doc.text(formatObjectKeyInPDF(k), 45 + idx * colWidth, yPos + 11);
          });
          
          doc.setDrawColor(203, 213, 225);
          doc.line(40, yPos + tableHeaderHeight, 555, yPos + tableHeaderHeight);
          yPos += tableHeaderHeight;

          // Rows
          doc.setFont("helvetica", "normal");
          val.forEach((row: any) => {
            if (yPos + rowHeight > 750) {
              doc.addPage();
              yPos = 50;
              // Redraw headers on new page
              doc.setFillColor(241, 245, 249);
              doc.rect(40, yPos, 515, tableHeaderHeight, "F");
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8.5);
              doc.setTextColor(71, 85, 105);
              keys.forEach((k, idx) => {
                doc.text(formatObjectKeyInPDF(k), 45 + idx * colWidth, yPos + 11);
              });
              doc.setDrawColor(203, 213, 225);
              doc.line(40, yPos + tableHeaderHeight, 555, yPos + tableHeaderHeight);
              yPos += tableHeaderHeight;
              doc.setFont("helvetica", "normal");
            }

            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            keys.forEach((k, idx) => {
              const cellVal = row[k];
              const cellStr = cellVal !== undefined && cellVal !== null && cellVal !== "" ? String(cellVal) : "-";
              doc.text(cellStr, 45 + idx * colWidth, yPos + 11);
            });

            doc.setDrawColor(241, 245, 249);
            doc.line(40, yPos + rowHeight, 555, yPos + rowHeight);
            yPos += rowHeight;
          });

          yPos += 15;

        } else if (typeof item.val === "object") {
          // Nested object/dictionary
          const val = item.val;
          const entries = Object.entries(val);
          const count = entries.length;
          const rowHeight = 16;
          const boxHeight = 12 + count * rowHeight + 10;

          ensureSpace(boxHeight < 150 ? boxHeight : 100);

          // Render Label first
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(item.label.toUpperCase(), 40, yPos);
          yPos += 10;

          doc.setDrawColor(226, 232, 240);
          doc.setFillColor(250, 250, 250);
          doc.rect(40, yPos, 515, count * rowHeight + 8, "F");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          
          let innerY = yPos + 14;
          entries.forEach(([subKey, subVal]) => {
            if (innerY + rowHeight > 750) {
              doc.addPage();
              yPos = 50;
              innerY = yPos + 14;
            }
            const displayKey = formatObjectKeyInPDF(subKey);
            let displayVal = "";
            if (subVal === null || subVal === undefined) {
              displayVal = "-";
            } else if (typeof subVal === "number" && (subKey.toLowerCase().includes("amount") || subKey.toLowerCase().includes("price") || subKey.toLowerCase().includes("fee") || subKey.toLowerCase().includes("cost") || subKey.toLowerCase().includes("rate") || subKey.toLowerCase() === "payment")) {
              displayVal = `INR ${subVal.toLocaleString("en-IN")}`;
            } else {
              displayVal = String(subVal);
            }

            doc.setFont("helvetica", "bold");
            doc.setTextColor(100, 116, 139);
            doc.text(`${displayKey} :`, 50, innerY);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            doc.text(displayVal, 180, innerY);
            
            innerY += rowHeight;
          });

          yPos = innerY + 10;
        }
      }
    });

    if (pendingSimple) {
      ensureSpace(35);
      drawSimpleItem(pendingSimple, 40);
      yPos += 35;
      pendingSimple = null;
    }

    // Dynamic Answers finishes. Render bottom borders and payments
    ensureSpace(60);

    // Divider line matching border-t border-slate-100
    doc.setDrawColor(241, 245, 249);
    doc.line(40, yPos, 555, yPos);
    yPos += 18;

    // Financial Amount block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("FINANCIAL AMOUNT (INR)", 40, yPos);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate-950
    doc.text(`₹${getRecordAmount(customer).toLocaleString("en-IN")}`, 40, yPos + 14);

    // Gateway Method block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("GATEWAY METHOD", 300, yPos);

    let methodStr = String(customer.paymentMethod || "—");
    if (customer.transactionId) {
      methodStr += ` (TID: ${customer.transactionId})`;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(methodStr, 300, yPos + 14);

    yPos += 40;

    // Footer block
    ensureSpace(30);

    doc.setDrawColor(241, 245, 249);
    doc.line(40, yPos, 555, yPos);
    yPos += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Logged System-Time: ${new Date(customer.createdAt).toLocaleString()}`, 40, yPos);

    const safeName = customerName.replace(/\s+/g, "_");
    doc.save(`${safeName}_Invoice.pdf`);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditRecord) return;

    setEditSaving(true);
    setEditError("");

    // Frontend required validations
    for (const field of editFormFields) {
      if (field.required) {
        const val = editAnswers[field.name];
        if (val === undefined || val === null || String(val).trim() === "") {
          setEditError(`The field "${field.label}" is required.`);
          setEditSaving(false);
          return;
        }
      }
    }

    try {
      const payload = {
        data: editAnswers,
        paymentAmount: Number(editPayment) || 0,
        paymentMethod: editMethod,
        transactionId: editMethod === "Online" ? editTransaction : undefined
      };

      const res = await fetch(`/api/customers/${activeEditRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to edit dynamic directory entry.");
      }

      // Close modal and refresh records listing
      setActiveEditRecord(null);
      await fetchFiltersAndRecords();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndRecords();
  }, [selectedBizId, searchQuery]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Top headline section */}
      <div className="pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight">Customer Database Grid</h1>
          <p className="text-xs text-slate-500 font-medium">Browse dynamic customer rosters, search records, or manually execute deletions and edits.</p>
        </div>
        
        {/* Quick totals count indicator */}
        <div className="flex items-center space-x-1 bg-slate-100 border border-slate-200/50 px-3.5 py-1.5 rounded-xl font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider self-start md:self-auto">
          <span>Total Records:</span>
          <strong className="text-indigo-600 font-bold">{records.length}</strong>
        </div>
      </div>

      {/* FILTER SHELF */}
      <div className="grid md:grid-cols-12 gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        {/* Business select filter */}
        <div className="md:col-span-4 space-y-1 text-left">
          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Aggregate Store</label>
          <div className="relative">
            <Building2 className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-slate-400" />
            <select
              value={selectedBizId}
              onChange={(e) => setSelectedBizId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 font-semibold rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="">-- Show All Businesses --</option>
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>{biz.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Universal text searches keyword matcher */}
        <div className="md:col-span-8 space-y-1 text-left">
          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Universal Dynamic Search</label>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, plant choice, transaction codes, or care inputs..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SPREADSHEET TABLE GRID CONTAINER */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Aggregating matching dynamic records...</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {records.length === 0 ? (
            <div className="py-24 text-center text-xs text-slate-400 font-medium space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
              <p>No customer records found matching your active filter criteria.</p>
              <button 
                onClick={() => { setSelectedBizId(""); setSearchQuery(""); }} 
                className="text-indigo-650 text-indigo-600 font-bold underline cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-700 text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[9px] uppercase tracking-wider select-none leading-none">
                    <th className="py-4.5 px-6 font-semibold">Store Context</th>
                    <th className="py-4.5 px-6 font-semibold">Customer Intake Details</th>
                    <th className="py-4.5 px-6 font-semibold">Payment Amount</th>
                    <th className="py-4.5 px-6 font-semibold">Gateway / Clearance</th>
                    <th className="py-4.5 px-6 font-semibold text-center h-12">Registry Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium leading-none">
                  {records.map((r) => {
                    const storeMatch = businesses.find(b => b.id === r.businessId);
                    const clientName = r.data.customerName || "No Name Intake";
                    const orderItem = r.data.plantName || "-";
                    const createdStr = new Date(r.createdAt).toLocaleDateString("en-IN", { 
                      day: "numeric", 
                      month: "short", 
                      year: "numeric" 
                    });

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Store Context */}
                        <td className="py-4 px-6 border-b border-slate-100">
                          <span className="font-semibold text-slate-900 block">{storeMatch?.name || "Multiple Stores"}</span>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">{createdStr}</span>
                        </td>

                        {/* Customer Intake Details key pairings */}
                        <td className="py-4 px-6 border-b border-slate-100">
                          <span className="font-bold text-slate-900 block">{clientName}</span>
                          <span className="text-[10px] text-slate-500 font-medium block mt-1 flex flex-wrap gap-1 leading-normal">
                            {Object.entries(r.data)
                              .filter(([key]) => {
                                const kL = key.toLowerCase();
                                return !kL.includes("name") && typeof r.data[key] !== "object";
                              })
                              .slice(0, 3)
                              .map(([key, val]) => {
                                if (val === null || val === undefined || val === "") return null;
                                return (
                                  <span key={key} className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] text-slate-500 font-medium text-slate-600">
                                    {key.replace(/([A-Z])/g, " $1").trim()}: {String(val)}
                                  </span>
                                );
                              })
                            }
                          </span>
                        </td>

                        {/* Payment numerical amount columns label */}
                        <td className="py-4 px-6 border-b border-slate-100 shrink-0">
                          <span className="font-extrabold text-slate-950 font-mono text-sm">₹{getRecordAmount(r).toLocaleString("en-IN")}</span>
                        </td>

                        {/* Payment Methods clearances and visual badges */}
                        <td className="py-4 px-6 border-b border-slate-100">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md ${
                              r.paymentMethod === "Cash" ? "bg-slate-105 bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-600"
                            }`}>
                              {r.paymentMethod}
                            </span>
                            {r.transactionId && (
                              <span className="font-mono text-[9px] text-slate-400 font-medium tracking-tight">ID: {r.transactionId}</span>
                            )}
                          </div>
                        </td>

                        {/* Operation buttons: Edit, View Details, Manual persistent delete */}
                        <td className="py-2.5 px-6 border-b border-slate-100">
                          <div className="flex items-center justify-center space-x-2">
                            {/* View detailed inspect button */}
                            <button
                              onClick={() => setActiveInspectRecord(r)}
                              className="p-1 px-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                              title="Inspect Records Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">Inspect</span>
                            </button>

                            {/* Edit action button */}
                            <button
                              onClick={() => openEditModal(r)}
                              className="p-1 px-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              title="Modify Records Data"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">Edit</span>
                            </button>

                            {/* Persistent Manual Deletions controllers */}
                            <button
                              onClick={() => handleManualDelete(r.id)}
                              className="p-1 px-2 bg-red-50 border border-red-100 text-red-650 text-red-600 hover:bg-red-100/60 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              title="Safely Delete Directory Record Manually"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 1. INSPECT RECORD DETAILS MODAL COVER */}
      {activeInspectRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in text-left font-sans">
          <div className="bg-white border border-slate-155 p-8 rounded-2xl shadow-xl max-w-2xl w-full space-y-6 relative">
            <button 
              onClick={() => setActiveInspectRecord(null)}
              className="absolute top-6 right-6 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
 
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-indigo-650 text-indigo-600 flex items-center justify-center">
                <UserSquare className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 text-sm">Customer Record Invoice</h3>
                <span className="text-[10px] text-slate-400 font-mono font-medium block uppercase mt-0.5">ID: {activeInspectRecord.id}</span>
              </div>
            </div>
 
            {/* Dynamic answers details block */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-4 border-b border-slate-100">
                {Object.entries(activeInspectRecord.data).map(([key, val]) => {
                  const isComplex = val !== null && val !== undefined && typeof val === "object";
                  const label = key.replace(/([A-Z])/g, " $1").trim();
                  return (
                    <div 
                      key={key} 
                      className={`py-1 text-left ${isComplex ? "col-span-2 space-y-1.5" : "col-span-2 sm:col-span-1 space-y-0.5"}`}
                    >
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">
                        {label}
                      </span>
                      <div className="text-xs font-semibold text-slate-800">
                        {val === true ? "Confirmed/Yes" : val === false ? "Declined/No" : renderRecordValue(val, label)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Invoiced Payments block */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Financial Amount (INR)</span>
                  <span className="text-md font-extrabold text-slate-950 font-mono block">
                    ₹{getRecordAmount(activeInspectRecord).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Gateway Method</span>
                  <div className="flex items-center space-x-1.5 pt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      activeInspectRecord.paymentMethod === "Cash" ? "bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-600"
                    }`}>
                      {activeInspectRecord.paymentMethod}
                    </span>
                    {activeInspectRecord.transactionId && (
                      <span className="font-mono text-[10px] text-slate-400 font-semibold">TID: {activeInspectRecord.transactionId}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-[10px] font-mono text-slate-400 text-left">
                Logged System-Time: {new Date(activeInspectRecord.createdAt).toLocaleString()}
              </span>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExportSingleCustomerInvoicePDF(activeInspectRecord)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInspectRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg tracking-wider uppercase transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC FIELD VALUE ADJUSTER EDIT MODAL */}
      {activeEditRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in text-left">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xl max-w-md w-full space-y-5 relative">
            <button 
              onClick={() => setActiveEditRecord(null)}
              className="absolute top-6 right-6 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 text-sm">Modify Ingested Entry</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Dynamic Form adjustment sheet</p>
              </div>
            </div>

            {editError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-150 rounded-lg text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-3.5 max-h-[260px] overflow-y-auto pr-1">
                {editFormFields.map((field) => {
                  const val = editAnswers[field.name];
                  const isTable = field.type === "table" || Array.isArray(val);
                  const isObject = !isTable && typeof val === "object" && val !== null;

                  return (
                    <div key={field.id} className="space-y-1.5 flex flex-col items-start w-full">
                      {!isTable && !isObject && (
                        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.required && <span className="text-red-500 font-bold">*</span>}
                        </label>
                      )}

                      {isTable ? (
                        <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl text-left w-full">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span>{field.label}</span>
                              {field.required && <span className="text-red-500 font-bold">*</span>}
                            </label>
                            <button
                              type="button"
                              onClick={() => handleEditAddTableRow(field.name, field.columns || [])}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>+ Add Row</span>
                            </button>
                          </div>

                          {(!val || !Array.isArray(val) || val.length === 0) ? (
                            <div className="text-xs text-slate-400 italic text-center py-6 bg-white rounded-lg border border-slate-200 w-full">
                              No rows added yet. Click "+ Add Row" to begin.
                            </div>
                          ) : (
                            <div className="overflow-x-auto w-full">
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
                                  {val.map((row: any, rIdx: number) => (
                                    <tr key={rIdx} className="border-b last:border-none border-slate-200">
                                      {(field.columns || []).map((col: any) => (
                                        <td key={col.id} className="p-2">
                                          <input
                                            type={col.type === "number" ? "number" : "text"}
                                            placeholder={col.label}
                                            value={row[col.name] !== undefined ? row[col.name] : ""}
                                            onChange={(e) => handleEditUpdateTableRowValue(
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
                                          onClick={() => handleEditDeleteTableRow(field.name, rIdx)}
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
                      ) : isObject ? (
                        <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl text-left w-full">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>{field.label}</span>
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                            {Object.entries(val).map(([subKey, subVal]) => (
                              <div key={subKey} className="space-y-1 flex flex-col items-start w-full">
                                <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">{subKey}</span>
                                <input
                                  type={typeof subVal === "number" ? "number" : "text"}
                                  value={subVal !== undefined && subVal !== null ? String(subVal) : ""}
                                  onChange={(e) => {
                                    const parsedVal = e.target.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value;
                                    setEditAnswers({
                                      ...editAnswers,
                                      [field.name]: {
                                        ...val,
                                        [subKey]: parsedVal
                                      }
                                    });
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500/10 text-xs font-semibold"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : field.type === "select" ? (
                        <select
                          required={field.required}
                          value={val || ""}
                          onChange={(e) => setEditAnswers({ ...editAnswers, [field.name]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none"
                        >
                          <option value="">-- Choose Option --</option>
                          {field.options?.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <label className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={val || false}
                            onChange={(e) => setEditAnswers({ ...editAnswers, [field.name]: e.target.checked })}
                            className="rounded border-slate-350 text-indigo-500 focus:ring-indigo-505 w-4.5 h-4.5"
                          />
                          <span>Yes, confirm selection</span>
                        </label>
                      ) : field.type === "date" ? (
                        <input
                          type="date"
                          required={field.required}
                          value={val || ""}
                          onChange={(e) => setEditAnswers({ ...editAnswers, [field.name]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none"
                        />
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          required={field.required}
                          value={val || ""}
                          onChange={(e) => setEditAnswers({ ...editAnswers, [field.name]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          required={field.required}
                          value={val || ""}
                          onChange={(e) => setEditAnswers({ ...editAnswers, [field.name]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Edit Payments block */}
                <div className="space-y-2 pt-2 border-t border-slate-100 flex flex-col items-start">
                  <label className="text-xs font-semibold text-slate-600 block">Financial Price (INR)</label>
                  <input
                    type="number"
                    required
                    value={editPayment}
                    onChange={(e) => setEditPayment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none"
                  />
                </div>

                {/* Method selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 block">Clearance Method</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditMethod("Cash")}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                        editMethod === "Cash" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMethod("Online")}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                        editMethod === "Online" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Online
                    </button>
                  </div>
                </div>

                {/* Transaction tag if online */}
                {editMethod === "Online" && (
                  <div className="space-y-1.5 flex flex-col items-start">
                    <label className="text-xs font-semibold text-slate-600 block">Transaction Reference ID</label>
                    <input
                      type="text"
                      required
                      value={editTransaction}
                      onChange={(e) => setEditTransaction(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveEditRecord(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 z-50 animate-bounce duration-300">
          <div className="bg-emerald-500 p-1 rounded-full text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-xs font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Move to Recycle Bin Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in text-left">
          <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6" aria-hidden="true" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-semibold leading-6 text-slate-950">
                Move to Recycle Bin
              </h3>
              <p className="text-xs text-slate-500">
                Move this record to Recycle Bin?
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Recycle Bin</span>
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
