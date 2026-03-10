import { NextRequest, NextResponse } from "next/server";
import { analyzeScreenshotForTemplate } from "@/lib/template-analyze";
import { isGeminiConfigured } from "@/lib/gemini";
import { saveImage } from "@/lib/storage";
import { type Workspace } from "@/lib/constants";

/**
 * POST /api/templates/analyze
 * Accepts a screenshot of a restaurant post and analyzes it with Gemini
 * to generate a reusable template suggestion.
 *
 * Body: multipart/form-data with "image" file + "workspace"
 * Returns: { template: AnalyzedTemplate, source_image_url: string }
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
    const workspace = (formData.get("workspace") as Workspace) || "general";

    if (!imageFile) {
      return NextResponse.json(
        { error: "image file is required" },
        { status: 400 }
      );
    }

    // Validate image type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // Limit file size (10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert to base64
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Save the screenshot to blob storage for reference
    const saved = await saveImage({
      buffer,
      workspace,
      mimeType: imageFile.type,
      prefix: "tpl-src",
    });

    // Analyze with Gemini
    const template = await analyzeScreenshotForTemplate(base64, imageFile.type);

    return NextResponse.json({
      template,
      source_image_url: saved.publicUrl,
    });
  } catch (error) {
    console.error("Template analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
