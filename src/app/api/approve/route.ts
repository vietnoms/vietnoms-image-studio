import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { isGoogleDriveConnected, uploadToDrive } from "@/lib/google-drive";

// Map studio categories to website's accepted values
function mapCategory(category?: string): string {
  if (!category) return "uncategorized";
  const lower = category.toLowerCase();
  if (lower.includes("food") || lower.includes("entree") || lower.includes("beverage") || lower.includes("appetizer") || lower.includes("dessert")) return "food";
  if (lower.includes("interior") || lower.includes("decor")) return "interior";
  if (lower.includes("event") || lower.includes("catering")) return "events";
  if (lower.includes("team") || lower.includes("staff")) return "team";
  if (lower.includes("promo") || lower.includes("market") || lower.includes("banner")) return "marketing";
  return "food"; // default for restaurant asset generator
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, workspace, category, tags, itemName } = body as {
      imageUrl: string;
      workspace: string;
      category?: string;
      tags?: string[];
      itemName?: string;
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

    // Attempt website media ingest if configured
    let websiteUpload: { id: number; blobUrl: string } | null = null;
    let websiteError: string | null = null;

    const siteUrl = process.env.VIETNOMS_SITE_URL;
    const ingestKey = process.env.MEDIA_INGEST_KEY;

    if (siteUrl && ingestKey) {
      try {
        const ingestRes = await fetch(`${siteUrl}/api/media/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ingestKey}`,
          },
          body: JSON.stringify({
            imageUrl,
            filename,
            altText: itemName || category || "Generated image",
            category: mapCategory(category),
            tags: tags?.join(",") || undefined,
          }),
        });

        const ingestData = await ingestRes.json();

        if (!ingestRes.ok) {
          throw new Error(ingestData.error || `Ingest failed: ${ingestRes.status}`);
        }

        websiteUpload = { id: ingestData.id, blobUrl: ingestData.blobUrl };
      } catch (error) {
        console.error("Website ingest error:", error);
        websiteError = error instanceof Error ? error.message : "Website ingest failed";
      }
    }

    return NextResponse.json({
      success: true,
      driveUpload,
      driveError,
      websiteUpload,
      websiteError,
    });
  } catch (error) {
    console.error("Approve error:", error);
    const message = error instanceof Error ? error.message : "Approval failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
