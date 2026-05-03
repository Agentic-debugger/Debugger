"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import type { BugReport, Finding } from "@/lib/types";

type SortKey = "line" | "severity" | "type";

export function FindingsTable({
  bugReport,
  onLineClick,
}: {
  bugReport: BugReport;
  onLineClick?: (l: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!bugReport.findings.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(22,163,74,0.08)",
            border: "1px solid rgba(22,163,74,0.22)",
          }}
        >
          <CheckCircle2 className="w-5 h-5 text-s_ok" />
        </div>
        <p className="font-medium text-t-1" style={{ fontSize: "14px" }}>
          No issues detected
        </p>
        <p className="text-t-3" style={{ fontSize: "12px" }}>
          All checks passed
        </p>
      </div>
    );
  }

  const errors   = bugReport.findings.filter((f) => f.severity === "Error").length;
  const warnings = bugReport.findings.filter((f) => f.severity === "Warning").length;

  const sorted = [...bugReport.findings].sort((a, b) => {
    let c = 0;
    if (sortKey === "line")     c = a.line - b.line;
    if (sortKey === "severity") c = a.severity === "Error" ? -1 : 1;
    if (sortKey === "type")     c = a.type.localeCompare(b.type);
    return sortDir === "asc" ? c : -c;
  });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4" style={{ fontSize: "13px" }}>
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-s_error" />
          <span className="text-t-2">
            <span className="font-semibold text-s_error">{errors}</span> error
            {errors !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="w-px h-4 bg-line-2" />
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-s_warn" />
          <span className="text-t-2">
            <span className="font-semibold text-s_warn">{warnings}</span>{" "}
            warning{warnings !== 1 ? "s" : ""}
          </span>
        </div>
        {bugReport.critical_count > 0 && (
          <Badge variant="error" dot>
            {bugReport.critical_count} critical
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border border-line">
        <table className="w-full" style={{ fontSize: "13px" }}>
          <thead>
            <tr className="border-b border-line" style={{ background: "var(--bg-1)" }}>
              <Th label="Line"     k="line"     current={sortKey} dir={sortDir} onSort={toggleSort} w="64px" />
              <Th label="Type"     k="type"     current={sortKey} dir={sortDir} onSort={toggleSort} w="160px" />
              <Th label="Severity" k="severity" current={sortKey} dir={sortDir} onSort={toggleSort} w="110px" />
              <th
                className="px-4 py-3 text-left font-mono"
                style={{ color: "var(--t-3)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                Diagnosis
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => (
              <FindingRow
                key={i}
                finding={f}
                isExpanded={expanded === i}
                onToggle={() => setExpanded(expanded === i ? null : i)}
                onLineClick={onLineClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, k, current, dir, onSort, w }: {
  label: string; k: SortKey; current: SortKey; dir: "asc" | "desc";
  onSort: (k: SortKey) => void; w?: string;
}) {
  const active = current === k;
  return (
    <th
      onClick={() => onSort(k)}
      className="font-mono"
      style={{
        width: w, cursor: "pointer", userSelect: "none",
        padding: "10px 16px", textAlign: "left",
        color: active ? "var(--accent)" : "var(--t-3)",
        fontSize: "11px", fontWeight: 600,
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}
    >
      <div className="flex items-center gap-1">
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3 opacity-30" />
        }
      </div>
    </th>
  );
}

function FindingRow({ finding, isExpanded, onToggle, onLineClick }: {
  finding: Finding; isExpanded: boolean;
  onToggle: () => void; onLineClick?: (l: number) => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        className="cursor-pointer transition-colors duration-100 border-t border-line hover:bg-bg-1 focus:bg-bg-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
      >
        <td className="px-4 py-3">
          <button
            onClick={(e) => { e.stopPropagation(); onLineClick?.(finding.line); }}
            className="font-mono text-accent hover:underline cursor-pointer"
            style={{ fontSize: "12px" }}
          >
            :{finding.line}
          </button>
        </td>
        <td className="px-4 py-3">
          <span
            className="font-mono px-2 py-0.5 rounded text-t-2 bg-bg-3 border border-line"
            style={{ fontSize: "11px" }}
          >
            {finding.type}
          </span>
        </td>
        <td className="px-4 py-3">
          <Badge variant={finding.severity === "Error" ? "error" : "warn"} dot>
            {finding.severity}
          </Badge>
        </td>
        <td className="px-4 py-3 text-t-2" style={{ maxWidth: "280px" }}>
          <span className="truncate block">{finding.diagnosis}</span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-line" style={{ background: "rgba(15,15,23,0.7)" }}>
          <td colSpan={4} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-4" style={{ fontSize: "12px" }}>
              <div>
                <p className="mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Diagnosis</p>
                <p className="leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>{finding.diagnosis}</p>
              </div>
              <div>
                <p className="mb-1.5 font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Suggested fix</p>
                <p className="leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>{finding.neutralization}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
