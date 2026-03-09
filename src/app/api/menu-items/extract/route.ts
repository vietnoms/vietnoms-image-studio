import { NextRequest, NextResponse } from "next/server";
import { extractMenuFromImage } from "@/lib/menu-extract";
import { isGeminiConfigured } from "@/lib/gemini";

/**
 * POST /api/menu-items/extract
 * Accepts a menu board photo and extracts items via Gemini OCR.
 *
 * Body: multipart/form-data with "image" file + "workspace"
 * Returns: { items: ParsedMenuItem[] } for user review
 */
export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "Gemini API is not configured. Set GEMINI_API_KEY." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "image file is required" },
        { status: 400 }
      );
    }

    // Validate image type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // Convert to base64
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Extract menu items via Gemini
    const items = await extractMenuFromImage(base64, imageFile.type);

    return NextResponse.json({
      items,
      extracted: items.length,
      source: imageFile.name,
    });
  } catch (error) {
    console.error("Menu extraction error:", error);
    const message =
      error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
