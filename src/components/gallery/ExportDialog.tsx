"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  imageCount: number;
}

type ExportFormat = "png" | "jpeg" | "webp";
type ExportResolution = "original" | "medium" | "thumbnail";

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  desc: string;
}[] = [
  { value: "png", label: "PNG", desc: "Lossless, largest" },
  { value: "jpeg", label: "JPEG", desc: "Lossy, smaller" },
  { value: "webp", label: "WebP", desc: "Modern, smallest" },
];

const RESOLUTION_OPTIONS: {
  value: ExportResolution;
  label: string;
  desc: string;
}[] = [
  { value: "original", label: "Original", desc: "Full resolution" },
  { value: "medium", label: "Medium", desc: "50% resolution" },
  { value: "thumbnail", label: "Thumbnail", desc: "200px max" },
];

export function ExportDialog({
  open,
  onOpenChange,
  selectedIds,
  imageCount,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [resolution, setResolution] = useState<ExportResolution>("original");
  const [quality, setQuality] = useState(90);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setProgress("Preparing export...");

    try {
      const res = await fetch("/api/images/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selectedIds],
          format,
          quality: format === "png" ? 100 : quality,
          resolution,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      setProgress("Downloading ZIP...");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      setProgress(null);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Images</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Export {imageCount} image{imageCount !== 1 ? "s" : ""} as a ZIP
            file.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-left transition-colors",
                    format === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  )}
                >
                  <span className="text-sm font-medium block">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider (JPEG/WebP only) */}
          {format !== "png" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quality: {quality}%
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          {/* Resolution */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Resolution
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RESOLUTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setResolution(opt.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-left transition-colors",
                    resolution === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  )}
                >
                  <span className="text-sm font-medium block">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {progress && (
            <span className="text-xs text-muted-foreground mr-auto flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              {progress}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting || selectedIds.size === 0}
          >
            {isExporting ? "Exporting..." : `Export ${imageCount} Image${imageCount !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
