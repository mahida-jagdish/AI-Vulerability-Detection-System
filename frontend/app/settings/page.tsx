"use client";

import { useEffect, useState } from "react";
import { getAISettings, saveAISettings } from "@/lib/api";
import { CheckCircle2, Eye, EyeOff, Loader2, Save } from "lucide-react";

const PROVIDERS = [
    { id: "ollama", label: "Ollama (Local)", description: "Runs a local LLM — no API key needed. Requires Docker Compose with Ollama container.", placeholder: "llama3.1:8b", needsKey: false, modelHelp: "e.g. llama3.1:8b, llama3:latest, mistral:7b" },
    { id: "openrouter", label: "OpenRouter", description: "Access 200+ models including GPT-4o, Claude 3.5, Gemini — bring your own API key.", placeholder: "openai/gpt-4o-mini", needsKey: true, modelHelp: "e.g. openai/gpt-4o-mini, anthropic/claude-3-haiku, google/gemini-flash-1.5", keyLink: "https://openrouter.ai/keys" },
    { id: "openai", label: "OpenAI", description: "Direct OpenAI API access — GPT-4o, GPT-4 Turbo, etc.", placeholder: "gpt-4o-mini", needsKey: true, modelHelp: "e.g. gpt-4o, gpt-4o-mini, gpt-4-turbo", keyLink: "https://platform.openai.com/api-keys" },
];

export default function SettingsPage() {
    const [provider, setProvider] = useState("ollama");
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("llama3.1:8b");
    const [showKey, setShowKey] = useState(false);
    const [apiKeySet, setApiKeySet] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    const selected = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

    useEffect(() => {
        async function load() {
            try {
                const data = await getAISettings();
                setProvider(data.provider);
                setModel(data.model);
                setApiKeySet(data.api_key_set);
            } catch (e) {
                console.error("Failed to load settings", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSaved(false);
        try {
            await saveAISettings({ provider, api_key: apiKey, model });
            setSaved(true);
            if (apiKey) setApiKeySet(true);
            setApiKey("");
            setTimeout(() => setSaved(false), 3000);
        } catch {
            setError("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-8" style={{ color: "#64748B" }}>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6 fade-in">
            <div>
                <h1 className="text-3xl font-black tracking-tight" style={{ color: "#E2E8F0" }}>Settings</h1>
                <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
                    Configure the AI model used for findings enrichment and PoC generation.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
                {/* Provider selection */}
                <div className="card overflow-hidden p-0">
                    <div className="px-5 py-3 border-b" style={{ borderColor: "#1A1625", background: "rgba(255,255,255,0.02)" }}>
                        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>AI Provider</h2>
                    </div>
                    <div>
                        {PROVIDERS.map((p) => (
                            <label
                                key={p.id}
                                className="flex cursor-pointer items-start gap-4 px-5 py-4 transition-all border-b last:border-0"
                                style={{
                                    borderColor: "#1A1625",
                                    background: provider === p.id ? "rgba(124, 58, 237, 0.08)" : "transparent"
                                }}
                                onMouseEnter={e => { if (provider !== p.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = provider === p.id ? "rgba(124, 58, 237, 0.08)" : "transparent"; }}
                            >
                                <input
                                    type="radio"
                                    name="provider"
                                    value={p.id}
                                    checked={provider === p.id}
                                    onChange={() => { setProvider(p.id); setModel(p.placeholder); setApiKey(""); }}
                                    className="mt-1 accent-violet-600"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm" style={{ color: "#E2E8F0" }}>{p.label}</span>
                                        {!p.needsKey && (
                                            <span
                                                className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                                                style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.25)" }}
                                            >
                                                Free / Local
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs" style={{ color: "#64748B" }}>{p.description}</p>
                                    {("keyLink" in p) && (
                                        <a
                                            href={(p as any).keyLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 inline-block text-xs font-bold transition-colors"
                                            style={{ color: "#A855F7" }}
                                        >
                                            Get API key →
                                        </a>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Model + API key */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>Model Configuration</h2>

                    <div>
                        <label className="label" htmlFor="model-input">Model</label>
                        <input
                            id="model-input"
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder={selected.placeholder}
                            className="input-control mt-1"
                            required
                        />
                        <p className="mt-1 text-xs" style={{ color: "#475569" }}>{selected.modelHelp}</p>
                    </div>

                    {selected.needsKey && (
                        <div>
                            <label className="label" htmlFor="api-key-input">
                                API Key
                                {apiKeySet && (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                                        <CheckCircle2 className="h-3 w-3" /> Key saved
                                    </span>
                                )}
                            </label>
                            <div className="relative mt-1">
                                <input
                                    id="api-key-input"
                                    type={showKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={apiKeySet ? "Enter new key to replace saved key" : "sk-or-... / sk-..."}
                                    className="input-control pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: "#64748B" }}
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs" style={{ color: "#475569" }}>
                                Your key is stored server-side and never returned in plain text.
                            </p>
                        </div>
                    )}
                </div>

                {/* Error / success */}
                {error && (
                    <div className="p-4 rounded-2xl text-sm flex items-start gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#FCA5A5" }}>
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {error}
                    </div>
                )}
                {saved && (
                    <div className="p-4 rounded-2xl text-sm flex items-center gap-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#6EE7B7" }}>
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Settings saved successfully!
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary flex w-full items-center justify-center gap-2"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </form>

            {provider === "ollama" && (
                <div
                    className="rounded-2xl px-4 py-3 text-xs"
                    style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", color: "#FCD34D" }}
                >
                    <p className="font-bold">Running Ollama locally?</p>
                    <p className="mt-1" style={{ color: "#94A3B8" }}>
                        Make sure the model is pulled first:{" "}
                        <code className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: "rgba(245,158,11,0.12)", color: "#FCD34D" }}>
                            docker exec -it aicodexfrist-ollama-1 ollama pull {model}
                        </code>
                    </p>
                </div>
            )}
        </div>
    );
}
