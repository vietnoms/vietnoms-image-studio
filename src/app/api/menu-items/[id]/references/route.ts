import { NextRequest, NextResponse } from "next/server";
import {
  getMenuItemById,
  addReferenceImage,
  removeReferenceImage,
} from "@/lib/menu-items";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/menu-items/:id/references
 * Upload one or more reference photos for a menu item.
 * Body: multipart/form-data with "images" files
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const item = getMenuItemById(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("images") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No image files provided" },
        { status: 400 }
      );
    }

    // Ensure reference directory exists
    const refDir = path.join(
      process.cwd(),
      "public",
      "storage",
      "references",
      item.workspace,
      id
    );
    await fs.mkdir(refDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Validate image type
      if (!file.type.startsWith("image/")) {
        continue; // Skip non-image files silently
      }

      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
      const filename = `ref_${uuidv4().slice(0, 8)}.${ext}`;
      const filepath = path.join(refDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filepath, buffer);

      const publicUrl = `/storage/references/${item.workspace}/${id}/${filename}`;
      addReferenceImage(id, publicUrl);
      uploadedUrls.push(publicUrl);
    }

    // Return updated item
    const updated = getMenuItemById(id);
    return NextResponse.json({
      item: updated,
      uploaded: uploadedUrls.length,
      urls: uploadedUrls,
    });
  } catch (error) {
    console.error("Reference upload error:", error);
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/menu-items/:id/references?url=/storage/references/...
 * Remove a single reference image.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "url parameter is required" },
      { status: 400 }
    );
  }

  const item = getMenuItemById(id);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Delete file from disk
  const filepath = path.join(process.cwd(), "public", url);
  try {
    await fs.unlink(filepath);
  } catch {
    // File may already be gone
  }

  // Remove from item
  removeReferenceImage(id, url);

  const updated = getMenuItemById(id);
  return NextResponse.json({ item: updated });
}
