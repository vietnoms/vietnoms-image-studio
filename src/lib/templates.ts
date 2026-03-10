import { type Workspace, type AspectRatio } from "./constants";

// ── Types ───────────────────────────────────────────────────────────────
export interface Template {
  id: string;
  workspace: Workspace;
  name: string;
  category: string;
  prompt_text: string;
  negative_prompt: string;
  aspect_ratio: AspectRatio;
  style_preset: string;
  usage_count: number;
  is_premium: boolean;
  source_image_url: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  label: string; // human-readable: "beverage_name" → "Beverage Name"
  value: string;
}

// ── Variable Extraction ─────────────────────────────────────────────────
const VAR_REGEX = /\{(\w+)\}/g;

/** Extract variable names from a template prompt string */
export function extractVariables(promptText: string): string[] {
  const vars: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = VAR_REGEX.exec(promptText)) !== null) {
    if (!vars.includes(match[1])) {
      vars.push(match[1]);
    }
  }
  return vars;
}

/** Convert snake_case variable name to a friendly label */
export function variableToLabel(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Substitute variable values into a template prompt */
export function fillTemplate(
  promptText: string,
  values: Record<string, string>
): string {
  return promptText.replace(VAR_REGEX, (_, varName) => {
    return values[varName] || `{${varName}}`;
  });
}
