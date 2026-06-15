"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, cancelScan, downloadReport, getScan } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ScanEvent = {
  timestamp: string;
  stage: string;
  message: string;
  tool?: string;
  percent?: number;
};

type ScanData = {
  scan_id: string;
  status: string;
  progress: number;
  started_at: string | null;
  finished_at: string | null;
  events: ScanEvent[];
};

const TERMINAL_STATUSES = new Set(["completed", "failed", "timeout", "cancelled"]);

// Tool metadata: display name, color, icon emoji
const TOOL_META: Record<string, { label: string; color: string; icon: string }> = {
  "header-check": { label: "Headers", color: "#818CF8", icon: "🛡" },
  "tls-check": { label: "TLS/HTTPS", color: "#34D399", icon: "🔒" },
  "discovery": { label: "Discovery", color: "#60A5FA", icon: "🗺" },
  "nmap": { label: "Nmap", color: "#F472B6", icon: "📡" },
  "whatweb": { label: "WhatWeb", color: "#FBBF24", icon: "🌐" },
  "wafw00f": { label: "WAF Detect", color: "#A78BFA", icon: "🧱" },
  "nuclei": { label: "Nuclei", color: "#F87171", icon: "☢" },
  "nikto": { label: "Nikto", color: "#FB923C", icon: "🔍" },
  "sqlmap": { label: "SQLMap", color: "#EF4444", icon: "💉" },
  "dalfox": { label: "Dalfox XSS", color: "#EC4899", icon: "🎯" },
  "zap-baseline": { label: "OWASP ZAP", color: "#10B981", icon: "⚡" },
  "hakrawler": { label: "Hakrawler", color: "#06B6D4", icon: "🕷" },
  "ffuf": { label: "FFUF", color: "#8B5CF6", icon: "🔨" },
  "testssl": { label: "TestSSL", color: "#84CC16", icon: "📜" },
  "wpscan": { label: "WPScan", color: "#F59E0B", icon: "🔵" },
  "xss-passive": { label: "XSS Passive", color: "#E879F9", icon: "✴" },
  "csrf-check": { label: "CSRF", color: "#38BDF8", icon: "🔄" },
  "redirect-check": { label: "Open Redirect", color: "#4ADE80", icon: "↩" },
  "exposure-check": { label: "File Exposure", color: "#FCD34D", icon: "📁" },
  "ollama": { label: "AI Analysis", color: "#C084FC", icon: "🤖" },
  "reporting": { label: "Reporting", color: "#67E8F9", icon: "📋" },
};

