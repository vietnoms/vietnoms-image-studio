import { NextRequest, NextResponse } from "next/server";
import {
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
} from "@/lib/menu-items";
import { type Workspace } from "@/lib/constants";
import fs from "fs/promises";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/menu-items/:id */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const item = getMenuItemById(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

/** PUT /api/menu-items/:id — update an item */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, price, category, workspace } = body as {
      name?: string;
      description?: string;
      price?: string;
      category?: string;
      workspace?: Workspace;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (category !== undefined) updates.category = category;
    if (workspace !== undefined) updates.workspace = workspace;

    const item = updateMenuItem(id, updates);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Update menu item error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/menu-items/:id — delete item and its reference images */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const item = getMenuItemById(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Clean up reference images from disk
  const refDir = path.join(
    process.cwd(),
    "public",
    "storage",
    "references",
    item.workspace,
    id
  );
  try {
    await fs.rm(refDir, { recursive: true, force: true });
  } catch {
    // Directory may not exist — that's fine
  }

  const deleted = deleteMenuItem(id);
  if (!deleted) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
