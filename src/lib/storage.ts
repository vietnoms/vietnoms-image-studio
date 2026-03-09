import { put, del } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

export interface SaveImageOptions {
  buffer: Buffer;
  workspace: string;
  mimeType?: string;
  prefix?: string;
}

export interface SavedImage {
  filename: string;
  publicUrl: string; // Vercel Blob public URL
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

  const pathname = `images/${workspace}/${yearMonth}/${filename}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: mimeType,
  });

  return { filename, publicUrl: blob.url };
}

export async function saveReferenceImage(options: {
  buffer: Buffer;
  workspace: string;
  itemId: string;
  mimeType?: string;
}): Promise<{ filename: string; publicUrl: string }> {
  const { buffer, workspace, itemId, mimeType = "image/png" } = options;

  const ext = getExtension(mimeType);
  const filename = `ref_${uuidv4().slice(0, 8)}.${ext}`;
  const pathname = `references/${workspace}/${itemId}/${filename}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: mimeType,
  });

  return { filename, publicUrl: blob.url };
}

export async function deleteImage(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // Blob may already be deleted
  }
}

/**
 * Fetch an image from its Blob URL and return as base64.
 */
export async function imageToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

/**
 * Fetch an image from its Blob URL and return as Buffer.
 */
export async function imageToBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
