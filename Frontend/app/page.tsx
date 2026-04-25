"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Play,
  Shield,
  Wrench,
  FileText,
  History,
  Github,
  Settings,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  Cpu,
  ScanSearch,
  WandSparkles,
  FileCheck,
} from "lucide-react";

function LogoIcon({ size = 40 }: { size?: number }) {
  const id = `lg-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="10" fill={`url(#${id})`} />
      {/* left angle bracket */}
      <path d="M15 13L10 20L15 27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* right angle bracket */}
      <path d="M25 13L30 20L25 27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* scan ring — suggests analysis */}
      <circle cx="20" cy="20" r="4" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeDasharray="3 2.2" />
      {/* center dot */}
      <circle cx="20" cy="20" r="1.5" fill="white" />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18181B" />
          <stop offset="100%" stopColor="#09090B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

import { CodeEditor } from "@/components/run/CodeEditor";
import { ConfigPanel } from "@/components/run/ConfigPanel";
import { PipelineProgressPanel } from "@/components/run/PipelineProgress";
import { FindingsTable } from "@/components/results/FindingsTable";
import { FixHistory } from "@/components/results/FixHistory";
import { CodeDiff } from "@/components/results/CodeDiff";
import { ReportViewer } from "@/components/results/ReportViewer";
import { Badge } from "@/components/ui/Badge";
import { useAppStore } from "@/lib/store";
import { runPipeline } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PipelineProgress, PipelineState } from "@/lib/types";

// ─── Sample code ────────────────────────────────────────────────────────────

const SAMPLE = `import os

# Hardcoded credentials
password = "admin123"
SECRET_KEY = "hardcoded_secret"

# Mutable default argument
def process_users(users=[]):
    try:
        result = eval(users)      # eval() on input — critical
        if result == None:        # should use 'is None'
            return False
        return result
    except:                       # bare except
        pass

def divide(x, y):
    return x / y                  # no ZeroDivisionError guard
`;

const FEATURES = [
  {
    icon: Shield,
    color: "#2563EB",
    label: "01",
    title: "Hybrid Detection",
    body: "Deterministic AST analysis plus LLM cross-validation for stronger bug coverage.",
    bullets: [
      "Fast parser pass",
      "Catches parser-blind issues",
      "Fewer missed findings",
    ],
  },
  {
    icon: Wrench,
    color: "#9333EA",
    label: "02",
    title: "Iterative Fixing",
    body: "Applies deterministic patches first, then targeted LLM fixes in a controlled loop.",
    bullets: [
      "Deterministic first",
      "Surgical LLM patching",
      "Stops on clean or plateau",
    ],
  },
  {
    icon: FileText,
    color: "#D97706",
    label: "03",
    title: "Full Documentation",
    body: "Every run includes a clear report with what changed and why.",
    bullets: [
      "Findings table",
      "Per-iteration fix log",
      "Before/after code diff",
    ],
  },
] as const;

const WORKFLOW = [
  {
    icon: ScanSearch,
    title: "Scan",
    body: "Run deterministic AST checks and optional Gemini cross-review on your code.",
  },
  {
    icon: WandSparkles,
    title: "Fix",
    body: "Apply deterministic + LLM-assisted fixes in an iterative loop until stability.",
  },
  {
    icon: FileCheck,
    title: "Ship",
    body: "Get a full report with findings, fix history, code diff, and final output.",
  },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const editorRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { config, updateConfig, addToHistory, setCurrentRun } = useAppStore();

  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("script.py");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [result, setResult] = useState<PipelineState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollTo = (r: React.RefObject<HTMLDivElement | null>) =>
    r.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleRun = useCallback(async () => {
    const src = code.trim() || SAMPLE;
    if (!code.trim()) setCode(SAMPLE);
    setError(null);
    setResult(null);
    setRunning(true);
    setProgress({
      stage: "detector",
      phase: "detection",
      message: "Connecting to pipeline…",
      max_iterations: config.max_iterations,
    });
    setTimeout(() => scrollTo(resultsRef), 150);

    try {
      const res = await runPipeline(src, filename, config, (p) =>
        setProgress(p),
      );
      setProgress({ phase: "done" });
      setResult(res);
      setCurrentRun(res);
      addToHistory({
        id: res.id,
        filename,
        status: res.status,
        loop_status: res.loop_result?.status ?? null,
        started_at: res.started_at,
        finished_at: res.finished_at,
        iteration_count: res.loop_result?.iteration ?? 0,
        critical_count: res.bug_report?.critical_count ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline failed");
      setProgress(null);
    } finally {
      setRunning(false);
    }
  }, [code, filename, config, addToHistory, setCurrentRun]);

  const findings = result?.bug_report?.findings.length ?? 0;
  const critical = result?.bug_report?.critical_count ?? 0;
  const iters = result?.loop_result?.iteration ?? 0;
  const loopStatus = result?.loop_result?.status ?? null;

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Navbar ─────────────────────────────────────── */}
      <header
        className="fixed inset-x-0 top-0 z-50 h-16 border-b border-line backdrop-blur-md"
        style={{ background: "rgba(255,255,255,0.92)" }}
      >
        <div className="wrap max-w-6xl h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoIcon size={36} />
            <span className="font-heading text-base font-bold tracking-tight text-t-1">
              D<span className="text-accent">IG</span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-bg-2/60 p-1 pr-1.5">
              <Link
                href="/history"
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium",
                  "text-t-2 transition-colors hover:bg-bg-3 hover:text-t-1",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-3/80 border border-line/80">
                  <History className="h-3.5 w-3.5 text-accent" strokeWidth={2.25} />
                </span>
                <span className="hidden sm:inline pr-0.5">History</span>
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md text-t-2 transition-colors",
                  "hover:bg-bg-3 hover:text-t-1 border border-transparent hover:border-line/90",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                )}
                aria-label="View on GitHub"
              >
                <Github className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
            <Link
              href="/settings"
              className="btn-ghost hidden sm:inline-flex items-center gap-1.5 px-3 h-9 text-sm rounded-md text-t-2 hover:text-t-1"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Link>
            <button
              onClick={() => scrollTo(editorRef)}
              className="btn-primary flex items-center gap-1.5 shrink-0"
              style={{ height: "38px", padding: "0 16px", fontSize: "15px" }}
            >
              Try it free
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 relative overflow-hidden">
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Very soft top gradient */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.02) 0%, transparent 100%)" }}
        />

        <div className="wrap max-w-6xl relative text-center">
          {/* Label pill */}
          <div
            className="inline-flex items-center gap-2 mb-8"
            style={{
              background: "rgba(9,9,11,0.05)",
              border: "1px solid rgba(9,9,11,0.12)",
              borderRadius: "999px",
              padding: "5px 14px",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-xs font-medium text-t-2 tracking-wider uppercase">
              Powered by Gemini 2.5 Flash
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-heading font-bold mb-6 text-t-1 tracking-[-0.05em]"
            style={{ fontSize: "clamp(42px, 8.5vw, 70px)", lineHeight: "1.04" }}
          >
            Debug Python code,
            <br />
            <span className="text-t-3">automatically.</span>
          </h1>

          {/* Sub */}
          <p
            className="mx-auto mb-10 text-t-2"
            style={{ maxWidth: "500px", fontSize: "17px", lineHeight: "1.7" }}
          >
            Paste your code. DIG detects security risks, logic flaws, and style
            violations — then fixes and documents everything.
          </p>

          {/* CTA row */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => scrollTo(editorRef)}
              className="btn-primary flex items-center gap-2"
              style={{ height: "44px", padding: "0 24px", fontSize: "15px" }}
            >
              <Play className="w-4 h-4" />
              Analyse my code
            </button>
            <button
              onClick={() => { setCode(SAMPLE); scrollTo(editorRef); }}
              className="btn-secondary flex items-center gap-2"
              style={{ height: "44px", padding: "0 24px", fontSize: "15px" }}
            >
              Load a buggy example
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Social proof strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 font-mono text-[12px] tracking-wider uppercase"
               style={{ color: "var(--t-3)" }}>
            <span>15+ bug categories</span>
            <span style={{ color: "var(--line-2)" }}>·</span>
            <span>Iterative fix loop</span>
            <span style={{ color: "var(--line-2)" }}>·</span>
            <span>Auto-generated reports</span>
            <span style={{ color: "var(--line-2)" }}>·</span>
            <span>Zero configuration</span>
          </div>
        </div>
      </section>

      {/* ── Feature strip ──────────────────────────────── */}
      <section className="py-20 border-y border-line bg-bg-1">
        <div className="wrap max-w-6xl">
          <div className="text-center mb-10">
            <p className="label mb-3">Features</p>
            <h2
              className="font-heading font-semibold text-t-1 mb-3 tracking-[-0.04em]"
              style={{ fontSize: "30px" }}
            >
              Built for fast, trustworthy fixes
            </h2>
            <p
              className="mx-auto text-t-2"
              style={{ maxWidth: "640px", fontSize: "15px" }}
            >
              DIG combines deterministic analysis with LLM reasoning, then documents
              every change so you can trust the output.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map(
              ({ icon: Icon, color, label, title, body, bullets }) => (
                <article
                  key={title}
                  className="feature-card group rounded-2xl p-7"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${color}12`,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <span
                      className="font-mono text-xs text-t-3"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      {label}
                    </span>
                  </div>

                  <div className="mb-5">
                    <p
                      className="font-semibold text-t-1 mb-2"
                      style={{ fontSize: "17px" }}
                    >
                      {title}
                    </p>
                    <p
                      className="text-t-2 leading-relaxed"
                      style={{ fontSize: "14px" }}
                    >
                      {body}
                    </p>
                  </div>

                  <ul className="space-y-2.5">
                    {bullets.map((item) => (
                      <li
                        key={item}
                        className="feature-bullet text-t-2"
                        style={{ fontSize: "13px" }}
                      >
                        <span
                          className="feature-bullet-dot"
                          style={{ backgroundColor: color }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Workflow strip ─────────────────────────────── */}
      <section
        className="py-14 border-b border-line"
      >
        <div className="wrap max-w-6xl">
          <div className="text-center mb-8">
            <p className="label mb-3">Workflow</p>
            <h2
              className="font-heading font-semibold text-t-1 tracking-[-0.035em]"
              style={{ fontSize: "26px" }}
            >
              From raw code to documented fixes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {WORKFLOW.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-5">
                <div className="w-9 h-9 rounded-lg bg-bg-3 border border-line flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <p className="font-semibold text-t-1 mb-2">{title}</p>
                <p className="text-sm text-t-2 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Editor section ─────────────────────────────── */}
      <section
        ref={editorRef}
        className="py-20 scroll-mt-16 bg-bg-1"
      >
        <div className="wrap max-w-6xl">
          {/* Section header */}
          <div className="mb-8">
            <p className="label mb-3">Input</p>
            <h2
              className="font-heading font-semibold text-t-1 mb-2 tracking-[-0.035em]"
              style={{ fontSize: "28px" }}
            >
              Paste or upload your file
            </h2>
            <p className="text-t-2" style={{ fontSize: "14px" }}>
              Supports .py files via drag-and-drop, or paste code directly
              below.
            </p>
          </div>

          {/* Editor */}
          <div
            className="rounded-xl overflow-hidden mb-4"
            style={{
              border: running
                ? "1px solid rgba(9,9,11,0.5)"
                : "1px solid var(--line-2)",
              boxShadow: running ? "0 0 0 3px rgba(9,9,11,0.06)" : "none",
              transition: "border-color 0.3s, box-shadow 0.3s",
            }}
          >
            <div style={{ height: "400px" }}>
              <CodeEditor
                value={code}
                onChange={setCode}
                filename={filename}
                onFilenameChange={setFilename}
                readOnly={running}
              />
            </div>
          </div>

          {/* Config row + Run */}
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="card-sm flex-1 p-5">
              <ConfigPanel
                config={config}
                onChange={updateConfig}
                disabled={running}
              />
            </div>

            <div className="flex flex-col gap-3 md:w-48 flex-shrink-0">
              <button
                onClick={handleRun}
                disabled={running}
                className={cn(
                  "btn w-full font-semibold rounded-xl transition-all duration-200",
                  running ? "btn-secondary cursor-not-allowed" : "btn-primary",
                )}
                style={{ height: "48px", fontSize: "15px" }}
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Running…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Run Pipeline
                  </>
                )}
              </button>
              {!code && (
                <button
                  onClick={() => setCode(SAMPLE)}
                  className="text-xs text-accent hover:underline cursor-pointer text-center font-mono"
                >
                  load sample →
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mt-4 flex items-start gap-3 p-4 rounded-xl animate-fade-in"
              style={{
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.18)",
              }}
            >
              <XCircle className="w-4 h-4 text-s_error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-s_error font-mono">
                {error}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Results section ────────────────────────────── */}
      {(running || result || progress) && (
        <section
          ref={resultsRef}
          className="pb-24 scroll-mt-16 border-t border-line"
        >
          <div className="wrap max-w-6xl pt-16 space-y-8 animate-slide-up">
            {/* Header */}
            <div>
              <p className="label mb-3">Output</p>
              <h2
                className="font-heading font-semibold text-t-1 tracking-[-0.035em]"
                style={{ fontSize: "28px" }}
              >
                {running ? "Analysing…" : "Results"}
              </h2>
            </div>

            {/* Progress */}
            {(running || (progress && !result)) && (
              <div className="card w-full max-w-5xl p-6 md:p-8">
                <PipelineProgressPanel
                  progress={progress}
                  result={result}
                  isRunning={running}
                  maxIterations={config.max_iterations}
                />
              </div>
            )}

            {/* Completed result */}
            {result && !running && (
              <div className="space-y-6 animate-fade-in">
                {/* Status bar */}
                <div
                  className="flex flex-wrap items-center gap-4 p-5 rounded-xl"
                  style={{
                    background:
                      result.status === "ERROR"
                        ? "rgba(220,38,38,0.06)"
                        : "var(--bg-2)",
                    border: `1px solid ${result.status === "ERROR" ? "rgba(220,38,38,0.18)" : "var(--line)"}`,
                  }}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {result.status === "ERROR" ? (
                      <XCircle className="w-5 h-5 text-s_error flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-s_ok flex-shrink-0" />
                    )}
                    <span
                      className="font-semibold text-t-1"
                      style={{ fontSize: "14px" }}
                    >
                      {result.status === "DONE"
                        ? "Pipeline completed"
                        : result.status === "PARTIAL"
                          ? "Completed with warnings"
                          : "Pipeline error"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {findings > 0 && (
                      <Stat
                        label="findings"
                        value={findings}
                        color={critical > 0 ? "text-s_error" : "text-s_warn"}
                      />
                    )}
                    {iters > 0 && (
                      <Stat label="iterations" value={iters} color="text-t-2" />
                    )}
                    {loopStatus && (
                      <Badge
                        variant={
                          loopStatus === "CLEAN"
                            ? "ok"
                            : loopStatus === "ERROR"
                              ? "error"
                              : "warn"
                        }
                        dot
                      >
                        {loopStatus === "CLEAN"
                          ? "All clear"
                          : loopStatus === "NO_IMPROVEMENT"
                            ? "No improvement"
                            : loopStatus === "MAX_ITERATIONS_REACHED"
                              ? "Max iterations"
                              : loopStatus}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <Tabs.Root defaultValue="findings">
                  <Tabs.List
                    className="flex items-center gap-1 p-1 rounded-xl w-full"
                    style={{
                      background: "var(--bg-1)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {[
                      {
                        id: "findings",
                        label: "Findings",
                        icon: Shield,
                        count: findings,
                      },
                      {
                        id: "fix-history",
                        label: "Fix History",
                        icon: Wrench,
                        count: iters,
                      },
                      {
                        id: "diff",
                        label: "Code Diff",
                        icon: Cpu,
                        count: null,
                      },
                      {
                        id: "report",
                        label: "Report",
                        icon: FileText,
                        count: null,
                      },
                    ].map(({ id, label, icon: Icon, count }) => (
                      <Tabs.Trigger
                        key={id}
                        value={id}
                        className="flex items-center justify-center gap-2 py-2 rounded-lg flex-1 cursor-pointer
                                   text-t-2 hover:text-t-1 transition-colors duration-150
                                   data-[state=active]:text-t-1
                                   focus:outline-none focus:ring-2 focus:ring-accent/30"
                        style={{ fontSize: "13px", fontWeight: 500 }}
                        data-variant="tab"
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden sm:inline">{label}</span>
                        {count !== null && count > 0 && (
                          <span
                            className="ml-0.5 font-mono text-xs px-1.5 py-0.5 rounded text-t-3"
                            style={{
                              background: "var(--bg)",
                              border: "1px solid var(--line)",
                              fontSize: "11px",
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  <div className="mt-3">
                    <Tabs.Content
                      value="findings"
                      className="card p-6 animate-fade-in"
                    >
                      {result.bug_report ? (
                        <FindingsTable bugReport={result.bug_report} />
                      ) : (
                        <Empty msg="No findings data" />
                      )}
                    </Tabs.Content>
                    <Tabs.Content
                      value="fix-history"
                      className="card p-6 animate-fade-in"
                    >
                      {result.loop_result ? (
                        <FixHistory loopResult={result.loop_result} />
                      ) : (
                        <Empty msg="No fix history" />
                      )}
                    </Tabs.Content>
                    <Tabs.Content
                      value="diff"
                      className="card p-6 animate-fade-in"
                    >
                      {result.loop_result?.final_code ? (
                        <CodeDiff
                          originalCode={result.original_code}
                          fixedCode={result.loop_result.final_code}
                        />
                      ) : (
                        <Empty msg="No diff available" />
                      )}
                    </Tabs.Content>
                    <Tabs.Content
                      value="report"
                      className="card p-6 animate-fade-in"
                    >
                      {result.documentation_result ? (
                        <ReportViewer
                          doc={result.documentation_result}
                          runId={result.id}
                        />
                      ) : (
                        <Empty msg="No report generated" />
                      )}
                    </Tabs.Content>
                  </div>
                </Tabs.Root>

                {/* Reset */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => {
                      setResult(null);
                      setProgress(null);
                      scrollTo(editorRef);
                    }}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Analyse another file
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="py-10 border-t border-line">
        <div className="wrap max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={32} />
            <span className="font-heading text-base font-bold tracking-tight text-t-1">
              D<span className="text-accent">IG</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm text-t-3">
            <Link
              href="/history"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-2/50 px-3 py-2.5 text-t-2 hover:bg-bg-3 hover:text-t-1 transition-colors"
            >
              <History className="h-3.5 w-3.5 text-accent" strokeWidth={2.25} />
              History
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-2/50 px-3 py-2.5 text-t-2 hover:bg-bg-3 hover:text-t-1 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-t-3" strokeWidth={2} />
              Settings
            </Link>
            <span
              className="font-mono sm:border-l sm:border-line sm:pl-3 sm:ml-0.5"
              style={{ letterSpacing: "0.02em" }}
            >
              DIG · Gemini 2.5 Flash
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
      style={{ background: "var(--bg-1)", border: "1px solid var(--line-2)" }}
    >
      <span className={cn("font-mono font-bold text-sm", color)}>{value}</span>
      <span className="text-t-3" style={{ fontSize: "12px" }}>
        {label}
      </span>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div
      className="flex items-center justify-center py-10 text-t-3"
      style={{ fontSize: "13px" }}
    >
      {msg}
    </div>
  );
}
