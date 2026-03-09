import { NextResponse } from "next/server";
import { isSquareConfigured, getAuthUrl } from "@/lib/square";

export async function GET() {
  if (!isSquareConfigured()) {
    return NextResponse.json(
      { error: "Square is not configured. Add SQUARE_APP_ID and SQUARE_APP_SECRET to .env.local." },
      { status: 503 }
    );
  }

  const authUrl = getAuthUrl();
  return NextResponse.json({ authUrl });
}
