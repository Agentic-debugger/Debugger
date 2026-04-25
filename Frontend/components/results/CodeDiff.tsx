"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Copy, Check, SplitSquareHorizontal, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-bg-3 rounded-lg animate-pulse">
      <span className="text-t-3 text-sm font-mono">Loading diff...</span>
    </div>
  ),
});

interface CodeDiffProps {
  originalCode: string;
  fixedCode: string;
}

export function CodeDiff({ originalCode, fixedCode }: CodeDiffProps) {
  const [splitView, setSplitView] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fixedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unchanged = originalCode === fixedCode;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSplitView(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer
                        ${splitView ? "bg-bg-3 text-t-1 border border-line" : "text-t-3 hover:text-t-2"}`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            Split
          </button>
          <button
            onClick={() => setSplitView(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer
                        ${!splitView ? "bg-bg-3 text-t-1 border border-line" : "text-t-3 hover:text-t-2"}`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            Unified
          </button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={
            copied ? (
              <Check className="w-3.5 h-3.5 text-accent" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )
          }
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy Fixed Code"}
        </Button>
      </div>

      {unchanged ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 bg-bg-3/30 rounded-lg border border-line">
          <Check className="w-8 h-8 text-accent" />
          <p className="text-sm text-t-2">No changes — code is identical</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-line text-xs font-mono">
          <ReactDiffViewer
            oldValue={originalCode}
            newValue={fixedCode}
            splitView={splitView}
            leftTitle="Original"
            rightTitle="Fixed"
            useDarkTheme={false}
            styles={{
              variables: {
                light: {
                  diffViewerBackground: "#FAFAFA",
                  diffViewerColor: "#09090B",
                  addedBackground: "rgba(22,163,74,0.08)",
                  addedColor: "#09090B",
                  removedBackground: "rgba(220,38,38,0.08)",
                  removedColor: "#09090B",
                  wordAddedBackground: "rgba(22,163,74,0.18)",
                  wordRemovedBackground: "rgba(220,38,38,0.18)",
                  addedGutterBackground: "rgba(22,163,74,0.12)",
                  removedGutterBackground: "rgba(220,38,38,0.12)",
                  gutterBackground: "#F4F4F5",
                  gutterBackgroundDark: "#E4E4E7",
                  highlightBackground: "#E4E4E7",
                  highlightGutterBackground: "#D4D4D8",
                  codeFoldBackground: "#F4F4F5",
                  addedGutterColor: "#16A34A",
                  removedGutterColor: "#DC2626",
                  emptyLineBackground: "#FAFAFA",
                  gutterColor: "#A1A1AA",
                  diffViewerTitleBackground: "#F4F4F5",
                  diffViewerTitleBorderColor: "#E4E4E7",
                  diffViewerTitleColor: "#52525B",
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
