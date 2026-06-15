"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
    const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setStatus("sending");

        // Simulate API call for contact form submission
        setTimeout(() => {
            setStatus("success");
            setFormData({ name: "", email: "", subject: "", message: "" });
        }, 1500);
    };

    return (
        <section className="mx-auto max-w-4xl p-6 md:p-10">
            <div className="mb-8">
                <Link href="/dashboard" className="flex items-center text-sm font-semibold text-teal-700 hover:underline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </div>

            <div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
                <div className="fade-in">
                    <h1 className="page-title text-4xl font-bold">Contact Us</h1>
                    <p className="muted mt-4 text-bases">
                        Have questions about ExploitronAI, feedback on the project, or reporting an issue? Reach out below.
                    </p>

                    <div className="mt-8 space-y-4">
                        <div className="card p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-800">Documentation</p>
                            <p className="muted mt-1 text-sm">Please check the project README for setup instructions before reaching out for technical support.</p>
                        </div>
                        <div className="card p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-700">Responsibility</p>
                            <p className="muted mt-1 text-sm">Do not use this contact form to request scans on unauthorized targets.</p>
                        </div>
                    </div>
                </div>

                <form className="fade-in stagger-1 card-soft p-6 md:p-8" onSubmit={handleSubmit}>
                    {status === "success" ? (
                        <div className="flex h-full flex-col items-center justify-center space-y-4 rounded-xl bg-teal-50 p-8 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                                <Send className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-teal-900">Message Sent!</h3>
                            <p className="text-teal-700">Thank you for reaching out. We'll get back to you as soon as possible.</p>
                            <button
                                type="button"
                                onClick={() => setStatus("idle")}
                                className="btn btn-secondary mt-4"
                            >
                                Send Another Message
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <label className="label">
                                    Your Name
                                    <input
                                        className="input-control"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </label>
                                <label className="label">
                                    Email Address
                                    <input
                                        type="email"
                                        className="input-control"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </label>
                            </div>

                            <label className="label">
                                Subject
                                <input
                                    className="input-control"
                                    required
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </label>

                            <label className="label">
                                Message
                                <textarea
                                    className="input-control min-h-[150px] resize-y"
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={status === "sending"}
                                className="btn btn-primary mt-6 w-full py-3"
                            >
                                {status === "sending" ? "Sending..." : "Send Message"}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </section>
    );
}
