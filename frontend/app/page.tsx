"use client";

import Link from "next/link";
import { useEffect, useRef, useState, memo } from "react";
import { motion, useInView } from "framer-motion";
import { Component as SecurityIcons } from "@/components/ui/animated-security-icons";

// ─── STATIC DATA (no re-creation) ───────────────────────────────────────────

const FINDINGS = [
  { sev: "CRITICAL", color: "#EC4899", msg: "SQL Injection — /api/auth" },
  { sev: "HIGH", color: "#C084FC", msg: "XSS — /search?q= parameter" },
  { sev: "INFO", color: "#3B82F6", msg: "Port 443/80 open — Apache 2.4" },
  { sev: "MEDIUM", color: "#A855F7", msg: "TLS 1.0 still enabled" },
  { sev: "CRITICAL", color: "#EC4899", msg: "RCE via file upload — /upload" },
  { sev: "HIGH", color: "#C084FC", msg: "SSRF on image proxy endpoint" },
  { sev: "INFO", color: "#3B82F6", msg: "WAF detected — Cloudflare bypass" },
  { sev: "MEDIUM", color: "#A855F7", msg: "JWT alg:none accepted" },
  { sev: "CRITICAL", color: "#EC4899", msg: "IDOR on /api/users/:id" },
  { sev: "HIGH", color: "#C084FC", msg: "Broken Access Control — /admin" },
];

const TERMINAL_LINES = [
  { text: "$ nmap -sV -p- --open 192.168.1.0/24", color: "#C084FC", isCmd: true },
  { text: "  Discovered 3 hosts · 42 open ports", color: "#475569", isCmd: false },
  { text: "$ nuclei -u https://target.com -t cves/", color: "#C084FC", isCmd: true },
  { text: "  [CRITICAL] CVE-2023-44487 matched", color: "#EC4899", isCmd: false },
  { text: "$ sqlmap -u https://target.com/api --batch", color: "#C084FC", isCmd: true },
  { text: "  [HIGH] SQLi confirmed on /api/auth", color: "#EC4899", isCmd: false },
  { text: "$ ai-enrich --model gpt-4o --findings .", color: "#C084FC", isCmd: true },
  { text: "  CVSS 9.8 · CWE-89 · remediation ready", color: "#A855F7", isCmd: false },
  { text: "$ generate-report --format pdf,json", color: "#C084FC", isCmd: true },
  { text: "  ✓ report_20260301.pdf exported", color: "#22C55E", isCmd: false },
];

const FEATURES = [
  {
    icon: "🪐", title: "Reconnaissance Engine", color: "#3B82F6",
    desc: "Discovers subdomains, hosts, open ports, and service banners using Nmap, WhatWeb, and WafW00f.",
    bullets: ["Port & service fingerprinting", "WAF detection", "Technology stack mapping", "Endpoint discovery"]
  },
  {
    icon: "🛡️", title: "Vulnerability Matrix", color: "#A855F7",
    desc: "Nuclei templates, Nikto, SQLMap, ZAP baseline and passive checks to surface real CVEs.",
    bullets: ["Nuclei template engine", "Nikto & SQLMap fusion", "OWASP Top 10 coverage", "TLS & Header analysis"]
  },
  {
    icon: "🧠", title: "AI Enrichment Core", color: "#C084FC",
    desc: "Enriches findings with CWE IDs, CVSS scores, and remediation steps via Ollama or OpenAI.",
    bullets: ["Optional PoC generation", "Contextual remediation", "CVSS 3.1 & CWE scoring", "Multi-model orchestration"]
  },
  {
    icon: "📄", title: "Executive Telemetry", color: "#EC4899",
    desc: "Generates PDF and JSON reports ready for bug bounty submissions or internal security review.",
    bullets: ["PDF & JSON export", "Severity breakdown KPIs", "Executive summary", "Event timelines"]
  },
  {
    icon: "⚡", title: "Live Scan Interface", color: "#C084FC",
    desc: "Watch every tool execute in real time via a tool-by-tool terminal with time analytics.",
    bullets: ["Real-time event streaming", "Per-tool terminals", "Time analytics", "In-flight cancellation"]
  },
  {
    icon: "🔒", title: "Zero-G Safe Mode", color: "#A855F7",
    desc: "Scans run in passive, non-destructive mode inside an isolated Kali Linux Docker worker.",
    bullets: ["Isolated container worker", "No destructive payloads", "Authorization checkpoint", "Immutable audit log"]
  },
];

