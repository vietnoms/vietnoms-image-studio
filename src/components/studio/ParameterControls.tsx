"use client";

import { ASPECT_RATIOS, type AspectRatio } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ParameterControlsProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

const RATIO_SHAPES: Record<AspectRatio, { w: number; h: number }> = {
  "1:1": { w: 20, h: 20 },
  "9:16": { w: 14, h: 24 },
  "16:9": { w: 24, h: 14 },
  "4:5": { w: 18, h: 22 },
  "4:3": { w: 22, h: 17 },
};

export function ParameterControls({ aspectRatio, onAspectRatioChange }: ParameterControlsProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Aspect Ratio</label>
      <div className="grid grid-cols-5 gap-2">
        {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((ratio) => {
          const shape = RATIO_SHAPES[ratio];
          const info = ASPECT_RATIOS[ratio];
          return (
            <button
              key={ratio}
              onClick={() => onAspectRatioChange(ratio)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors",
                aspectRatio === ratio
                  ? "border-primary bg-accent"
                  : "border-border hover:border-muted-foreground/30"
              )}
              title={`${info.label} (${info.width}x${info.height})`}
            >
              <div
                className={cn(
                  "border-2 rounded-sm",
                  aspectRatio === ratio ? "border-primary" : "border-muted-foreground/40"
                )}
                style={{ width: shape.w, height: shape.h }}
              />
              <span className="text-[10px] text-muted-foreground">{ratio}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {ASPECT_RATIOS[aspectRatio].width} x {ASPECT_RATIOS[aspectRatio].height}px
      </p>
    </div>
  );
}
