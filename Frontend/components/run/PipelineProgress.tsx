"use client";

import { cn } from "@/lib/utils";
import { useId, useMemo } from "react";
import {
  CheckCircle2,
  Loader2,
  Shield,
  Wrench,
  FileText,
  XCircle,
} from "lucide-react";
import type {
  PipelineProgress,
  PipelineState,
  PipelineStage,
} from "@/lib/types";

const STAGE_META: Record<
  PipelineStage,
  { title: string; sub: string; icon: typeof Shield }
> = {
  detector: {
    title: "Detector",
    sub: "AST · optional AI",
    icon: Shield,
  },
  fixer: {
    title: "Fixer",
    sub: "Patches · validation",
    icon: Wrench,
  },
  documentation: {
    title: "Documentation",
    sub: "Markdown report",
    icon: FileText,
  },
};

const STAGES: PipelineStage[] = ["detector", "fixer", "documentation"];

/** Which of the three stages is currently executing (-1 = idle / unknown while not finished). */
export function deriveActiveStageIndex(
  progress: PipelineProgress | null,
): number {
  if (!progress || progress.phase === "done") return -1;
  if (progress.stage === "detector") return 0;
  if (progress.stage === "fixer") return 1;
  if (progress.stage === "documentation") return 2;
  if (progress.phase === "documentation") return 2;
  if (progress.phase === "fixing") return 1;
  if (progress.phase === "detection") {
    const m = progress.message ?? "";
    if (/validator|re-?scan/i.test(m)) return 1;
    return 0;
  }
  return 0;
}

function RailSegment({
  trackComplete,
  flowEnergy,
  warmup,
}: {
  trackComplete: boolean;
  flowEnergy: boolean;
  warmup: boolean;
}) {
  return (
    <div
      className="relative flex-1 min-w-[44px] md:min-w-[72px] lg:min-w-[96px] h-[6px] mx-2 md:mx-3 rounded-full bg-line/90 overflow-hidden self-center mt-[28px]"
      aria-hidden
    >
      {trackComplete && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-accent/60 via-accent/40 to-accent/25 transition-all duration-500" />
      )}
      {warmup && (
        <div className="absolute inset-0 opacity-75 pointer-events-none">
          <div
            className="absolute inset-y-0 w-[46%] rounded-full bg-gradient-to-r from-transparent via-accent to-transparent animate-rail-flow-slow shadow-[0_0_14px_rgba(168,85,247,0.55)]"
            style={{ willChange: "transform" }}
          />
        </div>
      )}
      {flowEnergy && (
        <div
          className="absolute inset-y-0 w-[42%] rounded-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-95 animate-rail-flow shadow-[0_0_18px_rgba(168,85,247,0.92)]"
          style={{ willChange: "transform" }}
        />
      )}
    </div>
  );
}

interface Props {
  progress: PipelineProgress | null;
  result: PipelineState | null;
  isRunning: boolean;
  maxIterations?: number;
}

