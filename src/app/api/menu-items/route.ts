import { NextRequest, NextResponse } from "next/server";
import { getMenuItems, createMenuItem } from "@/lib/db/menu-items";
import { type Workspace } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** GET /api/menu-items?workspace=vietnoms&category=beverages */
export async function GET(request: NextRequest) {
  const workspace = request.nextUrl.searchParams.get("workspace") as
    | Workspace
    | null;
  const category = request.nextUrl.searchParams.get("category") || undefined;

  const items = await getMenuItems(workspace ?? undefined, category);
  return NextResponse.json({ items });
}

/** POST /api/menu-items — create a single menu item */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspace, name, description, price, category } = body as {
      workspace: Workspace;
      name: string;
      description?: string;
      price?: string;
      category?: string;
    };

    if (!workspace || !name?.trim()) {
      return NextResponse.json(
        { error: "workspace and name are required" },
        { status: 400 }
      );
    }

    const item = await createMenuItem({
      workspace,
      name: name.trim(),
      description: (description || "").trim(),
      price: (price || "").trim(),
      category: (category || "Uncategorized").trim(),
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Create menu item error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
