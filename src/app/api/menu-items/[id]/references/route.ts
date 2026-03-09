import { NextRequest, NextResponse } from "next/server";
import {
  getMenuItemById,
  addReferenceImage,
  removeReferenceImage,
} from "@/lib/menu-items";
import { saveReferenceImage, deleteImage } from "@/lib/storage";

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

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Validate image type
      if (!file.type.startsWith("image/")) {
        continue; // Skip non-image files silently
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const saved = await saveReferenceImage({
        buffer,
        workspace: item.workspace,
        itemId: id,
        mimeType: file.type,
      });

      addReferenceImage(id, saved.publicUrl);
      uploadedUrls.push(saved.publicUrl);
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
 * DELETE /api/menu-items/:id/references?url=https://...blob.vercelcdn.com/...
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

  // Delete from Vercel Blob
  await deleteImage(url);

  // Remove from item
  removeReferenceImage(id, url);

  const updated = getMenuItemById(id);
  return NextResponse.json({ item: updated });
}
