"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  type Template,
  extractVariables,
  variableToLabel,
  fillTemplate,
} from "@/lib/templates";
import { type MenuItem } from "@/lib/menu-items";

interface PromptInputProps {
  prompt: string;
  negativePrompt: string;
  onPromptChange: (value: string) => void;
  onNegativePromptChange: (value: string) => void;
  showNegative: boolean;
  onToggleNegative: () => void;
  // Template support
  selectedTemplate: Template | null;
  variableValues: Record<string, string>;
  onVariableChange: (name: string, value: string) => void;
  // Menu item support
  selectedItems?: MenuItem[];
}

export function PromptInput({
  prompt,
  negativePrompt,
  onPromptChange,
  onNegativePromptChange,
  showNegative,
  onToggleNegative,
  selectedTemplate,
  variableValues,
  onVariableChange,
  selectedItems = [],
}: PromptInputProps) {
  const variables = selectedTemplate
    ? extractVariables(selectedTemplate.prompt_text)
    : [];

  // Show a preview of the filled-in template
  const filledPreview = selectedTemplate
    ? fillTemplate(selectedTemplate.prompt_text, variableValues)
    : null;

  return (
    <div className="space-y-3">
      {/* Template variable inputs */}
      {selectedTemplate && variables.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Template Variables
            </label>
            <span className="text-xs text-muted-foreground">
              {variables.length} field{variables.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1.5">
            {variables.map((varName) => (
              <div key={varName}>
                <label className="text-xs text-muted-foreground mb-0.5 block">
                  {variableToLabel(varName)}
                </label>
                <input
                  type="text"
                  value={variableValues[varName] || ""}
                  onChange={(e) => onVariableChange(varName, e.target.value)}
                  placeholder={`Enter ${variableToLabel(varName).toLowerCase()}...`}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            ))}
          </div>

          {/* Filled prompt preview */}
          {filledPreview && (
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              <div className="font-medium text-foreground mb-0.5">Preview:</div>
              <div className="leading-relaxed">{filledPreview}</div>
            </div>
          )}
        </div>
      )}

      {/* Reference photos indicator */}
      {selectedItems.length > 0 && (() => {
        const totalRefs = selectedItems.reduce(
          (sum, i) => sum + i.referenceImages.length, 0
        );
        return totalRefs > 0 ? (
          <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            Using {totalRefs} reference photo{totalRefs !== 1 ? "s" : ""} for AI-guided generation
          </div>
        ) : null;
      })()}

      {/* Main prompt textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">
            {selectedTemplate ? "Additional Instructions" : "Prompt"}
          </label>
          <span className="text-xs text-muted-foreground">
            {prompt.length} chars
          </span>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={
            selectedTemplate
              ? "Add any extra details or overrides (optional)..."
              : "Describe the image you want to generate..."
          }
          className={`resize-none ${selectedTemplate ? "min-h-[60px]" : "min-h-[120px]"}`}
        />
      </div>

      {/* Negative prompt */}
      <div>
        <button
          onClick={onToggleNegative}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showNegative ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
          Negative prompt
        </button>
        {showNegative && (
          <Textarea
            value={negativePrompt}
            onChange={(e) => onNegativePromptChange(e.target.value)}
            placeholder="Things to avoid in the generation..."
            className="mt-2 min-h-[60px] resize-none"
          />
        )}
      </div>
    </div>
  );
}
