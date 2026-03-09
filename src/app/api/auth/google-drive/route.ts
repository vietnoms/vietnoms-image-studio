import { NextResponse } from "next/server";
import { isGoogleDriveConfigured, getAuthUrl } from "@/lib/google-drive";

export async function GET() {
  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      { error: "Google Drive is not configured. Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to .env.local." },
      { status: 503 }
    );
  }

  const authUrl = getAuthUrl();
  return NextResponse.json({ authUrl });
}
