"use client";

import { useEffect, useState } from "react";
import { getTargets } from "@/lib/api";

export default function TargetsPage() {
    const [targets, setTargets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadTargets() {
            try {
                const data = await getTargets();
                setTargets(data);
            } catch (err) {
                console.error("Failed to load targets", err);
            } finally {
                setLoading(false);
            }
        }
        loadTargets();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-3 p-8" style={{ color: "#64748B" }}>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading targets...
            </div>
        );
    }

    const severityBadge = (value: number, color: string, bg: string) => (
        <span
            className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg text-xs font-black font-mono"
            style={{ background: bg, color }}
        >
            {value}
        </span>
    );

    return (
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight" style={{ color: "#E2E8F0" }}>Scanned Targets</h1>
                    <p className="text-sm mt-1" style={{ color: "#64748B" }}>Unique hosts discovered across all scans</p>
                </div>
                <div
                    className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(124, 58, 237, 0.15)", border: "1px solid rgba(124, 58, 237, 0.3)", color: "#A855F7" }}
                >
                    {targets.length} Total Unique Targets
                </div>
            </div>

            <div className="card overflow-hidden">
                {targets.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
                            <svg className="w-8 h-8" style={{ color: "#7C3AED" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" /></svg>
                        </div>
                        <p className="font-bold text-lg" style={{ color: "#94A3B8" }}>No targets found</p>
                        <p className="text-sm mt-1" style={{ color: "#475569" }}>Start a scan to populate this list.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="min-w-full">
                            <thead>
                                <tr style={{ borderBottom: "1px solid #1A1625", background: "rgba(255,255,255,0.02)" }}>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Target Host</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Last Scanned</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Total Scans</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Findings (C / H / M / L)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {targets.map((target, idx) => (
                                    <tr
                                        key={idx}
                                        style={{ borderBottom: "1px solid #1A1625" }}
                                        className="transition-colors"
                                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(124, 58, 237, 0.05)")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold" style={{ color: "#A855F7" }}>
                                            {target.target_host}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: "#64748B" }}>
                                            {new Date(target.last_scanned).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center font-bold" style={{ color: "#94A3B8" }}>
                                            {target.scan_count}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2 font-mono">
                                                {severityBadge(target.finding_summary.critical, "#EF4444", "rgba(239,68,68,0.12)")}
                                                {severityBadge(target.finding_summary.high, "#F97316", "rgba(249,115,22,0.12)")}
                                                {severityBadge(target.finding_summary.medium, "#F59E0B", "rgba(245,158,11,0.12)")}
                                                {severityBadge(target.finding_summary.low, "#3B82F6", "rgba(59,130,246,0.12)")}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
