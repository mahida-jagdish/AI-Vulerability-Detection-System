"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface IconProps {
    size?: number;
    className?: string;
}

/* ─── RADAR SCAN ─── */
export function RadarScanIcon({ size = 48, className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {/* Radar rings */}
            {[14, 10, 6].map((r, i) => (
                <circle key={r} cx="24" cy="24" r={r} stroke="#C084FC" strokeWidth={0.8} opacity={0.25 + i * 0.1} />
            ))}
            {/* Crosshairs */}
            <line x1="24" y1="10" x2="24" y2="38" stroke="#C084FC" strokeWidth={0.6} opacity={0.2} />
            <line x1="10" y1="24" x2="38" y2="24" stroke="#C084FC" strokeWidth={0.6} opacity={0.2} />
            {/* Sweep arm */}
            <motion.g
                style={{ transformOrigin: "24px 24px" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, ease: "linear", repeat: Infinity }}
            >
                <motion.path
                    d="M24 24 L24 10"
                    stroke="#A855F7"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                />
                {/* Sweep gradient cone */}
                <path d="M24 24 L24 10 A14 14 0 0 1 33 16 Z" fill="#A855F7" opacity={0.15} />
            </motion.g>
            {/* Blipping target dot */}
            <motion.circle cx="30" cy="18" r="2" fill="#EC4899"
                animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.8, ease: "easeOut" }} />
            <circle cx="24" cy="24" r="2" fill="#C084FC" opacity={0.8} />
        </svg>
    );
}

/* ─── SHIELD / ZERO-G SAFE MODE ─── */
export function ShieldIcon({ size = 48, className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {/* Shield fill */}
            <path d="M24 6L8 13v12c0 9 7.2 15.3 16 17 8.8-1.7 16-8 16-17V13L24 6z"
                fill="#A855F7" opacity={0.08} />
            <motion.path d="M24 6L8 13v12c0 9 7.2 15.3 16 17 8.8-1.7 16-8 16-17V13L24 6z"
                stroke="#C084FC" strokeWidth={1.5} strokeLinejoin="round"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
            {/* Checkmark / lock bolt */}
            <motion.path d="M17 25l5 5 9-10"
                stroke="#EC4899" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 0.5 }} />
            {/* Pulse ring */}
            <motion.circle cx="24" cy="24" r="20" stroke="#A855F7" strokeWidth={0.5}
                animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }} />
        </svg>
    );
}

/* ─── NEURAL AI CORE ─── */
export function NeuralAIIcon({ size = 48, className }: IconProps) {
    const nodes = [
        { cx: 24, cy: 24 },
        { cx: 14, cy: 16 }, { cx: 34, cy: 16 },
        { cx: 14, cy: 32 }, { cx: 34, cy: 32 },
        { cx: 24, cy: 10 }, { cx: 24, cy: 38 },
    ];
    const edges = [
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
        [1, 5], [2, 5], [3, 6], [4, 6],
    ];
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {edges.map(([a, b], i) => (
                <motion.line key={i}
                    x1={nodes[a].cx} y1={nodes[a].cy} x2={nodes[b].cx} y2={nodes[b].cy}
                    stroke="#A855F7" strokeWidth={0.8}
                    animate={{ opacity: [0.1, 0.6, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }} />
            ))}
            {nodes.map((n, i) => (
                <motion.circle key={i} cx={n.cx} cy={n.cy} r={i === 0 ? 3.5 : 2}
                    fill={i === 0 ? "#EC4899" : "#C084FC"} opacity={i === 0 ? 0.9 : 0.6}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }} />
            ))}
        </svg>
    );
}

/* ─── TERMINAL / LIVE SCAN ─── */
export function TerminalIcon({ size = 48, className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            <rect x="5" y="10" width="38" height="28" rx="3" fill="#0D0B14" stroke="#C084FC" strokeWidth={1.2} opacity={0.8} />
            {/* Top bar dots */}
            <circle cx="11" cy="16" r="1.2" fill="#EC4899" opacity={0.7} />
            <circle cx="15.5" cy="16" r="1.2" fill="#A855F7" opacity={0.7} />
            <circle cx="20" cy="16" r="1.2" fill="#3B82F6" opacity={0.7} />
            {/* Divider */}
            <line x1="5" y1="20" x2="43" y2="20" stroke="#C084FC" strokeWidth={0.5} opacity={0.3} />
            {/* Prompt lines */}
            <motion.g
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                <text x="9" y="28" fontSize="4" fill="#C084FC" fontFamily="monospace">$ nmap -sV 192.168.1.1</text>
            </motion.g>
            <motion.g
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}>
                <text x="9" y="33" fontSize="4" fill="#A855F7" fontFamily="monospace">$ nuclei -u target.com</text>
            </motion.g>
            {/* Blinking cursor */}
            <motion.rect x="9" y="35" width="3" height="1.8" fill="#EC4899"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }} />
        </svg>
    );
}

