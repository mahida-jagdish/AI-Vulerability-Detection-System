"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { clearToken, getToken } from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function DashIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" /></svg>;
}
function TargetIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" /></svg>;
}
function ScansIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
}
function ReportsIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function SettingsIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function ContactIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashIcon /> },
  { href: "/targets", label: "Targets", icon: <TargetIcon /> },
  { href: "/scans", label: "Scans", icon: <ScansIcon /> },
  { href: "/reports", label: "Reports", icon: <ReportsIcon /> },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: <SettingsIcon /> },
  { href: "/contact", label: "Contact", icon: <ContactIcon /> },
];

function SideNavItem({
  item,
  active,
  onClick
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group"
      style={
        active
          ? {
            background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.1))",
            color: "#C084FC",
            border: "1px solid rgba(168,85,247,0.3)",
            boxShadow: "inset 3px 0 0 #A855F7"
          }
          : {
            color: "#64748B",
            border: "1px solid transparent"
          }
      }
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.color = "#94A3B8";
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.color = "#64748B";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <span
        className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all"
        style={
          active
            ? {
              background: "linear-gradient(135deg, #A855F7, #EC4899)",
              color: "white",
              boxShadow: "0 0 12px rgba(168, 85, 247, 0.4)"
            }
            : {
              background: "rgba(255,255,255,0.05)",
              color: "#64748B"
            }
        }
      >
        {item.icon}
      </span>
      <span>{item.label}</span>
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-nebula-400" style={{ background: "#C084FC" }} />
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const isLanding = pathname === "/";
  const isAuth = pathname === "/login" || pathname === "/register";
  const activePath = useMemo(() => pathname || "/dashboard", [pathname]);

  useEffect(() => {
    if (isAuth || isLanding) {
      setAuthChecked(true);
      return;
    }
    const token = getToken();
    if (!token) {
      setAuthChecked(false);
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [isAuth, isLanding, router, pathname]);

  // Landing or auth pages — no shell
  if (isLanding || isAuth) {
    return <>{children}</>;
  }

  if (!authChecked) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#05050A" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #A855F7, #EC4899)", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}
          >
            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: "#64748B" }}>Initializing secure workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#05050A" }}
    >
      {/* Backdrop on mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="fixed lg:relative inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0"
        style={{
          background: "rgba(13, 11, 20, 0.95)",
          borderRight: "1px solid rgba(168, 85, 247, 0.1)",
          backdropFilter: "blur(20px)",
          transform: menuOpen ? "translateX(0)" : undefined
        }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: "rgba(168, 85, 247, 0.1)" }}>
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #A855F7, #EC4899)", boxShadow: "0 0 15px rgba(168,85,247,0.4)" }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Exploitron
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(to right, #C084FC, #EC4899)" }}
              >
                AI
              </span>
            </span>
          </Link>
          <button
            className="lg:hidden p-1 rounded-lg transition-colors"
            style={{ color: "#64748B" }}
            onClick={() => setMenuOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#334155" }}>Navigation</p>
          {PRIMARY_NAV.map((item) => (
            <SideNavItem
              key={item.href}
              item={item}
              active={activePath === item.href || activePath.startsWith(`${item.href}/`)}
              onClick={() => setMenuOpen(false)}
            />
          ))}

          <div className="pt-4 mt-4 border-t" style={{ borderColor: "rgba(168, 85, 247, 0.08)" }}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#334155" }}>System</p>
            {SECONDARY_NAV.map((item) => (
              <SideNavItem
                key={item.href}
                item={item}
                active={activePath === item.href || activePath.startsWith(`${item.href}/`)}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </div>
        </nav>

        {/* User Footer */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "rgba(168, 85, 247, 0.1)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(168, 85, 247, 0.1)" }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
              style={{ background: "linear-gradient(135deg, #A855F7, #EC4899)" }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">Admin</p>
              <p className="text-xs truncate" style={{ color: "#475569" }}>Operator</p>
            </div>
            <button
              title="Logout"
              className="p-1 rounded-lg transition-colors flex-shrink-0"
              style={{ color: "#475569" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
              onClick={() => {
                clearToken();
                router.push("/login");
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center gap-4 px-6 py-4 border-b flex-shrink-0"
          style={{
            background: "rgba(13, 11, 20, 0.85)",
            borderColor: "rgba(168, 85, 247, 0.1)",
            backdropFilter: "blur(20px)"
          }}
        >
          <button
            className="lg:hidden p-2 rounded-xl transition-colors"
            style={{ color: "#64748B", background: "rgba(255,255,255,0.04)" }}
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div className="flex-1">
            <p className="text-sm font-bold text-white capitalize">
              {activePath.split("/").filter(Boolean).join(" / ") || "Dashboard"}
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.2)", color: "#C084FC" }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nebula-400 opacity-75" style={{ background: "#C084FC" }}></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#A855F7" }}></span>
            </span>
            System Online
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6" style={{ background: "#05050A" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
