"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
    return (
        <section className="mx-auto max-w-4xl p-6 md:p-10">
            <div className="mb-8">
                <Link href="/dashboard" className="flex items-center text-sm font-semibold text-teal-700 hover:underline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </div>

            <div className="card-soft fade-in p-8 md:p-12">
                <h1 className="page-title text-4xl font-bold md:text-5xl">About ExploitronAI</h1>
                <p className="muted mt-6 text-lg leading-relaxed">
                    ExploitronAI is an advanced, automated web vulnerability assessment platform built as part of a comprehensive college project focusing on next-generation security tooling.
                </p>

                <div className="mt-10 space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">The Project</h2>
                        <p className="muted mt-3 text-base leading-relaxed">
                            This platform was designed to bridge the gap between traditional security scanning tools and modern, AI-driven analysis. By orchestrating industry-standard tools within a secure, containerized environment (Kali Linux) and enriching the findings with local Large Language Models, ExploitronAI provides actionable security insights without the overhead of manual correlation.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">The Creator</h2>
                        <p className="muted mt-3 text-base leading-relaxed">
                            Developed by an anonymous cybersecurity student passionate about offensive security, automation, and artificial intelligence. The goal of this project was to explore the intersection of these fields and create a practical tool that could assist security professionals and developers in identifying and mitigating web application vulnerabilities.
                        </p>
                    </div>

                    <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-6">
                        <h3 className="text-lg font-bold text-teal-900">Safety First</h3>
                        <p className="mt-2 text-sm text-teal-800">
                            ExploitronAI is built with strict safety controls. It is designed solely for authorized vulnerability assessments and employs only non-destructive, passive checks.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
