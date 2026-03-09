import { type Workspace } from "@/lib/constants";
import { getDb } from "./client";

// Re-export types from the original file
export type { MenuItem, ParsedMenuItem } from "@/lib/menu-items";
import type { MenuItem, ParsedMenuItem } from "@/lib/menu-items";

// ── Row ↔ TypeScript mapping ──────────────────────────────────────────
// DB uses `reference_images` (snake_case), TS uses `referenceImages` (camelCase)

interface MenuItemRow {
  id: string;
  workspace: string;
  name: string;
  description: string;
  price: string;
  category: string;
  reference_images: string[];
  created_at: string;
  updated_at: string;
}

function rowToMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    workspace: row.workspace as Workspace,
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category,
    referenceImages: row.reference_images || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────

export async function getMenuItems(
  workspace?: Workspace,
  category?: string
): Promise<MenuItem[]> {
  const db = getDb();
  let query = db.from("menu_items").select("*").order("created_at", { ascending: true });
  if (workspace) query = query.eq("workspace", workspace);
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToMenuItem);
}

export async function getMenuItemById(id: string): Promise<MenuItem | undefined> {
  const db = getDb();
  const { data, error } = await db.from("menu_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToMenuItem(data as MenuItemRow) : undefined;
}

export async function createMenuItem(
  data: Omit<MenuItem, "id" | "referenceImages" | "created_at" | "updated_at">
): Promise<MenuItem> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: row, error } = await db
    .from("menu_items")
    .insert({
      workspace: data.workspace,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      reference_images: [],
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToMenuItem(row as MenuItemRow);
}

/** Bulk-create menu items with deduplication by name+workspace */
export async function importMenuItems(
  parsedItems: ParsedMenuItem[],
  workspace: Workspace
): Promise<MenuItem[]> {
  if (parsedItems.length === 0) return [];
  const db = getDb();
  const now = new Date().toISOString();

  // Dedup: fetch existing names for this workspace
  const { data: existing } = await db
    .from("menu_items")
    .select("name")
    .eq("workspace", workspace);
  const existingNames = new Set(
    (existing || []).map((r: { name: string }) => r.name.trim().toLowerCase())
  );

  // Filter out items that already exist
  const newItems = parsedItems.filter(
    (p) => !existingNames.has(p.name.trim().toLowerCase())
  );

  if (newItems.length === 0) return [];

  const rows = newItems.map((p) => ({
    workspace,
    name: p.name.trim(),
    description: (p.description || "").trim(),
    price: (p.price || "").trim(),
    category: (p.category || "Uncategorized").trim(),
    reference_images: [],
    created_at: now,
    updated_at: now,
  }));

  const { data, error } = await db.from("menu_items").insert(rows).select();
  if (error) throw error;
  return (data || []).map(rowToMenuItem);
}

export async function updateMenuItem(
  id: string,
  data: Partial<Omit<MenuItem, "id" | "created_at" | "referenceImages">>
): Promise<MenuItem | null> {
  const db = getDb();
  // Map camelCase fields to snake_case for DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.workspace !== undefined) updates.workspace = data.workspace;
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.price !== undefined) updates.price = data.price;
  if (data.category !== undefined) updates.category = data.category;

  const { data: row, error } = await db
    .from("menu_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return rowToMenuItem(row as MenuItemRow);
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const db = getDb();
  const { error, count } = await db
    .from("menu_items")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── Reference Image Management ────────────────────────────────────────

export async function addReferenceImage(
  itemId: string,
  imageUrl: string
): Promise<MenuItem | null> {
  const db = getDb();
  const { data: row } = await db
    .from("menu_items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (!row) return null;

  const images: string[] = row.reference_images || [];
  if (!images.includes(imageUrl)) {
    images.push(imageUrl);
    const { data: updated, error } = await db
      .from("menu_items")
      .update({ reference_images: images, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .select()
      .single();
    if (error) throw error;
    return rowToMenuItem(updated as MenuItemRow);
  }
  return rowToMenuItem(row as MenuItemRow);
}

export async function removeReferenceImage(
  itemId: string,
  imageUrl: string
): Promise<MenuItem | null> {
  const db = getDb();
  const { data: row } = await db
    .from("menu_items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (!row) return null;

  const images: string[] = (row.reference_images || []).filter(
    (u: string) => u !== imageUrl
  );
  const { data: updated, error } = await db
    .from("menu_items")
    .update({ reference_images: images, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw error;
  return rowToMenuItem(updated as MenuItemRow);
}

// ── Utility ───────────────────────────────────────────────────────────

export async function getItemCategories(workspace: Workspace): Promise<string[]> {
  const db = getDb();
  const { data, error } = await db
    .from("menu_items")
    .select("category")
    .eq("workspace", workspace);
  if (error) throw error;
  const cats = new Set((data || []).map((r: { category: string }) => r.category));
  return [...cats].sort();
}

export async function getItemCount(workspace: Workspace): Promise<number> {
  const db = getDb();
  const { count, error } = await db
    .from("menu_items")
    .select("*", { count: "exact", head: true })
    .eq("workspace", workspace);
  if (error) throw error;
  return count ?? 0;
}
