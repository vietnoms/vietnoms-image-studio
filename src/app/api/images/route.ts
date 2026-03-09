import { NextRequest, NextResponse } from "next/server";
import { getImages, updateImage, deleteImage, type StoredImage } from "@/lib/db/images";
import { type Workspace } from "@/lib/constants";

// GET /api/images?workspace=vietnoms&status=approved&search=pho&limit=50&offset=0
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const workspace = searchParams.get("workspace") as Workspace | undefined;
  const status = searchParams.get("status") as StoredImage["status"] | "favorites" | undefined;
  const search = searchParams.get("search") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const tag = searchParams.get("tag") || undefined;

  const result = await getImages({
    workspace: workspace || undefined,
    status: status || undefined,
    search,
    tag,
    limit,
    offset,
  });

  return NextResponse.json(result);
}

// PATCH /api/images  — update image status/favorite
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, isFavorite, driveLink, tags } = body as {
      id: string;
      status?: StoredImage["status"];
      isFavorite?: boolean;
      driveLink?: string | null;
      tags?: string[];
    };

    if (!id) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
    }

    const updates: Partial<Pick<StoredImage, "status" | "isFavorite" | "driveLink" | "tags">> = {};
    if (status !== undefined) updates.status = status;
    if (isFavorite !== undefined) updates.isFavorite = isFavorite;
    if (driveLink !== undefined) updates.driveLink = driveLink;
    if (tags !== undefined) updates.tags = tags;

    const updated = await updateImage(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ image: updated });
  } catch (error) {
    console.error("Image update error:", error);
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
  }
}

// DELETE /api/images?id=abc123
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
  }

  const deleted = await deleteImage(id);
  if (!deleted) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
