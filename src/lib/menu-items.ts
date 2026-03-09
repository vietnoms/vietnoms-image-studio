import { type Workspace } from "./constants";

// ── Types ───────────────────────────────────────────────────────────────
export interface MenuItem {
  id: string;
  workspace: Workspace;
  name: string;
  description: string;
  price: string;
  category: string;
  referenceImages: string[]; // public URLs to uploaded reference photos
  created_at: string;
  updated_at: string;
}

/** Shape returned by import/extraction before saving */
export interface ParsedMenuItem {
  name: string;
  description?: string;
  price?: string;
  category?: string;
}

// ── In-memory store ─────────────────────────────────────────────────────
let nextId = 0;
function localId(): string {
  return `item-${++nextId}-${Date.now().toString(36)}`;
}

let items: MenuItem[] = [];

// ── CRUD Operations ─────────────────────────────────────────────────────

/** List menu items, optionally filtered by workspace and/or category */
export function getMenuItems(
  workspace?: Workspace,
  category?: string
): MenuItem[] {
  let result = [...items];
  if (workspace) result = result.filter((i) => i.workspace === workspace);
  if (category) result = result.filter((i) => i.category === category);
  return result;
}

/** Get a single menu item by ID */
export function getMenuItemById(id: string): MenuItem | undefined {
  return items.find((i) => i.id === id);
}

/** Create a single menu item */
export function createMenuItem(
  data: Omit<MenuItem, "id" | "referenceImages" | "created_at" | "updated_at">
): MenuItem {
  const now = new Date().toISOString();
  const item: MenuItem = {
    ...data,
    id: localId(),
    referenceImages: [],
    created_at: now,
    updated_at: now,
  };
  items.push(item);
  return item;
}

/** Bulk-create menu items from parsed import data */
export function importMenuItems(
  parsedItems: ParsedMenuItem[],
  workspace: Workspace
): MenuItem[] {
  const now = new Date().toISOString();
  const created: MenuItem[] = parsedItems.map((p) => ({
    id: localId(),
    workspace,
    name: p.name.trim(),
    description: (p.description || "").trim(),
    price: (p.price || "").trim(),
    category: (p.category || "Uncategorized").trim(),
    referenceImages: [],
    created_at: now,
    updated_at: now,
  }));
  items.push(...created);
  return created;
}

/** Update an existing menu item */
export function updateMenuItem(
  id: string,
  data: Partial<
    Omit<MenuItem, "id" | "created_at" | "referenceImages">
  >
): MenuItem | null {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  items[idx] = {
    ...items[idx],
    ...data,
    updated_at: new Date().toISOString(),
  };
  return items[idx];
}

/** Delete a menu item */
export function deleteMenuItem(id: string): boolean {
  const before = items.length;
  items = items.filter((i) => i.id !== id);
  return items.length < before;
}

// ── Reference Image Management ──────────────────────────────────────────

/** Add a reference image URL to a menu item */
export function addReferenceImage(
  itemId: string,
  imageUrl: string
): MenuItem | null {
  const item = items.find((i) => i.id === itemId);
  if (!item) return null;

  if (!item.referenceImages.includes(imageUrl)) {
    item.referenceImages.push(imageUrl);
    item.updated_at = new Date().toISOString();
  }
  return item;
}

/** Remove a reference image URL from a menu item */
export function removeReferenceImage(
  itemId: string,
  imageUrl: string
): MenuItem | null {
  const item = items.find((i) => i.id === itemId);
  if (!item) return null;

  item.referenceImages = item.referenceImages.filter((u) => u !== imageUrl);
  item.updated_at = new Date().toISOString();
  return item;
}

// ── Utility ─────────────────────────────────────────────────────────────

/** Get unique categories for a workspace */
export function getItemCategories(workspace: Workspace): string[] {
  const ws = items.filter((i) => i.workspace === workspace);
  return [...new Set(ws.map((i) => i.category))].sort();
}

/** Get total item count for a workspace */
export function getItemCount(workspace: Workspace): number {
  return items.filter((i) => i.workspace === workspace).length;
}
