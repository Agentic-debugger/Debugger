"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, FileText, Code2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DocumentationResult } from "@/lib/types";

interface ReportViewerProps {
  doc: DocumentationResult;
  runId: string;
}

export function ReportViewer({ doc, runId }: ReportViewerProps) {
  const [view, setView] = useState<"rendered" | "raw">("rendered");

  const handleDownload = (format: "md" | "html") => {
    if (format === "md") {
      const blob = new Blob([doc.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sp202-report-${runId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      window.open(`/api/results/${runId}/report?format=html`, "_blank");
    }
  };

  if (doc.status === "ERROR") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <p className="text-sm text-s_error">Documentation generation failed</p>
        {doc.error && <p className="text-xs text-t-3 font-mono">{doc.error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("rendered")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer
                        ${view === "rendered" ? "bg-bg-3 text-t-1 border border-line" : "text-t-3 hover:text-t-2"}`}
          >
            <FileText className="w-3.5 h-3.5" />
            Rendered
          </button>
          <button
            onClick={() => setView("raw")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer
                        ${view === "raw" ? "bg-bg-3 text-t-1 border border-line" : "text-t-3 hover:text-t-2"}`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Markdown
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleDownload("md")}
          >
            .md
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleDownload("html")}
          >
            .html
          </Button>
        </div>
      </div>

      {/* Report path */}
      {doc.output_path && (
        <p className="text-xs text-t-3 font-mono truncate">
          Saved to: {doc.output_path}
        </p>
      )}

      {/* Content */}
      <div className="border border-line rounded-lg overflow-hidden">
        {view === "rendered" ? (
          <div className="p-6 max-h-[600px] overflow-y-auto prose-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {doc.markdown}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="p-6 text-xs font-mono text-t-2 bg-bg-3 max-h-[600px] overflow-auto whitespace-pre-wrap break-words">
            {doc.markdown}
          </pre>
        )}
      </div>
    </div>
  );
}
