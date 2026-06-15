"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, createScan } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function NewScanPage() {
  const router = useRouter();
  const [targetUrl, setTargetUrl] = useState("https://example.com");
  const [scopeMode, setScopeMode] = useState<"authorized" | "lab">("authorized");
  const [authorizationAck, setAuthorizationAck] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [generatePoc, setGeneratePoc] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) router.replace("/login");
  }, [router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const created = await createScan({
        target_url: targetUrl,
        scope_mode: scopeMode,
        authorization_ack: authorizationAck,
        advanced_mode: advancedMode,
        generate_poc: generatePoc,
        ai_instructions: aiInstructions,
        notes
      });
      router.push(`/scan/${created.scan_id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
      setError(err instanceof Error ? err.message : "Scan start failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "input-control";

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#7C3AED" }}>Control Panel</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: "#E2E8F0" }}>Start a New Security Scan</h1>
        <p className="text-sm mt-1" style={{ color: "#64748B" }}>Safe checks only, with command output streamed from Kali worker.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="card space-y-5 p-6" onSubmit={onSubmit}>

          {/* Target URL */}
          <div>
            <label className="label">Target URL</label>
            <input
              className={inputCls}
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://target.example"
              required
            />
          </div>

          {/* Scope Mode */}
          <div>
            <label className="label">Scope Mode</label>
            <select
              className={inputCls}
              value={scopeMode}
              onChange={(e) => setScopeMode(e.target.value as "authorized" | "lab")}
            >
              <option value="authorized">Authorized public target</option>
              <option value="lab">Local / private lab target</option>
            </select>
          </div>

          {/* AI Directives */}
          <div>
            <label className="label">AI Directives (Optional)</label>
            <textarea
              className={inputCls}
              rows={2}
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="e.g. Focus heavily on SQL injection vectors..."
            />
            <span className="text-xs mt-1 block" style={{ color: "#475569" }}>
              Instruct the AI analysis model on specific vulnerability types to prioritize.
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Advanced Mode */}
          <label
            className="flex items-start gap-3 rounded-2xl p-4 cursor-pointer transition-all"
            style={{ background: advancedMode ? "rgba(239, 68, 68, 0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${advancedMode ? "rgba(239, 68, 68, 0.3)" : "#1A1625"}` }}
          >
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-red-600"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
            />
            <div>
              <span className="font-bold text-sm" style={{ color: "#E2E8F0" }}>Advanced Execution Mode</span>
              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Enables aggressive flags for deeply exhaustive discovery (longer scan times).</p>
            </div>
          </label>

          {/* Generate PoC */}
          <label
            className="flex items-start gap-3 rounded-2xl p-4 cursor-pointer transition-all"
            style={{ background: generatePoc ? "rgba(124, 58, 237, 0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${generatePoc ? "rgba(124, 58, 237, 0.3)" : "#1A1625"}` }}
          >
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-violet-600"
              checked={generatePoc}
              onChange={(e) => setGeneratePoc(e.target.checked)}
            />
            <div>
              <span className="font-bold text-sm" style={{ color: "#E2E8F0" }}>Generate Proof of Concept (PoC)</span>
              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Uses AI to write step-by-step reproduction steps for each finding (takes longer).</p>
            </div>
          </label>

          {/* Authorization ACK */}
          <label
            className="flex items-start gap-3 rounded-2xl p-4 cursor-pointer transition-all"
            style={{ background: authorizationAck ? "rgba(245, 158, 11, 0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${authorizationAck ? "rgba(245, 158, 11, 0.4)" : "#1A1625"}` }}
          >
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-amber-500"
              checked={authorizationAck}
              onChange={(e) => setAuthorizationAck(e.target.checked)}
            />
            <div>
              <span className="font-bold text-sm" style={{ color: "#E2E8F0" }}>Authorization Confirmation</span>
              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>I confirm I own this target or have written permission to test it.</p>
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-2xl text-sm flex items-start gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#FCA5A5" }}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Queueing...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Start Scan</>
            )}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#7C3AED" }}>Execution Rules</p>
            <ul className="space-y-2 text-sm" style={{ color: "#64748B" }}>
              <li className="flex items-start gap-2"><span style={{ color: "#7C3AED" }}>›</span> Single active scan to keep output deterministic.</li>
              <li className="flex items-start gap-2"><span style={{ color: "#7C3AED" }}>›</span> 20-minute hard cap per run.</li>
              <li className="flex items-start gap-2"><span style={{ color: "#7C3AED" }}>›</span> Kali worker executes scanner commands.</li>
              <li className="flex items-start gap-2"><span style={{ color: "#7C3AED" }}>›</span> No exploit or brute-force actions.</li>
            </ul>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6366F1" }}>What You Get</p>
            <ul className="space-y-2 text-sm" style={{ color: "#64748B" }}>
              <li className="flex items-start gap-2"><span style={{ color: "#6366F1" }}>›</span> Live terminal lines for commands and output.</li>
              <li className="flex items-start gap-2"><span style={{ color: "#6366F1" }}>›</span> Command history with end status.</li>
              <li className="flex items-start gap-2"><span style={{ color: "#6366F1" }}>›</span> Severity breakdown and remediation guidance.</li>
              <li className="flex items-start gap-2"><span style={{ color: "#6366F1" }}>›</span> One-click JSON and PDF download.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
