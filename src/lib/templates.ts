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

// ── Seed Templates (used when Supabase is not configured) ───────────────
let nextLocalId = 100;
function localId(): string {
  return `local-${++nextLocalId}`;
}

const SEED_TEMPLATES: Template[] = [
  // ── Vietnoms ──
  {
    id: "tpl-vn-001",
    workspace: "vietnoms",
    name: "Kiosk Beverage \u2014 Hero Shot",
    category: "beverage",
    prompt_text:
      "Professional product photography of a Vietnamese {beverage_name}, centered on a clean white surface with soft diffused lighting from the upper left, slight condensation on the cup, garnished with {garnish}. Shot from a 30-degree elevated angle. Crisp, appetizing, restaurant menu quality. 4K detail.",
    negative_prompt: "",
    aspect_ratio: "4:5",
    style_preset: "product-photo-clean",
    usage_count: 0,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "tpl-vn-002",
    workspace: "vietnoms",
    name: "Kiosk Entree \u2014 Overhead",
    category: "entree",
    prompt_text:
      "Overhead flat-lay food photography of {dish_name} in a modern bowl on a light wood surface. Vietnamese herbs and lime wedge garnish visible. Natural window lighting from the left. Steam slightly visible. Professional restaurant menu quality.",
    negative_prompt: "",
    aspect_ratio: "1:1",
    style_preset: "product-photo-overhead",
    usage_count: 0,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "tpl-vn-003",
    workspace: "vietnoms",
    name: "Kiosk Banner \u2014 Promo",
    category: "promo",
    prompt_text:
      "Wide promotional banner for a Vietnamese restaurant featuring {promo_item}. Modern, clean design with the text '{promo_text}' rendered clearly. Vibrant but not overwhelming colors. Digital menu board format.",
    negative_prompt: "",
    aspect_ratio: "16:9",
    style_preset: "promo-banner",
    usage_count: 0,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "tpl-vn-004",
    workspace: "vietnoms",
    name: "Beverage Lineup \u2014 Side by Side",
    category: "beverage",
    prompt_text:
      "Professional product photography lineup of {count} Vietnamese beverages side by side on a clean white surface. Consistent lighting across all drinks. Each drink is clearly distinct. Studio product photography style for a digital kiosk menu.",
    negative_prompt: "",
    aspect_ratio: "16:9",
    style_preset: "product-photo-lineup",
    usage_count: 0,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  // ── Lumination ──
  {
    id: "tpl-lm-001",
    workspace: "lumination",
    name: "Character Archetype Card",
    category: "character",
    prompt_text:
      "Anime-style character portrait of a {archetype} archetype \u2014 a {age_range} year old {description}. Dynamic pose showing inner strength. Vibrant color palette with {color_theme} tones. Semi-realistic anime art style. Suitable as a collectible card illustration. High detail, clean linework.",
    negative_prompt: "",
    aspect_ratio: "4:5",
    style_preset: "anime-character-card",
    usage_count: 0,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "tpl-lm-002",
    workspace: "lumination",
    name: "Hero Journey Scene",
    category: "scene",
    prompt_text:
      "Cinematic anime scene depicting the '{journey_stage}' stage of the hero's journey. A young protagonist {action_description}. Epic lighting with {mood} atmosphere. Wide shot showing environment and character. Anime film quality.",
    negative_prompt: "",
    aspect_ratio: "16:9",
    style_preset: "anime-cinematic",
    usage_count: 0,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "tpl-lm-003",
    workspace: "lumination",
    name: "Social Media \u2014 Quote Card",
    category: "social",
    prompt_text:
      "Inspirational quote card for Instagram with the text: '{quote_text}'. Anime-inspired background with subtle {element} motifs. Clean typography, easily readable. Brand colors: deep purple and gold accents. Modern, aspirational design appealing to teens and young adults.",
    negative_prompt: "",
    aspect_ratio: "1:1",
    style_preset: "social-quote",
    usage_count: 0,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "tpl-lm-004",
    workspace: "lumination",
    name: "Lore Drop Thumbnail",
    category: "content",
    prompt_text:
      "YouTube/social media thumbnail featuring an anime-style {character_type} with an intense expression. Bold text area reserved on the right side. Dynamic action lines in the background. Eye-catching, high contrast, designed to grab attention in a feed.",
    negative_prompt: "",
    aspect_ratio: "16:9",
    style_preset: "thumbnail-bold",
    usage_count: 0,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

// ── In-memory store (fallback when Supabase is not configured) ──────────
let localTemplates: Template[] = [...SEED_TEMPLATES];

/** List templates, optionally filtered by workspace */
export function getTemplates(workspace?: Workspace): Template[] {
  if (workspace) {
    return localTemplates.filter((t) => t.workspace === workspace);
  }
  return [...localTemplates];
}

/** Get a single template by ID */
export function getTemplateById(id: string): Template | undefined {
  return localTemplates.find((t) => t.id === id);
}

/** Create a new template */
export function createTemplate(
  data: Omit<Template, "id" | "usage_count" | "created_at" | "updated_at">
): Template {
  const now = new Date().toISOString();
  const template: Template = {
    ...data,
    id: localId(),
    usage_count: 0,
    created_at: now,
    updated_at: now,
  };
  localTemplates.unshift(template);
  return template;
}

/** Update an existing template */
export function updateTemplate(
  id: string,
  data: Partial<Omit<Template, "id" | "created_at">>
): Template | null {
  const idx = localTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  localTemplates[idx] = {
    ...localTemplates[idx],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return localTemplates[idx];
}

/** Delete a template */
export function deleteTemplate(id: string): boolean {
  const before = localTemplates.length;
  localTemplates = localTemplates.filter((t) => t.id !== id);
  return localTemplates.length < before;
}

/** Duplicate a template */
export function duplicateTemplate(id: string): Template | null {
  const source = getTemplateById(id);
  if (!source) return null;

  return createTemplate({
    workspace: source.workspace,
    name: `${source.name} (Copy)`,
    category: source.category,
    prompt_text: source.prompt_text,
    negative_prompt: source.negative_prompt,
    aspect_ratio: source.aspect_ratio,
    style_preset: source.style_preset,
  });
}

/** Increment usage count */
export function incrementUsage(id: string): void {
  const tpl = localTemplates.find((t) => t.id === id);
  if (tpl) {
    tpl.usage_count += 1;
    tpl.updated_at = new Date().toISOString();
  }
}

/** Get unique categories for a workspace */
export function getCategories(workspace: Workspace): string[] {
  const templates = getTemplates(workspace);
  return [...new Set(templates.map((t) => t.category))].sort();
}
