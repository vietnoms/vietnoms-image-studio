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
