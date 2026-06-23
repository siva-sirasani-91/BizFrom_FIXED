/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  User, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Camera, 
  Loader2, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import { UserProfile } from "../types";

const API_BASE_URL = typeof window !== "undefined" && window.location.hostname === "localhost" 
  ? "http://localhost:3000" 
  : "https://bizfrom-fixed.onrender.com";

interface ProfileViewProps {
  user: UserProfile;
  onProfileUpdate: (updatedUser: UserProfile) => void;
}

export default function ProfileView({ user, onProfileUpdate }: ProfileViewProps) {
  // Details form state
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [aadhaar, setAadhaar] = useState(user.aadhaar);
  const [photo, setPhoto] = useState(user.profilePhoto);

  // Password changing form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Loading / notification states
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passError, setPassError] = useState("");

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsLoading(true);
    setDetailsError("");
    setDetailsSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, aadhaar, profilePhoto: photo })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Profile updating failed.");
      }

      setDetailsSuccess("Profile information persisted on backend database successfully.");
      onProfileUpdate(data.user);
    } catch (err: any) {
      setDetailsError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (newPassword !== confirmPassword) {
      setPassError("New password verification does not match.");
      return;
    }

    setPassLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile/${user.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Password transition rejected.");
      }

      setPassSuccess("Password updated in secure registry successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  // Profile image templates
  const avatarPresets = [
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="pb-4 border-b border-slate-100 space-y-1">
        <h1 className="text-2xl font-display font-medium text-slate-900 tracking-tight">Profile Credentials</h1>
        <p className="text-xs text-slate-500 font-medium">Manage corporate identities, phone registers, and certified security passcode overrides.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Photo Selector & Info Details */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="font-display font-semibold text-sm text-slate-950 pb-3 border-b border-slate-100">Store Owner Profile</h2>
          
          {detailsSuccess && (
            <div className="flex items-start gap-2 p-3.5 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-700 text-xs font-semibold">
              <CheckCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{detailsSuccess}</span>
            </div>
          )}

          {detailsError && (
            <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-150 rounded-lg text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{detailsError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateDetails} className="space-y-6">
            {/* Visual avatar options selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 block">System Profile Photo</label>
              <div className="flex items-center space-x-6">
                <img 
                  src={photo} 
                  alt="active avatar" 
                  referrerPolicy="no-referrer"
                  className="w-18 h-18 rounded-2xl object-cover border border-slate-205 shadow-sm" 
                />
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">Choose preset badge:</span>
                  <div className="flex items-center space-x-2">
                    {avatarPresets.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setPhoto(preset)}
                        className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          photo === preset ? "border-indigo-600 scale-105 shadow-sm" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={preset} alt="preset link" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Structured details inputs */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Owner Registered Name</label>
                <div className="relative">
                  <User className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Owner Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Corporate Email Address</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Owner Aadhaar License Code</label>
                <div className="relative">
                  <ShieldCheck className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                    placeholder="e.g. 1234-5678-9012"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={detailsLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {detailsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Persist Profile Changes"}
            </button>
          </form>
        </div>

        {/* Right Side: Security Password Override */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="font-display font-semibold text-sm text-slate-950 pb-3 border-b border-slate-100">Security Credentials</h2>

          {passSuccess && (
            <div className="flex items-start gap-2 p-3.5 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-700 text-xs font-semibold">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-150 rounded-lg text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 block">Existing Passcode</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 block">New Security Passcode</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 block">Repeat New Passcode</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-205 focus:bg-white text-xs text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {passLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Modify Authorization Code"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
