import { NextResponse } from "next/server";
import { isGoogleDriveConfigured, isGoogleDriveConnected } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isGoogleDriveConfigured();
  const connected = configured ? await isGoogleDriveConnected() : false;

  return NextResponse.json({ configured, connected });
}
