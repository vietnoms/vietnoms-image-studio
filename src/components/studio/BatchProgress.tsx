"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { type GeneratedImage } from "./ResultPreview";

export interface BatchResult {
  itemId: string;
  itemName: string;
  status: "pending" | "generating" | "done" | "error";
  image?: GeneratedImage;
  error?: string;
}

interface BatchProgressProps {
  total: number;
  completed: number;
  results: BatchResult[];
  onCancel: () => void;
  onDone: () => void;
  isDone: boolean;
}

export function BatchProgress({
  total,
  completed,
  results,
  onCancel,
  onDone,
  isDone,
}: BatchProgressProps) {
  const succeeded = results.filter((r) => r.status === "done").length;
  const failed = results.filter((r) => r.status === "error").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">
            {isDone ? "Batch Complete" : "Batch Generation"}
          </h3>
          <span className="text-xs text-muted-foreground">
            {completed} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isDone ? "bg-green-500" : "gradient-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Summary stats */}
        {isDone && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            {succeeded > 0 && (
              <span className="text-green-400">{succeeded} succeeded</span>
            )}
            {failed > 0 && (
              <span className="text-red-400">{failed} failed</span>
            )}
            <span className="text-muted-foreground">
              Est. ${(succeeded * 0.18).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {results.map((result) => (
          <div
            key={result.itemId}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg border transition-colors",
              result.status === "generating"
                ? "border-primary/30 bg-primary/5"
                : result.status === "done"
                  ? "border-green-500/20 bg-green-500/5"
                  : result.status === "error"
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-border bg-card/30"
            )}
          >
            {/* Thumbnail or status icon */}
            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center bg-muted/30">
              {result.status === "done" && result.image ? (
                <Image
                  src={result.image.url}
                  alt={result.itemName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : result.status === "generating" ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : result.status === "error" ? (
                <svg
                  className="w-4 h-4 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>

            {/* Item info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {result.itemName}
              </p>
              {result.status === "generating" && (
                <p className="text-[10px] text-primary">Generating...</p>
              )}
              {result.status === "error" && (
                <p className="text-[10px] text-red-400 truncate">
                  {result.error || "Failed"}
                </p>
              )}
              {result.status === "done" && (
                <p className="text-[10px] text-green-400">Done</p>
              )}
            </div>

            {/* Checkmark for done */}
            {result.status === "done" && (
              <svg
                className="w-4 h-4 text-green-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2">
        {isDone ? (
          <button
            onClick={onDone}
            className="flex-1 h-9 rounded-lg text-sm font-medium text-white gradient-primary hover:opacity-90 transition-all"
          >
            View Results
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="flex-1 h-9 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
