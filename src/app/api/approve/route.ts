import { NextRequest, NextResponse } from "next/server";
import path from "path";
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

    // imageUrl is now a full Vercel Blob URL (https://...)
    // Extract filename from URL
    const filename = path.basename(new URL(imageUrl).pathname);

    // Attempt Google Drive upload if connected
    let driveUpload: { fileId: string; webViewLink: string } | null = null;
    let driveError: string | null = null;

    const driveConnected = await isGoogleDriveConnected();
    if (driveConnected) {
      try {
        // Fetch the image from Blob URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());

        driveUpload = await uploadToDrive({
          buffer,
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
