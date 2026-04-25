"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDuration, loopStatusLabel } from "@/lib/utils";
import { Trash2, RotateCcw, ArrowRight, Inbox } from "lucide-react";
import type { RunHistoryEntry } from "@/lib/types";

interface RunHistoryTableProps {
  history: RunHistoryEntry[];
  onDelete: (id: string) => void;
  onRerun: (entry: RunHistoryEntry) => void;
}

export function RunHistoryTable({
  history,
  onDelete,
  onRerun,
}: RunHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-bg-2 border border-line flex items-center justify-center">
          <Inbox className="w-6 h-6 text-t-3" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-t-1">No runs yet</p>
          <p className="text-xs text-t-3 mt-1">
            Run the pipeline on a Python file to see results here
          </p>
        </div>
        <Link href="/">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Go to Run
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-3 border-b border-line">
            <th className="px-4 py-3 text-left text-xs font-semibold text-t-2 uppercase tracking-wide">
              File
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-t-2 uppercase tracking-wide">
              Started
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-t-2 uppercase tracking-wide">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-t-2 uppercase tracking-wide">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-t-2 uppercase tracking-wide">
              Loop
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-t-2 uppercase tracking-wide w-20">
              Iter
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-t-2 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {history.map((entry) => (
            <tr
              key={entry.id}
              className="hover:bg-bg-3/40 transition-colors duration-150 group"
            >
              {/* Filename */}
              <td className="px-4 py-3">
                <Link
                  href={`/results/${entry.id}`}
                  className="font-mono text-sm text-t-1 hover:text-accent transition-colors"
                >
                  {entry.filename}
                </Link>
                {entry.critical_count > 0 && (
                  <span className="ml-2 text-xs text-s_error font-mono">
                    {entry.critical_count} critical
                  </span>
                )}
              </td>

              {/* Started */}
              <td className="px-4 py-3 text-xs text-t-3 whitespace-nowrap">
                {formatDate(entry.started_at)}
              </td>

              {/* Duration */}
              <td className="px-4 py-3 text-xs font-mono text-t-3">
                {formatDuration(entry.started_at, entry.finished_at)}
              </td>

              {/* Pipeline status */}
              <td className="px-4 py-3">
                <Badge
                  variant={
                    entry.status === "ERROR"
                      ? "error"
                      : entry.status === "PARTIAL"
                        ? "warn"
                        : entry.status === "DONE"
                          ? "ok"
                          : "neutral"
                  }
                  dot
                >
                  {entry.status}
                </Badge>
              </td>

              {/* Loop status */}
              <td className="px-4 py-3">
                <Badge
                  variant={
                    entry.loop_status === "CLEAN"
                      ? "ok"
                      : entry.loop_status === "ERROR"
                        ? "error"
                        : entry.loop_status === "NO_IMPROVEMENT"
                          ? "warn"
                          : entry.loop_status === "MAX_ITERATIONS_REACHED"
                            ? "warn"
                            : "neutral"
                  }
                >
                  {loopStatusLabel(entry.loop_status)}
                </Badge>
              </td>

              {/* Iterations */}
              <td className="px-4 py-3 font-mono text-xs text-t-3">
                {entry.iteration_count > 0 ? entry.iteration_count : "—"}
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                  <Link href={`/results/${entry.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={() => onRerun(entry)}
                    aria-label="Re-run"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => onDelete(entry.id)}
                    aria-label="Delete run"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