export function PipelineProgressPanel({
  progress,
  result,
  isRunning,
  maxIterations: maxIterationsProp,
}: Props) {
  const maxIter = progress?.max_iterations ?? maxIterationsProp ?? 3;
  const loopMarkerId = `loop-arrow-${useId().replace(/:/g, "")}`;

  const finished =
    !isRunning && (!!result || progress?.phase === "done");

  const activeStage = useMemo(
    () => deriveActiveStageIndex(progress),
    [progress],
  );

  const curMessage = progress?.message;

  /** True while validator / re-scan is running — matches “feedback toward Detector”. */
  const loopBackActive = Boolean(
    isRunning &&
      !finished &&
      progress?.stage === "fixer" &&
      progress.phase === "detection",
  );

  const stageHeadline = useMemo(() => {
    if (finished) return "Complete";
    if (activeStage < 0) return "…";
    return STAGE_META[STAGES[activeStage]!].title;
  }, [activeStage, finished]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-t-3">
            Live pipeline
          </p>
          <p className="text-sm text-t-2 mt-0.5">
            Forward pass: Detector → Fixer → Documentation. The curved line shows
            how validate / re-scan loops back toward Detector each iteration.
          </p>
        </div>
        {isRunning && activeStage >= 0 && (
          <div className="shrink-0 flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="tabular-nums">{stageHeadline}</span>
          </div>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="relative mx-auto min-w-min max-w-4xl px-2 md:px-4">
          <div className="flex min-w-max items-stretch justify-center gap-2 md:gap-6 lg:gap-10">
          {STAGES.map((stageKey, i) => {
            const meta = STAGE_META[stageKey];
            const Icon = meta.icon;

            const state: "pending" | "active" | "done" = finished
              ? "done"
              : activeStage > i
                ? "done"
                : activeStage === i
                  ? "active"
                  : "pending";

            const showFixerDetail =
              stageKey === "fixer" &&
              progress?.stage === "fixer" &&
              progress.iteration != null;

            return (
              <div key={stageKey} className="flex items-stretch">
                <div className="flex w-[118px] md:w-[132px] lg:w-[140px] shrink-0 flex-col items-center text-center px-1">
                  <div
                    className={cn(
                      "relative flex h-[52px] w-[52px] md:h-14 md:w-14 items-center justify-center rounded-2xl border-2 transition-all duration-500",
                      state === "pending" &&
                        "border-line bg-bg-2 text-t-3 opacity-55",
                      state === "active" &&
                        "border-accent bg-accent/15 text-accent scale-[1.05] animate-stage-glow",
                      state === "done" &&
                        "border-accent bg-accent text-white shadow-[0_0_14px_rgba(168,85,247,0.4)]",
                    )}
                  >
                    {state === "active" && isRunning ? (
                      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} />
                    ) : state === "done" ? (
                      <CheckCircle2
                        className="h-5 w-5 text-white"
                        strokeWidth={2.25}
                      />
                    ) : (
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    )}
                    {state === "active" && isRunning && (
                      <span
                        className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-accent/35 ring-offset-2 ring-offset-bg-1 animate-pulse"
                        aria-hidden
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-[11px] font-semibold leading-tight text-t-1",
                      state === "pending" && "text-t-3",
                    )}
                  >
                    {meta.title}
                  </span>
                  <span className="mt-0.5 text-[10px] leading-tight text-t-3 max-w-[130px]">
                    {showFixerDetail
                      ? `Iteration ${progress.iteration} / ${maxIter}`
                      : meta.sub}
                  </span>
                </div>

                {i < STAGES.length - 1 && (
                  <RailSegment
                    trackComplete={finished || activeStage > i}
                    flowEnergy={
                      isRunning &&
                      !finished &&
                      activeStage === i + 1
                    }
                    warmup={
                      isRunning && !finished && activeStage === 0 && i === 0
                    }
                  />
                )}
              </div>
            );
          })}
          </div>

          {/* Loop-back edge: Fixer → Detector (validator / re-detect) */}
          <div className="mt-4 md:mt-5 flex w-full min-w-[min(100%,520px)] max-w-3xl mx-auto flex-col items-center gap-2">
            <svg
              className={cn(
                "h-[52px] md:h-[56px] w-full overflow-visible select-none",
                loopBackActive ? "text-accent drop-shadow-[0_0_10px_rgba(168,85,247,0.45)]" : "text-t-3/40",
              )}
              viewBox="0 0 100 24"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <marker
                  id={loopMarkerId}
                  markerUnits="strokeWidth"
                  markerWidth="5"
                  markerHeight="5"
                  refX="4.5"
                  refY="2.5"
                  orient="auto"
                >
                  <path
                    d="M0,0 L5,2.5 L0,5 z"
                    fill={loopBackActive ? "#A855F7" : "rgba(82,82,91,0.6)"}
                  />
                </marker>
              </defs>
              {/* Wider sweep: from Fixer (center) down and back to Detector */}
              <path
                d="M 50 2.5 C 48 14, 28 19.5, 16.8 19.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={loopBackActive ? 2.75 : 2}
                strokeLinecap="round"
                strokeDasharray={loopBackActive ? "10 7" : "6 5"}
                markerEnd={`url(#${loopMarkerId})`}
                className={cn(
                  "motion-reduce:animate-none transition-[color,stroke-width,filter] duration-300",
                  loopBackActive && "animate-loop-back-dash",
                )}
              />
              {loopBackActive && (
                <path
                  d="M 50 2.5 C 48 14, 28 19.5, 16.8 19.5"
                  fill="none"
                  stroke="rgb(168,85,247)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeOpacity={0.2}
                  className="pointer-events-none blur-[3px]"
                />
              )}
            </svg>
            <p className="text-center text-[9px] md:text-[10px] text-t-3 leading-snug px-3 max-w-md">
              Loop: validate / re-scan → updated findings toward Detector
            </p>
          </div>
        </div>
      </div>

      {curMessage && isRunning && (
        <div
          className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-t-2 leading-snug"
          style={{ boxShadow: "0 0 24px rgba(168,85,247,0.12)" }}
        >
          <span className="font-mono text-xs uppercase tracking-wider text-accent">
            Status
          </span>
          <p className="mt-1 text-t-1">{curMessage}</p>
          {progress?.stage === "fixer" &&
            progress.max_iterations &&
            progress.iteration != null && (
              <p className="mt-2 text-xs text-t-3">
                Fix loop {progress.iteration} / {progress.max_iterations}
              </p>
            )}
        </div>
      )}

      {result && !isRunning && (
        <div
          className={cn("rounded-xl p-4 space-y-3 animate-fade-in")}
          style={{
            background:
              result.status === "ERROR"
                ? "rgba(248,113,113,0.06)"
                : "rgba(168,85,247,0.08)",
            border: `1px solid ${
              result.status === "ERROR"
                ? "rgba(248,113,113,0.2)"
                : "rgba(168,85,247,0.22)"
            }`,
          }}
        >
          <div className="flex items-center gap-2">
            {result.status === "ERROR" ? (
              <XCircle className="w-4 h-4 text-s_error flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-s_ok flex-shrink-0" />
            )}
            <span
              className={cn(
                "font-semibold",
                result.status === "ERROR" ? "text-s_error" : "text-s_ok",
              )}
              style={{ fontSize: "13px" }}
            >
              {result.status === "DONE"
                ? "Complete"
                : result.status === "PARTIAL"
                  ? "Partial"
                  : "Failed"}
            </span>
          </div>
          {result.loop_result && (
            <div
              className="grid grid-cols-2 gap-y-1.5"
              style={{ fontSize: "12px" }}
            >
              <span className="text-t-3">Loop status</span>
              <span className="font-mono text-t-1">
                {result.loop_result.status}
              </span>
              <span className="text-t-3">Iterations</span>
              <span className="font-mono text-t-1">
                {result.loop_result.iteration}
              </span>
              {result.bug_report && (
                <>
                  <span className="text-t-3">Issues found</span>
                  <span className="font-mono text-t-1">
                    {result.bug_report.findings.length}
                    {result.bug_report.critical_count > 0 && (
                      <span className="text-s_error ml-1">
                        ({result.bug_report.critical_count} critical)
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
