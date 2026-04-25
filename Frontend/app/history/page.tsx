"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, History, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { RunHistoryTable } from "@/components/history/RunHistoryTable";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { deleteRun, getRunHistory } from "@/lib/api";
import type { RunHistoryEntry } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const {
    history: localHistory,
    removeFromHistory,
    clearHistory,
  } = useAppStore();
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getRunHistory()
      .then((rows) => {
        if (mounted) setHistory(rows);
      })
      .catch(() => {
        if (mounted) setHistory(localHistory);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [localHistory]);

  const handleRerun = (entry: RunHistoryEntry) => {
    router.push(`/?rerun=${entry.id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRun(id);
      setHistory((prev) => prev.filter((r) => r.id !== id));
    } catch {
      removeFromHistory(id);
      setHistory((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleClearAll = async () => {
    const ids = history.map((r) => r.id);
    await Promise.all(
      ids.map(async (id) => {
        try {
          await deleteRun(id);
        } catch {
          // Keep UI moving even if server no longer has an entry.
        }
      }),
    );
    clearHistory();
    setHistory([]);
  };

  return (
    <>
      <Navbar />
    <div className="page-container space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-bg-2 border border-line flex items-center justify-center">
            <History className="w-4 h-4 text-t-3" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-t-1">Run History</h1>
            <p className="text-xs text-t-3 mt-0.5">
              {history.length} run{history.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => {
              if (confirm("Clear all run history?")) void handleClearAll();
            }}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-t-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading history…</span>
        </div>
      ) : (
        <RunHistoryTable
          history={history}
          onDelete={(id) => void handleDelete(id)}
          onRerun={handleRerun}
        />
      )}
    </div>
    </>
  );
}
