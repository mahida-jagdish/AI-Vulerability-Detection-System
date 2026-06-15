"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelScan, getScans } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { ArrowRight, CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

export default function ScansPage() {
    const router = useRouter();
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState<string | null>(null);

    const loadScans = async () => {
        try {
            const data = await getScans();
            setScans(data);
        } catch (err) {
            console.error("Failed to load scans", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!getToken()) { router.replace("/login"); return; }
        loadScans();
        const timer = setInterval(loadScans, 5000);
        return () => clearInterval(timer);
    }, [router]);

    function statusBadge(status: string) {
        const configs: Record<string, { bg: string; color: string; border: string }> = {
            completed: { bg: "rgba(16, 185, 129, 0.12)", color: "#10B981", border: "rgba(16, 185, 129, 0.3)" },
            running: { bg: "rgba(99, 102, 241, 0.12)", color: "#818CF8", border: "rgba(99, 102, 241, 0.3)" },
            analyzing: { bg: "rgba(99, 102, 241, 0.12)", color: "#818CF8", border: "rgba(99, 102, 241, 0.3)" },
            queued: { bg: "rgba(245, 158, 11, 0.12)", color: "#F59E0B", border: "rgba(245, 158, 11, 0.3)" },
            failed: { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444", border: "rgba(239, 68, 68, 0.3)" },
            timeout: { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444", border: "rgba(239, 68, 68, 0.3)" },
            cancelled: { bg: "rgba(100, 116, 139, 0.12)", color: "#64748B", border: "rgba(100, 116, 139, 0.3)" },
        };
        const cfg = configs[status] || { bg: "rgba(100, 116, 139, 0.12)", color: "#64748B", border: "rgba(100, 116, 139, 0.3)" };
        return (
            <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize border"
                style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
            >
                {statusIcon(status)} {status}
            </span>
        );
    }

    function statusIcon(status: string) {
        if (status === "completed") return <CheckCircle2 className="h-3 w-3" />;
        if (["running", "queued", "analyzing"].includes(status)) return <Loader2 className="h-3 w-3 animate-spin" />;
        if (["failed", "timeout", "cancelled"].includes(status)) return <XCircle className="h-3 w-3" />;
        return <Circle className="h-3 w-3" />;
    }

    const isActive = (s: string) => ["queued", "running", "analyzing"].includes(s);

    const handleCancel = async (scanId: string) => {
        setCancelling(scanId);
        try { await cancelScan(scanId); await loadScans(); }
        catch (e) { console.error("Cancel failed", e); }
        finally { setCancelling(null); }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 p-8" style={{ color: "#64748B" }}>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading scan history...
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight" style={{ color: "#E2E8F0" }}>Scan History</h1>
                    <p className="text-sm mt-1" style={{ color: "#64748B" }}>All scans — use "View" to see live output or report.</p>
                </div>
                <Link href="/scan/new" className="btn btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    New Scan
                </Link>
            </div>

            <div className="card overflow-hidden">
                {scans.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
                            <svg className="w-8 h-8" style={{ color: "#7C3AED" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <p className="font-bold text-lg" style={{ color: "#94A3B8" }}>No scans yet</p>
                        <p className="text-sm mt-1 mb-5" style={{ color: "#475569" }}>Run your first scan to see it here.</p>
                        <Link href="/scan/new" className="btn btn-primary inline-flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            Start First Scan
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="min-w-full">
                            <thead>
                                <tr style={{ borderBottom: "1px solid #1A1625", background: "rgba(255,255,255,0.02)" }}>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Status</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Target</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Progress</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Date</th>
                                    <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Findings</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scans.map((scan) => {
                                    const totalIssues = (scan.finding_summary?.critical || 0) + (scan.finding_summary?.high || 0) + (scan.finding_summary?.medium || 0) + (scan.finding_summary?.low || 0) + (scan.finding_summary?.info || 0);
                                    return (
                                        <tr
                                            key={scan.id}
                                            style={{ borderBottom: "1px solid #1A1625" }}
                                            className="transition-colors"
                                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(124, 58, 237, 0.04)")}
                                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                        >
                                            <td className="px-5 py-4 whitespace-nowrap">{statusBadge(scan.status)}</td>
                                            <td className="px-5 py-4 max-w-[240px]">
                                                <p className="font-medium truncate" style={{ color: "#E2E8F0" }}>{scan.target_url}</p>
                                                <p className="text-xs font-mono mt-0.5" style={{ color: "#475569" }}>{scan.id?.slice(0, 8)}…</p>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "#1A1625" }}>
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{ width: `${scan.progress || 0}%`, background: "linear-gradient(to right, #7C3AED, #6366F1)" }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold" style={{ color: "#64748B" }}>{scan.progress || 0}%</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-xs" style={{ color: "#64748B" }}>
                                                {new Date(scan.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-center">
                                                <span
                                                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                                                    style={totalIssues > 0
                                                        ? { background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" }
                                                        : { background: "rgba(100, 116, 139, 0.12)", color: "#64748B" }
                                                    }
                                                >
                                                    {totalIssues} findings
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/scan/${scan.id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-bold transition-colors"
                                                        style={{ color: "#A855F7" }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = "#C084FC")}
                                                        onMouseLeave={e => (e.currentTarget.style.color = "#A855F7")}
                                                    >
                                                        {isActive(scan.status) ? "Watch Live" : "View"} <ArrowRight className="h-3.5 w-3.5" />
                                                    </Link>
                                                    {scan.status === "completed" && (
                                                        <Link
                                                            href={`/reports/${scan.id}`}
                                                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors"
                                                            style={{ border: "1px solid #1A1625", color: "#94A3B8" }}
                                                        >
                                                            Report
                                                        </Link>
                                                    )}
                                                    {isActive(scan.status) && (
                                                        <button
                                                            onClick={() => handleCancel(scan.id)}
                                                            disabled={cancelling === scan.id}
                                                            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50"
                                                            style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", background: "rgba(239,68,68,0.05)" }}
                                                        >
                                                            {cancelling === scan.id ? "Cancelling…" : "Cancel"}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
