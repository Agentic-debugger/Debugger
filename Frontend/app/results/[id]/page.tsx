"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeft,
  Shield,
  Wrench,
  GitCompare,
  FileText,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FindingsTable } from "@/components/results/FindingsTable";
import { FixHistory } from "@/components/results/FixHistory";
import { CodeDiff } from "@/components/results/CodeDiff";
import { ReportViewer } from "@/components/results/ReportViewer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { getRunResult } from "@/lib/api";
import { formatDate, formatDuration, loopStatusLabel } from "@/lib/utils";
import type { PipelineState } from "@/lib/types";

const TABS = [
  { id: "findings", label: "Findings", icon: Shield },
  { id: "fix-history", label: "Fix History", icon: Wrench },
  { id: "diff", label: "Code Diff", icon: GitCompare },
  { id: "report", label: "Report", icon: FileText },
];

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentRun } = useAppStore();

  const [result, setResult] = useState<PipelineState | null>(
    currentRun?.id === id ? currentRun : null,
  );
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result) return;
    setLoading(true);
    getRunResult(id)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, result]);

  if (loading)
    return (
      <>
        <Navbar />
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3 text-t-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading results...</span>
          </div>
        </div>
      </>
    );

  if (error || !result)
    return (
      <>
        <Navbar />
        <div className="page-container flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-s_error text-sm">{error ?? "Result not found"}</p>
          <Button variant="secondary" size="sm" onClick={() => router.push("/")}>
            Back to Run
          </Button>
        </div>
      </>
    );

  const findingCount = result.bug_report?.findings.length ?? 0;
  const errorCount =
    result.bug_report?.findings.filter((f) => f.severity === "Error").length ??
    0;
  const warningCount =
    result.bug_report?.findings.filter((f) => f.severity === "Warning")
      .length ?? 0;

  return (
    <>
      <Navbar />
    <div className="page-container space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/")}
            className="mt-1 p-1.5 rounded-lg text-t-3 hover:text-t-1 hover:bg-bg-2
                       transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-t-1 font-mono">
              {result.source_path.split(/[/\\]/).pop()}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-t-3">
              <span>{formatDate(result.started_at)}</span>
              <span>·</span>
              <span>
                {formatDuration(result.started_at, result.finished_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant={
              result.status === "ERROR"
                ? "error"
                : result.status === "PARTIAL"
                  ? "warn"
                  : "ok"
            }
            dot
          >
            {result.status}
          </Badge>
          {result.loop_result && (
            <Badge
              variant={
                result.loop_result.status === "CLEAN"
                  ? "ok"
                  : result.loop_result.status === "ERROR"
                    ? "error"
                    : "warn"
              }
            >
              {loopStatusLabel(result.loop_result.status)}
            </Badge>
          )}
        </div>
      </div>

      {/* Stat chips */}
      <div className="flex items-center gap-3 flex-wrap">
        {errorCount > 0 && (
          <StatChip label="Errors" value={errorCount} color="text-s_error" />
        )}
        {warningCount > 0 && (
          <StatChip label="Warnings" value={warningCount} color="text-s_warn" />
        )}
        {findingCount === 0 && (
          <StatChip label="Issues" value={0} color="text-accent" />
        )}
        {result.loop_result && (
          <StatChip
            label="Iterations"
            value={result.loop_result.iteration}
            color="text-t-2"
          />
        )}
        {result.bug_report?.critical_count ? (
          <StatChip
            label="Critical"
            value={result.bug_report.critical_count}
            color="text-s_error"
          />
        ) : null}
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="findings" className="space-y-4">
        <Tabs.List
          className="flex items-center gap-1 bg-bg-2 border border-line rounded-xl p-1"
          aria-label="Results tabs"
        >
          {TABS.map(({ id: tabId, label, icon: Icon }) => {
            const countBadge =
              tabId === "findings" && findingCount > 0
                ? findingCount
                : tabId === "fix-history" && result.loop_result
                  ? result.loop_result.iteration
                  : null;

            return (
              <Tabs.Trigger
                key={tabId}
                value={tabId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1
                           text-t-3 transition-colors duration-150 cursor-pointer
                           hover:text-t-2
                           data-[state=active]:bg-bg-3 data-[state=active]:text-t-1
                           focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                {countBadge !== null && (
                  <span className="ml-auto text-xs font-mono bg-bg-2 px-1.5 py-0.5 rounded">
                    {countBadge}
                  </span>
                )}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {/* Findings */}
        <Tabs.Content
          value="findings"
          className="card card-body animate-fade-in"
        >
          {result.bug_report ? (
            <FindingsTable bugReport={result.bug_report} />
          ) : (
            <EmptyTab message="No bug report available" />
          )}
        </Tabs.Content>

        {/* Fix History */}
        <Tabs.Content
          value="fix-history"
          className="card card-body animate-fade-in"
        >
          {result.loop_result ? (
            <FixHistory loopResult={result.loop_result} />
          ) : (
            <EmptyTab message="No fix loop data available" />
          )}
        </Tabs.Content>

        {/* Code Diff */}
        <Tabs.Content value="diff" className="card card-body animate-fade-in">
          {result.loop_result?.final_code ? (
            <CodeDiff
              originalCode={result.original_code}
              fixedCode={result.loop_result.final_code}
            />
          ) : (
            <EmptyTab message="No fixed code available" />
          )}
        </Tabs.Content>

        {/* Report */}
        <Tabs.Content value="report" className="card card-body animate-fade-in">
          {result.documentation_result ? (
            <ReportViewer doc={result.documentation_result} runId={result.id} />
          ) : (
            <EmptyTab message="No report generated" />
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
    </>
  );
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-2 border border-line rounded-lg">
      <span className={`font-mono font-semibold text-sm ${color}`}>
        {value}
      </span>
      <span className="text-xs text-t-3">{label}</span>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-t-3 text-sm">
      {message}
    </div>
  );
}
