"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";

const CORRECT_PASSWORD = "letsgetit";
const AUTH_KEY = "mymanifest_authenticated";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    setIsAuthenticated(stored === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password === CORRECT_PASSWORD) {
      setIsUnlocking(true);
      // Brief unlock animation before revealing content
      await new Promise((resolve) => setTimeout(resolve, 800));
      sessionStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
    } else {
      setIsShaking(true);
      setError("Access denied");
      setTimeout(() => setIsShaking(false), 500);
      setPassword("");
      inputRef.current?.focus();
    }
  };

  // Loading state — avoid flash
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Authenticated — render children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Login gate
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 50% 45%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div
        className={`relative w-full max-w-sm transition-transform duration-500 ${
          isShaking ? "animate-shake" : ""
        } ${isUnlocking ? "scale-95 opacity-0 transition-all duration-700" : ""}`}
      >
        {/* Lock icon */}
        <div className="flex justify-center mb-8">
          <div
            className={`relative flex items-center justify-center w-16 h-16 rounded-2xl border transition-all duration-500 ${
              isUnlocking
                ? "border-green-500/40 bg-green-500/10"
                : error
                ? "border-red-500/30 bg-red-500/5"
                : "border-neutral-800 bg-neutral-900/50"
            }`}
          >
            {isUnlocking ? (
              <ShieldCheck className="w-7 h-7 text-green-400 animate-pulse" />
            ) : (
              <Lock
                className={`w-7 h-7 transition-colors duration-300 ${
                  error ? "text-red-400" : "text-neutral-400"
                }`}
              />
            )}
            {/* Glow ring */}
            <div
              className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
                isUnlocking ? "opacity-100" : "opacity-0"
              }`}
              style={{
                boxShadow: "0 0 30px rgba(74, 222, 128, 0.15)",
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-xs font-bold tracking-[0.3em] text-neutral-300 font-display uppercase">
            MyManifest
          </h1>
          <p className="text-[10px] tracking-[0.2em] text-neutral-600 mt-2 font-display uppercase">
            Enter password to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <div className="relative group">
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Password"
              autoComplete="off"
              className={`w-full px-4 py-3.5 pr-12 rounded-xl bg-neutral-950 text-white text-sm font-medium tracking-wider placeholder-neutral-600 border transition-all duration-300 focus:outline-none ${
                error
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-neutral-800 focus:border-neutral-600 group-hover:border-neutral-700"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer p-1"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Error message */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              error ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <p className="text-[10px] font-bold tracking-[0.2em] text-red-400 uppercase text-center">
              {error}
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!password || isUnlocking}
            className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-xs tracking-[0.2em] uppercase hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer group/btn"
          >
            {isUnlocking ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
