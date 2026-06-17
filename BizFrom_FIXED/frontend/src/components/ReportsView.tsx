/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from "react";
import { Loader2, RefreshCw, FolderOpen, FileDown, Printer } from "lucide-react";
import { Business, CustomerRecord, FormField, UserProfile } from "../types";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

interface ReportsViewProps {
  userId: string;
  user: UserProfile;
  language: "en" | "te";
}

export default function ReportsView({ userId, user, language }: ReportsViewProps) {
  const isTelugu = language === "te";

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

  const triggerPdfDownload = (doc: jsPDF, fileName: string) => {
    try {
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("PDF generation/download error:", err);
      try {
        const urlFallback = URL.createObjectURL(doc.output("blob"));
        window.open(urlFallback);
      } catch (innerErr) {
        doc.save(fileName);
      }
    }
  };

  // State Management
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBizId, setSelectedBizId] = useState("");
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<CustomerRecord[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Filtering states
  const [filterPeriod, setFilterPeriod] = useState<string>("thisMonth"); // default to thisMonth
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Customer Details Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  // Translations
  const t = {
    title: isTelugu ? "నివేదికలు" : "Reports",
    selectNursery: isTelugu ? "నర్సరీని ఎంచుకోండి:" : "Select Nursery Business:",
    noNurseries: isTelugu ? "యాక్టివ్ నర్సరీలు ఏవీ లేవు" : "No active nurseries found.",
    loadingData: isTelugu ? "నివేదిక డేటాను లోడ్ చేస్తోంది..." : "Loading report data...",
    noRecords: isTelugu ? "ఈ నర్సరీకి ఎటువంటి కస్టమర్ రికార్డులు కనుగొనబడలేదు" : "No customer records found matching active filters.",
    subTitle: isTelugu ? "సింపుల్ టేబుల్ నివేదికలు మరియు ఎగుమతులు" : "Simple table-based nursery record logs with comprehensive filters and exports."
  };

  // 1. Fetch businesses for selector on mount
  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/businesses?userId=${userId}`);
      if (res.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      if (res.ok) {
        const bDataRaw = await res.json();
        const bData: Business[] = Array.isArray(bDataRaw) ? bDataRaw : [];
        setBusinesses(bData);
        if (bData.length > 0) {
          const firstActive = bData.find(b => b.status === "active") || bData[0];
          setSelectedBizId(firstActive.id);
        }
      }
    } catch (err) {
      console.error("Failed to load nurseries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [userId]);

  // 2. Load records and dynamic schema when selected nursery changes
  const loadReportsData = async () => {
    if (!selectedBizId) return;
    try {
      setLoading(true);
      // Fetch dynamic form fields (determines dynamic report columns)
      const schemaRes = await fetch(`/api/forms/${selectedBizId}`);
      if (schemaRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        setFormFields(schemaData.fields || []);
      }

      // Fetch customer records
      const recordsRes = await fetch(`/api/customers?businessId=${selectedBizId}`);
      if (recordsRes.status === 401) {
        window.dispatchEvent(new Event("unauthorized"));
        return;
      }
      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        const activeOnly = Array.isArray(recordsData)
          ? recordsData.filter((r: CustomerRecord) => !r.deletedAt)
          : [];
        setAllRecords(activeOnly);
      }
    } catch (err) {
      console.error("Error loading reports database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [selectedBizId]);

  // Separate non-table fields from table fields
  const nonTableFields = useMemo(() => {
    return formFields.filter(f => f.type !== "table");
  }, [formFields]);

  const tableFields = useMemo(() => {
    return formFields.filter(f => f.type === "table");
  }, [formFields]);

  // Build the complete array of visible table columns
  const columnsToRender = useMemo(() => {
    // 1. Identify the primary name field to ensure it is first and visible
    const nameField = nonTableFields.find(f => {
      const lbl = f.label.trim().toLowerCase();
      const nm = f.name.trim().toLowerCase();
      return lbl.includes("customer") || lbl.includes("name") || nm.includes("customer") || nm.includes("name");
    }) || nonTableFields[0];

    // 2. Put the name field first and append all other non-table fields without any exclusion
    const orderedFields: FormField[] = [];
    if (nameField) {
      orderedFields.push(nameField);
      nonTableFields.forEach(f => {
        if (f.id !== nameField.id) {
          orderedFields.push(f);
        }
      });
    } else {
      orderedFields.push(...nonTableFields);
    }

    // 3. Map them to render schema
    const cols = orderedFields.map(f => ({
      id: f.id,
      label: f.label,
      name: f.name,
      isTableCount: false,
      type: f.type
    }));

    tableFields.forEach(f => {
      cols.push({
        id: f.id,
        label: `${f.label} Count`,
        name: f.name,
        isTableCount: true,
        type: "number"
      });
    });

    // Filtes out prohibited columns per user guidelines
    return cols.filter((col) => {
      const lblLower = col.label.trim().toLowerCase();
      return !(
        lblLower === "cash count" ||
        lblLower === "online count" ||
        lblLower === "offline count" ||
        lblLower === "payment count"
      );
    });
  }, [nonTableFields, tableFields]);

  // Determine which fields are valid quantitative dynamic business numeric values (to sum)
  const numericFields = useMemo(() => {
    return nonTableFields.filter(field => {
      const lbl = field.label.trim().toLowerCase();
      const nm = field.name.trim().toLowerCase();

      // Explicit exclusions list of non-business identifier / non-numeric text / location fields
      const nonNumericKeywords = [
        "name", "phone", "mobile", "contact", "address", "area", "location", "date", "text", "notes", "type", "description",
        "aadhar", "aadhaar", "pincode", "zipcode", "post", "pin", "vehicle", "id", "serial", "variety", "care", "remark", "status",
        "instruction", "block", "zone", "ward"
      ];

      // Exact boundaries check for id keyword to avoid summing code IDs, except for "workers count"
      const isWorkersCount = lbl.includes("workers count") || nm.includes("workers count");
      if (!isWorkersCount) {
        const isExcluded = nonNumericKeywords.some(keyword => lbl.includes(keyword) || nm.includes(keyword));
        if (isExcluded) return false;
        
        // Exclude text types unless they represent standard numeric values
        if (field.type === "text" || field.type === "select" || field.type === "date" || field.type === "boolean") {
          const numericKeywords = ["workers count", "count", "packet", "trip", "amount", "salary", "advance", "qty", "quantity", "bill", "price", "fee", "rate", "weight", "charge", "days", "cost", "total", "commission", "balance"];
          const matchesKeyword = numericKeywords.some(keyword => lbl.includes(keyword) || nm.includes(keyword));
          if (!matchesKeyword) return false;
        }
      }

      // Type is explicitly number
      if (field.type === "number") return true;

      // Otherwise, match common nursery business quantitative fields
      const businessKeywords = ["workers count", "count", "packet", "trip", "amount", "salary", "advance", "qty", "quantity", "bill", "price", "fee", "rate", "weight", "charge", "days", "cost", "total", "commission", "balance"];
      return businessKeywords.some(keyword => lbl.includes(keyword) || nm.includes(keyword));
    });
  }, [nonTableFields]);

  // Filter columns that can be summed up below
  const summableColumns = useMemo(() => {
    return columnsToRender.filter(col => {
      if (col.isTableCount) return true;
      return numericFields.some(nf => nf.name === col.name);
    });
  }, [columnsToRender, numericFields]);

  // 3. Date filtering computations
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      const date = new Date(rec.createdAt);
      const now = new Date();
      
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayEnd);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

      if (filterPeriod === "today") {
        return date >= todayStart && date <= todayEnd;
      }
      if (filterPeriod === "yesterday") {
        return date >= yesterdayStart && date <= yesterdayEnd;
      }
      if (filterPeriod === "thisWeek") {
        const weekStart = new Date(now);
        const dayOfWeek = weekStart.getDay(); // 0 Sunday - 6 Saturday
        weekStart.setDate(weekStart.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        return date >= weekStart && date <= todayEnd;
      }
      if (filterPeriod === "thisMonth") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= monthStart && date <= todayEnd;
      }
      if (filterPeriod === "thisYear") {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return date >= yearStart && date <= todayEnd;
      }
      if (filterPeriod === "custom") {
        if (!customStart) return true;
        const start = new Date(customStart);
        const end = customEnd ? new Date(customEnd) : new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      }
      return true;
    });
  }, [allRecords, filterPeriod, customStart, customEnd]);

  // 4. Dynamic Totals Calculations based on Filtered Records
  const totals = useMemo(() => {
    const counts = {
      uniqueCustomers: 0
    };

    // Calculate unique customer names ignoring case
    const uniqueCustsSet = new Set<string>();
    filteredRecords.forEach((rec) => {
      const candidateName = rec.data.customerName || rec.data.customerNameUpper || rec.data.customer_name || rec.data.name || "Unknown";
      if (typeof candidateName === "string" && candidateName.trim() !== "") {
        uniqueCustsSet.add(candidateName.trim().toLowerCase());
      }
    });
    counts.uniqueCustomers = uniqueCustsSet.size;

    // Sum all regular dynamic numeric fields + table array counts
    const fieldsSums: Record<string, number> = {};
    numericFields.forEach(f => {
      fieldsSums[f.name] = 0;
    });
    tableFields.forEach(f => {
      fieldsSums[f.name] = 0;
    });

    filteredRecords.forEach((rec) => {
      // 1. Accumulate standard numeric schema inputs
      numericFields.forEach(field => {
        const val = Number(rec.data[field.name]);
        if (!isNaN(val) && rec.data[field.name] !== undefined && rec.data[field.name] !== null && rec.data[field.name] !== "") {
          fieldsSums[field.name] += val;
        }
      });

      // 2. Accumulate sub-table item sizes
      tableFields.forEach(field => {
        const arr = rec.data[field.name];
        const count = Array.isArray(arr) ? arr.length : 0;
        fieldsSums[field.name] += count;
      });
    });

    return {
      uniqueCustomerCount: counts.uniqueCustomers,
      fieldTotals: fieldsSums
    };
  }, [filteredRecords, numericFields, tableFields]);

  // Current selected Business nursery object
  const activeNursery = useMemo(() => {
    return businesses.find((b) => b.id === selectedBizId);
  }, [businesses, selectedBizId]);

  // PDF Export Generation Handlers
  const handleExportPDF = () => {
    const doc = new jsPDF("l", "pt", "a4"); // Landscape mode
    const nurseryName = activeNursery?.name || "Nursery Business";

    // Header styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(`${nurseryName} - Customer Activity Report`, 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Period: ${filterPeriod.toUpperCase()}`, 40, 70);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 40, 85);

    let yPos = 110;
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(40, yPos - 12, 800, yPos - 12);

    // Dynamic Columns layout width mapping
    const colCount = columnsToRender.length;
    const colWidth = Math.floor(740 / Math.max(1, colCount));

    // Dynamic Header row
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // Slate-700

    columnsToRender.forEach((col, idx) => {
      const maxColChars = Math.max(5, Math.floor(colWidth / 5.5));
      const truncatedLabel = col.label.length > maxColChars ? col.label.substring(0, maxColChars - 2) + ".." : col.label;
      doc.text(truncatedLabel, 40 + idx * colWidth, yPos);
    });

    doc.line(40, yPos + 4, 800, yPos + 4);
    yPos += 18;

    // Data Row Iteration logs
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    filteredRecords.forEach((rec) => {
      // Handle pagination spillover
      if (yPos > 500) {
        doc.addPage();
        yPos = 50;
        doc.setFont("helvetica", "bold");
        columnsToRender.forEach((col, idx) => {
          const maxColChars = Math.max(5, Math.floor(colWidth / 5.5));
          const truncatedLabel = col.label.length > maxColChars ? col.label.substring(0, maxColChars - 2) + ".." : col.label;
          doc.text(truncatedLabel, 40 + idx * colWidth, yPos);
        });
        doc.line(40, yPos + 4, 800, yPos + 4);
        yPos += 18;
        doc.setFont("helvetica", "normal");
      }

      columnsToRender.forEach((col, idx) => {
        let val;
        if (col.isTableCount) {
          val = Array.isArray(rec.data[col.name]) ? rec.data[col.name].length : 0;
        } else {
          val = rec.data[col.name];
        }
        const strVal = val !== undefined && val !== null && val !== "" ? String(val) : "-";
        const maxColChars = Math.max(5, Math.floor(colWidth / 5.5));
        const truncatedVal = strVal.length > maxColChars ? strVal.substring(0, maxColChars - 2) + ".." : strVal;
        doc.text(truncatedVal, 40 + idx * colWidth, yPos);
      });

      yPos += 16;
    });

    // Space separator
    yPos += 20;
    if (yPos > 490) {
      doc.addPage();
      yPos = 50;
    }
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.line(40, yPos - 10, 800, yPos - 10);

    // Totals headers
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("TOTALS SUMMARY", 40, yPos);
    yPos += 18;

    const totalsHeaders = ["Total Customers", ...summableColumns.map(col => {
      if (col.isTableCount) return `Total ${col.label.replace(" Count", "")}`;
      return `Total ${col.label}`;
    })];
    const totColWidth = Math.floor(740 / totalsHeaders.length);

    totalsHeaders.forEach((th, idx) => {
      doc.text(th, 40 + idx * totColWidth, yPos);
    });
    yPos += 14;

    // Totals values
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105); // Emerald-600

    const totalsValues = [
      String(totals.uniqueCustomerCount || filteredRecords.length),
      ...summableColumns.map(col => {
        const val = totals.fieldTotals[col.name] || 0;
        const colLabelLower = col.label.toLowerCase();
        const isPricingVal = colLabelLower.includes("amount") || colLabelLower.includes("salary") || colLabelLower.includes("advance") || colLabelLower.includes("bill") || colLabelLower.includes("price") || colLabelLower.includes("fee") || colLabelLower.includes("rate");
        return isPricingVal ? `Rs. ${val.toLocaleString("en-IN")}` : val.toLocaleString("en-IN");
      })
    ];

    totalsValues.forEach((tv, idx) => {
      doc.text(tv, 40 + idx * totColWidth, yPos);
    });

    const fileName = `${nurseryName.replace(/\s+/g, "_")}_Filtered_Report.pdf`;
    triggerPdfDownload(doc, fileName);
  };

  // Excel Export Generation Handlers
  const handleExportExcel = () => {
    const wsData: any[] = [];
    const nurseryName = activeNursery?.name || "Nursery Business";

    // Header & Metadata
    wsData.push([`${nurseryName} - Filtered Activity Report`]);
    wsData.push([`Period: ${filterPeriod.toUpperCase()}`]);
    wsData.push([`Generated At: ${new Date().toLocaleString()}`]);
    wsData.push([]); // spacer

    // Main Columns
    const headers = columnsToRender.map(col => col.label);
    wsData.push(headers);

    // Rows
    filteredRecords.forEach(rec => {
      const row = columnsToRender.map(col => {
        if (col.isTableCount) {
          return Array.isArray(rec.data[col.name]) ? rec.data[col.name].length : 0;
        }
        const val = rec.data[col.name];
        return val !== undefined && val !== null ? val : "";
      });
      wsData.push(row);
    });

    wsData.push([]); // spacing
    wsData.push([]); // spacing

    // Totals title & columns
    const totalsHeaders = ["Total Customers", ...summableColumns.map(col => {
      if (col.isTableCount) return `Total ${col.label.replace(" Count", "")}`;
      return `Total ${col.label}`;
    })];
    wsData.push(totalsHeaders);

    // Totals calculations
    const totalsValues = [
      totals.uniqueCustomerCount || filteredRecords.length,
      ...summableColumns.map(col => totals.fieldTotals[col.name] || 0)
    ];
    wsData.push(totalsValues);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nursery Report");

    const filePrefix = nurseryName.replace(/\s+/g, "_");
    XLSX.writeFile(wb, `${filePrefix}_Filtered_Report.xlsx`);
  };

  // Single Customer Portrait PDF Statement
  const handleExportSingleCustomerPDF = (customer: CustomerRecord) => {
    const doc = new jsPDF("p", "pt", "a4"); // Portrait Mode
    const nurseryName = activeNursery?.name || "Nursery Customer Registry";
    const customerName = customer.data.customerName || customer.data.customerNameUpper || customer.data.customer_name || customer.data.name || "Unknown Customer";

    // Header styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(nurseryName, 40, 50);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("CUSTOMER DETAILS & SYSTEM RECORDS", 40, 68);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Statement Generated: ${new Date().toLocaleString()}`, 40, 80);
    doc.text(`Customer Record Audit Key: #${customer.id.substring(0, 8)}`, 350, 80);

    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(40, 92, 555, 92);

    let yPos = 115;

    // 1. Nursery Intake Schema Fields Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("NURSERY INTAKE SCHEMA FIELDS", 40, yPos);
    yPos += 15;

    // Render non-table fields in 2-column grid format
    for (let i = 0; i < nonTableFields.length; i += 2) {
      if (yPos > 730) {
        doc.addPage();
        yPos = 50;
      }

      // Left Box
      const fieldL = nonTableFields[i];
      const rawValL = customer.data[fieldL.name];
      const valL = rawValL !== undefined && rawValL !== null && rawValL !== "" ? String(rawValL) : "-";

      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(40, yPos, 245, 38, "DF");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(fieldL.label.toUpperCase(), 50, yPos + 12);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text(valL, 50, yPos + 26);

      // Right Box (if exists)
      if (i + 1 < nonTableFields.length) {
        const fieldR = nonTableFields[i + 1];
        const rawValR = customer.data[fieldR.name];
        const valR = rawValR !== undefined && rawValR !== null && rawValR !== "" ? String(rawValR) : "-";

        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.rect(310, yPos, 245, 38, "DF");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(fieldR.label.toUpperCase(), 320, yPos + 12);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(valR, 320, yPos + 26);
      }

      yPos += 48;
    }

    yPos += 10;

    // 2. Financial Transaction Details Header
    if (yPos > 720) {
      doc.addPage();
      yPos = 50;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("FINANCIAL TRANSACTION DETAILS", 40, yPos);
    yPos += 15;

    // Three horizontal boxes
    // Total Amount (Emerald styling)
    doc.setDrawColor(167, 243, 208); // Emerald-200
    doc.setFillColor(240, 253, 250); // Emerald-50
    doc.rect(40, yPos, 165, 38, "DF");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text("TOTAL AMOUNT", 50, yPos + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(4, 120, 87); // Emerald-700
    doc.text(`₹${getRecordAmount(customer).toLocaleString("en-IN")}`, 50, yPos + 26);

    // Payment Method
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(215, yPos, 165, 38, "DF");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("PAYMENT METHOD", 225, yPos + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(String(customer.paymentMethod || "—"), 225, yPos + 26);

    // Transaction ID
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(390, yPos, 165, 38, "DF");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("TRANSACTION ID", 400, yPos + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(String(customer.transactionId || "—"), 400, yPos + 26);

    yPos += 58;

    // 3. Dynamic Repeating Tables (such as Workers, Plant Packs list, etc.)
    tableFields.forEach((field) => {
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const cleanLabel = (() => {
        const lbl = field.label.trim().toLowerCase();
        if (lbl === "workers" || lbl === "worker") return "Workers Details";
        if (lbl === "cash" || lbl === "payment" || lbl === "cash ledger") return "Payment Details";
        return field.label;
      })();
      doc.text(cleanLabel.toUpperCase(), 40, yPos);
      yPos += 15;

      const subRows = customer.data[field.name] || [];
      if (subRows.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text("No repeating row records listed in this intake entry.", 55, yPos);
        yPos += 25;
        return;
      }

      const columns = field.columns || [];
      const colWidth = Math.floor(515 / Math.max(1, columns.length));

      // Draw table header
      doc.setFillColor(241, 245, 249);
      doc.rect(40, yPos - 12, 515, 18, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      columns.forEach((col: any, colIdx: number) => {
        doc.text(col.label, 45 + colIdx * colWidth, yPos);
      });

      doc.setDrawColor(203, 213, 225);
      doc.line(40, yPos + 8, 555, yPos + 8);
      yPos += 22;

      // Draw rows
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);

      const subTableTotals: Record<string, number> = {};
      columns.forEach((col: any) => {
        if (col.type === "number") {
          subTableTotals[col.name] = 0;
        }
      });

      subRows.forEach((row: any) => {
        if (yPos > 740) {
          doc.addPage();
          yPos = 50;

          // Repeat headers
          doc.setFillColor(241, 245, 249);
          doc.rect(40, yPos - 12, 515, 18, "F");
          doc.setFont("helvetica", "bold");
          columns.forEach((col: any, colIdx: number) => {
            doc.text(col.label, 45 + colIdx * colWidth, yPos);
          });
          doc.line(40, yPos + 8, 555, yPos + 8);
          yPos += 22;
          doc.setFont("helvetica", "normal");
        }

        columns.forEach((col: any, colIdx: number) => {
          const val = row[col.name];
          const strVal = val !== undefined && val !== null ? String(val) : "-";
          doc.text(strVal, 45 + colIdx * colWidth, yPos);

          if (col.type === "number" && !isNaN(Number(val))) {
            subTableTotals[col.name] += Number(val);
          }
        });

        yPos += 16;
      });

      // Show Sub-table Totals Row
      const hasNumericCols = Object.keys(subTableTotals).length > 0;
      if (hasNumericCols) {
        doc.setDrawColor(203, 213, 225);
        doc.line(40, yPos - 10, 555, yPos - 10);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        columns.forEach((col: any, colIdx: number) => {
          if (colIdx === 0) {
            doc.text("Total", 45, yPos);
          } else if (col.type === "number") {
            const sumStr = subTableTotals[col.name].toLocaleString("en-IN");
            const labelLower = (col.label || "").toLowerCase();
            const isCash = labelLower.includes("amount") || labelLower.includes("rate") || labelLower.includes("salary") || labelLower.includes("advance") || labelLower.includes("total") || labelLower.includes("price") || labelLower.includes("rent");
            doc.text((isCash ? "₹" : "") + sumStr, 45 + colIdx * colWidth, yPos);
          }
        });
        yPos += 20;
      }

      yPos += 15;
    });

    // 4. Ingestion Datestamp & Status footer
    if (yPos > 740) {
      doc.addPage();
      yPos = 50;
    }
    
    doc.setDrawColor(226, 232, 240);
    doc.line(40, yPos, 555, yPos);
    yPos += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Ingestion Datestamp: ${new Date(customer.createdAt).toLocaleString()}`, 40, yPos);
    doc.text("Record Status: Verified & Saved", 420, yPos);

    const safeCustName = customerName.replace(/\s+/g, "_");
    triggerPdfDownload(doc, `${safeCustName}_Statement.pdf`);
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in text-left select-none">
      
      {/* Dynamic Header Switcher */}
      <div className="pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">{t.title}</h1>
          <p className="text-xs text-slate-500 font-medium">{t.subTitle}</p>
        </div>

        {/* Nursery Business Chooser Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Nursery:</label>
          <select
            value={selectedBizId}
            onChange={(e) => setSelectedBizId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer min-w-[200px]"
          >
            {businesses.length === 0 ? (
              <option value="">{t.noNurseries}</option>
            ) : (
              businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name}
                </option>
              ))
            )}
          </select>
          <button
            onClick={() => loadReportsData()}
            className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh logs Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 bg-white border border-slate-100 rounded-xl flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <span className="text-xs text-slate-400 font-mono tracking-wider font-semibold uppercase">{t.loadingData}</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Simple controls: Filters & Exports */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all">
            
            {/* 1. Period Range Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mr-2 font-mono">Date Range:</span>
              <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg">
                {[
                  { id: "today", label: isTelugu ? "నేడు" : "Today" },
                  { id: "yesterday", label: isTelugu ? "నిన్న" : "Yesterday" },
                  { id: "thisWeek", label: isTelugu ? "ఈ వారం" : "This Week" },
                  { id: "thisMonth", label: isTelugu ? "ఈ నెల" : "This Month" },
                  { id: "thisYear", label: isTelugu ? "ఈ సంవత్సరం" : "This Year" },
                  { id: "custom", label: isTelugu ? "అనుకూల తేదీ" : "Custom Range" }
                ].map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setFilterPeriod(period.id)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                      filterPeriod === period.id 
                        ? "bg-white text-slate-900 shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* Custom Range Range Picker */}
              {filterPeriod === "custom" && (
                <div className="flex items-center gap-1.5 ml-2 animate-fade-in">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                    placeholder="Start date"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                    placeholder="End date"
                  />
                </div>
              )}
            </div>

            {/* 2. File Export Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportPDF}
                disabled={filteredRecords.length === 0}
                className="px-4 py-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                id="btn-export-pdf"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={filteredRecords.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                id="btn-export-excel"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
            </div>

          </div>

          {/* Core Table View Section */}
          {filteredRecords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
              <FolderOpen className="w-8 h-8 text-slate-300" />
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">No Records Available</span>
                <p className="text-xs text-slate-500">{t.noRecords}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* PRIMARY REPORTS DATA TABLE */}
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-xs" id="reports-main-data-table-container">
                <table className="min-w-full text-xs text-left border-collapse" id="reports-main-data-table">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-600 font-bold">
                      {columnsToRender.map((col) => (
                        <th key={col.id} className="p-3 border-r last:border-r-0 border-slate-200 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredRecords.map((rec) => {
                      return (
                        <tr 
                          key={rec.id} 
                          onClick={() => setSelectedCustomer(rec)}
                          className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                        >
                          {columnsToRender.map((col, idx) => {
                            const isFirstCell = idx === 0;
                            let rawVal;

                            if (col.isTableCount) {
                              rawVal = Array.isArray(rec.data[col.name]) ? rec.data[col.name].length : 0;
                            } else {
                              rawVal = rec.data[col.name];
                            }

                            const formattedVal = rawVal !== undefined && rawVal !== null && rawVal !== "" ? String(rawVal) : "-";

                            if (isFirstCell) {
                              return (
                                <td 
                                  key={col.id} 
                                  className="p-3 border-r last:border-r-0 border-slate-200 font-bold text-indigo-650 text-indigo-600 hover:underline"
                                >
                                  {formattedVal}
                                </td>
                              );
                            }

                            const isNumField = col.isTableCount || numericFields.some(nf => nf.id === col.id);
                            return (
                              <td 
                                key={col.id} 
                                className={`p-3 border-r last:border-r-0 border-slate-200 ${
                                  isNumField ? "font-mono font-medium text-slate-900" : "text-slate-700"
                                }`}
                              >
                                {formattedVal}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TOTALS VALUE DISPLAY DIRECTLY BELOW THE TABLE */}
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-xs" id="reports-totals-table-container">
                <table className="min-w-full text-xs text-left border-collapse" id="reports-totals-table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-3 border-r border-slate-200 whitespace-nowrap font-bold">
                        Total Customers
                      </th>
                      {summableColumns.map((col) => (
                        <th key={col.id} className="p-3 border-r last:border-r-0 border-slate-200 whitespace-nowrap font-bold">
                          {col.isTableCount ? `Total ${col.label.replace(" Count", "")}` : `Total ${col.label}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr className="font-bold text-slate-950 font-extrabold bg-slate-50/40">
                      <td className="p-3 border-r border-slate-200 font-mono text-sm text-indigo-650">
                        {totals.uniqueCustomerCount || filteredRecords.length}
                      </td>
                      {summableColumns.map((col) => {
                        const sumValue = totals.fieldTotals[col.name] || 0;
                        const labelLower = col.label.toLowerCase();
                        const isPricingVal = labelLower.includes("amount") || labelLower.includes("salary") || labelLower.includes("advance") || labelLower.includes("bill") || labelLower.includes("price") || labelLower.includes("fee") || labelLower.includes("rate");

                        return (
                          <td 
                            key={col.id} 
                            className={`p-3 border-r last:border-r-0 border-slate-200 font-mono text-sm ${
                              isPricingVal ? "text-emerald-700 font-bold" : "text-slate-950 font-semibold"
                            }`}
                          >
                            {isPricingVal ? "₹" : ""}{sumValue.toLocaleString("en-IN")}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>
      )}

      {/* FULL CUSTOMER DETAILS MODAL SCREEN OVERLAY */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-container">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                background-color: white !important;
                color: black !important;
                font-family: inherit;
              }
              #modal-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: white !important;
                z-index: 99999 !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
              }
              #customer-details-card {
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
              .shadow-xl, .shadow-2xs, .shadow-xs, .shadow-md, .shadow-sm {
                box-shadow: none !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}} />

          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh]" id="customer-details-card">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between print:hidden">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider">Customer Registry</span>
                <h3 className="font-bold text-slate-900 text-sm">Full Customer Details & System Records</h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center font-bold text-slate-400 hover:text-slate-700 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* PRINT-ONLY HEADER LOGO */}
              <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-3">
                <p className="text-[9px] font-bold font-mono tracking-widest text-slate-400 uppercase">Statement of Nursery Account Records & Transaction Statement</p>
                <h2 className="text-xl font-bold text-slate-950 tracking-tight mt-0.5">
                  {activeNursery?.name || "Nursery Customer Registry"}
                </h2>
                <div className="grid grid-cols-2 gap-4 mt-3 text-[10px] text-slate-500 font-mono">
                  <div>Statement Generated: {new Date().toLocaleString()}</div>
                  <div className="text-right">Customer Record Audit Key: #{selectedCustomer.id.substring(0, 8)}</div>
                </div>
              </div>

              {/* Dynamic Customer Key-Value Fields */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider print:text-xs">
                  Nursery Intake Schema Fields
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
                  {nonTableFields.map((field) => {
                    const rawVal = selectedCustomer.data[field.name];
                    const displayVal = rawVal !== undefined && rawVal !== null && rawVal !== "" ? String(rawVal) : "-";
                    return (
                      <div key={field.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 print:bg-slate-50 print:border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5 print:text-[8px]">{field.label}</span>
                        <span className="text-xs font-semibold text-slate-800 font-sans break-words">{displayVal}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explicit Payment Details Session */}
              <div className="pt-4 border-t border-slate-100 space-y-3 print:pt-3 print:border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider print:text-xs">
                  Financial Transaction Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 print:bg-emerald-50/30 print:border-emerald-200">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block tracking-wider mb-0.5 print:text-[8px]">Total Amount</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono break-words">
                      ₹{getRecordAmount(selectedCustomer).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 print:bg-slate-50 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5 print:text-[8px]">Payment Method</span>
                    <span className="text-xs font-semibold text-slate-800 font-sans break-words">
                      {selectedCustomer.paymentMethod || "—"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 print:bg-slate-50 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5 print:text-[8px]">Transaction ID</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 break-words">
                      {selectedCustomer.transactionId || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Repeating Tables (e.g. Workers repeating data logs) */}
              {tableFields.map((field) => {
                const subRows = selectedCustomer.data[field.name] || [];
                return (
                  <div key={field.id} className="pt-4 border-t border-slate-100 space-y-2.5 print:pt-3 print:border-slate-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-1">
                        <span>
                          {(() => {
                            const lbl = field.label.trim().toLowerCase();
                            if (lbl === "workers" || lbl === "worker") return "Workers Details";
                            if (lbl === "cash" || lbl === "payment" || lbl === "cash ledger") return "Payment Details";
                            return field.label;
                          })()}
                        </span>
                      </h4>
                    </div>

                    {subRows.length === 0 ? (
                      <div className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center italic print:border print:border-slate-200">
                        No repeating row records listed in this intake entry.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs print:border print:border-slate-200">
                        <table className="min-w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                              {(field.columns || []).map((col: any) => (
                                <th key={col.id} className="p-2.5 border-r last:border-r-0 border-slate-200 font-bold whitespace-nowrap">
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {subRows.map((row: any, subRowIdx: number) => (
                              <tr key={subRowIdx} className="hover:bg-slate-50/55 transition-colors">
                                {(field.columns || []).map((col: any) => {
                                  const cellVal = row[col.name];
                                  const renderVal = cellVal !== undefined && cellVal !== null ? String(cellVal) : "-";
                                  const isColNum = col.type === "number";

                                  return (
                                    <td 
                                      key={col.id} 
                                      className={`p-2.5 border-r last:border-r-0 border-slate-200 ${
                                        isColNum ? "font-mono font-medium text-slate-900" : "text-slate-700"
                                      }`}
                                    >
                                      {renderVal}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                            {/* Cumulative Totals line inside the sub-table UI */}
                            {(() => {
                              const columns = field.columns || [];
                              const hasNumericCols = columns.some((col: any) => col.type === "number");
                              if (!hasNumericCols) return null;

                              return (
                                <tr className="bg-slate-50/70 font-bold border-t border-slate-300 print:bg-slate-100">
                                  {columns.map((col: any, colIdx: number) => {
                                    if (colIdx === 0) {
                                      return (
                                        <td key={col.id} className="p-2.5 border-r last:border-r-0 border-slate-200 text-slate-800 font-bold">
                                          Total
                                        </td>
                                      );
                                    }
                                    
                                    const colSum = subRows.reduce((acc: number, r: any) => {
                                      const v = Number(r[col.name]);
                                      return acc + (isNaN(v) ? 0 : v);
                                    }, 0);

                                    const hasNumbers = subRows.some((r: any) => {
                                      const val = r[col.name];
                                      return val !== undefined && val !== null && val !== "" && !isNaN(Number(val));
                                    });

                                    if (hasNumbers) {
                                      const labelLower = (col.label || "").toLowerCase();
                                      const isCash = labelLower.includes("online") || labelLower.includes("offline") || labelLower.includes("cash") || labelLower.includes("amount") || labelLower.includes("rate") || labelLower.includes("salary") || labelLower.includes("advance") || labelLower.includes("total") || labelLower.includes("price") || labelLower.includes("rent") || labelLower.includes("fee") || labelLower.includes("bill") || labelLower.includes("charges");
                                      return (
                                        <td key={col.id} className="p-2.5 border-r last:border-r-0 border-slate-200 font-mono text-slate-950 font-extrabold">
                                          {isCash ? "₹" : ""}{colSum.toLocaleString("en-IN")}
                                        </td>
                                      );
                                    }

                                    return (
                                      <td key={col.id} className="p-2.5 border-r last:border-r-0 border-slate-200 text-slate-400">
                                        —
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Auxiliary System Logs */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono print:text-[8px] print:pt-2 print:border-slate-200">
                <span>Ingestion Datestamp: {new Date(selectedCustomer.createdAt).toLocaleString()}</span>
                <span>Record Status: Verified &amp; Saved</span>
              </div>

            </div>

            {/* Modal Footer with print/download functionality */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleExportSingleCustomerPDF(selectedCustomer)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-indigo-150"
                  title="Download Statement as PDF"
                >
                  <FileDown size={14} className="text-indigo-650" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-750 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-emerald-150"
                  title="Print Account Statement"
                >
                  <Printer size={14} className="text-emerald-650" />
                  <span>Print Receipt</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                type="button"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
