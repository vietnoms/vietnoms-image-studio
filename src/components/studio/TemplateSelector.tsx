"use client";

import { useState, useEffect, useMemo } from "react";
import { type Workspace } from "@/lib/constants";
import { type Template, extractVariables, variableToLabel } from "@/lib/templates";

interface TemplateSelectorProps {
  workspace: Workspace;
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template | null) => void;
}

export function TemplateSelector({
  workspace,
  selectedTemplate,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch templates when workspace changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/templates?workspace=${workspace}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setTemplates(data.templates || []);
          // Clear selection when workspace changes
          onSelectTemplate(null);
        }
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  // Group templates by category
  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const tpl of templates) {
      const cat = tpl.category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(tpl);
    }
    return map;
  }, [templates]);

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground py-1">
        Loading templates...
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Template</label>
        {selectedTemplate && (
          <button
            onClick={() => onSelectTemplate(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Template grid */}
      <div className="space-y-3">
        {[...grouped.entries()].map(([category, tpls]) => (
          <div key={category}>
            <div className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider mb-1.5">
              {category}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {tpls.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
                const vars = extractVariables(tpl.prompt_text);
                return (
                  <button
                    key={tpl.id}
                    onClick={() =>
                      onSelectTemplate(isSelected ? null : tpl)
                    }
                    className={`
                      text-left p-2.5 rounded-lg border text-xs transition-all duration-150
                      ${
                        isSelected
                          ? "border-primary/50 bg-primary/10 glow-sm"
                          : "border-border hover:border-primary/30 hover:bg-accent/50"
                      }
                    `}
                  >
                    <div className="font-medium truncate text-foreground">{tpl.name}</div>
                    {vars.length > 0 && (
                      <div className="text-muted-foreground mt-0.5 truncate text-[10px]">
                        {vars.map((v) => variableToLabel(v)).join(", ")}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
