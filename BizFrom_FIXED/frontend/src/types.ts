/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  aadhaar: string;
  profilePhoto: string;
  password?: string;
  status?: "pending" | "verified" | "active" | string;
  createdAt?: string;
}

export type BusinessStatus = "active" | "archived";

export interface Business {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  status: BusinessStatus;
  createdAt: string;
}

export type FieldType = "text" | "number" | "select" | "date" | "boolean" | "table";

export interface TableColumn {
  id: string;
  name: string;
  label: string;
  type: "text" | "number";
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // options for dropdown selections
  columns?: TableColumn[]; // columns for repeating table
}

export interface FormStructure {
  businessId: string;
  fields: FormField[];
}

export interface CustomerRecord {
  id: string;
  businessId: string;
  data: Record<string, any>; // Dynamic Form Field Values
  paymentAmount: number;
  paymentMethod: "Cash" | "Online";
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: "Open" | "In Progress" | "Resolved";
  createdAt: string;
}

export interface SupportFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SalesTrendPoint {
  date: string;
  amount: number;
  registrations: number;
}

export interface BusinessRevenueShare {
  name: string;
  value: number;
  customerCount: number;
}

export interface OverallReport {
  totalBusinesses: number;
  activeBusinesses: number;
  totalCustomers: number;
  totalCollection: number;
  cashCollection: number;
  onlineCollection: number;
  salesTrend: SalesTrendPoint[];
  businessDistribution: BusinessRevenueShare[];
}

export interface BusinessReport {
  id: string;
  name: string;
  totalCustomers: number;
  totalCollection: number;
  cashCollection: number;
  onlineCollection: number;
  monthlyCollections: {
    name: string;
    revenue: number;
    customers: number;
  }[];
}
