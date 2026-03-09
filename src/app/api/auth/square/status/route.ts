import { NextResponse } from "next/server";
import { isSquareConfigured, isSquareConnected } from "@/lib/square";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSquareConfigured();
  const connected = configured ? await isSquareConnected() : false;

  return NextResponse.json({ configured, connected });
}
