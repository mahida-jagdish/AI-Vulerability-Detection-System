"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(username, password);
      setToken(data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: "#05050A" }}
    >
      {/* Deep Space Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
            animation: "pulse-glow 4s ease-in-out infinite"
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
            animation: "pulse-glow 4s ease-in-out 2s infinite"
          }}
        />
        <div
          className="absolute top-[30%] right-[30%] w-[300px] h-[300px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "50px 50px"
          }}
        />
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-3xl p-8 border"
        style={{
          background: "rgba(13, 11, 20, 0.85)",
          borderColor: "rgba(168, 85, 247, 0.2)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 80px -20px rgba(168, 85, 247, 0.25), 0 40px 60px rgba(0,0,0,0.4)"
        }}
      >
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 group mb-10 block">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #A855F7, #EC4899)",
              boxShadow: "0 0 20px rgba(168, 85, 247, 0.4)"
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            Exploitron
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(to right, #C084FC, #EC4899)" }}
            >
              AI
            </span>
          </span>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Welcome back</h1>
          <p className="text-sm" style={{ color: "#94A3B8" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-bold transition-all"
              style={{ color: "#C084FC" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#EC4899")}
              onMouseLeave={e => (e.currentTarget.style.color = "#C084FC")}
            >
              Register now
            </Link>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#64748B" }}>
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(168, 85, 247, 0.2)",
                color: "#F1F5F9",
                caretColor: "#C084FC"
              }}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={e => { e.currentTarget.style.border = "1px solid rgba(168, 85, 247, 0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168, 85, 247, 0.15)"; }}
              onBlur={e => { e.currentTarget.style.border = "1px solid rgba(168, 85, 247, 0.2)"; e.currentTarget.style.boxShadow = "none"; }}
              required
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>
                Password
              </label>
              <button type="button" className="text-xs font-semibold transition-colors" style={{ color: "#64748B" }}>
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-3.5 pr-12 text-sm outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(168, 85, 247, 0.2)",
                  color: "#F1F5F9",
                  caretColor: "#C084FC"
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={e => { e.currentTarget.style.border = "1px solid rgba(168, 85, 247, 0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168, 85, 247, 0.15)"; }}
                onBlur={e => { e.currentTarget.style.border = "1px solid rgba(168, 85, 247, 0.2)"; e.currentTarget.style.boxShadow = "none"; }}
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "#64748B" }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="p-4 rounded-2xl text-sm flex items-start gap-3"
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#FCA5A5"
              }}
            >
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-black text-white transition-all duration-200 mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading ? "rgba(168, 85, 247, 0.5)" : "linear-gradient(135deg, #A855F7, #EC4899)",
              boxShadow: loading ? "none" : "0 0 30px rgba(168, 85, 247, 0.3)"
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 0 40px rgba(236, 72, 153, 0.5)"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = "0 0 30px rgba(168, 85, 247, 0.3)"; }}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Authenticating...
              </>
            ) : (
              <>
                Sign In
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#475569" }}>
          Authorized testing only. All actions are logged.
        </p>
      </div>
    </div>
  );
}
