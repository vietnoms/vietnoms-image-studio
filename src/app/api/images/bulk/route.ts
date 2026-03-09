import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateImages, type StoredImage } from "@/lib/image-store";

const ACTION_TO_STATUS: Record<string, StoredImage["status"]> = {
  approve: "approved",
  reject: "rejected",
  archive: "archived",
};

// POST /api/images/bulk  { ids: string[], action: "approve"|"reject"|"archive"|"favorite"|"unfavorite" }
export async function POST(request: NextRequest) {
  try {
    const { ids, action } = (await request.json()) as {
      ids?: string[];
      action?: string;
    };

    if (!ids?.length || !action) {
      return NextResponse.json(
        { error: "ids and action are required" },
        { status: 400 }
      );
    }

    let updates: Partial<Pick<StoredImage, "status" | "isFavorite">> = {};

    if (ACTION_TO_STATUS[action]) {
      updates = { status: ACTION_TO_STATUS[action] };
    } else if (action === "favorite") {
      updates = { isFavorite: true };
    } else if (action === "unfavorite") {
      updates = { isFavorite: false };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = bulkUpdateImages(ids, updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
