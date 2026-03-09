import { type Workspace } from "./constants";

// ── Types ───────────────────────────────────────────────────────────────
export interface StoredImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  workspace: Workspace;
  status: "pending" | "approved" | "rejected" | "archived";
  isFavorite: boolean;
  createdAt: string;
  driveLink?: string | null;
  model?: string;
  costEstimate?: number;
  tags: string[];
}

// ── In-memory store ─────────────────────────────────────────────────────
let images: StoredImage[] = [];

/** Add a newly generated image to the store */
export function addImage(image: StoredImage): void {
  images.unshift(image);
  // Keep max 200 images in memory
  if (images.length > 200) {
    images = images.slice(0, 200);
  }
}

/** Get all images, optionally filtered */
export function getImages(filters?: {
  workspace?: Workspace;
  status?: StoredImage["status"] | "favorites";
  search?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): { images: StoredImage[]; total: number } {
  let filtered = [...images];

  if (filters?.workspace) {
    filtered = filtered.filter((img) => img.workspace === filters.workspace);
  }
  if (filters?.status === "favorites") {
    filtered = filtered.filter((img) => img.isFavorite);
  } else if (filters?.status) {
    filtered = filtered.filter((img) => img.status === filters.status);
  }
  if (filters?.tag) {
    filtered = filtered.filter((img) => img.tags.includes(filters.tag!));
  }
  if (filters?.search?.trim()) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((img) =>
      img.prompt.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;

  return {
    images: filtered.slice(offset, offset + limit),
    total,
  };
}

/** Get a single image by ID */
export function getImageById(id: string): StoredImage | undefined {
  return images.find((img) => img.id === id);
}

/** Update an image (status, favorite, driveLink, tags, etc.) */
export function updateImage(
  id: string,
  updates: Partial<Pick<StoredImage, "status" | "isFavorite" | "driveLink" | "tags">>
): StoredImage | null {
  const img = images.find((i) => i.id === id);
  if (!img) return null;
  Object.assign(img, updates);
  return img;
}

/** Delete an image from the store */
export function deleteImage(id: string): boolean {
  const before = images.length;
  images = images.filter((img) => img.id !== id);
  return images.length < before;
}

/** Bulk update multiple images at once */
export function bulkUpdateImages(
  ids: string[],
  updates: Partial<Pick<StoredImage, "status" | "isFavorite">>
): { updated: number; images: StoredImage[] } {
  const updatedImages: StoredImage[] = [];
  for (const id of ids) {
    const img = images.find((i) => i.id === id);
    if (img) {
      Object.assign(img, updates);
      updatedImages.push(img);
    }
  }
  return { updated: updatedImages.length, images: updatedImages };
}

/** Get all unique tags for a workspace (or all workspaces) */
export function getTags(workspace?: Workspace): string[] {
  const source = workspace
    ? images.filter((i) => i.workspace === workspace)
    : images;
  const tagSet = new Set<string>();
  for (const img of source) {
    for (const t of img.tags) tagSet.add(t);
  }
  return [...tagSet].sort();
}

/** Get stats for a workspace */
export function getStats(workspace: Workspace): {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  archived: number;
  favorites: number;
} {
  const ws = images.filter((img) => img.workspace === workspace);
  return {
    total: ws.length,
    approved: ws.filter((i) => i.status === "approved").length,
    pending: ws.filter((i) => i.status === "pending").length,
    rejected: ws.filter((i) => i.status === "rejected").length,
    archived: ws.filter((i) => i.status === "archived").length,
    favorites: ws.filter((i) => i.isFavorite).length,
  };
}