function elapsed(start: string | null): string {
  if (!start) return "–";
  const secs = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function statusStyle(status: string) {
  if (status === "completed") return { color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" };
  if (status === "failed" || status === "timeout") return { color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" };
  if (status === "cancelled") return { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" };
  return { color: "#818CF8", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)" };
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#0D0B14", border: "1px solid #1A1625" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#475569" }}>{label}</p>
      {children}
    </div>
  );
}

/** One terminal panel for a single tool */
function ToolTerminal({
  toolId,
  lines,
  active,
  done,
}: {
  toolId: string;
  lines: string[];
  active: boolean;
  done: boolean;
}) {
  const meta = TOOL_META[toolId] ?? { label: toolId, color: "#94A3B8", icon: "⚙" };
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  const borderColor = active ? meta.color : done ? "rgba(255,255,255,0.06)" : "#1A1625";
  const glow = active ? `0 0 18px -4px ${meta.color}55` : "none";

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden transition-all duration-500"
      style={{
        border: `1px solid ${borderColor}`,
        boxShadow: glow,
        background: "#08070E",
        minHeight: "180px",
        maxHeight: "240px",
      }}
    >
      {/* Titlebar */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${borderColor}` }}
      >
        <span className="text-base">{meta.icon}</span>
        <span className="text-xs font-bold flex-1" style={{ color: meta.color }}>{meta.label}</span>
        {active && (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider" style={{ color: meta.color }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: meta.color }} />
            LIVE
          </span>
        )}
        {!active && done && (
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#374151" }}>done</span>
        )}
        {!active && !done && (
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#1F2937" }}>waiting</span>
        )}
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="flex-1 overflow-auto p-3 font-mono text-[10px] leading-5"
        style={{ color: "#64748B", scrollbarWidth: "none" }}
      >
        {lines.length === 0 ? (
          <span style={{ color: "#1F2937" }}>waiting for output...</span>
        ) : (
          lines.map((line, i) => {
            const isCmd = line.startsWith("$ ");
            const isDone = line.startsWith("# ↳");
            const isWave = line.includes("Wave") && line.includes("==");
            const isFinding = line.toLowerCase().includes("finding");
            return (
              <div
                key={i}
                className="whitespace-pre-wrap break-all"
                style={{
                  color: isCmd ? meta.color
                    : isDone ? "#374151"
                      : isWave ? "#6366F1"
                        : isFinding ? "#10B981"
                          : "#64748B",
                }}
              >
                {line}
              </div>
            );
          })
        )}
        {active && (
          <span className="inline-block w-2 h-3 ml-0.5 animate-pulse" style={{ background: meta.color, verticalAlign: "text-bottom" }} />
        )}
      </div>
    </div>
  );
}

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scanId = params.id;

  const [scan, setScan] = useState<ScanData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [elapsed_, setElapsed] = useState("0s");

  const isDone = useMemo(() => (scan ? TERMINAL_STATUSES.has(scan.status) : false), [scan]);

  // Group events by tool
  const toolLines = useMemo(() => {
    if (!scan) return {} as Record<string, string[]>;
    const map: Record<string, string[]> = {};
    for (const ev of scan.events) {
      const t = ev.tool || "scanner";
      if (!map[t]) map[t] = [];
      if (ev.stage === "command_start") map[t].push(`$ ${ev.message}`);
      else if (ev.stage === "command_end") map[t].push(`# ↳ ${ev.message}`);
      else if (ev.message) map[t].push(ev.message);
    }
    return map;
  }, [scan]);

  // Tools that have appeared in events (ordered by first seen)
  const seenTools = useMemo(() => {
    if (!scan) return [] as string[];
    const order: string[] = [];
    const seen = new Set<string>();
    for (const ev of scan.events) {
      const t = ev.tool;
      if (t && !seen.has(t) && t !== "scanner") {
        seen.add(t);
        order.push(t);
      }
    }
    return order;
  }, [scan]);

  // Tools active in last 12 seconds
  const activeTools = useMemo(() => {
    if (!scan || isDone) return new Set<string>();
    const cutoff = Date.now() - 12000;
    return new Set(scan.events.filter(e => e.tool && new Date(e.timestamp).getTime() > cutoff).map(e => e.tool!));
  }, [scan, isDone]);

  // Timeline events (non-command)
  const timelineEvents = useMemo(
    () => (scan?.events || []).filter(e => !["command_start", "command_output", "command_end"].includes(e.stage)),
    [scan]
  );

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    let active = true;
    const load = async () => {
      try {
        const data = await getScan(scanId);
        if (active) { setScan(data); setError(""); }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        setError(err instanceof Error ? err.message : "Unable to fetch scan status");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [router, scanId]);

  useEffect(() => {
    if (!scan?.started_at || isDone) return;
    const tick = () => setElapsed(elapsed(scan.started_at));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [scan, isDone]);

  const statusCfg = scan ? statusStyle(scan.status) : null;

  return (
    <section className="w-full space-y-5 overflow-x-hidden">

      {/* Header */}
      <header
        className="fade-in flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
        style={{ background: "#0D0B14", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 0 40px -15px rgba(124,58,237,0.15)" }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#7C3AED" }} />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#7C3AED" }}>
              {isDone ? "Scan Complete" : "Parallel Execution Live"}
            </p>
          </div>
          <h1 className="text-2xl font-black" style={{ color: "#E2E8F0" }}>Kali Scanner</h1>
          <p className="font-mono text-xs mt-1 break-all" style={{ color: "#475569" }}>{scanId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/scan/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1A1625", color: "#94A3B8" }}
          >
            + New Scan
          </Link>
          {scan && !isDone && (
            <button
              disabled={cancelling}
              onClick={async () => {
                setCancelling(true);
                try {
                  await cancelScan(scan.scan_id);
                  const updated = await getScan(scan.scan_id);
                  setScan(updated);
                } catch (err) {
                  if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
                  setError(err instanceof Error ? err.message : "Cancel failed");
                } finally { setCancelling(false); }
              }}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 transition-all"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}
            >
              {cancelling ? "Cancelling…" : "✕ Cancel"}
            </button>
          )}
        </div>
      </header>

      {loading && (
        <div className="flex items-center gap-3 px-2 text-sm" style={{ color: "#64748B" }}>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading scan…
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#FCA5A5" }}>
          {error}
        </div>
      )}

      {scan && (
        <>
          {/* Stats row */}
          <div className="fade-in grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Status">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase"
                style={{ color: statusCfg!.color, background: statusCfg!.bg, borderColor: statusCfg!.border }}
              >
                {!isDone && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                {scan.status}
              </span>
            </StatCard>
            <StatCard label="Progress">
              <p className="text-2xl font-black mb-1" style={{ color: "#818CF8" }}>{scan.progress}%</p>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#1A1625" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${scan.progress}%`, background: "linear-gradient(to right, #7C3AED, #6366F1)" }} />
              </div>
            </StatCard>
            <StatCard label="Elapsed">
              <p className="text-2xl font-black" style={{ color: "#E2E8F0" }}>{isDone ? elapsed(scan.started_at) : elapsed_}</p>
            </StatCard>
            <StatCard label="Active Tools">
              <p className="text-2xl font-black" style={{ color: "#10B981" }}>
                {isDone ? seenTools.length : activeTools.size}
                <span className="text-sm font-normal ml-2" style={{ color: "#374151" }}>
                  {isDone ? "completed" : "running"}
                </span>
              </p>
            </StatCard>
          </div>

          {/* Download buttons */}
          {isDone && (
            <div className="fade-in flex flex-wrap gap-3">
              <Link
                href={`/reports/${scan.scan_id}`}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all"
                style={{ background: "linear-gradient(135deg, #7C3AED, #6366F1)", boxShadow: "0 0 25px rgba(124,58,237,0.35)" }}
              >
                📊 Open Report →
              </Link>
              <button className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1A1625", color: "#94A3B8" }} onClick={() => downloadReport(scan.scan_id, "json")}>⬇ JSON</button>
              <button className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1A1625", color: "#94A3B8" }} onClick={() => downloadReport(scan.scan_id, "pdf")}>⬇ PDF</button>
            </div>
          )}

          {/* ── MULTI-TERMINAL GRID ── */}
          <div className="fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #7C3AED, #6366F1)" }} />
              <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                Kali Terminals
                {!isDone && activeTools.size > 0 && (
                  <span className="ml-3 text-[10px] font-bold" style={{ color: "#7C3AED" }}>
                    {activeTools.size} running in parallel
                  </span>
                )}
              </h2>
            </div>

            {seenTools.length === 0 ? (
              // Placeholder grid while waiting
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {["header-check", "nmap", "nuclei", "nikto", "sqlmap", "dalfox", "xss-passive", "csrf-check"].map(tool => (
                  <ToolTerminal key={tool} toolId={tool} lines={[]} active={false} done={false} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {seenTools.map(tool => (
                  <ToolTerminal
                    key={tool}
                    toolId={tool}
                    lines={toolLines[tool] || []}
                    active={activeTools.has(tool)}
                    done={isDone || !activeTools.has(tool)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="fade-in rounded-2xl p-5" style={{ background: "#0D0B14", border: "1px solid #1A1625" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #7C3AED, #6366F1)" }} />
              <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "#94A3B8" }}>Scan Timeline</h2>
            </div>
            <div className="relative space-y-0">
              {timelineEvents.length === 0 && (
                <p className="text-sm" style={{ color: "#475569" }}>No timeline events yet.</p>
              )}
              {timelineEvents.map((event, idx) => {
                const isLast = idx === timelineEvents.length - 1;
                const isActive = isLast && !isDone;
                const toolMeta = event.tool ? (TOOL_META[event.tool] ?? { color: "#475569", icon: "⚙", label: event.tool }) : null;
                return (
                  <div key={`${event.timestamp}-${idx}`} className="relative flex items-start gap-3 pb-4">
                    {!isLast && <div className="absolute left-[7px] top-5 h-full w-0.5" style={{ background: "#1A1625" }} />}
                    <div
                      className="mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 transition-all"
                      style={isActive
                        ? { borderColor: toolMeta?.color ?? "#7C3AED", background: "rgba(124,58,237,0.2)" }
                        : { borderColor: "#1A1625", background: "#0D0B14" }
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {toolMeta && (
                          <span className="text-[10px]">{toolMeta.icon}</span>
                        )}
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: toolMeta?.color ?? "#475569" }}>
                          {toolMeta?.label ?? event.stage}
                        </p>
                        {event.percent !== undefined && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: "rgba(124,58,237,0.15)", color: "#A855F7" }}>
                            {event.percent}%
                          </span>
                        )}
                        <p className="ml-auto text-[10px]" style={{ color: "#334155" }}>
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="mt-1 text-sm" style={{ color: "#94A3B8" }}>{event.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
