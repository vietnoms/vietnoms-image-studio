import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const STORAGE_BASE = path.join(process.cwd(), "public", "storage", "images");

export interface SaveImageOptions {
  buffer: Buffer;
  workspace: string;
  mimeType?: string;
  prefix?: string;
}

export interface SavedImage {
  filename: string;
  filepath: string; // absolute path on disk
  publicUrl: string; // URL accessible from browser
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  return map[mimeType] || "png";
}

export async function saveImage(options: SaveImageOptions): Promise<SavedImage> {
  const { buffer, workspace, mimeType = "image/png", prefix = "gen" } = options;

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const shortId = uuidv4().slice(0, 8);
  const ext = getExtension(mimeType);
  const filename = `${prefix}_${timestamp}_${shortId}.${ext}`;

  const dir = path.join(STORAGE_BASE, workspace, yearMonth);
  await fs.mkdir(dir, { recursive: true });

  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buffer);

  // Public URL relative to /public
  const publicUrl = `/storage/images/${workspace}/${yearMonth}/${filename}`;

  return { filename, filepath, publicUrl };
}

export async function deleteImage(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
  } catch {
    // File may already be deleted
  }
}

export async function imageToBase64(filepath: string): Promise<string> {
  const buffer = await fs.readFile(filepath);
  return buffer.toString("base64");
}