/* ─── VULNERABILITY / BUG HUNT ─── */
export function VulnIcon({ size = 48, className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {/* Bug body */}
            <ellipse cx="24" cy="26" rx="8" ry="10" fill="#A855F7" opacity={0.1} stroke="#C084FC" strokeWidth={1.2} />
            {/* Bug head */}
            <circle cx="24" cy="16" r="4" fill="#A855F7" opacity={0.15} stroke="#EC4899" strokeWidth={1.2} />
            {/* Bug eyes */}
            <motion.circle cx="22.3" cy="15.5" r="1" fill="#EC4899"
                animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <motion.circle cx="25.7" cy="15.5" r="1" fill="#EC4899"
                animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} />
            {/* Antennae */}
            <line x1="22" y1="13" x2="19" y2="9" stroke="#C084FC" strokeWidth={1} strokeLinecap="round" />
            <line x1="26" y1="13" x2="29" y2="9" stroke="#C084FC" strokeWidth={1} strokeLinecap="round" />
            <circle cx="19" cy="9" r="1.2" fill="#C084FC" opacity={0.8} />
            <circle cx="29" cy="9" r="1.2" fill="#C084FC" opacity={0.8} />
            {/* Legs with animation */}
            {[-1, 0, 1].map((offset, i) => (
                <motion.g key={i}
                    animate={{ rotate: [offset * 10, offset * -10, offset * 10] }}
                    style={{ transformOrigin: "24px 26px" }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}>
                    <line x1="16" y1={22 + i * 4} x2="10" y2={20 + i * 4} stroke="#A855F7" strokeWidth={1} strokeLinecap="round" opacity={0.6} />
                    <line x1="32" y1={22 + i * 4} x2="38" y2={20 + i * 4} stroke="#A855F7" strokeWidth={1} strokeLinecap="round" opacity={0.6} />
                </motion.g>
            ))}
            {/* Alert pulse */}
            <motion.circle cx="24" cy="26" r="11" stroke="#EC4899" strokeWidth={0.8}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }} />
        </svg>
    );
}