const CHAIN = [
  { step: "01", label: "Recon", sub: "Nmap · WhatWeb · WafW00f", color: "#3B82F6", icon: "🔭" },
  { step: "02", label: "Map", sub: "Subdomain · Endpoints", color: "#818CF8", icon: "🗺️" },
  { step: "03", label: "Exploit", sub: "Nuclei · SQLMap · Nikto", color: "#A855F7", icon: "💥" },
  { step: "04", label: "Enrich", sub: "AI · CVSS · CWE · PoC", color: "#C084FC", icon: "🧠" },
  { step: "05", label: "Report", sub: "PDF · JSON · Executive", color: "#EC4899", icon: "📊" },
];

const STACK = [
  { label: "Next.js 14", color: "#C084FC" }, { label: "FastAPI", color: "#A855F7" },
  { label: "Celery", color: "#9333EA" }, { label: "PostgreSQL", color: "#EC4899" },
  { label: "Redis", color: "#3B82F6" }, { label: "Kali Linux", color: "#818CF8" },
  { label: "Nuclei", color: "#C084FC" }, { label: "Ollama", color: "#D8B4FE" },
];

// Particles: pre-computed positions so no math on every render
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  left: `${8 + ((i * 7.3) % 84)}%`,
  top: `${4 + ((i * 8.7) % 88)}%`,
  color: i % 3 === 0 ? "#EC4899" : i % 3 === 1 ? "#C084FC" : "#3B82F6",
  delay: `${(i * 0.4) % 4}s`,
  duration: `${4 + (i % 3)}s`,
}));

