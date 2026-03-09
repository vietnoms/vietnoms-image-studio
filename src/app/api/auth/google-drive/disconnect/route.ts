import { NextResponse } from "next/server";
import { disconnectDrive } from "@/lib/google-drive";

export async function POST() {
  try {
    await disconnectDrive();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Drive disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
