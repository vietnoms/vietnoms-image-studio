import { type Workspace } from "@/lib/constants";
import { getDb } from "./client";

// Re-export the StoredImage type
export type { StoredImage } from "@/lib/image-store";
import type { StoredImage } from "@/lib/image-store";

// ── Row ↔ TypeScript mapping ──────────────────────────────────────────
// DB: snake_case, TS: camelCase for several fields

interface ImageRow {
  id: string;
  url: string;
  prompt: string;
  aspect_ratio: string;
  workspace: string;
  status: string;
  is_favorite: boolean;
  created_at: string;
  drive_link: string | null;
  model: string | null;
  cost_estimate: number | null;
  tags: string[];
}

function rowToStoredImage(row: ImageRow): StoredImage {
  return {
    id: row.id,
    url: row.url,
    prompt: row.prompt,
    aspectRatio: row.aspect_ratio,
    workspace: row.workspace as Workspace,
    status: row.status as StoredImage["status"],
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    driveLink: row.drive_link,
    model: row.model ?? undefined,
    costEstimate: row.cost_estimate ?? undefined,
    tags: row.tags || [],
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────

export async function addImage(image: StoredImage): Promise<void> {
  const db = getDb();
  const { error } = await db.from("stored_images").insert({
    id: image.id,
    url: image.url,
    prompt: image.prompt,
    aspect_ratio: image.aspectRatio,
    workspace: image.workspace,
    status: image.status,
    is_favorite: image.isFavorite,
    created_at: image.createdAt,
    drive_link: image.driveLink ?? null,
    model: image.model ?? null,
    cost_estimate: image.costEstimate ?? null,
    tags: image.tags || [],
  });
  if (error) throw error;
}

export async function getImages(filters?: {
  workspace?: Workspace;
  status?: StoredImage["status"] | "favorites";
  search?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<{ images: StoredImage[]; total: number }> {
  const db = getDb();
  let query = db
    .from("stored_images")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.workspace) query = query.eq("workspace", filters.workspace);
  if (filters?.status === "favorites") {
    query = query.eq("is_favorite", true);
  } else if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.tag) {
    query = query.contains("tags", [filters.tag]);
  }
  if (filters?.search?.trim()) {
    query = query.ilike("prompt", `%${filters.search.trim()}%`);
  }

  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    images: (data || []).map((r) => rowToStoredImage(r as ImageRow)),
    total: count || 0,
  };
}

export async function getImageById(id: string): Promise<StoredImage | undefined> {
  const db = getDb();
  const { data, error } = await db
    .from("stored_images")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStoredImage(data as ImageRow) : undefined;
}

export async function updateImage(
  id: string,
  updates: Partial<Pick<StoredImage, "status" | "isFavorite" | "driveLink" | "tags">>
): Promise<StoredImage | null> {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbUpdates: Record<string, any> = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
  if (updates.driveLink !== undefined) dbUpdates.drive_link = updates.driveLink;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

  const { data, error } = await db
    .from("stored_images")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return rowToStoredImage(data as ImageRow);
}

export async function deleteImage(id: string): Promise<boolean> {
  const db = getDb();
  const { error, count } = await db
    .from("stored_images")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function bulkUpdateImages(
  ids: string[],
  updates: Partial<Pick<StoredImage, "status" | "isFavorite">>
): Promise<{ updated: number; images: StoredImage[] }> {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbUpdates: Record<string, any> = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;

  const { data, error } = await db
    .from("stored_images")
    .update(dbUpdates)
    .in("id", ids)
    .select();
  if (error) throw error;

  const images = (data || []).map((r) => rowToStoredImage(r as ImageRow));
  return { updated: images.length, images };
}

export async function getTags(workspace?: Workspace): Promise<string[]> {
  const db = getDb();
  let query = db.from("stored_images").select("tags");
  if (workspace) query = query.eq("workspace", workspace);
  const { data, error } = await query;
  if (error) throw error;

  const tagSet = new Set<string>();
  for (const row of data || []) {
    for (const t of (row as { tags: string[] }).tags || []) {
      tagSet.add(t);
    }
  }
  return [...tagSet].sort();
}

export async function getStats(workspace: Workspace): Promise<{
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  archived: number;
  favorites: number;
}> {
  const db = getDb();
  const { data, error } = await db
    .from("stored_images")
    .select("status, is_favorite")
    .eq("workspace", workspace);
  if (error) throw error;

  const rows = data || [];
  return {
    total: rows.length,
    approved: rows.filter((r) => r.status === "approved").length,
    pending: rows.filter((r) => r.status === "pending").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    archived: rows.filter((r) => r.status === "archived").length,
    favorites: rows.filter((r) => r.is_favorite).length,
  };
}
