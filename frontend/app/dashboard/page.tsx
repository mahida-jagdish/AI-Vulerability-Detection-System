"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats } from "@/lib/api";
import { Activity, ShieldAlert, Target } from "lucide-react";

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
    return (
        <div className="card p-6 flex items-center justify-between group hover:scale-[1.01] transition-all">
            <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>{label}</p>
                <p className="text-3xl font-black" style={{ color: accent }}>{value}</p>
            </div>
            <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center"
                style={{ background: `${accent}15`, color: accent }}
            >
                {icon}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const data = await getDashboardStats();
                setStats(data);
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-3 p-8" style={{ color: "#64748B" }}>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading dashboard...
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-8 text-sm" style={{ color: "#FCA5A5" }}>
                Failed to load dashboard data. Make sure the backend is running.
            </div>
        );
    }

    const { finding_summary } = stats;

    const severities = [
        { label: "Critical", value: finding_summary.critical, color: "#EF4444" },
        { label: "High", value: finding_summary.high, color: "#F97316" },
        { label: "Medium", value: finding_summary.medium, color: "#F59E0B" },
        { label: "Low", value: finding_summary.low, color: "#3B82F6" },
        { label: "Info", value: finding_summary.info, color: "#64748B" },
    ];

    return (
        <div className="space-y-8 fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight" style={{ color: "#E2E8F0" }}>Dashboard</h1>
                    <p className="text-sm mt-1" style={{ color: "#64748B" }}>Platform overview and vulnerability distribution</p>
                </div>
                <Link href="/scan/new" className="btn btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Start New Scan
                </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Scans" value={stats.total_scans} icon={<Activity className="h-6 w-6" />} accent="#6366F1" />
                <StatCard label="Active Scans" value={stats.active_scans} icon={<Activity className="h-6 w-6 animate-pulse" />} accent="#10B981" />
                <StatCard label="Unique Targets" value={stats.total_targets} icon={<Target className="h-6 w-6" />} accent="#A855F7" />
                <StatCard label="Critical Issues" value={finding_summary.critical} icon={<ShieldAlert className="h-6 w-6" />} accent="#EF4444" />
            </div>

            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "#1A1625", background: "rgba(255,255,255,0.02)" }}>
                    <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #7C3AED, #6366F1)" }} />
                    <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>Global Vulnerability Distribution</h2>
                </div>
                <div className="p-6">
                    <div className="kpi-grid">
                        {severities.map((s) => (
                            <div key={s.label} className="kpi text-center">
                                <span className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>{s.label}</span>
                                <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
