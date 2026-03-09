import { NextRequest, NextResponse } from "next/server";
import { editImage, isGeminiConfigured } from "@/lib/gemini";
import { saveImage } from "@/lib/storage";
import { addImage } from "@/lib/db/images";
import { IMAGE_COST_ESTIMATE, type Workspace } from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      imageBase64,
      imageMimeType = "image/png",
      instruction,
      workspace = "general",
      mask,
    } = body as {
      imageBase64: string;
      imageMimeType?: string;
      instruction: string;
      workspace?: Workspace;
      mask?: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }
    if (!instruction?.trim()) {
      return NextResponse.json({ error: "Edit instruction is required" }, { status: 400 });
    }

    // Edit image via Gemini
    const result = await editImage({
      imageBase64,
      imageMimeType,
      instruction,
      ...(mask ? { mask } : {}),
    });

    // Save edited image to Vercel Blob storage
    const saved = await saveImage({
      buffer: result.imageBuffer,
      workspace,
      mimeType: result.mimeType,
      prefix: "edit",
    });

    const imageId = uuidv4();

    // Add to shared image store
    await addImage({
      id: imageId,
      url: saved.publicUrl,
      prompt: `[Edit] ${instruction}`,
      aspectRatio: "1:1",
      workspace: workspace as Workspace,
      status: "pending",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      model: result.model,
      costEstimate: IMAGE_COST_ESTIMATE.editing,
      tags: [],
    });

    return NextResponse.json({
      image: {
        id: imageId,
        filename: saved.filename,
        url: saved.publicUrl,
        instruction,
        model: result.model,
        workspace,
        costEstimate: IMAGE_COST_ESTIMATE.editing,
      },
    });
  } catch (error) {
    console.error("Edit error:", error);
    const message = error instanceof Error ? error.message : "Image editing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
