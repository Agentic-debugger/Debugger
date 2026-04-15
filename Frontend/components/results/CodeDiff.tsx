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
            useDarkTheme={true}
            styles={{
              variables: {
                dark: {
                  diffViewerBackground: "#0C0C0C",
                  diffViewerColor: "#FAFAFA",
                  addedBackground: "#A855F71A",
                  addedColor: "#F8FAFC",
                  removedBackground: "#EF44441A",
                  removedColor: "#F8FAFC",
                  wordAddedBackground: "#A855F733",
                  wordRemovedBackground: "#EF444433",
                  addedGutterBackground: "#A855F726",
                  removedGutterBackground: "#EF444426",
                  gutterBackground: "#000000",
                  gutterBackgroundDark: "#000000",
                  highlightBackground: "#18181B",
                  highlightGutterBackground: "#18181B",
                  codeFoldBackground: "#0F172A",
                  addedGutterColor: "#A855F7",
                  removedGutterColor: "#EF4444",
                  emptyLineBackground: "#000000",
                  gutterColor: "#52525B",
                  diffViewerTitleBackground: "#18181B",
                  diffViewerTitleBorderColor: "#27272A",
                  diffViewerTitleColor: "#A1A1AA",
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
