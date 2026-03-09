import { NextRequest, NextResponse } from "next/server";
import { importMenuItems, type ParsedMenuItem } from "@/lib/db/menu-items";
import { parseCSVString, parseSpreadsheet, mapRowsToItems } from "@/lib/menu-extract";
import { type Workspace } from "@/lib/constants";

/**
 * POST /api/menu-items/import
 *
 * Two modes:
 * 1. File upload (multipart/form-data with "file" + "workspace"):
 *    → Parses CSV/XLSX, returns { columns, rows } for column mapping
 *
 * 2. Confirmed import (JSON body with "items" + "workspace" + "confirmed: true"):
 *    → Saves mapped items to the store
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  // ── Mode 2: Confirmed import (JSON body) ──────────────────────────
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const { items, workspace, confirmed, columnMap, rows } = body as {
        items?: ParsedMenuItem[];
        workspace: Workspace;
        confirmed?: boolean;
        columnMap?: Record<string, string>;
        rows?: Record<string, string>[];
      };

      if (!workspace) {
        return NextResponse.json(
          { error: "workspace is required" },
          { status: 400 }
        );
      }

      // If rows + columnMap provided, map them first
      let finalItems = items;
      if (!finalItems && rows && columnMap) {
        finalItems = mapRowsToItems(rows, columnMap);
      }

      if (!finalItems || finalItems.length === 0) {
        return NextResponse.json(
          { error: "No items to import" },
          { status: 400 }
        );
      }

      if (confirmed) {
        const created = await importMenuItems(finalItems, workspace);
        return NextResponse.json({
          success: true,
          imported: created.length,
          items: created,
        });
      }

      // Preview mode — return items without saving
      return NextResponse.json({ items: finalItems, preview: true });
    } catch (error) {
      console.error("Import error:", error);
      const message =
        error instanceof Error ? error.message : "Import failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── Mode 1: File upload (multipart/form-data) ─────────────────────
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspace = formData.get("workspace") as Workspace | null;

    if (!file || !workspace) {
      return NextResponse.json(
        { error: "file and workspace are required" },
        { status: 400 }
      );
    }

    const filename = file.name.toLowerCase();
    const isCSV = filename.endsWith(".csv");
    const isExcel =
      filename.endsWith(".xlsx") ||
      filename.endsWith(".xls") ||
      filename.endsWith(".ods");

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { error: "Unsupported file type. Use CSV, XLSX, or XLS." },
        { status: 400 }
      );
    }

    if (isCSV) {
      const text = await file.text();
      const { columns, rows } = parseCSVString(text);
      return NextResponse.json({ columns, rows, format: "csv" });
    }

    // Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const { columns, rows } = parseSpreadsheet(buffer, file.type);
    return NextResponse.json({ columns, rows, format: "xlsx" });
  } catch (error) {
    console.error("File parse error:", error);
    const message =
      error instanceof Error ? error.message : "File parsing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
