import { NextRequest, NextResponse } from "next/server";
import { generateImage, isGeminiConfigured } from "@/lib/gemini";
import { saveImage } from "@/lib/storage";
import { addImage } from "@/lib/db/images";
import { IMAGE_COST_ESTIMATE, type AspectRatio, type Workspace } from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Add GEMINI_API_KEY to your .env.local file." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      prompt,
      negativePrompt,
      aspectRatio = "1:1",
      workspace = "general",
      referenceImages = [],
    } = body as {
      prompt: string;
      negativePrompt?: string;
      aspectRatio?: AspectRatio;
      workspace?: Workspace;
      referenceImages?: { data: string; mimeType: string }[];
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Generate image via Gemini
    const result = await generateImage({
      prompt,
      negativePrompt,
      aspectRatio,
      workspace,
      referenceImages,
    });

    // Save to Vercel Blob storage
    const saved = await saveImage({
      buffer: result.imageBuffer,
      workspace,
      mimeType: result.mimeType,
      prefix: "gen",
    });

    const imageId = uuidv4();

    // Persist to shared image store so Gallery can access it
    await addImage({
      id: imageId,
      url: saved.publicUrl,
      prompt: result.prompt,
      aspectRatio,
      workspace: workspace as Workspace,
      status: "pending",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      model: result.model,
      costEstimate: IMAGE_COST_ESTIMATE.generation,
      tags: [],
    });

    return NextResponse.json({
      image: {
        id: imageId,
        filename: saved.filename,
        url: saved.publicUrl,
        prompt: result.prompt,
        model: result.model,
        aspectRatio,
        workspace,
        costEstimate: IMAGE_COST_ESTIMATE.generation,
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
