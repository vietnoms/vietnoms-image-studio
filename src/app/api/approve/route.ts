import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { isGoogleDriveConnected, uploadToDrive } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, workspace, category } = body as {
      imageUrl: string;
      workspace: string;
      category?: string;
    };

    if (!imageUrl || !workspace) {
      return NextResponse.json(
        { error: "imageUrl and workspace are required" },
        { status: 400 }
      );
    }

    // Resolve the local file path from the public URL
    // imageUrl is like: /storage/images/vietnoms/2026-03/gen_20260308_abc12345.png
    const filepath = path.join(process.cwd(), "public", imageUrl);

    // Verify the file exists
    try {
      await fs.access(filepath);
    } catch {
      return NextResponse.json(
        { error: "Image file not found on disk" },
        { status: 404 }
      );
    }

    const filename = path.basename(filepath);

    // Attempt Google Drive upload if connected
    let driveUpload: { fileId: string; webViewLink: string } | null = null;
    let driveError: string | null = null;

    const driveConnected = await isGoogleDriveConnected();
    if (driveConnected) {
      try {
        driveUpload = await uploadToDrive({
          filepath,
          filename,
          workspace,
          category: category || "Uncategorized",
        });
      } catch (error) {
        console.error("Google Drive upload error:", error);
        driveError = error instanceof Error ? error.message : "Drive upload failed";
      }
    }

    return NextResponse.json({
      success: true,
      driveUpload,
      driveError,
    });
  } catch (error) {
    console.error("Approve error:", error);
    const message = error instanceof Error ? error.message : "Approval failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