/* ─── EXPLOIT CHAIN ─── */
export function ExploitChainIcon({ size = 48, className }: IconProps) {
    const steps = [
        { x: 8, y: 24, label: "R" },
        { x: 20, y: 24, label: "S" },
        { x: 32, y: 24, label: "X" },
        { x: 44, y: 24, label: "P" },
    ];
    return (
        <svg viewBox="0 0 52 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {/* Chain links */}
            {steps.slice(0, -1).map((s, i) => (
                <motion.line key={i}
                    x1={s.x + 4} y1={s.y} x2={steps[i + 1].x - 4} y2={s.y}
                    stroke="#A855F7" strokeWidth={1.5} strokeDasharray="3 2"
                    animate={{ strokeDashoffset: [0, -10] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear", delay: i * 0.25 }} />
            ))}
            {steps.map((s, i) => (
                <motion.g key={i}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                    <circle cx={s.x} cy={s.y} r="4.5" fill="#A855F7" opacity={0.15} stroke="#C084FC" strokeWidth={1} />
                    <text x={s.x} y={s.y + 1.5} textAnchor="middle" fontSize="4" fill="#EC4899" fontWeight="bold" fontFamily="monospace">{s.label}</text>
                </motion.g>
            ))}
            {/* Steps label */}
            {["RECON", "SCAN", "XPLOIT", "PAY"].map((lbl, i) => (
                <motion.text key={lbl} x={steps[i].x} y={32} textAnchor="middle" fontSize="3.2" fill="#C084FC" fontFamily="monospace" opacity={0.6}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}>
                    {lbl}
                </motion.text>
            ))}
        </svg>
    );
}

/* ─── PDF REPORT ─── */
export function ReportIcon({ size = 48, className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {/* Paper */}
            <motion.rect x="10" y="6" width="28" height="36" rx="2.5" fill="#0D0B14" stroke="#C084FC" strokeWidth={1.2}
                animate={{ y: [0, -1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            {/* Folded corner */}
            <motion.path d="M30 6h8v8h-8z" fill="#A855F7" opacity={0.2}
                animate={{ y: [0, -1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            <motion.path d="M30 6l8 8" stroke="#C084FC" strokeWidth={0.8}
                animate={{ y: [0, -1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            {/* Severity bar — CRITICAL */}
            <rect x="14" y="18" width="20" height="3" rx="1.5" fill="#EC4899" opacity={0.15} />
            <motion.rect x="14" y="18" width="16" height="3" rx="1.5" fill="#EC4899" opacity={0.8}
                animate={{ width: [0, 16] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }} />
            {/* HIGH */}
            <rect x="14" y="23" width="20" height="3" rx="1.5" fill="#A855F7" opacity={0.15} />
            <motion.rect x="14" y="23" width="12" height="3" rx="1.5" fill="#A855F7" opacity={0.6}
                animate={{ width: [0, 12] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2, delay: 0.3 }} />
            {/* MED */}
            <rect x="14" y="28" width="20" height="3" rx="1.5" fill="#3B82F6" opacity={0.15} />
            <motion.rect x="14" y="28" width="8" height="3" rx="1.5" fill="#3B82F6" opacity={0.5}
                animate={{ width: [0, 8] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2, delay: 0.6 }} />
            {/* Labels */}
            <text x="14" y="16" fontSize="3.5" fill="#EC4899" fontFamily="monospace" opacity={0.8}>CRITICAL</text>
            <text x="36" y="16" fontSize="3" fill="#C084FC" fontFamily="monospace" opacity={0.5} textAnchor="end">3</text>
        </svg>
    );
}

/* ─── NETWORK MAP ─── */
export function NetworkIcon({ size = 48, className }: IconProps) {
    const nodes = [
        { cx: 24, cy: 8 },
        { cx: 10, cy: 20 }, { cx: 38, cy: 20 },
        { cx: 16, cy: 36 }, { cx: 32, cy: 36 },
    ];
    const edges = [[0, 1], [0, 2], [1, 3], [2, 4], [1, 4], [2, 3]];
    const colors = ["#EC4899", "#C084FC", "#A855F7", "#3B82F6", "#A855F7"];
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {edges.map(([a, b], i) => (
                <motion.line key={i}
                    x1={nodes[a].cx} y1={nodes[a].cy} x2={nodes[b].cx} y2={nodes[b].cy}
                    stroke="#A855F7" strokeWidth={0.8}
                    animate={{ opacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }} />
            ))}
            {/* Packet traveling along edge 0→1 */}
            <motion.circle r="1.5" fill="#EC4899"
                animate={{
                    cx: [nodes[0].cx, nodes[1].cx, nodes[3].cx, nodes[1].cx, nodes[0].cx],
                    cy: [nodes[0].cy, nodes[1].cy, nodes[3].cy, nodes[1].cy, nodes[0].cy],
                    opacity: [0, 1, 1, 1, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
            {nodes.map((n, i) => (
                <motion.circle key={i} cx={n.cx} cy={n.cy} r={i === 0 ? 4 : 3}
                    fill={colors[i]} opacity={0.15} stroke={colors[i]} strokeWidth={1}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />
            ))}
        </svg>
    );
}

/* ─── LOCK / AUTH ─── */
export function LockIcon({ size = 48, className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {/* Shackle */}
            <motion.path d="M16 22V16a8 8 0 0116 0v6"
                stroke="#C084FC" strokeWidth={2} strokeLinecap="round"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }} />
            {/* Body */}
            <rect x="10" y="22" width="28" height="20" rx="4" fill="#A855F7" opacity={0.1} stroke="#C084FC" strokeWidth={1.5} />
            {/* Keyhole */}
            <motion.circle cx="24" cy="31" r="3" stroke="#EC4899" strokeWidth={1.5}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }} />
            <motion.line x1="24" y1="34" x2="24" y2="38" stroke="#EC4899" strokeWidth={1.5} strokeLinecap="round"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }} />
            {/* Scan line sweep */}
            <motion.line x1="10" y1="31" x2="38" y2="31" stroke="#A855F7" strokeWidth={0.8} opacity={0.4}
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
        </svg>
    );
}

/* ─── WAF DETECTION ─── */
export function WafIcon({ size = 48, className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {/* Outer firewall box */}
            <rect x="4" y="14" width="40" height="20" rx="3" fill="#A855F7" opacity={0.07} stroke="#A855F7" strokeWidth={1} />
            {/* Incoming packets blocked */}
            {[0, 1, 2].map((i) => (
                <motion.g key={i}
                    animate={{ x: [14, 0, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}>
                    <rect x={-14 + i * 0} y={19 + i * 5} width="6" height="4" rx="1" fill="#3B82F6" opacity={0.7} />
                </motion.g>
            ))}
            {/* Wall bars */}
            {[12, 17, 22, 27, 32].map((x) => (
                <rect key={x} x={x} y="14" width="3" height="20" fill="#A855F7" opacity={0.2} rx="1" />
            ))}
            {/* Blocked X */}
            <motion.path d="M20 20l8 8m0-8l-8 8" stroke="#EC4899" strokeWidth={2} strokeLinecap="round"
                animate={{ opacity: [0, 1, 1, 0, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
            {/* Label */}
            <text x="24" y="42" textAnchor="middle" fontSize="4" fill="#C084FC" fontFamily="monospace" opacity={0.6}>WAF DETECTED</text>
        </svg>
    );
}

/* ─── CVSS SCORE ─── */
export function CvssIcon({ size = 48, className }: IconProps) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {/* Gauge arc background */}
            <path d="M8 30 A16 16 0 0 1 40 30" stroke="#1A1625" strokeWidth={5} strokeLinecap="round" />
            {/* Score arc — fills like a meter */}
            <motion.path d="M8 30 A16 16 0 0 1 40 30"
                stroke="url(#cvssGrad)" strokeWidth={5} strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 0.85, 0.85, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 0.5 }} />
            <defs>
                <linearGradient id="cvssGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="60%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
            </defs>
            {/* Needle */}
            <motion.line x1="24" y1="30" x2="24" y2="16" stroke="#EC4899" strokeWidth={1.5} strokeLinecap="round"
                style={{ transformOrigin: "24px 30px" }}
                animate={{ rotate: [-90, 60, 60, -90] }}
                transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }} />
            <circle cx="24" cy="30" r="2.5" fill="#EC4899" />
            {/* Score text */}
            <motion.text x="24" y="40" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#EC4899" fontFamily="monospace"
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 0.5 }}>
                9.8
            </motion.text>
            <text x="24" y="45" textAnchor="middle" fontSize="3.5" fill="#C084FC" fontFamily="monospace" opacity={0.5}>CVSS</text>
        </svg>
    );
}

/* ─── DNA / FINGERPRINT ─── */
export function FingerprintIcon({ size = 48, className }: IconProps) {
    const arcs = [6, 9, 12, 15, 18];
    return (
        <svg viewBox="0 0 48 48" fill="none" className={cn("", className)} style={{ width: size, height: size }}>
            {arcs.map((r, i) => (
                <motion.path key={r}
                    d={`M${24 - r} 28 A${r} ${r} 0 0 1 ${24 + r} 28`}
                    stroke={i % 2 === 0 ? "#C084FC" : "#A855F7"}
                    strokeWidth={1.2} strokeLinecap="round" fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: [0, 1, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }} />
            ))}
            {/* Scan line */}
            <motion.line x1="6" y1="28" x2="42" y2="28" stroke="#EC4899" strokeWidth={0.8}
                animate={{ y: [-8, 2, -8] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
            <text x="24" y="43" textAnchor="middle" fontSize="4" fill="#C084FC" fontFamily="monospace" opacity={0.6}>FINGERPRINT</text>
        </svg>
    );
}

/* ─── DEMO COMPONENT ─── */
const ALL_ICONS = [
    { name: "Radar Scan", Icon: RadarScanIcon, desc: "Recon Engine" },
    { name: "Zero-G Shield", Icon: ShieldIcon, desc: "Safe Mode" },
    { name: "AI Core", Icon: NeuralAIIcon, desc: "AI Enrichment" },
    { name: "Live Terminal", Icon: TerminalIcon, desc: "Scan Interface" },
    { name: "Bug Hunt", Icon: VulnIcon, desc: "Vulnerability" },
    { name: "Exploit Chain", Icon: ExploitChainIcon, desc: "Attack Path" },
    { name: "PDF Report", Icon: ReportIcon, desc: "Telemetry" },
    { name: "Network Map", Icon: NetworkIcon, desc: "Topology" },
    { name: "Auth Lock", Icon: LockIcon, desc: "Access Control" },
    { name: "WAF Detect", Icon: WafIcon, desc: "WAF" },
    { name: "CVSS Score", Icon: CvssIcon, desc: "Scoring" },
    { name: "Fingerprint", Icon: FingerprintIcon, desc: "Tech Stack" },
];

export function Component() {
    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-10">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 justify-items-center">
                {ALL_ICONS.map(({ name, Icon, desc }) => (
                    <div key={name} className="flex flex-col items-center gap-2 group">
                        <div className="flex items-center justify-center w-20 h-20 rounded-2xl border border-space-700 bg-space-800/60 backdrop-blur-sm group-hover:border-nebula-500/50 group-hover:bg-space-800 transition-all duration-300">
                            <Icon size={44} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-wide text-center leading-tight uppercase group-hover:text-nebula-400 transition-colors">
                            {name}
                        </span>
                        <span className="text-[9px] text-slate-600 tracking-widest text-center">{desc}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
