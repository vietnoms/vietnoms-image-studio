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
