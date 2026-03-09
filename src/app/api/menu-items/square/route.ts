import { NextRequest, NextResponse } from "next/server";
import { isSquareConnected, fetchCatalogItems } from "@/lib/square";
import { importMenuItems, addReferenceImage } from "@/lib/menu-items";
import { saveReferenceImage } from "@/lib/storage";
import type { ParsedMenuItem } from "@/lib/menu-items";
import type { Workspace } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/menu-items/square
 * Fetch catalog items from Square for preview.
 * Returns: { items: ParsedMenuItem[], images: Record<string, string> }
 */
export async function GET() {
  const connected = await isSquareConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "Square is not connected. Please authorize first." },
      { status: 401 }
    );
  }

  try {
    const result = await fetchCatalogItems();

    // Map to ParsedMenuItem format for the import preview
    const items: ParsedMenuItem[] = result.items.map((item) => ({
      name: item.name,
      description: item.description || undefined,
      price: item.price || undefined,
      category: item.category || undefined,
    }));

    // Build image map: item name → image URL (for optional download)
    const images: Record<string, string> = {};
    for (const item of result.items) {
      if (item.imageUrl) {
        images[item.name] = item.imageUrl;
      }
    }

    return NextResponse.json({
      items,
      images,
      totalFetched: result.totalFetched,
    });
  } catch (error) {
    console.error("Square catalog fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/menu-items/square
 * Confirm import of Square catalog items.
 * Body: { items: ParsedMenuItem[], workspace: Workspace, downloadImages?: boolean, imageMap?: Record<string, string> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      workspace,
      downloadImages = false,
      imageMap = {},
    } = body as {
      items: ParsedMenuItem[];
      workspace: Workspace;
      downloadImages?: boolean;
      imageMap?: Record<string, string>;
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items to import" },
        { status: 400 }
      );
    }

    // Import items using existing bulk import function
    const created = importMenuItems(items, workspace);

    // Optionally download Square product images as reference images
    if (downloadImages && Object.keys(imageMap).length > 0) {
      for (const item of created) {
        const imageUrl = imageMap[item.name];
        if (!imageUrl) continue;

        try {
          const response = await fetch(imageUrl);
          if (!response.ok) continue;

          const contentType = response.headers.get("content-type") || "image/jpeg";
          const buffer = Buffer.from(await response.arrayBuffer());

          const saved = await saveReferenceImage({
            buffer,
            workspace,
            itemId: item.id,
            mimeType: contentType,
          });

          addReferenceImage(item.id, saved.publicUrl);
        } catch (err) {
          // Skip failed image downloads silently
          console.error(`Failed to download image for "${item.name}":`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: created.length,
      items: created,
    });
  } catch (error) {
    console.error("Square import error:", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
