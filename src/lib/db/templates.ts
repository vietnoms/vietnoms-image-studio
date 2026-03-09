import { type Workspace, type AspectRatio } from "@/lib/constants";
import { getDb } from "./client";

// Re-export the Template type from the original file
export type { Template } from "@/lib/templates";
import type { Template } from "@/lib/templates";

// ── Row ↔ TypeScript mapping ──────────────────────────────────────────
// Column names match the TS interface exactly (both snake_case), so no
// mapping is needed — rows pass through as-is.

// ── CRUD ──────────────────────────────────────────────────────────────

export async function getTemplates(workspace?: Workspace): Promise<Template[]> {
  const db = getDb();
  let query = db.from("templates").select("*").order("created_at", { ascending: true });
  if (workspace) query = query.eq("workspace", workspace);
  const { data, error } = await query;
  if (error) throw error;
  return data as Template[];
}

export async function getTemplateById(id: string): Promise<Template | undefined> {
  const db = getDb();
  const { data, error } = await db.from("templates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Template) ?? undefined;
}

export async function createTemplate(
  data: Omit<Template, "id" | "usage_count" | "created_at" | "updated_at">
): Promise<Template> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: row, error } = await db
    .from("templates")
    .insert({ ...data, usage_count: 0, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return row as Template;
}

export async function updateTemplate(
  id: string,
  data: Partial<Omit<Template, "id" | "created_at">>
): Promise<Template | null> {
  const db = getDb();
  const { data: row, error } = await db
    .from("templates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return row as Template;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const db = getDb();
  const { error, count } = await db
    .from("templates")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function duplicateTemplate(id: string): Promise<Template | null> {
  const source = await getTemplateById(id);
  if (!source) return null;
  return createTemplate({
    workspace: source.workspace,
    name: `${source.name} (Copy)`,
    category: source.category,
    prompt_text: source.prompt_text,
    negative_prompt: source.negative_prompt,
    aspect_ratio: source.aspect_ratio as AspectRatio,
    style_preset: source.style_preset,
  });
}

export async function incrementUsage(id: string): Promise<void> {
  const db = getDb();
  // Use rpc-style increment — fetch current, add 1
  const { data: row } = await db.from("templates").select("usage_count").eq("id", id).single();
  if (row) {
    await db
      .from("templates")
      .update({ usage_count: row.usage_count + 1, updated_at: new Date().toISOString() })
      .eq("id", id);
  }
}

export async function getCategories(workspace: Workspace): Promise<string[]> {
  const db = getDb();
  const { data, error } = await db
    .from("templates")
    .select("category")
    .eq("workspace", workspace);
  if (error) throw error;
  const cats = new Set((data || []).map((r: { category: string }) => r.category));
  return [...cats].sort();
}
