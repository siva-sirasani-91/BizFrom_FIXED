/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ShieldCheck, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Fingerprint
} from "lucide-react";
import { UserProfile } from "../types";

type AuthMode = "login" | "register" | "otp" | "forgot" | "reset";

interface AuthPageProps {
  initialMode: "login" | "register";
  onLoginSuccess: (user: UserProfile) => void;
  onBackToLanding: () => void;
}

export default function AuthPage({ initialMode, onLoginSuccess, onBackToLanding }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  // Registration data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  
  // OTP state
  const [otp, setOtp] = useState("");
  
  // Reset password state
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [rememberMe, setRememberMe] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify your fields.");
      return;
    }

    setLoading(true);
    try {
     const response = await fetch("https://bizfrom-fixed.onrender.com/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, confirmPassword, name, phone, aadhaar })
});

let data: any = {};

const text = await response.text();

if (text) {
  data = JSON.parse(text);
}

if (!response.ok) {
  throw new Error(data.error || "Failed to initiate registration.");
}
      // OTP generated and sent
      setMode("otp");
      setSuccessMsg(data.message || "An activation OTP code has been dispatched to your email address.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setErrorMsg("");
  setSuccessMsg("");

  try {
    const response = await fetch("https://bizfrom-fixed.onrender.com/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });

    let data: any = {};

    const text = await response.text();

    if (text) {
      data = JSON.parse(text);
    }

    if (!response.ok) {
      throw new Error(data.error || "OTP verification failed.");
    }

    setSuccessMsg("Account created successfully!");

    setTimeout(() => {
      onLoginSuccess(data.user);
    }, 1000);

  } catch (err: any) {
    setErrorMsg(err.message);
  } finally {
    setLoading(false);
  }
};

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
     const response = await fetch("https://bizfrom-fixed.onrender.com/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe })
      });
     let data: any = {};

      const text = await response.text();

     if (text) {
      data = JSON.parse(text);
    }

      if (!response.ok) {
        throw new Error(data.error || "Login credentials rejected.");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

 const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email) {
    setErrorMsg("Please enter email address to request password reset.");
    return;
  }

  setLoading(true);
  setErrorMsg("");
  setSuccessMsg("");

  try {
  const response = await fetch("https://bizfrom-fixed.onrender.com/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    let data: any = {};

    const text = await response.text();

    if (text) {
      data = JSON.parse(text);
    }

    if (!response.ok) {
      throw new Error(data.error || "Reset password request failed.");
    }

    setMode("reset");

    setSuccessMsg(
      data.message || "Reset link dispatched. Enter the reset OTP below."
    );

  } catch (err: any) {
    setErrorMsg(err.message);
  } finally {
    setLoading(false);
  }
};

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch("https://bizfrom-fixed.onrender.com/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });


      let data: any = {};

      const text = await response.text();

     if (text) {
     data = JSON.parse(text);
     }
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }
      setSuccessMsg("Password reset successfully! Redirecting to Log In...");
      setTimeout(() => {
        setMode("login");
        setSuccessMsg("");
        setOtp("");
        setPassword("");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans leading-none relative">
      
      {/* Back button */}
      <div className="absolute top-8 left-8">
        <button 
          onClick={onBackToLanding}
          className="flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/35">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-medium text-slate-950 tracking-tight leading-normal">
            {mode === "login" && "Welcome Back"}
            {mode === "register" && "Create Your Account"}
            {mode === "otp" && "Verify Security Code"}
            {mode === "forgot" && "Recover Your Password"}
            {mode === "reset" && "Set New Password"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "login" && "Enter your details to access your dashboard"}
            {mode === "register" && "Provide your details to set up your store and custom forms"}
            {mode === "otp" && "Enter the verification code to activate your account"}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-slate-200 shadow-sm rounded-2xl space-y-6">
          
          {errorMsg && (
            <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-150 rounded-lg text-red-700 text-xs font-medium">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3.5 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-700 text-xs font-medium">
              <CheckCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="siva@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500">Password</label>
                  <button 
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs font-semibold text-slate-500 select-none cursor-pointer">
                  Remember Me (keeps session active)
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log In to Dashboard"}
              </button>
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Owner Name</label>
                <div className="relative">
                  <User className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Siva S"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 block">Aadhaar (Optional)</label>
                  <div className="relative">
                    <ShieldCheck className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={aadhaar}
                      onChange={(e) => setAadhaar(e.target.value)}
                      placeholder="1234-5678-9012"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="siva@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Account Password</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Identity & Send OTP"}
              </button>
            </form>
          )}

          {/* MODE: OTP VERIFICATION */}
          {mode === "otp" && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Enter 6-Digit OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g., 429302"
                  className="w-full tracking-widest text-center py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-lg font-bold rounded-lg text-slate-800 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Verification Code"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Change registration info
                </button>
              </div>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Your Registered Email</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="siva@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dispatch Security OTP"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Return to Log in
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESET PASSWORD */}
          {mode === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Security Reset OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 549321"
                  className="w-full tracking-widest text-center py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-sm font-semibold rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Enter New Password</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 text-xs rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Credentials"}
              </button>
            </form>
          )}



          {/* Back & Forth toggles */}
          <div className="text-center text-xs font-medium text-slate-500">
            {mode === "login" && (
              <span>
                Don't have an account?{" "}
                <button 
                  onClick={() => { setMode("register"); setErrorMsg(""); setSuccessMsg(""); }} 
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Create one here
                </button>
              </span>
            )}
            {mode === "register" && (
              <span>
                Already registered?{" "}
                <button 
                  onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }} 
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Log In
                </button>
              </span>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
