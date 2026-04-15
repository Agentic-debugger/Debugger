"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Settings,
  Eye,
  EyeOff,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";

export default function SettingsPage() {
  const { config, updateConfig } = useAppStore();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedApi, setSavedApi] = useState(false);
  const [savedConfig, setSavedConfig] = useState(false);
  const [maxIterationsInput, setMaxIterationsInput] = useState(
    String(config.max_iterations),
  );

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000",
    [],
  );

  useEffect(() => {
    setMaxIterationsInput(String(config.max_iterations));
  }, [config.max_iterations]);

  useEffect(() => {
    const existing = sessionStorage.getItem("sp202_api_key");
    if (existing) setApiKey(existing);
  }, []);

  const handleSaveApiKey = () => {
    // Store in sessionStorage (never localStorage for API keys)
    if (apiKey.trim()) sessionStorage.setItem("sp202_api_key", apiKey.trim());
    else sessionStorage.removeItem("sp202_api_key");
    setSavedApi(true);
    setTimeout(() => setSavedApi(false), 2000);
  };

  const handleSaveConfig = () => {
    const parsed = Number(maxIterationsInput);
    const normalized = Number.isFinite(parsed)
      ? Math.min(10, Math.max(1, Math.round(parsed)))
      : 3;
    updateConfig({ max_iterations: normalized });
    setMaxIterationsInput(String(normalized));
    setSavedConfig(true);
    setTimeout(() => setSavedConfig(false), 2000);
  };

  const handleResetDefaults = () => {
    updateConfig({
      use_gemini_detection: true,
      use_llm_doc_format: true,
      max_iterations: 3,
    });
    setMaxIterationsInput("3");
  };

  return (
    <div className="min-h-screen py-20 animate-fade-in">
      <div className="wrap max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-bg-2 border border-line flex items-center justify-center">
              <Settings className="w-4 h-4 text-t-3" />
            </div>
            <h1 className="text-lg font-semibold text-t-1">Settings</h1>
          </div>
          <Link
            href="/"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="card space-y-0 divide-y divide-line">
          {/* API Key */}
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-t-1">Google API Key</h2>
              <p className="text-xs text-t-3 mt-1">
                Required for Gemini-powered detection and documentation. Stored
                in session only.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-bg-3 border border-line rounded-lg px-3 py-2 text-sm
                           font-mono text-t-1 placeholder:text-t-3
                           focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50
                           transition-colors pr-10"
                  aria-label="Google API Key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-t-3
                           hover:text-t-2 transition-colors cursor-pointer"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveApiKey}
                icon={
                  savedApi ? <CheckCircle2 className="w-4 h-4" /> : undefined
                }
              >
                {savedApi ? "Saved" : "Save"}
              </Button>
            </div>
          </div>

          {/* Pipeline Config */}
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-t-1">
                Pipeline defaults
              </h2>
              <p className="text-xs text-t-3 mt-1">
                These defaults are used on the run page and saved in local app
                state.
              </p>
            </div>

            <label className="flex items-center justify-between rounded-lg border border-line bg-bg-3 px-3 py-2.5">
              <div>
                <p className="text-sm text-t-1">
                  Enable Gemini detection review
                </p>
                <p className="text-xs text-t-3">
                  Cross-validates AST findings with Gemini.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.use_gemini_detection}
                onChange={(e) =>
                  updateConfig({ use_gemini_detection: e.target.checked })
                }
                className="h-4 w-4 accent-violet-500"
                aria-label="Enable Gemini detection review"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-line bg-bg-3 px-3 py-2.5">
              <div>
                <p className="text-sm text-t-1">
                  Enable LLM documentation formatting
                </p>
                <p className="text-xs text-t-3">
                  Polishes the generated markdown report wording.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.use_llm_doc_format}
                onChange={(e) =>
                  updateConfig({ use_llm_doc_format: e.target.checked })
                }
                className="h-4 w-4 accent-violet-500"
                aria-label="Enable LLM documentation formatting"
              />
            </label>

            <div className="space-y-2">
              <label
                htmlFor="max-iterations"
                className="text-xs font-medium text-t-2"
              >
                Max fix iterations (1-10)
              </label>
              <input
                id="max-iterations"
                type="number"
                min={1}
                max={10}
                step={1}
                value={maxIterationsInput}
                onChange={(e) => setMaxIterationsInput(e.target.value)}
                className="w-28 bg-bg-3 border border-line rounded-lg px-3 py-2 text-sm
                         font-mono text-t-1 focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveConfig}
                icon={
                  savedConfig ? <CheckCircle2 className="w-4 h-4" /> : undefined
                }
              >
                {savedConfig ? "Saved" : "Save defaults"}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleResetDefaults}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Reset defaults
              </Button>
            </div>
          </div>

          {/* API URL */}
          <div className="p-6 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-t-1">Backend URL</h2>
              <p className="text-xs text-t-3 mt-1">
                FastAPI backend endpoint. Set via NEXT_PUBLIC_API_BASE in
                .env.local
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-3 border border-line rounded-lg">
              <span className="text-xs font-mono text-t-3">{apiBase}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
