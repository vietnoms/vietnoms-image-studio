import { NextRequest, NextResponse } from "next/server";
import { getImages, updateImage, type StoredImage } from "@/lib/image-store";
import { type Workspace } from "@/lib/constants";

// GET /api/images?workspace=vietnoms&status=approved&search=pho&limit=50&offset=0
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const workspace = searchParams.get("workspace") as Workspace | undefined;
  const status = searchParams.get("status") as StoredImage["status"] | "favorites" | undefined;
  const search = searchParams.get("search") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const result = getImages({
    workspace: workspace || undefined,
    status: status || undefined,
    search,
    limit,
    offset,
  });

  return NextResponse.json(result);
}

// PATCH /api/images  — update image status/favorite
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, isFavorite, driveLink } = body as {
      id: string;
      status?: StoredImage["status"];
      isFavorite?: boolean;
      driveLink?: string | null;
    };

    if (!id) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
    }

    const updates: Partial<Pick<StoredImage, "status" | "isFavorite" | "driveLink">> = {};
    if (status !== undefined) updates.status = status;
    if (isFavorite !== undefined) updates.isFavorite = isFavorite;
    if (driveLink !== undefined) updates.driveLink = driveLink;

    const updated = updateImage(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ image: updated });
  } catch (error) {
    console.error("Image update error:", error);
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
  }
}