// ─── STAT COUNTER (memoized) ─────────────────────────────────────────────────
const StatCounter = memo(function StatCounter({
  end, suffix = "", label,
}: { end: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const total = 50;
    const tick = () => {
      frame++;
      setCount(Math.round((frame / total) * end));
      if (frame < total) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl font-black text-white tabular-nums">{count}{suffix}</p>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</p>
    </div>
  );
});

// ─── FEATURE CARD (memoized, CSS transitions, no framer per-frame) ────────────
const FeatureCard = memo(function FeatureCard({
  feature, index, active,
}: { feature: typeof FEATURES[0]; index: number; active: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top - r.height / 2) / r.height) * -8;
    const ry = ((e.clientX - r.left - r.width / 2) / r.width) * 8;
    cardRef.current.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
  };
  const onMouseLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = "";
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="feature-card group relative rounded-3xl border border-space-700 bg-space-800/60 p-7 backdrop-blur-md overflow-hidden transition-[transform,border-color,box-shadow] duration-300 ease-out"
      style={{
        transformStyle: "preserve-3d",
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.55s ease ${index * 0.08}s, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${index * 0.08}s`,
      }}
    >
      {/* hover corner glow — CSS only, no JS */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{ background: `radial-gradient(circle at 0 0, ${feature.color}18, transparent 65%)` }} />

      <div className="relative z-10">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-space-700 bg-space-900 text-xl
          group-hover:border-opacity-60 transition-all duration-300"
          style={{ "--hover-color": feature.color } as React.CSSProperties}>
          {feature.icon}
        </div>
        <h3 className="mb-3 text-lg font-black text-white leading-snug">{feature.title}</h3>
        <p className="mb-5 text-sm leading-relaxed text-slate-400 font-light">{feature.desc}</p>
        <ul className="space-y-2">
          {feature.bullets.map((b, j) => (
            <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: `${feature.color}22`, color: feature.color }}>
                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [termLines, setTermLines] = useState(0);
  const [chainActive, setChainActive] = useState(0);
  const [chainStarted, setChainStarted] = useState(false);

  const featuresRef = useRef<HTMLDivElement>(null);
  const chainRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.05 });
  const chainInView = useInView(chainRef, { once: true, amount: 0.2 });

  // Scroll listener — passive, no state-heavy logic
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Terminal typewriter — one interval, one state integer (minimal re-renders)
  useEffect(() => {
    const id = setInterval(() => {
      setTermLines(n => {
        if (n >= TERMINAL_LINES.length) { clearInterval(id); return n; }
        return n + 1;
      });
    }, 800);
    return () => clearInterval(id);
  }, []);

  // Kill chain cycling — only starts once in view
  useEffect(() => {
    if (!chainInView || chainStarted) return;
    setChainStarted(true);
    const id = setInterval(() => setChainActive(n => (n + 1) % CHAIN.length), 1800);
    return () => clearInterval(id);
  }, [chainInView, chainStarted]);

  const navLinks = [
    { href: "#home", label: "Home" }, { href: "#features", label: "Capabilities" },
    { href: "#chain", label: "Kill Chain" }, { href: "#about", label: "Modules" },
  ];

  const termPct = Math.round((termLines / TERMINAL_LINES.length) * 100);

  return (
    <div className="bg-space-900 min-h-screen text-slate-200 font-sans selection:bg-nebula-500/30 overflow-x-hidden relative">

      {/* ══ STATIC BACKGROUND (pure CSS, zero JS) ══ */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Purple grid — static */}
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(to right,rgba(192,132,252,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(192,132,252,0.04) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        {/* Nebula orbs — CSS animated */}
        <div className="orb-1 absolute top-[-8%] left-[-12%] w-[650px] h-[650px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(147,51,234,0.15), transparent 70%)", filter: "blur(80px)" }} />
        <div className="orb-2 absolute bottom-[8%] right-[-8%] w-[550px] h-[550px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.1), transparent 70%)", filter: "blur(100px)" }} />
        <div className="orb-3 absolute top-[42%] left-[38%] w-[380px] h-[380px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.1), transparent 70%)", filter: "blur(80px)" }} />
        {/* Floating particles — CSS animated */}
        {PARTICLES.map((p, i) => (
          <div key={i} className="absolute w-[3px] h-[3px] rounded-full"
            style={{
              left: p.left, top: p.top, background: p.color,
              animation: `p-float ${p.duration} ease-in-out ${p.delay} infinite`
            }} />
        ))}
      </div>

      {/* ══ LIVE TICKER (CSS scroll, single DOM update) ══ */}
      <div className="fixed top-0 inset-x-0 z-[60] overflow-hidden"
        style={{ height: 30, background: "rgba(5,5,10,0.95)", borderBottom: "1px solid rgba(168,85,247,0.18)" }}>
        <div className="h-full flex items-center">
          <div className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-nebula-500/25 h-full bg-space-900">
            <div className="w-1.5 h-1.5 rounded-full bg-nebula-pink dot-ping" />
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-nebula-400">LIVE SCAN</span>
          </div>
          {/* Pure CSS scroll — no JS motion */}
          <div className="overflow-hidden flex-1 relative h-full flex items-center">
            <div className="ticker-track flex gap-0 whitespace-nowrap">
              {[...FINDINGS, ...FINDINGS].map((f, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-5 text-[11px] font-mono">
                  <span className="font-black text-[9px] px-1.5 py-[1px] rounded-sm border"
                    style={{ color: f.color, borderColor: `${f.color}35`, background: `${f.color}10` }}>
                    {f.sev}
                  </span>
                  <span className="text-slate-400">{f.msg}</span>
                  <span className="text-slate-700 ml-4">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ NAVBAR ══ */}
      <nav className={`fixed top-[30px] inset-x-0 z-50 transition-[background,border,padding,box-shadow] duration-300 ${scrolled ? "bg-space-900/88 backdrop-blur-lg border-b border-space-700/50 py-3 shadow-[0_4px_40px_rgba(0,0,0,0.5)]"
          : "bg-transparent py-5"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-nebula-400 to-nebula-pink opacity-70 blur-[8px] group-hover:opacity-100 transition-opacity" />
              <div className="relative w-9 h-9 rounded-xl bg-space-800 border border-space-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-nebula-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Exploitron<span className="bg-clip-text text-transparent bg-gradient-to-r from-nebula-400 to-nebula-pink">AI</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <a key={l.label} href={l.href}
                className="text-sm font-medium text-slate-300 hover:text-nebula-400 transition-colors relative group">
                {l.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-nebula-400 to-nebula-pink transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard"
              className="rounded-full p-[1px] bg-gradient-to-r from-nebula-500 to-nebula-pink group hover:shadow-[0_0_22px_rgba(168,85,247,0.5)] transition-shadow">
              <div className="bg-space-900 rounded-full px-5 py-2 group-hover:bg-transparent transition-colors">
                <span className="text-sm font-bold text-white group-hover:text-space-900 transition-colors">Initialize</span>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section id="home" className="relative z-10 pt-44 pb-16">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* LEFT — Copy (framer-motion entrance, fires once) */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>

            <div className="inline-flex items-center gap-2 rounded-full border border-nebula-500/30 bg-nebula-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-nebula-400 backdrop-blur-sm mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-nebula-400 dot-ping" />
              Autonomous Pentest Platform
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[3.8rem] xl:text-7xl font-black text-white tracking-tighter leading-[1.05] mb-6">
              Hack smarter.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-nebula-400 via-nebula-pink to-nebula-blue">
                Defy limits.
              </span>
            </h1>

            <p className="text-base text-slate-400 mb-9 leading-relaxed font-light max-w-lg">
              ExploitronAI automates your entire pentest workflow — from deep recon to AI-enriched PoC generation,
              inside an isolated Kali Linux environment.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link href="/dashboard"
                className="rounded-xl bg-gradient-to-r from-nebula-500 to-nebula-pink px-7 py-3.5 text-sm font-bold text-white
                  shadow-[0_0_22px_rgba(192,132,252,0.3)] hover:shadow-[0_0_34px_rgba(236,72,153,0.5)] hover:scale-105
                  transition-[transform,box-shadow] duration-200 flex items-center gap-2 group">
                Launch Platform
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <a href="#chain"
                className="rounded-xl border border-space-700 bg-space-800/50 px-7 py-3.5 text-sm font-bold text-slate-200
                  hover:bg-space-700/60 hover:border-nebula-500/40 hover:scale-105 transition-[transform,background,border] duration-200 backdrop-blur-md">
                See Kill Chain
              </a>
            </div>

            <div className="grid grid-cols-3 gap-6 border-t border-space-700/50 pt-8 relative
              before:absolute before:-top-px before:inset-x-0 before:h-px
              before:bg-gradient-to-r before:from-transparent before:via-nebula-500/35 before:to-transparent">
              <StatCounter end={8} suffix="+" label="Security Modules" />
              <StatCounter end={100} suffix="%" label="Non-Destructive" />
              <div className="text-center">
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-nebula-400 to-nebula-pink">AI</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">Guided Scans</p>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Terminal (minimal re-renders: only termLines integer triggers update) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative">
            <div className="rounded-2xl border border-space-700 bg-space-800/85 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.1)]">
              {/* Terminal title bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-space-700/80 bg-space-900/70">
                <div className="w-3 h-3 rounded-full bg-nebula-pink opacity-80" />
                <div className="w-3 h-3 rounded-full bg-amber-400 opacity-70" />
                <div className="w-3 h-3 rounded-full bg-emerald-400 opacity-70" />
                <div className="flex-1 text-center">
                  <span className="text-[11px] font-mono text-slate-600 tracking-wider">exploitron — zsh — 80×24</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-nebula-pink dot-ping" />
                  <span className="text-[9px] font-bold text-nebula-pink tracking-widest uppercase">SCANNING</span>
                </div>
              </div>

              {/* Terminal body — CSS transitions, no AnimatePresence */}
              <div className="p-5 font-mono text-[12px] leading-relaxed space-y-1.5 min-h-[310px]">
                {TERMINAL_LINES.map((line, i) => (
                  <div key={i}
                    className="flex items-start gap-2 transition-[opacity,transform] duration-300"
                    style={{
                      opacity: termLines > i ? 1 : 0,
                      transform: termLines > i ? "translateX(0)" : "translateX(-6px)",
                      color: line.color,
                    }}>
                    <span className="flex-shrink-0 select-none" style={{ color: line.isCmd ? "#A855F7" : "#334155" }}>
                      {line.isCmd ? "›" : "│"}
                    </span>
                    <span>{line.text}</span>
                  </div>
                ))}
                {termLines < TERMINAL_LINES.length && (
                  <span className="inline-block w-2 h-[14px] bg-nebula-400 rounded-sm ml-8 blink" />
                )}
              </div>

              {/* Progress bar */}
              <div className="px-5 py-2.5 border-t border-space-700/60 bg-space-900/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-slate-600 tracking-widest uppercase">Scan Progress</span>
                  <span className="text-[9px] font-mono text-nebula-400">{termPct}%</span>
                </div>
                <div className="h-[3px] bg-space-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-nebula-500 to-nebula-pink transition-[width] duration-500"
                    style={{ width: `${termPct}%` }} />
                </div>
              </div>
            </div>
            {/* Soft glow behind terminal — static, no animation */}
            <div className="absolute inset-0 -z-10 rounded-2xl blur-[50px]"
              style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)" }} />
          </motion.div>
        </div>
      </section>

      {/* ══ KILL CHAIN ══ */}
      <section id="chain" ref={chainRef} className="relative z-10 py-20 border-y border-space-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.55 }}
            className="text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-nebula-500/30 bg-nebula-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-nebula-400 mb-4">
              ⚙️ Attack Lifecycle
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-nebula-400 to-nebula-pink">Kill Chain</span> — automated.
            </h2>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-0">
            {CHAIN.map((step, i) => (
              <div key={step.step} className="flex flex-col md:flex-row items-center flex-1" style={{ minWidth: 0 }}>
                {/* Node — CSS class toggle, no per-frame JS */}
                <div className="relative flex flex-col items-center">
                  {/* Ring — CSS animation toggled by className */}
                  <div
                    className={`absolute w-[72px] h-[72px] rounded-full transition-all duration-500 ${chainActive === i ? "chain-ring-active" : ""}`}
                    style={{
                      border: `1px solid ${step.color}`,
                      background: `${step.color}10`,
                      opacity: chainActive === i ? 1 : 0.2,
                    }}
                  />
                  <div className="relative z-10 w-[60px] h-[60px] rounded-full border-2 flex items-center justify-center text-xl bg-space-900 transition-[border-color,box-shadow] duration-400"
                    style={{
                      borderColor: chainActive === i ? step.color : "#1A1625",
                      boxShadow: chainActive === i ? `0 0 22px ${step.color}50` : "none",
                    }}>
                    {step.icon}
                  </div>
                  <div className="mt-3 text-center pb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: step.color }}>{step.step}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{step.label}</p>
                    <p className="text-[10px] text-slate-500 max-w-[88px] leading-tight mt-0.5">{step.sub}</p>
                  </div>
                </div>
                {/* Connector — pure CSS dash animation */}
                {i < CHAIN.length - 1 && (
                  <div className="flex-1 hidden md:flex items-center justify-center px-2" style={{ minWidth: 36 }}>
                    <svg width="100%" height="14" viewBox="0 0 60 14" fill="none" className="w-full max-w-[72px]">
                      <line x1="0" y1="7" x2="52" y2="7" stroke="#A855F7" strokeWidth="1.5" strokeDasharray="4 3"
                        style={{ animation: "chain-dash 1s linear infinite" }} />
                      <polygon points="52,3 60,7 52,11" fill="#A855F7" opacity="0.7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" ref={featuresRef} className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-nebula-500/30 bg-nebula-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-nebula-400 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-nebula-400 dot-ping" /> Capabilities
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Capabilities Matrix</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base font-light">
              Every subsystem precision-engineered to map, exploit, enrich, and report — autonomously.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} feature={f} index={i} active={featuresInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ CORE SUBSYSTEMS ICONS ══ */}
      <section id="about" className="relative z-10 py-20 border-t border-space-800/50 bg-space-800/12 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-nebula-500/30 bg-nebula-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-nebula-400 mb-5">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-nebula-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-nebula-500" />
              Core Subsystems
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Every module.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-nebula-400 to-nebula-pink">Always alive.</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto font-light">
              Each subsystem pulses in sync — radar sweeps targets, AI enriches, the chain builds itself.
            </p>
          </motion.div>
          <SecurityIcons />
        </div>
      </section>

      {/* ══ TECH STACK ══ */}
      <section className="relative z-10 py-16 border-t border-space-800/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <motion.h2
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-xl font-black text-white mb-10 tracking-tight">
            Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-nebula-400 to-nebula-pink">Next-Gen Core</span>
          </motion.h2>
          <div className="flex flex-wrap justify-center gap-3">
            {STACK.map((t, i) => (
              <div key={t.label}
                className="rounded-xl border border-space-700 bg-space-800/50 px-5 py-2.5 text-sm font-bold text-slate-300
                  backdrop-blur-md hover:border-opacity-50 hover:text-white hover:-translate-y-1
                  transition-[transform,border-color,color] duration-200 cursor-default"
                style={{
                  borderColor: "#1A1625",
                  animationDelay: `${i * 0.07}s`,
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 24px ${t.color}30`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="relative z-10 py-16 border-t border-space-800/50">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.55 }}
            className="relative rounded-3xl border border-space-700 bg-space-800/60 px-8 py-12 text-center overflow-hidden backdrop-blur-xl">
            {/* Animated gradient — CSS background-size trick */}
            <div className="absolute inset-0 -z-10 rounded-3xl"
              style={{
                background: "linear-gradient(135deg, #A855F720, #05050A, #EC489912, #05050A, #A855F720)",
                backgroundSize: "400% 400%",
                animation: "cta-glow 8s ease infinite",
              }} />
            <div className="inline-flex items-center gap-2 rounded-full border border-nebula-500/30 bg-nebula-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-nebula-400 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-nebula-pink dot-ping" /> Ready to scan
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
              Begin your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-nebula-400 to-nebula-pink">autonomous pentest</span>
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8 font-light text-sm">
              Drop your target URL and let ExploitronAI handle everything — from first packet to final report.
            </p>
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-nebula-500 to-nebula-pink px-8 py-4
                text-sm font-bold text-white shadow-[0_0_28px_rgba(168,85,247,0.4)]
                hover:scale-105 hover:shadow-[0_0_44px_rgba(236,72,153,0.55)] transition-[transform,box-shadow] duration-200 group">
              Initialize Platform
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="relative z-10 border-t border-space-800 bg-space-900 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nebula-500 to-nebula-pink flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-black text-white tracking-tight">
              Exploitron<span className="text-transparent bg-clip-text bg-gradient-to-r from-nebula-400 to-nebula-pink">AI</span>
            </span>
          </div>
          <p className="text-xs font-medium text-slate-600 text-center">
            © {new Date().getFullYear()} ExploitronAI · Operating in deep space · Educational & authorized testing only
          </p>
          <div className="flex gap-5">
            {["Transmission", "Repository", "Comms"].map(s => (
              <a key={s} href="#" className="text-xs font-bold text-slate-500 hover:text-nebula-400 transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </footer>

      {/* Inline keyframe for chain dash (too small for globals.css) */}
      <style>{`
        @keyframes chain-dash { to { stroke-dashoffset: -14; } }
      `}</style>
    </div>
  );
}
